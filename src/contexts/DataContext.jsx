import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, serverTimestamp, writeBatch, runTransaction,
  increment, deleteField, getDoc
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

  // Auto-cook meals whose date has passed. Runs on mount, when the page
  // becomes visible again (PWA resumed from background), and on a periodic
  // interval so the app rolls over correctly if left open past midnight.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTick(t => t + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    const iv = setInterval(() => setTick(t => t + 1), 5 * 60 * 1000) // every 5 min
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(iv)
    }
  }, [])

  useEffect(() => {
    if (!ready || !user) return
    autoCookPastMeals(householdId, user.uid, mealPlans, items, recipes, storageLocations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mealPlans.length, items.length, recipes.length, tick])

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
    const stock = {}
    if (location && (Number(quantity) || 0) > 0) {
      stock[location] = Number(quantity)
    }
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
    const current = item.stock?.[location] || 0
    const target = Math.max(0, Number(quantity) || 0)
    const delta = target - current
    if (delta === 0) return
    const update = { updatedAt: serverTimestamp() }
    // Use increment() so a concurrent edit to a DIFFERENT location key doesn't
    // get clobbered. If target is 0, also remove the field for cleanliness.
    update[`stock.${location}`] = increment(delta)
    await updateDoc(doc(db, 'items', id), update)
    // If we drove it to zero and want to clean the stale field, run a follow-up.
    // We don't strictly need this; the field is fine at 0. Leaving it alone.
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

    await runTransaction(db, async (tx) => {
      const groceryRef = doc(db, 'grocery', id)
      const gSnap = await tx.get(groceryRef)
      if (!gSnap.exists()) return
      const gCurrent = gSnap.data()
      // Idempotent guard: if someone else already flipped it, don't double-apply.
      if (gCurrent.bought === bought) return

      if (bought) {
        let itemId = gCurrent.itemId
        if (!itemId) {
          // Grocery entry wasn't linked to a pantry item — create one now.
          const newRef = doc(collection(db, 'items'))
          tx.set(newRef, {
            ...scopeFields(),
            name: gCurrent.name,
            unit: gCurrent.unit,
            stock: { [WAITING]: gCurrent.quantity || 0 },
            stores: gCurrent.store ? [gCurrent.store] : [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          itemId = newRef.id
          tx.update(groceryRef, { bought: true, itemId })
        } else {
          // Atomic increment — safe against concurrent writes to the same item
          tx.update(doc(db, 'items', itemId), {
            [`stock.${WAITING}`]: increment(gCurrent.quantity || 0),
            updatedAt: serverTimestamp(),
          })
          tx.update(groceryRef, { bought: true })
        }
      } else {
        // Un-mark: subtract quantity from WAITING, but never below zero.
        if (gCurrent.itemId) {
          const itemSnap = await tx.get(doc(db, 'items', gCurrent.itemId))
          const currentWaiting = itemSnap.data()?.stock?.[WAITING] || 0
          const actualSubtract = Math.min(gCurrent.quantity || 0, currentWaiting)
          tx.update(doc(db, 'items', gCurrent.itemId), {
            [`stock.${WAITING}`]: increment(-actualSubtract),
            updatedAt: serverTimestamp(),
          })
        }
        tx.update(groceryRef, { bought: false })
      }
    })
  }

  async function putAway(itemId, targetLocation, quantity) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const waiting = item.stock?.[WAITING] || 0
    const moveQty = Math.min(Number(quantity) || 0, waiting)
    if (moveQty <= 0) return

    // Atomic: subtract from WAITING and add to target in one write.
    // A concurrent putAway of the SAME item into a DIFFERENT target won't lose.
    // A concurrent putAway of the SAME item into the SAME target adds both.
    // The only remaining race is if two putAways collectively subtract more
    // than WAITING has, which would drive WAITING negative. Guard with a
    // transaction to check-then-decrement.
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(doc(db, 'items', itemId))
      if (!snap.exists()) return
      const currentWaiting = snap.data().stock?.[WAITING] || 0
      const actualMove = Math.min(moveQty, currentWaiting)
      if (actualMove <= 0) return
      tx.update(doc(db, 'items', itemId), {
        [`stock.${WAITING}`]: increment(-actualMove),
        [`stock.${targetLocation}`]: increment(actualMove),
        updatedAt: serverTimestamp(),
      })
    })
  }

  async function addRecipe({ name, ingredients }) {
    const ref = await addDoc(collection(db, 'recipes'), {
      ...scopeFields(),
      name: name.trim(),
      ingredients: ingredients || [],
      // Phase 3 UI fields — stored but not yet edited
      servings: null,
      notes: null,
      prepMinutes: null,
      cookMinutes: null,
      tags: [],
      photoUrl: null,
      isLeftover: false,
      createdAt: serverTimestamp(),
    })
    return ref.id
  }

  async function updateRecipe(id, patch) {
    await updateDoc(doc(db, 'recipes', id), patch)
    // If ingredients changed, delete past uncooked plans referencing this recipe
    // (they'd have stale expected reservations)
    if (patch.ingredients) {
      const today = todayISO()
      const stale = mealPlans.filter(p => p.recipeId === id && !p.cooked && p.date < today)
      if (stale.length > 0) {
        const batch = writeBatch(db)
        for (const p of stale) batch.delete(doc(db, 'mealPlans', p.id))
        await batch.commit()
      }
    }
  }

  async function duplicateRecipe(id) {
    const src = recipes.find(r => r.id === id)
    if (!src) return null
    const ref = await addDoc(collection(db, 'recipes'), {
      ...scopeFields(),
      name: `${src.name} (copy)`,
      ingredients: src.ingredients || [],
      servings: src.servings ?? null,
      notes: src.notes ?? null,
      prepMinutes: src.prepMinutes ?? null,
      cookMinutes: src.cookMinutes ?? null,
      tags: src.tags || [],
      photoUrl: src.photoUrl ?? null,
      isLeftover: false,
      createdAt: serverTimestamp(),
    })
    return ref.id
  }

  /**
   * Delete a recipe, but block if any uncooked (current or future) meal plans
   * still reference it. Returns { ok: true } on success, or { ok: false, blockers: [...] }
   * with a list of plan descriptions.
   */
  async function deleteRecipe(id) {
    const today = todayISO()
    const blockers = mealPlans
      .filter(p => p.recipeId === id && !p.cooked && p.date >= today)
      .map(p => ({ id: p.id, date: p.date, slot: p.slot }))
    if (blockers.length > 0) {
      return { ok: false, blockers }
    }
    await deleteDoc(doc(db, 'recipes', id))
    return { ok: true }
  }

  async function addMealPlan({ date, slot, recipeId, leftoverText }) {
    const payload = {
      ...scopeFields(),
      date,
      slot,
      recipeId: recipeId || null,
      leftoverText: leftoverText || null,
      cooked: false,
      createdAt: serverTimestamp(),
    }
    const ref = await addDoc(collection(db, 'mealPlans'), payload)
    if (recipeId) {
      await reconcileGroceryList(scopeFields(), [...mealPlans, { id: ref.id, ...payload }], items, recipes, grocery)
    }
    return ref.id
  }

  async function deleteMealPlan(id) {
    await deleteDoc(doc(db, 'mealPlans', id))
    const remaining = mealPlans.filter(p => p.id !== id)
    await reconcileGroceryList(scopeFields(), remaining, items, recipes, grocery)
  }

  /**
   * Set per-ingredient location assignments for an uncooked meal plan.
   * `assignments` shape: { [itemId]: { [locationId]: quantity } }
   * Pass null/empty object to clear.
   */
  async function updateMealPlanAssignments(planId, assignments) {
    await updateDoc(doc(db, 'mealPlans', planId), {
      assignments: assignments && Object.keys(assignments).length > 0 ? assignments : deleteField(),
    })
  }

  // ---------- Location Management ----------
  // All of these read the current locations array from the household doc
  // inside a transaction, so concurrent renames/adds/reorders don't clobber
  // one another.

  async function renameLocation(id, newLabel) {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    const ref = doc(db, 'households', householdId)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      const cur = snap.data().locations || []
      const next = cur.map(l => l.id === id ? { ...l, label: trimmed } : l)
      tx.update(ref, { locations: next })
    })
  }

  async function addLocation(label, id) {
    const trimmed = label.trim()
    if (!trimmed) return
    const ref = doc(db, 'households', householdId)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      const cur = snap.data().locations || []
      const existing = new Set(cur.map(l => l.id))
      let candidate = id
      if (existing.has(candidate)) {
        let n = 2
        while (existing.has(`${candidate}_${n}`)) n++
        candidate = `${candidate}_${n}`
      }
      const next = [...cur, { id: candidate, label: trimmed }]
      tx.update(ref, { locations: next })
    })
  }

  async function reorderLocations(orderedIds) {
    const ref = doc(db, 'households', householdId)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      const cur = snap.data().locations || []
      const byId = Object.fromEntries(cur.map(l => [l.id, l]))
      const next = orderedIds.map(id => byId[id]).filter(Boolean)
      tx.update(ref, { locations: next })
    })
  }

  /**
   * Delete a location. Any stock currently at that location gets moved to
   * "Waiting to be Stored" so it's not orphaned. Uses a transaction on the
   * household doc; per-item stock updates use atomic increments so concurrent
   * putAway/increment writes are safe.
   */
  async function deleteLocation(id) {
    const ref = doc(db, 'households', householdId)

    // Update household locations transactionally
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      const cur = snap.data().locations || []
      const next = cur.filter(l => l.id !== id)
      tx.update(ref, { locations: next })
    })

    // Move stock from the deleted location to WAITING for each affected item.
    // These are separate updates using atomic increments — safe against other
    // concurrent stock changes.
    const affected = items.filter(item => (item.stock?.[id] || 0) > 0)
    for (const item of affected) {
      const qty = item.stock[id]
      await updateDoc(doc(db, 'items', item.id), {
        [`stock.${id}`]: deleteField(),
        [`stock.${WAITING}`]: increment(qty),
        updatedAt: serverTimestamp(),
      })
    }
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
    addRecipe, updateRecipe, deleteRecipe, duplicateRecipe,
    addMealPlan, deleteMealPlan, updateMealPlanAssignments,
    renameLocation, addLocation, reorderLocations, deleteLocation,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/**
 * Auto-cook meals whose date has passed. Each meal is cooked in its own
 * transaction to prevent double-cook races (two devices seeing the same
 * uncooked meal, both draining stock). The transaction re-checks the
 * `cooked` flag and aborts if another writer already marked it.
 *
 * Draw order:
 *   1. If the plan has per-ingredient `assignments`, drain those specified
 *      amounts from those specified locations first.
 *   2. Any remaining shortfall drains from the household's location order
 *      (matches the display order from Settings → Locations).
 */
