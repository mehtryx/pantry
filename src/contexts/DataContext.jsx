import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, serverTimestamp, writeBatch, getDocs
} from 'firebase/firestore'
import { db, auth, ensureSignedIn } from '../lib/firebase'
import { WAITING, DRAIN_ORDER } from '../lib/constants'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

export function DataProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [items, setItems] = useState([])
  const [grocery, setGrocery] = useState([])
  const [recipes, setRecipes] = useState([])
  const [mealPlans, setMealPlans] = useState([])

  // Sign in on mount
  useEffect(() => {
    ensureSignedIn()
      .then(u => setUser(u))
      .catch(err => console.error('Auth failed:', err))
  }, [])

  // Subscribe to collections once signed in
  useEffect(() => {
    if (!user) return
    const uid = user.uid

    const unsubItems = onSnapshot(
      query(collection(db, 'items'), where('uid', '==', uid)),
      snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const unsubGrocery = onSnapshot(
      query(collection(db, 'grocery'), where('uid', '==', uid)),
      snap => setGrocery(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const unsubRecipes = onSnapshot(
      query(collection(db, 'recipes'), where('uid', '==', uid)),
      snap => setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const unsubPlans = onSnapshot(
      query(collection(db, 'mealPlans'), where('uid', '==', uid)),
      snap => {
        setMealPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setReady(true)
      }
    )

    return () => {
      unsubItems(); unsubGrocery(); unsubRecipes(); unsubPlans()
    }
  }, [user])

  // Auto-cook meals whose date has passed
  useEffect(() => {
    if (!ready || !user) return
    autoCookPastMeals(user.uid, mealPlans, items, recipes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mealPlans.length, items.length, recipes.length])

  // Compute reservations per item (across all uncooked future plans)
  const reservations = useMemo(() => {
    const map = {}
    const today = todayISO()
    for (const plan of mealPlans) {
      if (plan.cooked) continue
      if (plan.date < today) continue
      const recipe = recipes.find(r => r.id === plan.recipeId)
      if (!recipe) continue
      for (const ing of (recipe.ingredients || [])) {
        if (!ing.itemId) continue
        map[ing.itemId] = (map[ing.itemId] || 0) + (ing.quantity || 0)
      }
    }
    return map
  }, [mealPlans, recipes])

  // ---------- Mutations ----------
  const uid = user?.uid

  async function addItem({ name, unit, location, quantity }) {
    const stock = { [location]: Number(quantity) || 0 }
    const ref = await addDoc(collection(db, 'items'), {
      uid, name: name.trim(), unit, stock, stores: [],
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    })
    return ref.id
  }

  async function updateItem(id, patch) {
    await updateDoc(doc(db, 'items', id), { ...patch, updatedAt: serverTimestamp() })
  }

  async function setItemLocationQty(id, location, quantity) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const stock = { ...(item.stock || {}) }
    const q = Math.max(0, Number(quantity) || 0)
    if (q === 0) delete stock[location]
    else stock[location] = q
    await updateItem(id, { stock })
  }

  async function deleteItem(id) {
    await deleteDoc(doc(db, 'items', id))
  }

  // ---------- Grocery ----------
  async function addGrocery({ itemId, name, unit, quantity, store }) {
    await addDoc(collection(db, 'grocery'), {
      uid,
      itemId: itemId || null,
      name: name.trim(),
      unit,
      quantity: Number(quantity) || 0,
      store: store || null,
      addedBy: 'manual',
      bought: false,
      createdAt: serverTimestamp(),
    })
  }

  async function updateGrocery(id, patch) {
    await updateDoc(doc(db, 'grocery', id), patch)
  }

  async function deleteGrocery(id) {
    await deleteDoc(doc(db, 'grocery', id))
  }

  /**
   * Toggle bought state. When set to bought:
   *   - If itemId exists: add quantity to item.stock.waiting_to_be_stored
   *   - If no itemId: create the item first with quantity in waiting, then link
   * When unset:
   *   - Subtract from waiting_to_be_stored
   */
  async function setGroceryBought(id, bought) {
    const g = grocery.find(x => x.id === id)
    if (!g) return
    if (bought === g.bought) return

    const batch = writeBatch(db)

    if (bought) {
      let itemId = g.itemId
      if (!itemId) {
        // Create new item
        const newRef = doc(collection(db, 'items'))
        batch.set(newRef, {
          uid,
          name: g.name,
          unit: g.unit,
          stock: { [WAITING]: g.quantity || 0 },
          stores: g.store ? [g.store] : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        itemId = newRef.id
        batch.update(doc(db, 'grocery', id), { bought: true, itemId })
      } else {
        const item = items.find(i => i.id === itemId)
        const current = item?.stock?.[WAITING] || 0
        const newStock = { ...(item?.stock || {}), [WAITING]: current + (g.quantity || 0) }
        batch.update(doc(db, 'items', itemId), { stock: newStock, updatedAt: serverTimestamp() })
        batch.update(doc(db, 'grocery', id), { bought: true })
      }
    } else {
      // Un-bought: pull the quantity back out of waiting
      if (g.itemId) {
        const item = items.find(i => i.id === g.itemId)
        const current = item?.stock?.[WAITING] || 0
        const remaining = Math.max(0, current - (g.quantity || 0))
        const newStock = { ...(item?.stock || {}) }
        if (remaining === 0) delete newStock[WAITING]
        else newStock[WAITING] = remaining
        batch.update(doc(db, 'items', g.itemId), { stock: newStock, updatedAt: serverTimestamp() })
      }
      batch.update(doc(db, 'grocery', id), { bought: false })
    }

    await batch.commit()
  }

  /**
   * Move quantity from waiting_to_be_stored to a real location.
   * If storing partial amount, remainder stays in waiting.
   */
  async function putAway(itemId, targetLocation, quantity) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const stock = { ...(item.stock || {}) }
    const waiting = stock[WAITING] || 0
    const moveQty = Math.min(Number(quantity) || 0, waiting)
    if (moveQty <= 0) return

    stock[WAITING] = waiting - moveQty
    if (stock[WAITING] === 0) delete stock[WAITING]
    stock[targetLocation] = (stock[targetLocation] || 0) + moveQty
    await updateItem(itemId, { stock })
  }

  // ---------- Recipes ----------
  async function addRecipe({ name, ingredients }) {
    const ref = await addDoc(collection(db, 'recipes'), {
      uid, name: name.trim(), ingredients, createdAt: serverTimestamp()
    })
    return ref.id
  }
  async function updateRecipe(id, patch) {
    await updateDoc(doc(db, 'recipes', id), patch)
  }
  async function deleteRecipe(id) {
    await deleteDoc(doc(db, 'recipes', id))
  }

  // ---------- Meal Plans ----------
  async function addMealPlan({ date, slot, recipeId }) {
    const ref = await addDoc(collection(db, 'mealPlans'), {
      uid, date, slot, recipeId, cooked: false, createdAt: serverTimestamp()
    })
    await reconcileGroceryList(uid, [...mealPlans, { id: ref.id, date, slot, recipeId, cooked: false }], items, recipes, grocery)
    return ref.id
  }

  async function deleteMealPlan(id) {
    await deleteDoc(doc(db, 'mealPlans', id))
    const remaining = mealPlans.filter(p => p.id !== id)
    await reconcileGroceryList(uid, remaining, items, recipes, grocery)
  }

  const value = {
    user, ready,
    items, grocery, recipes, mealPlans, reservations,
    addItem, updateItem, setItemLocationQty, deleteItem,
    addGrocery, updateGrocery, deleteGrocery, setGroceryBought, putAway,
    addRecipe, updateRecipe, deleteRecipe,
    addMealPlan, deleteMealPlan,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// ---------- Helpers ----------
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

async function autoCookPastMeals(uid, mealPlans, items, recipes) {
  const today = todayISO()
  const toCook = mealPlans.filter(p => !p.cooked && p.date < today)
  if (toCook.length === 0) return

  const batch = writeBatch(db)
  // Track stock changes across batch
  const stockDeltas = {} // itemId -> { location: -amount }

  for (const plan of toCook) {
    const recipe = recipes.find(r => r.id === plan.recipeId)
    if (!recipe) {
      batch.update(doc(db, 'mealPlans', plan.id), { cooked: true })
      continue
    }
    for (const ing of (recipe.ingredients || [])) {
      if (!ing.itemId) continue
      const item = items.find(i => i.id === ing.itemId)
      if (!item) continue
      let need = ing.quantity || 0
      const workingStock = { ...(item.stock || {}), ...(stockDeltas[ing.itemId] || {}) }
      for (const loc of DRAIN_ORDER) {
        if (need <= 0) break
        const have = workingStock[loc] || 0
        if (have <= 0) continue
        const take = Math.min(have, need)
        workingStock[loc] = have - take
        need -= take
      }
      // Clean zeros
      for (const loc of Object.keys(workingStock)) {
        if (workingStock[loc] === 0) delete workingStock[loc]
      }
      stockDeltas[ing.itemId] = workingStock
    }
    batch.update(doc(db, 'mealPlans', plan.id), { cooked: true })
  }

  for (const [itemId, stock] of Object.entries(stockDeltas)) {
    batch.update(doc(db, 'items', itemId), { stock })
  }

  try {
    await batch.commit()
  } catch (e) {
    console.error('Auto-cook failed:', e)
  }
}

/**
 * Reconcile grocery list against meal plan needs.
 * For each ingredient across uncooked plans, sum needed quantity.
 * If (onHand + already-on-list-manual + already-on-list-auto) < needed, add auto entry.
 * If an existing 'meal:*' entry is no longer needed, remove it.
 */
async function reconcileGroceryList(uid, mealPlans, items, recipes, grocery) {
  const today = todayISO()
  const needs = {} // itemId -> total needed

  for (const plan of mealPlans) {
    if (plan.cooked || plan.date < today) continue
    const recipe = recipes.find(r => r.id === plan.recipeId)
    if (!recipe) continue
    for (const ing of (recipe.ingredients || [])) {
      if (!ing.itemId) continue
      needs[ing.itemId] = (needs[ing.itemId] || 0) + (ing.quantity || 0)
    }
  }

  const batch = writeBatch(db)
  let dirty = false

  for (const [itemId, needed] of Object.entries(needs)) {
    const item = items.find(i => i.id === itemId)
    if (!item) continue
    const onHand = Object.entries(item.stock || {})
      .filter(([loc]) => loc !== WAITING)
      .reduce((s, [, q]) => s + (q || 0), 0)
    const waiting = item.stock?.[WAITING] || 0
    const manualPending = grocery
      .filter(g => !g.bought && g.itemId === itemId && g.addedBy === 'manual')
      .reduce((s, g) => s + (g.quantity || 0), 0)
    const existingAuto = grocery.find(g => !g.bought && g.itemId === itemId && g.addedBy?.startsWith('meal'))

    const shortfall = needed - onHand - waiting - manualPending
    if (shortfall > 0) {
      if (existingAuto) {
        if (existingAuto.quantity !== shortfall) {
          batch.update(doc(db, 'grocery', existingAuto.id), { quantity: shortfall })
          dirty = true
        }
      } else {
        const ref = doc(collection(db, 'grocery'))
        batch.set(ref, {
          uid, itemId, name: item.name, unit: item.unit,
          quantity: shortfall, store: null,
          addedBy: 'meal:auto', bought: false, createdAt: serverTimestamp(),
        })
        dirty = true
      }
    } else if (existingAuto) {
      batch.delete(doc(db, 'grocery', existingAuto.id))
      dirty = true
    }
  }

  // Remove auto entries for items no longer needed at all
  for (const g of grocery) {
    if (g.bought || g.addedBy !== 'meal:auto') continue
    if (!needs[g.itemId]) {
      batch.delete(doc(db, 'grocery', g.id))
      dirty = true
    }
  }

  if (dirty) {
    try { await batch.commit() } catch (e) { console.error('Reconcile failed:', e) }
  }
}
