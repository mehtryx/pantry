import { WAITING } from './constants'

/**
 * Compute status for one item.
 * Returns: { onHand, incoming, reserved, status }
 *   status: 'green' | 'yellow' | 'red-under' | 'red-over' | 'neutral'
 */
export function computeItemStatus(item, groceryItems = [], reserved = 0) {
  const stock = item.stock || {}
  const waiting = stock[WAITING] || 0
  const onHand = Object.entries(stock)
    .filter(([loc]) => loc !== WAITING)
    .reduce((sum, [, q]) => sum + (q || 0), 0)

  const groceryPending = groceryItems
    .filter(g => !g.bought && g.itemId === item.id)
    .reduce((s, g) => s + (g.quantity || 0), 0)

  const incoming = waiting + groceryPending
  const onList = groceryItems.some(g => !g.bought && g.itemId === item.id)

  let status = 'neutral'
  if (reserved > 0 || onList) {
    if (onList && onHand >= reserved && onHand > 0) {
      // On list but stock alone already covers reserved needs
      status = 'red-over'
    } else if (onHand >= reserved) {
      status = 'green'
    } else if (onHand + incoming >= reserved) {
      status = 'yellow'
    } else {
      status = 'red-under'
    }
  } else if (onHand > 0) {
    status = 'green'
  }

  return { onHand, incoming, reserved, waiting, status, onList }
}

export const STATUS_COLORS = {
  green: 'bg-status-green status-dot',
  yellow: 'bg-status-yellow status-dot',
  'red-under': 'bg-status-redUnder status-dot',
  'red-over': 'bg-status-redOver status-dot',
  neutral: 'bg-subtle/30 status-dot',
}

export const STATUS_LABELS = {
  green: 'Stocked',
  yellow: 'On the way',
  'red-under': 'Need more',
  'red-over': 'Already have',
  neutral: 'Empty',
}
