import { useState, useMemo } from 'react'
import { Search, Plus, Package2, Trash2, Minus } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { LOCATIONS, STORAGE_LOCATIONS, UNITS, WAITING, locationLabel } from '../lib/constants'
import { computeItemStatus, STATUS_COLORS, STATUS_LABELS } from '../lib/status'
import { Button, Input, Select, Card, Modal, EmptyState } from '../components/UI'

export default function PantryPage() {
  const { items, grocery, reservations, addItem, updateItem, setItemLocationQty, deleteItem } = useData()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterLoc, setFilterLoc] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    let list = items.filter(it => {
      if (s && !it.name.toLowerCase().includes(s)) return false
      if (filterLoc !== 'all') {
        if (!(it.stock?.[filterLoc] > 0)) return false
      }
      return true
    })
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'location') {
      list.sort((a, b) => {
        const la = primaryLocation(a) || ''
        const lb = primaryLocation(b) || ''
        return la.localeCompare(lb) || a.name.localeCompare(b.name)
      })
    } else if (sortBy === 'status') {
      const order = { 'red-under': 0, 'red-over': 1, yellow: 2, green: 3, neutral: 4 }
      list.sort((a, b) => {
        const sa = computeItemStatus(a, grocery, reservations[a.id] || 0).status
        const sb = computeItemStatus(b, grocery, reservations[b.id] || 0).status
        return (order[sa] ?? 9) - (order[sb] ?? 9) || a.name.localeCompare(b.name)
      })
    }
    return list
  }, [items, grocery, reservations, search, sortBy, filterLoc])

  return (
    <div className="px-4 pt-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-sage-800 dark:text-cream-100">Pantry</h1>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </header>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items…"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-sm">
          <option value="name">Sort: Name</option>
          <option value="location">Sort: Location</option>
          <option value="status">Sort: Status</option>
        </Select>
        <Select value={filterLoc} onChange={e => setFilterLoc(e.target.value)} className="text-sm">
          <option value="all">All locations</option>
          {LOCATIONS.map(l => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package2}
          title={items.length === 0 ? 'No items yet' : 'No matches'}
          description={items.length === 0 ? 'Add your first pantry item to get started.' : 'Try adjusting your search or filter.'}
          action={items.length === 0 && <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Item</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map(item => {
            const st = computeItemStatus(item, grocery, reservations[item.id] || 0)
            return (
              <li key={item.id}>
                <Card className="p-3 flex items-center gap-3 active:bg-cream-200 dark:active:bg-sage-800" onClick={() => setDetailItem(item)}>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COLORS[st.status]}`} title={STATUS_LABELS[st.status]} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sage-800 dark:text-cream-100 truncate">{item.name}</div>
                    <div className="text-xs text-sage-500 dark:text-cream-400 truncate">
                      {stockSummary(item)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-sage-500 dark:text-cream-400">
                    {st.reserved > 0 && <div>Reserved: {st.reserved}{item.unit}</div>}
                    {st.status === 'red-over' && <div className="text-terracotta-500">On list, have plenty</div>}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <AddItemModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={addItem} />
      <ItemDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        setItemLocationQty={setItemLocationQty}
        updateItem={updateItem}
        deleteItem={(id) => { deleteItem(id); setDetailItem(null) }}
      />
    </div>
  )
}

function stockSummary(item) {
  const entries = Object.entries(item.stock || {}).filter(([, q]) => q > 0)
  if (entries.length === 0) return `Out of stock · ${item.unit}`
  return entries
    .map(([loc, q]) => `${q}${item.unit} in ${locationLabel(loc)}`)
    .join(' · ')
}

function primaryLocation(item) {
  const entries = Object.entries(item.stock || {}).filter(([, q]) => q > 0)
  entries.sort((a, b) => b[1] - a[1])
  return entries[0]?.[0]
}

function AddItemModal({ open, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('count')
  const [location, setLocation] = useState('kitchen_pantry')
  const [qty, setQty] = useState('1')

  function reset() { setName(''); setUnit('count'); setLocation('kitchen_pantry'); setQty('1') }
  async function submit() {
    if (!name.trim()) return
    await onAdd({ name, unit, location, quantity: Number(qty) })
    reset(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Item">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-sage-600 dark:text-cream-300 mb-1 block">Name</label>
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken breast" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-sage-600 dark:text-cream-300 mb-1 block">Quantity</label>
            <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-sage-600 dark:text-cream-300 mb-1 block">Unit</label>
            <Select value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <label className="text-sm text-sage-600 dark:text-cream-300 mb-1 block">Location</label>
          <Select value={location} onChange={e => setLocation(e.target.value)}>
            {STORAGE_LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </Select>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={submit} className="flex-1">Add</Button>
        </div>
      </div>
    </Modal>
  )
}

function ItemDetailModal({ item, onClose, setItemLocationQty, updateItem, deleteItem }) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  if (!item) return null
  const stockEntries = STORAGE_LOCATIONS.map(loc => ({
    location: loc.id,
    label: loc.label,
    qty: item.stock?.[loc.id] || 0,
  }))
  const waitingQty = item.stock?.[WAITING] || 0

  function saveName() {
    if (nameDraft.trim() && nameDraft !== item.name) {
      updateItem(item.id, { name: nameDraft.trim() })
    }
    setEditingName(false)
  }

  return (
    <Modal open={!!item} onClose={onClose} title="Item Details">
      <div className="space-y-4">
        <div>
          {editingName ? (
            <div className="flex gap-2">
              <Input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()} />
            </div>
          ) : (
            <button className="text-lg font-medium text-sage-800 dark:text-cream-100" onClick={() => { setNameDraft(item.name); setEditingName(true) }}>
              {item.name} <span className="text-sm text-sage-400">(tap to edit)</span>
            </button>
          )}
          <div className="text-sm text-sage-500 dark:text-cream-400">Unit: {item.unit}</div>
        </div>

        {waitingQty > 0 && (
          <div className="bg-amber_warn-400/10 border border-amber_warn-400/30 rounded-xl p-3 text-sm">
            <strong>{waitingQty}{item.unit}</strong> waiting to be stored. Head to the Put Away tab to assign a location.
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-2">Stock by Location</h4>
          <ul className="space-y-2">
            {stockEntries.map(({ location, label, qty }) => (
              <QtyRow key={location} label={label} qty={qty} unit={item.unit}
                onChange={n => setItemLocationQty(item.id, location, n)} />
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-cream-200 dark:border-sage-700">
          <Button variant="danger" onClick={() => { if (confirm('Delete this item?')) deleteItem(item.id) }} className="w-full">
            <Trash2 className="w-4 h-4" /> Delete Item
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function QtyRow({ label, qty, unit, onChange }) {
  const [val, setVal] = useState(String(qty))
  return (
    <li className="flex items-center gap-2">
      <div className="flex-1 text-sm text-sage-700 dark:text-cream-200">{label}</div>
      <Button variant="ghost" size="sm" onClick={() => { const n = Math.max(0, (Number(val) || 0) - 1); setVal(String(n)); onChange(n) }}>
        <Minus className="w-3 h-3" />
      </Button>
      <input
        type="number"
        inputMode="decimal"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => onChange(Number(val) || 0)}
        className="w-16 px-2 py-1.5 rounded-lg border border-cream-300 dark:border-sage-700 bg-cream-50 dark:bg-sage-800 text-center text-sm"
      />
      <span className="text-xs text-sage-500 w-8">{unit}</span>
      <Button variant="ghost" size="sm" onClick={() => { const n = (Number(val) || 0) + 1; setVal(String(n)); onChange(n) }}>
        <Plus className="w-3 h-3" />
      </Button>
    </li>
  )
}
