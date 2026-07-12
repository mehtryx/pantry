import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db, auth, initAuth, ensureHouseholdMembership, householdIdForEmail } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { WAITING, DEFAULT_STORAGE_LOCATIONS, buildLocationLookup, fullLocationList } from '../lib/constants'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

export function DataProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [storageLocations, setStorageLocations] = useState(DEFAULT_STORAGE_LOCATIONS)
  const [ready, setReady] = useState(false)
  const [items, setItems] = useState([])
  const [grocery, setGrocery] = useState([])
  const [recipes, setRecipes] = useState([])
  const [mealPlans, setMealPlans] = useState([])

  useEffect(() => {
    initAuth().catch(err => {
      console.error('Auth failed:', err)
      setAuthError(err)
    })
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u)
    })
    return unsub
  }, [])

  // Whenever user changes: derive household ID and ensure membership
  useEffect(() => {
    if (!user) return
    if (user.isAnonymous) {
      setHouseholdId(null)
      return
    }
    const hid = householdIdForEmail(user.email)

    let cancelled = false
    ;(async () => {
      try {
        await ensureHouseholdMembership(user)
        if (cancelled) return
        setHouseholdId(hid)
      } catch (err) {
        console.error('Household setup failed:', err)
      }
    })()

    return () => { cancelled = true }
  }, [user])

  // Subscribe to collections scoped by household. If not yet in a household
  // (anonymous), don't subscribe at all — the sign-in gate blocks the app.
  useEffect(() => {
    if (!user || !householdId) {
      setItems([]); setGrocery([]); setRecipes([]); setMealPlans([])
      setStorageLocations(DEFAULT_STORAGE_LOCATIONS)
      setReady(!!user)
      return
    }

    const scoped = [where('householdId', '==', householdId)]

    // Household doc — for shared settings like storage locations
    const unsubHousehold = onSnapshot(doc(db, 'households', householdId), snap => {
      if (!snap.exists()) return
      const data = snap.data()
      if (Array.isArray(data.locations) && data.locations.length > 0) {
        setStorageLocations(data.locations)
      } else {
        // First run under v0.8: seed defaults into the household doc.
        // Any concurrent writer will just overwrite with the same values.
        updateDoc(doc(db, 'households', householdId), {
          locations: DEFAULT_STORAGE_LOCATIONS,
        }).catch(err => console.warn('Failed to seed default locations:', err))
        setStorageLocations(DEFAULT_STORAGE_LOCATIONS)
      }
    })

    const unsubs = [
      unsubHousehold,
      onSnapshot(query(collection(db, 'items'), ...scoped),
        snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'grocery'), ...scoped),
        snap => setGrocery(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'recipes'), ...scoped),
        snap => setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'mealPlans'), ...scoped),
        snap => {
          setMealPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })))
          setReady(true)
        }),
    ]

    return () => unsubs.forEach(u => u())
  }, [user, householdId])

  // Auto-cook meals whose date has passed
  useEffect(() => {
    if (!ready || !user) return
    autoCookPastMeals(householdId, user.uid, mealPlans, items, recipes, storageLocations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mealPlans.length, items.length, recipes.length])

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

  // Every write gets tagged with the household ID
  const scopeFields = () => ({ householdId })

  async function addItem({ name, unit, location, quantity }) {
    const stock = { [location]: Number(quantity) || 0 }
    const ref = await addDoc(collection(db, 'items'), {
      ...scopeFields(),
      name: name.trim(), unit, stock, stores: [],
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

  async function addGrocery({ itemId, name, unit, quantity, store }) {
    await addDoc(collection(db, 'grocery'), {
      ...scopeFields(),
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

  async function setGroceryBought(id, bought) {
    const g = grocery.find(x => x.id === id)
    if (!g) return
    if (bought === g.bought) return

    const batch = writeBatch(db)

    if (bought) {
      let itemId = g.itemId
      if (!itemId) {
        const newRef = doc(collection(db, 'items'))
        batch.set(newRef, {
          ...scopeFields(),
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

  async function addRecipe({ name, ingredients }) {
    const ref = await addDoc(collection(db, 'recipes'), {
      ...scopeFields(), name: name.trim(), ingredients, createdAt: serverTimestamp()
    })
    return ref.id
  }
  async function updateRecipe(id, patch) {
    await updateDoc(doc(db, 'recipes', id), patch)
  }
  async function deleteRecipe(id) {
    await deleteDoc(doc(db, 'recipes', id))
  }

  async function addMealPlan({ date, slot, recipeId }) {
    const ref = await addDoc(collection(db, 'mealPlans'), {
      ...scopeFields(), date, slot, recipeId, cooked: false, createdAt: serverTimestamp()
    })
    await reconcileGroceryList(scopeFields(), [...mealPlans, { id: ref.id, date, slot, recipeId, cooked: false }], items, recipes, grocery)
    return ref.id
  }

  async function deleteMealPlan(id) {
    await deleteDoc(doc(db, 'mealPlans', id))
    const remaining = mealPlans.filter(p => p.id !== id)
    await reconcileGroceryList(scopeFields(), remaining, items, recipes, grocery)
  }

  // ---------- Location Management ----------

  async function renameLocation(id, newLabel) {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    const next = storageLocations.map(l => l.id === id ? { ...l, label: trimmed } : l)
    await updateDoc(doc(db, 'households', householdId), { locations: next })
  }

  async function addLocation(label, id) {
    const trimmed = label.trim()
    if (!trimmed) return
    // Ensure unique ID
    let candidate = id
    const existing = new Set(storageLocations.map(l => l.id))
    if (existing.has(candidate)) {
      let n = 2
      while (existing.has(`${candidate}_${n}`)) n++
      candidate = `${candidate}_${n}`
    }
    const next = [...storageLocations, { id: candidate, label: trimmed }]
    await updateDoc(doc(db, 'households', householdId), { locations: next })
  }

  async function reorderLocations(orderedIds) {
    const byId = Object.fromEntries(storageLocations.map(l => [l.id, l]))
    const next = orderedIds.map(id => byId[id]).filter(Boolean)
    await updateDoc(doc(db, 'households', householdId), { locations: next })
  }

  /**
   * Delete a location. Any stock currently at that location gets moved to
   * "Waiting to be Stored" so it's not orphaned.
   */
  async function deleteLocation(id) {
    const next = storageLocations.filter(l => l.id !== id)
    const batch = writeBatch(db)
    batch.update(doc(db, 'households', householdId), { locations: next })

    // Sweep every item: if it has stock at the deleted location, move to WAITING
    for (const item of items) {
      const qty = item.stock?.[id] || 0
      if (qty <= 0) continue
      const newStock = { ...item.stock }
      delete newStock[id]
      newStock[WAITING] = (newStock[WAITING] || 0) + qty
      batch.update(doc(db, 'items', item.id), { stock: newStock, updatedAt: serverTimestamp() })
    }
    await batch.commit()
  }

  const value = {
    user, ready, authError, clearAuthError: () => setAuthError(null),
    householdId,
    storageLocations,
    locationLookup: buildLocationLookup(storageLocations),
    allLocations: fullLocationList(storageLocations),
    items, grocery, recipes, mealPlans, reservations,
    addItem, updateItem, setItemLocationQty, deleteItem,
    addGrocery, updateGrocery, deleteGrocery, setGroceryBought, putAway,
    addRecipe, updateRecipe, deleteRecipe,
    addMealPlan, deleteMealPlan,
    renameLocation, addLocation, reorderLocations, deleteLocation,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/**
 * Auto-cook meals whose date has passed, draining stock from locations in
 * DRAIN_ORDER. Runs opportunistically whenever the app loads with pending
 * past meals.
 */
async function autoCookPastMeals(householdId, uid, mealPlans, items, recipes, storageLocations) {
  const today = todayISO()
  const toCook = mealPlans.filter(p => !p.cooked && p.date < today)
  if (toCook.length === 0) return

  const drainOrder = (storageLocations || []).map(l => l.id)

  const batch = writeBatch(db)
  const stockDeltas = {}

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
      for (const loc of drainOrder) {
        if (need <= 0) break
        const have = workingStock[loc] || 0
        if (have <= 0) continue
        const take = Math.min(have, need)
        workingStock[loc] = have - take
        need -= take
      }
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

async function reconcileGroceryList(scope, mealPlans, items, recipes, grocery) {
  const today = todayISO()
  const needs = {}

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
          ...scope, itemId, name: item.name, unit: item.unit,
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
