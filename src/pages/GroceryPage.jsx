import { useState, useMemo } from 'react'
import { Plus, ShoppingCart, Check, X, Store } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { UNITS, formatQty } from '../lib/constants'
import { computeItemStatus } from '../lib/status'
import { Button, Input, Select, Card, Modal, EmptyState } from '../components/UI'

export default function GroceryPage() {
  const { grocery, items, reservations, addGrocery, deleteGrocery, setGroceryBought, departments, departmentLookup } = useData()
  const [showAdd, setShowAdd] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState(false)
  const [storeFilter, setStoreFilter] = useState('all')
  const [sortBy, setSortBy] = useState('added') // added, name, department

  const allStores = useMemo(() => {
    const s = new Set()
    for (const g of grocery) if (g.store) s.add(g.store)
    for (const it of items) for (const st of (it.stores || [])) s.add(st)
    return Array.from(s).sort()
  }, [grocery, items])

  const active = useMemo(() => grocery.filter(g => !g.bought), [grocery])
  const bought = useMemo(() => grocery.filter(g => g.bought), [grocery])

  const filteredActive = useMemo(() => {
    if (storeFilter === 'all') return active
    if (storeFilter === 'none') return active.filter(g => !g.store)
    return active.filter(g => g.store === storeFilter)
  }, [active, storeFilter])

  // Look up department id for a grocery entry (via its linked pantry item)
  function groceryDept(g) {
    if (!g.itemId) return null
    const item = items.find(i => i.id === g.itemId)
    return item?.department || null
  }

  const sortedActive = useMemo(() => {
    const list = [...filteredActive]
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'department') {
      const deptOrder = new Map(departments.map((d, i) => [d.id, i]))
      list.sort((a, b) => {
        const da = groceryDept(a)
        const db = groceryDept(b)
        const oa = da ? (deptOrder.get(da) ?? 998) : 999
        const ob = db ? (deptOrder.get(db) ?? 998) : 999
        return oa - ob || a.name.localeCompare(b.name)
      })
    }
    // 'added' = natural Firestore order — leave as-is
    return list
  }, [filteredActive, sortBy, departments, items])

  return (
    <div className="px-4 pt-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-body">Grocery</h1>
        <div className="flex gap-2">
          <Button variant={checkoutMode ? 'primary' : 'secondary'} size="sm" onClick={() => setCheckoutMode(v => !v)}>
            <ShoppingCart className="w-4 h-4" /> {checkoutMode ? 'Exit' : 'Shop'}
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-sm">
          <option value="added">Sort: Added</option>
          <option value="name">Sort: Name</option>
          <option value="department">Sort: Department</option>
        </Select>
        {allStores.length > 0 ? (
          <Select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="text-sm">
            <option value="all">All stores</option>
            <option value="none">No store set</option>
            {allStores.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        ) : <div />}
      </div>

      {filteredActive.length === 0 && bought.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Grocery list empty"
          description="Add items you need to buy."
          action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Item</Button>}
        />
      ) : (
        <>
          {sortBy === 'department' ? (
            <div className="mb-6">
              <GroceryGrouped
                entries={sortedActive}
                groupBy={groceryDept}
                groupLabel={id => id ? (departmentLookup[id] || id) : 'No department'}
                items={items}
                grocery={grocery}
                reservations={reservations}
                checkoutMode={checkoutMode}
                onToggle={setGroceryBought}
                onDelete={deleteGrocery}
              />
            </div>
          ) : (
            <ul className={`space-y-2 mb-6`}>
              {sortedActive.map(g => {
                const linkedItem = items.find(i => i.id === g.itemId)
                const statusColor = linkedItem
                  ? statusForGrocery(linkedItem, grocery, reservations[linkedItem.id] || 0)
                  : null
                return (
                  <GroceryRow
                    key={g.id}
                    g={g}
                    checkoutMode={checkoutMode}
                    statusColor={statusColor}
                    onToggle={() => setGroceryBought(g.id, true)}
                    onDelete={() => deleteGrocery(g.id)}
                  />
                )
              })}
            </ul>
          )}
          {bought.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Bought ({bought.length})</h3>
              <ul className="space-y-2">
                {bought.map(g => (
                  <GroceryRow
                    key={g.id}
                    g={g}
                    checkoutMode={checkoutMode}
                    onToggle={() => setGroceryBought(g.id, false)}
                    onDelete={() => deleteGrocery(g.id)}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <AddGroceryModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        items={items}
        stores={allStores}
        departments={departments}
        onAdd={addGrocery}
      />
    </div>
  )
}

function statusForGrocery(item, grocery, reserved) {
  const st = computeItemStatus(item, grocery, reserved)
  return st.status === 'red-over' ? 'bg-danger/80' : null
}

function GroceryRow({ g, checkoutMode, statusColor, onToggle, onDelete }) {
  const size = checkoutMode ? 'py-4' : 'py-3'
  return (
    <li>
      <Card className={`px-3 ${size} flex items-center gap-3 ${g.bought ? 'opacity-60' : ''}`}>
        <button
          onClick={onToggle}
          className={`flex-shrink-0 rounded-full border-2 flex items-center justify-center ${checkoutMode ? 'w-10 h-10' : 'w-7 h-7'} ${
            g.bought
              ? 'bg-primary border-primary text-primary-fg'
              : 'border-border'
          }`}
        >
          {g.bought && <Check className={checkoutMode ? 'w-6 h-6' : 'w-4 h-4'} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-body ${g.bought ? 'line-through' : ''} ${checkoutMode ? 'text-lg' : ''}`}>
            {g.name}
          </div>
          <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
            <span>{formatQty(g.quantity, g.unit)}</span>
            {g.store && <span className="flex items-center gap-0.5"><Store className="w-3 h-3" /> {g.store}</span>}
            {g.addedBy === 'meal:auto' && <span className="text-subtle">from meal plan</span>}
          </div>
        </div>
        {statusColor && <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} title="You already have plenty of this at home" />}
        {!checkoutMode && (
          <button onClick={onDelete} className="text-subtle hover:text-danger p-2">
            <X className="w-4 h-4" />
          </button>
        )}
      </Card>
    </li>
  )
}

/**
 * Grocery list grouped by department. Renders section headers and preserves
 * the pre-sorted order within each group.
 */
function GroceryGrouped({ entries, groupBy, groupLabel, items, grocery, reservations, checkoutMode, onToggle, onDelete }) {
  const groups = []
  let currentKey = Symbol('unset')
  let currentList = null
  for (const g of entries) {
    const key = groupBy(g)
    if (key !== currentKey) {
      currentList = { key, label: groupLabel(key), items: [] }
      groups.push(currentList)
      currentKey = key
    }
    currentList.items.push(g)
  }
  return (
    <div className="space-y-4">
      {groups.map((group, gi) => (
        <div key={gi}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 px-1">
            {group.label}
          </h3>
          <ul className="space-y-2">
            {group.items.map(g => {
              const linkedItem = items.find(i => i.id === g.itemId)
              const statusColor = linkedItem
                ? statusForGrocery(linkedItem, grocery, reservations[linkedItem.id] || 0)
                : null
              return (
                <GroceryRow
                  key={g.id}
                  g={g}
                  checkoutMode={checkoutMode}
                  statusColor={statusColor}
                  onToggle={() => onToggle(g.id, true)}
                  onDelete={() => onDelete(g.id)}
                />
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function AddGroceryModal({ open, onClose, items, stores, departments, onAdd }) {
  const [nameInput, setNameInput] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [unit, setUnit] = useState('count')
  const [qty, setQty] = useState('1')
  const [department, setDepartment] = useState('')
  const [store, setStore] = useState('')

  const suggestions = useMemo(() => {
    const s = nameInput.trim().toLowerCase()
    if (!s) return []
    return items
      .filter(i => i.name.toLowerCase().includes(s))
      .slice(0, 6)
  }, [nameInput, items])

  function pick(item) {
    setSelectedItem(item)
    setNameInput(item.name)
    setUnit(item.unit)
    // Pre-fill department from the linked item so she doesn't retype
    setDepartment(item.department || '')
  }

  function reset() {
    setNameInput(''); setSelectedItem(null); setUnit('count'); setQty('1')
    setDepartment(''); setStore('')
  }

  async function submit() {
    if (!nameInput.trim()) return
    await onAdd({
      itemId: selectedItem?.id || null,
      name: nameInput,
      unit,
      quantity: Number(qty),
      store: store || null,
      department: department || null,
    })
    reset(); onClose()
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Add to Grocery List">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted mb-1 block">Item</label>
          <Input
            autoFocus
            value={nameInput}
            onChange={e => { setNameInput(e.target.value); setSelectedItem(null) }}
            placeholder="Type item name…"
          />
          {suggestions.length > 0 && !selectedItem && (
            <ul className="mt-1 border border-border rounded-xl overflow-hidden">
              {suggestions.map(item => (
                <li key={item.id}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-surface2 dark:hover:bg-surface2 text-sm"
                    onClick={() => pick(item)}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-subtle text-xs ml-2">({item.unit})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedItem && (
            <div className="mt-1 text-xs text-muted">Linked to existing pantry item</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted mb-1 block">Quantity</label>
            <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted mb-1 block">Unit</label>
            <Select value={unit} onChange={e => setUnit(e.target.value)} disabled={!!selectedItem}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">
            Department (optional)
            {selectedItem?.department && (
              <span className="text-xs text-subtle ml-2">from item</span>
            )}
          </label>
          <Select value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">No department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </Select>
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">Store (optional)</label>
          <Input value={store} onChange={e => setStore(e.target.value)} list="store-suggestions" placeholder="e.g. Costco" />
          <datalist id="store-suggestions">
            {stores.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => { reset(); onClose() }} className="flex-1">Cancel</Button>
          <Button onClick={submit} className="flex-1">Add</Button>
        </div>
      </div>
    </Modal>
  )
}
