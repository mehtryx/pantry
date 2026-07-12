import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Search } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { UNITS } from '../lib/constants'
import { Button, Input, Select, Modal } from './UI'

/**
 * Recipe editor modal. Handles both create and edit.
 * onSave receives { name, ingredients: [{ itemId, name, quantity, unit }] }
 */
export default function RecipeEditor({ open, recipe, onClose, onSave }) {
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState([])

  useEffect(() => {
    if (open) {
      setName(recipe?.name || '')
      setIngredients(recipe?.ingredients ? [...recipe.ingredients] : [])
    }
  }, [open, recipe])

  function addIngredient(ing) {
    setIngredients(prev => [...prev, ing])
  }

  function updateIngredient(index, patch) {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, ...patch } : ing))
  }

  function removeIngredient(index) {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  async function submit() {
    if (!name.trim()) return
    // Filter out empty ingredients (no name)
    const cleaned = ingredients
      .filter(i => (i.name || '').trim())
      .map(i => ({
        itemId: i.itemId || null,
        name: i.name.trim(),
        quantity: Number(i.quantity) || 0,
        unit: i.unit || 'count',
      }))
    await onSave({ name: name.trim(), ingredients: cleaned })
  }

  return (
    <Modal open={open} onClose={onClose} title={recipe ? 'Edit Recipe' : 'New Recipe'} wide>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted mb-1 block">Recipe Name</label>
          <Input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Butter chicken"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-muted">Ingredients</label>
            <span className="text-xs text-subtle">
              {ingredients.length} {ingredients.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <ul className="space-y-2 mb-2">
            {ingredients.map((ing, i) => (
              <IngredientRow
                key={i}
                ingredient={ing}
                onChange={patch => updateIngredient(i, patch)}
                onRemove={() => removeIngredient(i)}
              />
            ))}
          </ul>
          <IngredientAdder onAdd={addIngredient} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={submit} className="flex-1" disabled={!name.trim()}>
            {recipe ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** A row for an existing ingredient — quantity + unit editable, name/item fixed */
function IngredientRow({ ingredient, onChange, onRemove }) {
  return (
    <li className="bg-surface border border-border rounded-xl p-2.5 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-body truncate">{ingredient.name}</div>
        {!ingredient.itemId && (
          <div className="text-xs text-subtle">not linked to a pantry item</div>
        )}
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={ingredient.quantity}
        onChange={e => onChange({ quantity: e.target.value })}
        className="w-16 px-2 py-1.5 rounded-lg border border-border bg-bg text-center text-sm"
      />
      <Select
        value={ingredient.unit}
        onChange={e => onChange({ unit: e.target.value })}
        className="w-24 text-sm"
      >
        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </Select>
      <button onClick={onRemove} className="text-subtle hover:text-danger p-1" aria-label="Remove">
        <X className="w-4 h-4" />
      </button>
    </li>
  )
}

/** Adder — search for existing item OR create new */
function IngredientAdder({ onAdd }) {
  const { items, addItem } = useData()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const suggestions = useMemo(() => {
    const s = query.trim().toLowerCase()
    if (s.length < 2) return []
    return items
      .filter(i => i.name.toLowerCase().includes(s))
      .sort((a, b) => {
        // Names starting with the query come first
        const aStarts = a.name.toLowerCase().startsWith(s)
        const bStarts = b.name.toLowerCase().startsWith(s)
        if (aStarts !== bStarts) return aStarts ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .slice(0, 8)
  }, [items, query])

  function pickExisting(item) {
    onAdd({
      itemId: item.id,
      name: item.name,
      quantity: 1,
      unit: item.unit,
    })
    setQuery('')
  }

  const [showCreate, setShowCreate] = useState(false)
  const [createUnit, setCreateUnit] = useState('count')

  async function confirmCreate() {
    if (!query.trim()) return
    setBusy(true)
    try {
      // Create the pantry item with zero stock everywhere and no default
      // location — it exists as a name/unit reference only.
      const newId = await addItem({
        name: query.trim(),
        unit: createUnit,
        location: null, // zero everywhere
        quantity: 0,
      })
      onAdd({
        itemId: newId,
        name: query.trim(),
        quantity: 1,
        unit: createUnit,
      })
      setQuery('')
      setShowCreate(false)
    } finally {
      setBusy(false)
    }
  }

  if (showCreate) {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 space-y-2">
        <div className="text-sm text-body">
          Create new pantry item: <strong>{query}</strong>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-muted">Unit:</label>
          <Select value={createUnit} onChange={e => setCreateUnit(e.target.value)} className="flex-1 text-sm">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={confirmCreate} disabled={busy} className="flex-1">Create &amp; Add</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Add ingredient…"
          className="pl-9"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="border border-border rounded-xl overflow-hidden">
          {suggestions.map(item => (
            <button
              key={item.id}
              className="w-full text-left px-3 py-2 hover:bg-surface2 active:bg-surface2 border-b border-border last:border-b-0"
              onClick={() => pickExisting(item)}
            >
              <div className="text-sm text-body">{item.name}</div>
              <div className="text-xs text-subtle">({item.unit})</div>
            </button>
          ))}
          <button
            className="w-full text-left px-3 py-2 bg-primary/10 hover:bg-primary/20 border-t border-primary/30 flex items-center gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm text-body">
              Create new item &quot;<strong>{query.trim()}</strong>&quot;
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
