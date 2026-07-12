import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, BookOpen, History, Calendar, Plus, X, ChevronDown, Trash2, Search } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { todayISO } from '../contexts/DataContext'
import { MEAL_SLOTS } from '../lib/constants'
import { computeItemStatus } from '../lib/status'
import { Button, Input, Card, Modal, EmptyState } from '../components/UI'

const SLOT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

export default function MealsPage() {
  const navigate = useNavigate()
  const { mealPlans, recipes, items, grocery, reservations, addMealPlan, deleteMealPlan } = useData()
  const [daysShown, setDaysShown] = useState(9)
  const [picker, setPicker] = useState(null) // { date, slot } when adding
  const [showHistory, setShowHistory] = useState(false)

  const today = todayISO()

  // Build the day list starting from today
  const days = useMemo(() => {
    const arr = []
    const start = new Date(today + 'T00:00:00')
    for (let i = 0; i < daysShown; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      arr.push({
        iso,
        date: d,
        isToday: iso === today,
      })
    }
    return arr
  }, [daysShown, today])

  // Group upcoming meal plans by date+slot
  const plansByDay = useMemo(() => {
    const map = {}
    for (const p of mealPlans) {
      if (p.cooked) continue
      if (p.date < today) continue
      const key = `${p.date}:${p.slot}`
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [mealPlans, today])

  // Ref to today's card for the "Today" jump button
  const todayRef = useRef(null)
  function jumpToToday() {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="pt-0">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-border safe-top">
        <div className="px-4 py-3 flex items-center gap-2">
          <h1 className="text-xl font-semibold text-body flex-1">Meals</h1>
          <button
            onClick={jumpToToday}
            className="text-muted hover:text-body p-2 rounded-lg active:bg-surface2"
            title="Today"
            aria-label="Today"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="text-muted hover:text-body p-2 rounded-lg active:bg-surface2"
            title="History"
            aria-label="History"
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/recipes')}
            className="text-muted hover:text-body p-2 rounded-lg active:bg-surface2"
            title="Recipes"
            aria-label="Recipes"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {days.map(day => (
          <DayCard
            key={day.iso}
            day={day}
            forwardRef={day.isToday ? todayRef : null}
            plansByDay={plansByDay}
            recipes={recipes}
            items={items}
            grocery={grocery}
            reservations={reservations}
            onAdd={(slot) => setPicker({ date: day.iso, slot })}
            onDelete={deleteMealPlan}
          />
        ))}

        <div className="pt-2">
          <Button variant="secondary" onClick={() => setDaysShown(n => n + 7)} className="w-full">
            <ChevronDown className="w-4 h-4" /> Show more days
          </Button>
        </div>
      </div>

      <SlotPickerModal
        target={picker}
        onClose={() => setPicker(null)}
        recipes={recipes.filter(r => !r.isLeftover)}
        onPickRecipe={async (recipeId) => {
          await addMealPlan({ date: picker.date, slot: picker.slot, recipeId })
          setPicker(null)
        }}
        onAddLeftover={async (text) => {
          await addMealPlan({ date: picker.date, slot: picker.slot, leftoverText: text })
          setPicker(null)
        }}
      />

      <HistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  )
}

function DayCard({ day, forwardRef, plansByDay, recipes, items, grocery, reservations, onAdd, onDelete }) {
  const dayLabel = day.date.toLocaleDateString(undefined, { weekday: 'long' })
  const dateLabel = day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return (
    <div ref={forwardRef}>
      <Card className={`p-4 ${day.isToday ? 'border-primary' : ''}`}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-body">
            {day.isToday ? 'Today' : dayLabel}
          </h2>
          <span className="text-sm text-muted">{dateLabel}</span>
        </div>
        <div className="space-y-3">
          {MEAL_SLOTS.map(slot => (
            <SlotSection
              key={slot}
              slot={slot}
              plans={plansByDay[`${day.iso}:${slot}`] || []}
              recipes={recipes}
              items={items}
              grocery={grocery}
              reservations={reservations}
              onAdd={() => onAdd(slot)}
              onDelete={onDelete}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}

function SlotSection({ slot, plans, recipes, items, grocery, reservations, onAdd, onDelete }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted mb-1.5">
        {SLOT_LABELS[slot]}
      </div>
      <ul className="space-y-1.5">
        {plans.map(plan => (
          <PlanEntry
            key={plan.id}
            plan={plan}
            recipes={recipes}
            items={items}
            grocery={grocery}
            reservations={reservations}
            onDelete={() => onDelete(plan.id)}
          />
        ))}
      </ul>
      <button
        onClick={onAdd}
        className="mt-1.5 text-sm text-subtle hover:text-body active:bg-surface2 rounded-lg px-2 py-1 flex items-center gap-1"
      >
        <Plus className="w-3.5 h-3.5" /> Add
      </button>
    </div>
  )
}

function PlanEntry({ plan, recipes, items, grocery, reservations, onDelete }) {
  if (plan.leftoverText) {
    return (
      <li className="flex items-center gap-2 bg-surface2 rounded-lg px-2.5 py-2">
        <div className="w-2 h-2 rounded-full status-dot bg-subtle flex-shrink-0" />
        <span className="text-sm text-body flex-1">Leftover {plan.leftoverText}</span>
        <button onClick={onDelete} className="text-subtle hover:text-danger p-1" aria-label="Remove">
          <X className="w-3.5 h-3.5" />
        </button>
      </li>
    )
  }
  const recipe = recipes.find(r => r.id === plan.recipeId)
  const status = recipe ? computePlanStatus(recipe, items, grocery, reservations) : 'neutral'
  const dotClasses = {
    green: 'bg-status-green',
    yellow: 'bg-status-yellow',
    'red-under': 'bg-status-redUnder',
    neutral: 'bg-subtle/50',
  }
  return (
    <li className="flex items-center gap-2 bg-surface2 rounded-lg px-2.5 py-2">
      <div className={`w-2 h-2 rounded-full status-dot flex-shrink-0 ${dotClasses[status]}`} />
      <span className="text-sm text-body flex-1 truncate">
        {recipe?.name || <em className="text-subtle">(deleted recipe)</em>}
      </span>
      <button onClick={onDelete} className="text-subtle hover:text-danger p-1" aria-label="Remove">
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  )
}

/**
 * Compute status for a single planned meal: green if we have enough of every
 * ingredient on hand, yellow if grocery list covers the gap, red if short.
 */
function computePlanStatus(recipe, items, grocery, reservations) {
  let anyShort = false
  let coveredByGrocery = false
  for (const ing of (recipe.ingredients || [])) {
    if (!ing.itemId) continue
    const item = items.find(i => i.id === ing.itemId)
    if (!item) { anyShort = true; continue }
    const st = computeItemStatus(item, grocery, reservations[ing.itemId] || 0)
    if (st.status === 'red-under') anyShort = true
    else if (st.status === 'yellow') coveredByGrocery = true
  }
  if (anyShort) return 'red-under'
  if (coveredByGrocery) return 'yellow'
  return 'green'
}

function SlotPickerModal({ target, onClose, recipes, onPickRecipe, onAddLeftover }) {
  const [query, setQuery] = useState('')
  const [leftoverMode, setLeftoverMode] = useState(false)
  const [leftoverText, setLeftoverText] = useState('')

  useEffect(() => {
    if (target) {
      setQuery('')
      setLeftoverMode(false)
      setLeftoverText('')
    }
  }, [target])

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase()
    let list = recipes
    if (s) list = list.filter(r => r.name.toLowerCase().includes(s))
    return list.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 30)
  }, [recipes, query])

  if (!target) return null

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Add to ${SLOT_LABELS[target.slot]}`}
    >
      {leftoverMode ? (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted mb-1 block">Leftover description</label>
            <Input
              autoFocus
              value={leftoverText}
              onChange={e => setLeftoverText(e.target.value)}
              placeholder="e.g. Spaghetti, Pizza"
            />
            <p className="text-xs text-subtle mt-2">
              Displays as &quot;Leftover {leftoverText || '…'}&quot;. Doesn&apos;t affect pantry stock and auto-clears after the day passes.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setLeftoverMode(false)} className="flex-1">Back</Button>
            <Button onClick={() => onAddLeftover(leftoverText.trim())} disabled={!leftoverText.trim()} className="flex-1">
              Add
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => setLeftoverMode(true)}
            className="w-full text-left bg-primary/10 border border-primary/30 rounded-xl px-3 py-2.5 hover:bg-primary/20"
          >
            <div className="text-sm text-body font-medium">+ Add a leftover</div>
            <div className="text-xs text-muted">For when you&apos;re finishing off something already cooked</div>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search recipes…"
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-sm text-muted text-center py-6">
              {recipes.length === 0
                ? 'No recipes yet. Create one in the Recipes tab.'
                : 'No recipes match your search.'}
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto border border-border rounded-xl">
              {filtered.map(recipe => (
                <li key={recipe.id}>
                  <button
                    onClick={() => onPickRecipe(recipe.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-surface2 active:bg-surface2 border-b border-border last:border-b-0"
                  >
                    <div className="text-sm text-body">{recipe.name}</div>
                    <div className="text-xs text-subtle">
                      {recipe.ingredients?.length || 0} {(recipe.ingredients?.length === 1) ? 'ingredient' : 'ingredients'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}

function HistoryModal({ open, onClose }) {
  const { mealPlans, deleteMealPlan, addMealPlan } = useData()
  const [query, setQuery] = useState('')
  const [cookAgain, setCookAgain] = useState(null) // history entry to re-cook
  const [confirmPurge, setConfirmPurge] = useState(false)

  const today = todayISO()

  // Days boundary for delete restriction: 30 days ago
  const thirtyDaysAgoISO = useMemo(() => {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - 30)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [today])

  const historyEntries = useMemo(() => {
    const s = query.trim().toLowerCase()
    return mealPlans
      .filter(p => p.cooked)
      .filter(p => {
        const label = p.snapshot?.recipeName || p.leftoverText || ''
        if (s && !label.toLowerCase().includes(s)) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [mealPlans, query])

  const oldCount = mealPlans.filter(p => p.cooked && p.date < thirtyDaysAgoISO).length

  async function handlePurge() {
    // Delete every cooked plan older than 30 days
    const targets = mealPlans.filter(p => p.cooked && p.date < thirtyDaysAgoISO)
    for (const p of targets) await deleteMealPlan(p.id)
    setConfirmPurge(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Meal History" wide>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search history…"
            className="pl-9"
          />
        </div>

        {historyEntries.length === 0 ? (
          <EmptyState
            icon={History}
            title="No history yet"
            description="Cooked meals will appear here."
          />
        ) : (
          <ul className="space-y-1.5 max-h-96 overflow-y-auto">
            {historyEntries.map(entry => (
              <HistoryEntry
                key={entry.id}
                entry={entry}
                canDelete={entry.date >= thirtyDaysAgoISO}
                onDelete={() => deleteMealPlan(entry.id)}
                onCookAgain={() => setCookAgain(entry)}
              />
            ))}
          </ul>
        )}

        {oldCount > 0 && (
          <div className="pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setConfirmPurge(true)} className="w-full">
              <Trash2 className="w-4 h-4" /> Delete {oldCount} {oldCount === 1 ? 'entry' : 'entries'} older than 30 days
            </Button>
          </div>
        )}
      </div>

      <CookAgainModal
        entry={cookAgain}
        onClose={() => setCookAgain(null)}
        onConfirm={async ({ date, slot }) => {
          if (cookAgain.recipeId) {
            await addMealPlan({ date, slot, recipeId: cookAgain.recipeId })
          } else if (cookAgain.leftoverText) {
            await addMealPlan({ date, slot, leftoverText: cookAgain.leftoverText })
          }
          setCookAgain(null)
        }}
      />

      <Modal open={confirmPurge} onClose={() => setConfirmPurge(false)} title="Delete Old History">
        <div className="space-y-3">
          <p className="text-sm text-body">
            Permanently delete {oldCount} meal history {oldCount === 1 ? 'entry' : 'entries'} older than 30 days?
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setConfirmPurge(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={handlePurge} className="flex-1">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  )
}

function HistoryEntry({ entry, canDelete, onDelete, onCookAgain }) {
  const label = entry.snapshot?.recipeName
    || (entry.leftoverText ? `Leftover ${entry.leftoverText}` : '(deleted recipe)')
  const dateLabel = new Date(entry.date + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <li className="bg-surface2 rounded-lg px-3 py-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-body truncate">{label}</div>
        <div className="text-xs text-subtle">{dateLabel} · {SLOT_LABELS[entry.slot]}</div>
      </div>
      <button
        onClick={onCookAgain}
        className="text-xs text-primary hover:underline px-2 py-1"
      >
        Cook again
      </button>
      {canDelete && (
        <button onClick={onDelete} className="text-subtle hover:text-danger p-1" aria-label="Delete">
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  )
}

function CookAgainModal({ entry, onClose, onConfirm }) {
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('dinner')

  useEffect(() => {
    if (entry) {
      setDate(todayISO())
      setSlot(entry.slot || 'dinner')
    }
  }, [entry])

  if (!entry) return null
  const label = entry.snapshot?.recipeName
    || (entry.leftoverText ? `Leftover ${entry.leftoverText}` : '(deleted recipe)')

  return (
    <Modal open={!!entry} onClose={onClose} title="Cook Again">
      <div className="space-y-3">
        <p className="text-sm text-body">
          Plan <strong>{label}</strong> for:
        </p>
        <div>
          <label className="text-sm text-muted mb-1 block">Date</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted mb-1 block">Slot</label>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_SLOTS.map(s => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`py-2 rounded-xl border text-sm ${slot === s
                  ? 'bg-primary border-primary text-primary-fg'
                  : 'border-border text-muted'
                }`}
              >
                {SLOT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onConfirm({ date, slot })} className="flex-1" disabled={!date}>
            Add to plan
          </Button>
        </div>
      </div>
    </Modal>
  )
}
