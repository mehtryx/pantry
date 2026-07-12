import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Package2, Trash2, Minus, Package, ChevronRight } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { UNITS, WAITING, formatQty } from '../lib/constants'
import { computeItemStatus, STATUS_COLORS, STATUS_LABELS } from '../lib/status'
import { Button, Input, Select, Card, Modal, EmptyState } from '../components/UI'

export default function PantryPage() {
  const navigate = useNavigate()
  const { items, grocery, reservations, addItem, updateItem, setItemLocationQty, deleteItem, storageLocations, allLocations, locationLookup } = useData()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterLoc, setFilterLoc] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  // Item is "empty / no demand" when it has zero stock everywhere,
  // isn't on the grocery list, and no meal plan reserves it.
  function isEmptyNoDemand(item) {
    const totalStock = Object.values(item.stock || {}).reduce((s, q) => s + (q || 0), 0)
    if (totalStock > 0) return false
    if ((reservations[item.id] || 0) > 0) return false
    if (grocery.some(g => !g.bought && g.itemId === item.id)) return false
    return true
  }

  // Total waiting-to-be-stored across all items — drives the Put Away chip
  const waitingCount = useMemo(
    () => items.filter(i => (i.stock?.[WAITING] || 0) > 0).length,
    [items]
  )

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    let list = items.filter(it => {
      const empty = isEmptyNoDemand(it)

      // "Empty / no demand" filter: show only these items
      if (filterLoc === 'empty') {
        if (!empty) return false
        if (s && !it.name.toLowerCase().includes(s)) return false
        return true
      }

      // Specific location filter: item must have stock there
      if (filterLoc !== 'all') {
        if (!(it.stock?.[filterLoc] > 0)) return false
        if (s && !it.name.toLowerCase().includes(s)) return false
        return true
      }

      // 'all' mode: hide empty items unless the user is searching for one
      if (empty && !s) return false
      if (s && !it.name.toLowerCase().includes(s)) return false
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
        <h1 className="text-2xl font-semibold text-body">Pantry</h1>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </header>

      {waitingCount > 0 && (
        <button
          onClick={() => navigate('/putaway')}
          className="w-full mb-3 flex items-center gap-2 bg-warn/10 border border-warn/30 rounded-xl px-3 py-2.5 text-left active:bg-warn/20"
        >
          <Package className="w-4 h-4 text-warn flex-shrink-0" />
          <span className="text-sm text-body flex-1">
            {waitingCount} {waitingCount === 1 ? 'item' : 'items'} waiting to be stored
          </span>
          <ChevronRight className="w-4 h-4 text-subtle" />
        </button>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
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
          {allLocations.map(l => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
          <option value="empty">Empty / no demand</option>
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
                <Card className="p-3 flex items-center gap-3 active:bg-surface2 dark:active:bg-surface2" onClick={() => setDetailItem(item)}>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COLORS[st.status]}`} title={STATUS_LABELS[st.status]} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-body truncate">{item.name}</div>
                    <div className="text-xs text-muted truncate">
                      {stockSummary(item, locationLookup)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    {st.reserved > 0 && <div>Reserved: {formatQty(st.reserved, item.unit)}</div>}
                    {st.status === 'red-over' && <div className="text-danger">On list, have plenty</div>}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <AddItemModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={addItem} storageLocations={storageLocations} />
      <ItemDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        setItemLocationQty={setItemLocationQty}
        updateItem={updateItem}
        deleteItem={(id) => { deleteItem(id); setDetailItem(null) }}
        storageLocations={storageLocations}
      />
    </div>
  )
}

function stockSummary(item, locationLookup) {
  const entries = Object.entries(item.stock || {}).filter(([, q]) => q > 0)
  if (entries.length === 0) return `Out of stock · ${item.unit}`
  return entries
    .map(([loc, q]) => `${formatQty(q, item.unit)} in ${locationLookup[loc] || loc}`)
    .join(' · ')
}

function primaryLocation(item) {
  const entries = Object.entries(item.stock || {}).filter(([, q]) => q > 0)
  entries.sort((a, b) => b[1] - a[1])
  return entries[0]?.[0]
}

function AddItemModal({ open, onClose, onAdd, storageLocations }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('count')
  const [location, setLocation] = useState('')
  const [qty, setQty] = useState('1')

  // Default location to first available when list changes / modal opens
  useEffect(() => {
    if (!location && storageLocations.length > 0) {
      setLocation(storageLocations[0].id)
    }
  }, [storageLocations, location])

  function reset() { setName(''); setUnit('count'); setLocation(storageLocations[0]?.id || ''); setQty('1') }
  async function submit() {
    if (!name.trim() || !location) return
    await onAdd({ name, unit, location, quantity: Number(qty) })
    reset(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Item">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted mb-1 block">Name</label>
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken breast" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted mb-1 block">Quantity</label>
            <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted mb-1 block">Unit</label>
            <Select value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <label className="text-sm text-muted mb-1 block">Location</label>
          <Select value={location} onChange={e => setLocation(e.target.value)}>
            {storageLocations.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
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

function ItemDetailModal({ item, onClose, setItemLocationQty, updateItem, deleteItem, storageLocations }) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  if (!item) return null
  const stockEntries = storageLocations.map(loc => ({
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
            <button className="text-lg font-medium text-body" onClick={() => { setNameDraft(item.name); setEditingName(true) }}>
              {item.name} <span className="text-sm text-subtle">(tap to edit)</span>
            </button>
          )}
          <div className="text-sm text-muted">Unit: {item.unit}</div>
        </div>

        {waitingQty > 0 && (
          <div className="bg-warn/10 border border-warn/30 rounded-xl p-3 text-sm">
            <strong>{formatQty(waitingQty, item.unit)}</strong> waiting to be stored. Head to the Put Away tab to assign a location.
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-muted mb-2">Stock by Location</h4>
          <ul className="space-y-2">
            {stockEntries.map(({ location, label, qty }) => (
              <QtyRow key={location} label={label} qty={qty} unit={item.unit}
                onChange={n => setItemLocationQty(item.id, location, n)} />
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-border">
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
      <div className="flex-1 text-sm text-body">{label}</div>
      <Button variant="ghost" size="sm" onClick={() => { const n = Math.max(0, (Number(val) || 0) - 1); setVal(String(n)); onChange(n) }}>
        <Minus className="w-3 h-3" />
      </Button>
      <input
        type="number"
        inputMode="decimal"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => onChange(Number(val) || 0)}
        className="w-16 px-2 py-1.5 rounded-lg border border-border bg-surface text-center text-sm"
      />
      <span className="text-xs text-muted w-8">{unit}</span>
      <Button variant="ghost" size="sm" onClick={() => { const n = (Number(val) || 0) + 1; setVal(String(n)); onChange(n) }}>
        <Plus className="w-3 h-3" />
      </Button>
    </li>
  )
}
