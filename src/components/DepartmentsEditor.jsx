import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { departmentIdFromLabel } from '../lib/constants'
import { Modal, Button, Input } from './UI'

export default function DepartmentsEditor({ open, onClose }) {
  const { departments, items, renameDepartment, addDepartment, reorderDepartments, deleteDepartment } = useData()
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, label, count }

  function startEdit(dept) {
    setEditingId(dept.id)
    setEditDraft(dept.label)
  }

  async function saveEdit() {
    if (editDraft.trim() && editingId) {
      await renameDepartment(editingId, editDraft)
    }
    setEditingId(null); setEditDraft('')
  }

  function cancelEdit() {
    setEditingId(null); setEditDraft('')
  }

  async function handleAdd() {
    if (!newLabel.trim()) return
    const id = departmentIdFromLabel(newLabel)
    await addDepartment(newLabel, id)
    setNewLabel(''); setAdding(false)
  }

  async function moveUp(index) {
    if (index === 0) return
    const ids = departments.map(d => d.id)
    ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
    await reorderDepartments(ids)
  }

  async function moveDown(index) {
    if (index === departments.length - 1) return
    const ids = departments.map(d => d.id)
    ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
    await reorderDepartments(ids)
  }

  function requestDelete(dept) {
    const count = items.filter(item => item.department === dept.id).length
    setConfirmDelete({ id: dept.id, label: dept.label, count })
  }

  async function doDelete() {
    if (!confirmDelete) return
    await deleteDepartment(confirmDelete.id)
    setConfirmDelete(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Departments" wide>
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Rename, add, remove, or reorder your grocery departments. The display order
          here is used when sorting your grocery list and pantry by department.
        </p>

        <ul className="space-y-2">
          {departments.map((dept, index) => (
            <li key={dept.id}>
              <div className="bg-surface border border-border rounded-xl p-3 flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                    className="text-subtle hover:text-body disabled:opacity-30 p-0.5"
                    aria-label="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === departments.length - 1}
                    onClick={() => moveDown(index)}
                    className="text-subtle hover:text-body disabled:opacity-30 p-0.5"
                    aria-label="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {editingId === dept.id ? (
                  <>
                    <Input
                      autoFocus
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      className="flex-1"
                    />
                    <button onClick={saveEdit} className="text-primary p-2" aria-label="Save">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={cancelEdit} className="text-subtle p-2" aria-label="Cancel">
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 text-body">{dept.label}</div>
                    <button onClick={() => startEdit(dept)} className="text-subtle hover:text-body p-2" aria-label="Rename">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => requestDelete(dept)} className="text-subtle hover:text-danger p-2" aria-label="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {adding ? (
          <div className="bg-surface border border-border rounded-xl p-3 flex items-center gap-2">
            <Input
              autoFocus
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="New department name"
              className="flex-1"
            />
            <button onClick={handleAdd} className="text-primary p-2" aria-label="Add">
              <Check className="w-5 h-5" />
            </button>
            <button onClick={() => { setAdding(false); setNewLabel('') }} className="text-subtle p-2" aria-label="Cancel">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)} className="w-full">
            <Plus className="w-4 h-4" /> Add Department
          </Button>
        )}
      </div>

      <ConfirmDeleteModal
        target={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={doDelete}
      />
    </Modal>
  )
}

function ConfirmDeleteModal({ target, onCancel, onConfirm }) {
  if (!target) return null
  return (
    <Modal open={!!target} onClose={onCancel} title="Delete Department">
      <div className="space-y-3">
        <p className="text-sm text-body">
          Are you sure you want to delete <strong>{target.label}</strong>?
        </p>
        {target.count > 0 && (
          <div className="bg-warn/10 border border-warn/30 rounded-xl p-3 text-sm text-body">
            {target.count} {target.count === 1 ? 'item is' : 'items are'} assigned to this department.
            Their department will be cleared, but the items themselves stay intact.
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}