async function autoCookPastMeals(householdId, uid, mealPlans, items, recipes, storageLocations) {
  const today = todayISO()
  const toCook = mealPlans.filter(p => !p.cooked && p.date < today)
  if (toCook.length === 0) return

  const drainOrder = (storageLocations || []).map(l => l.id)

  // Cook each meal in its own transaction. If someone else already cooked
  // it, our transaction just no-ops. If we win the race, we take the write.
  for (const plan of toCook) {
    try {
      await runTransaction(db, async (tx) => {
        const planRef = doc(db, 'mealPlans', plan.id)
        const planSnap = await tx.get(planRef)
        if (!planSnap.exists()) return
        const planData = planSnap.data()
        if (planData.cooked) return // someone beat us to it — abort cleanly

        const recipe = planData.recipeId ? recipes.find(r => r.id === planData.recipeId) : null
        if (!recipe) {
          // Leftover or orphaned recipe reference — just mark cooked
          tx.update(planRef, { cooked: true })
          return
        }

        // Read every ingredient item fresh inside the transaction so we
        // deduct from actual current stock, not stale client state.
        const itemDeductions = {} // itemId -> { location: amountToDeduct }
        const assignments = planData.assignments || {}

        for (const ing of (recipe.ingredients || [])) {
          if (!ing.itemId) continue
          const itemRef = doc(db, 'items', ing.itemId)
          const itemSnap = await tx.get(itemRef)
          if (!itemSnap.exists()) continue
          const currentStock = itemSnap.data().stock || {}

          let need = ing.quantity || 0
          const deducts = itemDeductions[ing.itemId] || {}
          const workingStock = { ...currentStock }
          // Fold in any deductions we've already queued for this same item
          for (const [loc, amount] of Object.entries(deducts)) {
            workingStock[loc] = (workingStock[loc] || 0) - amount
          }

          // 1) Apply user assignments first
          const asn = assignments[ing.itemId] || {}
          for (const [loc, requested] of Object.entries(asn)) {
            if (need <= 0) break
            const available = workingStock[loc] || 0
            const take = Math.min(available, requested, need)
            if (take > 0) {
              deducts[loc] = (deducts[loc] || 0) + take
              workingStock[loc] -= take
              need -= take
            }
          }

          // 2) Fall back to default drain order for remaining shortfall
          for (const loc of drainOrder) {
            if (need <= 0) break
            const have = workingStock[loc] || 0
            if (have <= 0) continue
            const take = Math.min(have, need)
            deducts[loc] = (deducts[loc] || 0) + take
            workingStock[loc] -= take
            need -= take
          }

          itemDeductions[ing.itemId] = deducts
        }

        // Apply the deductions using atomic decrements
        for (const [itemId, deducts] of Object.entries(itemDeductions)) {
          const update = { updatedAt: serverTimestamp() }
          for (const [loc, amount] of Object.entries(deducts)) {
            if (amount > 0) update[`stock.${loc}`] = increment(-amount)
          }
          if (Object.keys(update).length > 1) {
            tx.update(doc(db, 'items', itemId), update)
          }
        }

        // Mark cooked with snapshot
        tx.update(planRef, {
          cooked: true,
          snapshot: {
            recipeName: recipe.name,
            ingredients: recipe.ingredients || [],
          },
        })
      })
    } catch (e) {
      console.error(`Auto-cook failed for plan ${plan.id}:`, e)
    }
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
