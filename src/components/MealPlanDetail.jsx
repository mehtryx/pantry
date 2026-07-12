import { useState, useEffect, useMemo } from 'react'
import { X, ChevronDown, ChevronRight, RotateCcw, Trash2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { WAITING, formatQty } from '../lib/constants'
import { Modal, Button, Card } from './UI'

/**
 * Detail view for a single uncooked meal plan.
 * Shows recipe ingredients and lets the user assign per-location sources
 * that override the default drain order at auto-cook time.
 */
export default function MealPlanDetail({ plan, onClose, onDelete }) {
  const { recipes, items, storageLocations, locationLookup, updateMealPlanAssignments } = useData()
  const [assignments, setAssignments] = useState({})
  const [expanded, setExpanded] = useState(new Set())
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (plan) {
      setAssignments(plan.assignments ? deepClone(plan.assignments) : {})
      setExpanded(new Set())
      setDirty(false)
    }
  }, [plan?.id])

  const recipe = plan ? recipes.find(r => r.id === plan.recipeId) : null

  function toggleExpand(itemId) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function setAssignment(itemId, locationId, quantity) {
    setDirty(true)
    setAssignments(prev => {
      const next = deepClone(prev)
      if (!next[itemId]) next[itemId] = {}
      const q = Math.max(0, Number(quantity) || 0)
      if (q === 0) delete next[itemId][locationId]
      else next[itemId][locationId] = q
      if (Object.keys(next[itemId]).length === 0) delete next[itemId]
      return next
    })
  }

  function clearIngredientAssignment(itemId) {
    setDirty(true)
    setAssignments(prev => {
      const next = deepClone(prev)
      delete next[itemId]
      return next
    })
  }

  async function save() {
    await updateMealPlanAssignments(plan.id, assignments)
    setDirty(false)
    onClose()
  }

  if (!plan) return null

  const title = recipe?.name || (plan.leftoverText ? `Leftover ${plan.leftoverText}` : '(deleted recipe)')

  return (
    <Modal open={!!plan} onClose={onClose} title={title} wide>
      <div className="space-y-3">
        <div className="text-xs text-muted">
          {new Date(plan.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          {' · '}
          {plan.slot.charAt(0).toUpperCase() + plan.slot.slice(1)}
        </div>

        {plan.leftoverText ? (
          <div className="text-sm text-muted">
            Leftovers don&apos;t reserve or consume pantry stock.
          </div>
        ) : !recipe ? (
          <div className="text-sm text-danger">
            This recipe has been deleted. Delete this meal plan.
          </div>
        ) : (
          <>
            <div className="text-sm text-muted">
              For each ingredient, tap to expand and choose which locations to draw from.
              Anything you don&apos;t assign will be drawn in your default location order at cook time.
            </div>

            <ul className="space-y-2">
              {(recipe.ingredients || []).map((ing, i) => (
                <IngredientRow
                  key={`${ing.itemId || 'x'}:${i}`}
                  ingredient={ing}
                  items={items}
                  storageLocations={storageLocations}
                  locationLookup={locationLookup}
                  assignment={assignments[ing.itemId] || {}}
                  expanded={expanded.has(ing.itemId)}
                  onToggleExpand={() => toggleExpand(ing.itemId)}
                  onSetAssignment={(loc, q) => setAssignment(ing.itemId, loc, q)}
                  onClearAssignment={() => clearIngredientAssignment(ing.itemId)}
                />
              ))}
            </ul>
          </>
        )}

        <div className="flex gap-2 pt-3 border-t border-border">
          <Button variant="danger" onClick={() => { onDelete(plan.id); onClose() }} size="sm">
            <Trash2 className="w-4 h-4" /> Remove
          </Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose} size="sm">
            {dirty ? 'Discard' : 'Close'}
          </Button>
          {dirty && recipe && (
            <Button onClick={save} size="sm">Save</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function IngredientRow({ ingredient, items, storageLocations, locationLookup, assignment, expanded, onToggleExpand, onSetAssignment, onClearAssignment }) {
  const item = items.find(i => i.id === ingredient.itemId)
  const needed = ingredient.quantity || 0
  const unit = ingredient.unit

  // Locations with stock (in display order, then WAITING at the end)
  const availableLocations = useMemo(() => {
    if (!item) return []
    const list = storageLocations
      .map(l => ({ id: l.id, label: l.label, qty: item.stock?.[l.id] || 0 }))
      .filter(l => l.qty > 0)
    const waitingQty = item.stock?.[WAITING] || 0
    if (waitingQty > 0) {
      list.push({ id: WAITING, label: 'Waiting to be Stored', qty: waitingQty })
    }
    return list
  }, [item, storageLocations])

  const totalAvailable = availableLocations.reduce((s, l) => s + l.qty, 0)
  const assignedTotal = Object.values(assignment).reduce((s, q) => s + (q || 0), 0)
  const hasAnyAssignment = Object.keys(assignment).length > 0
  const shortfall = needed - Math.max(assignedTotal, Math.min(totalAvailable, needed))

  let statusLabel
  let statusClass
  if (!item) {
    statusLabel = 'Missing'
    statusClass = 'text-danger'
  } else if (hasAnyAssignment) {
    statusLabel = `${formatQty(assignedTotal, unit)} / ${formatQty(needed, unit)} assigned`
    statusClass = assignedTotal >= needed ? 'text-body' : 'text-warn'
  } else if (totalAvailable >= needed) {
    statusLabel = 'Auto (in stock)'
    statusClass = 'text-muted'
  } else if (totalAvailable > 0) {
    statusLabel = `Auto — short ${formatQty(needed - totalAvailable, unit)}`
    statusClass = 'text-warn'
  } else {
    statusLabel = 'Not in stock'
    statusClass = 'text-danger'
  }

  return (
    <li>
      <Card className="p-3">
        <button
          className="w-full flex items-center gap-2 text-left"
          onClick={onToggleExpand}
          disabled={!item}
        >
          {expanded
            ? <ChevronDown className="w-4 h-4 text-subtle flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-subtle flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-body truncate">
              {ingredient.name} <span className="text-subtle">· {formatQty(needed, unit)}</span>
            </div>
            <div className={`text-xs ${statusClass}`}>{statusLabel}</div>
          </div>
        </button>

        {expanded && item && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            {availableLocations.length === 0 ? (
              <div className="text-xs text-muted text-center py-2">
                No stock in any location.
              </div>
            ) : (
              <>
                {availableLocations.map(loc => (
                  <LocationAssignRow
                    key={loc.id}
                    location={loc}
                    unit={unit}
                    assigned={assignment[loc.id] || 0}
                    onChange={q => onSetAssignment(loc.id, q)}
                  />
                ))}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted">
                    Assigned: <strong className={assignedTotal >= needed ? 'text-body' : 'text-warn'}>
                      {formatQty(assignedTotal, unit)}
                    </strong> of {formatQty(needed, unit)}
                  </span>
                  {hasAnyAssignment && (
                    <button
                      onClick={onClearAssignment}
                      className="text-subtle hover:text-body flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset to auto
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </li>
  )
}

function LocationAssignRow({ location, unit, assigned, onChange }) {
  const [val, setVal] = useState(String(assigned))
  useEffect(() => { setVal(String(assigned)) }, [assigned])

  function commit() {
    const n = Math.min(Number(val) || 0, location.qty)
    onChange(n)
    setVal(String(n))
  }

  function takeAll() {
    onChange(location.qty)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-body truncate">{location.label}</div>
        <div className="text-xs text-subtle">available: {formatQty(location.qty, unit)}</div>
      </div>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max={location.qty}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { commit(); e.target.blur() } }}
        className="w-20 px-2 py-1.5 rounded-lg border border-border bg-bg text-center text-sm"
      />
      <button
        onClick={takeAll}
        className="text-xs text-primary hover:underline whitespace-nowrap"
        title="Assign all available"
      >
        all
      </button>
    </div>
  )
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}
