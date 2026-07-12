// Special protected location — always exists, cannot be renamed or deleted.
// Used by the grocery→put-away flow.
export const WAITING = 'waiting_to_be_stored'
export const WAITING_LABEL = 'Waiting to be Stored'

// Default storage locations — seeded into the household on first run.
// After that, storage locations are user-editable and live in
// households/{domain}.locations.
export const DEFAULT_STORAGE_LOCATIONS = [
  { id: 'kitchen_fridge',         label: 'Kitchen Fridge' },
  { id: 'kitchen_freezer',        label: 'Kitchen Freezer' },
  { id: 'basement_fridge',        label: 'Basement Fridge' },
  { id: 'basement_freezer',       label: 'Basement Freezer' },
  { id: 'basement_chest_freezer', label: 'Basement Chest Freezer' },
  { id: 'kitchen_pantry',         label: 'Kitchen Pantry' },
  { id: 'dining_room_pantry',     label: 'Dining Room Pantry' },
]

/**
 * Given the household's storage locations array (or falling back to defaults),
 * return a lookup object { id → label } that also includes WAITING.
 */
export function buildLocationLookup(storageLocations) {
  const map = { [WAITING]: WAITING_LABEL }
  for (const l of (storageLocations || DEFAULT_STORAGE_LOCATIONS)) {
    map[l.id] = l.label
  }
  return map
}

/**
 * Full list including WAITING, in display order (storage locations first).
 * Used by filter dropdowns that need every possible location.
 */
export function fullLocationList(storageLocations) {
  const arr = (storageLocations || DEFAULT_STORAGE_LOCATIONS).map(l => ({ ...l }))
  arr.push({ id: WAITING, label: WAITING_LABEL })
  return arr
}

/** Generate a stable-ish ID from a user-entered label. */
export function locationIdFromLabel(label) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return base || `loc_${Date.now()}`
}

export const UNITS = ['g', 'kg', 'mL', 'L', 'cup', 'tbsp', 'tsp', 'count', 'package']

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner']

// Default departments — seeded into the household on first run.
// Order here is the initial sort order; users can reorder from Settings.
export const DEFAULT_DEPARTMENTS = [
  { id: 'produce',     label: 'Produce' },
  { id: 'meat_seafood', label: 'Meat & Seafood' },
  { id: 'dairy_eggs',  label: 'Dairy & Eggs' },
  { id: 'frozen',      label: 'Frozen' },
  { id: 'bakery',      label: 'Bakery' },
  { id: 'deli',        label: 'Deli' },
  { id: 'pantry_dry',  label: 'Pantry' },
  { id: 'beverages',   label: 'Beverages' },
  { id: 'snacks',      label: 'Snacks' },
  { id: 'household',   label: 'Household' },
  { id: 'other',       label: 'Other' },
]

/** Generate a stable-ish ID from a user-entered label. */
export function departmentIdFromLabel(label) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return base || `dept_${Date.now()}`
}

/** Look up a department label by id, falling back to the id itself. */
export function buildDepartmentLookup(departments) {
  const map = {}
  for (const d of (departments || DEFAULT_DEPARTMENTS)) {
    map[d.id] = d.label
  }
  return map
}

const SPACED_UNITS = new Set(['cup', 'count', 'package'])

export function formatQty(quantity, unit) {
  const q = quantity ?? ''
  if (!unit) return String(q)
  return SPACED_UNITS.has(unit) ? `${q} ${unit}` : `${q}${unit}`
}
