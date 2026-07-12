import { useState, useMemo } from 'react'
import { Package, ArrowRight } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { STORAGE_LOCATIONS, WAITING, formatQty } from '../lib/constants'
import { Button, Select, Card, Modal, EmptyState } from '../components/UI'

export default function PutAwayPage() {
  const { items, putAway } = useData()
  const [target, setTarget] = useState(null) // { item }

  const waitingItems = useMemo(() =>
    items.filter(i => (i.stock?.[WAITING] || 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  )

  return (
    <div className="px-4 pt-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-body">Put Away</h1>
        <p className="text-sm text-muted mt-1">
          Items you've bought but haven't stored yet.
        </p>
      </header>

      {waitingItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="All put away"
          description="Nothing waiting to be stored."
        />
      ) : (
        <ul className="space-y-2">
          {waitingItems.map(item => (
            <li key={item.id}>
              <Card className="p-3 flex items-center gap-3 active:bg-surface2 dark:active:bg-surface2" onClick={() => setTarget({ item })}>
                <div className="w-2.5 h-2.5 rounded-full bg-warn flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-body">{item.name}</div>
                  <div className="text-xs text-muted">
                    {formatQty(item.stock[WAITING], item.unit)} to store
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-subtle" />
              </Card>
            </li>
          ))}
        </ul>
      )}

      <PutAwayModal target={target} onClose={() => setTarget(null)} putAway={putAway} />
    </div>
  )
}

function PutAwayModal({ target, onClose, putAway }) {
  const [location, setLocation] = useState('kitchen_pantry')
  const [qty, setQty] = useState('')

  if (!target) return null
  const { item } = target
  const available = item.stock?.[WAITING] || 0
  const amountToMove = qty === '' ? available : Number(qty)

  async function submit(all = false) {
    const moving = all ? available : amountToMove
    if (moving <= 0) return
    await putAway(item.id, location, moving)
    setQty('')
    onClose()
  }

  return (
    <Modal open={!!target} onClose={onClose} title={`Put Away: ${item.name}`}>
      <div className="space-y-3">
        <div className="bg-surface2 rounded-xl p-3 text-sm">
          <strong>{formatQty(available, item.unit)}</strong> waiting to be stored
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">Destination</label>
          <Select value={location} onChange={e => setLocation(e.target.value)}>
            {STORAGE_LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </Select>
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">
            Quantity <span className="text-subtle">(leave blank for all)</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder={`All (${formatQty(available, item.unit)})`}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-border bg-surface dark:border-border dark:text-body"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => submit(qty === '')} className="flex-1">
            Store {formatQty(amountToMove, item.unit)}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
