export const LOCATIONS = [
  { id: 'kitchen_fridge', label: 'Kitchen Fridge' },
  { id: 'kitchen_freezer', label: 'Kitchen Freezer' },
  { id: 'basement_fridge', label: 'Basement Fridge' },
  { id: 'basement_freezer', label: 'Basement Freezer' },
  { id: 'basement_chest_freezer', label: 'Basement Chest Freezer' },
  { id: 'kitchen_pantry', label: 'Kitchen Pantry' },
  { id: 'dining_room_pantry', label: 'Dining Room Pantry' },
  { id: 'waiting_to_be_stored', label: 'Waiting to be Stored' },
]

export const STORAGE_LOCATIONS = LOCATIONS.filter(l => l.id !== 'waiting_to_be_stored')
export const WAITING = 'waiting_to_be_stored'

export function locationLabel(id) {
  return LOCATIONS.find(l => l.id === id)?.label ?? id
}

export const UNITS = ['g', 'kg', 'mL', 'L', 'cup', 'tbsp', 'tsp', 'count', 'package']

// Drain order for auto-cooking: kitchen first (easier to grab), then basement
export const DRAIN_ORDER = [
  'kitchen_fridge',
  'kitchen_pantry',
  'dining_room_pantry',
  'kitchen_freezer',
  'basement_fridge',
  'basement_freezer',
  'basement_chest_freezer',
]

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner']
