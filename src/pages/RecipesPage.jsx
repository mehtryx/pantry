import { useState, useMemo } from 'react'
import { Search, Plus, BookOpen, Copy, Trash2, Pencil, X } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { Button, Input, Card, Modal, EmptyState } from '../components/UI'
import RecipeEditor from '../components/RecipeEditor'

export default function RecipesPage() {
  const { recipes, mealPlans, addRecipe, updateRecipe, duplicateRecipe, deleteRecipe } = useData()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // recipe object OR 'new'
  const [deleteBlocker, setDeleteBlocker] = useState(null)

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    let list = recipes.filter(r => !r.isLeftover)
    if (s) list = list.filter(r => r.name.toLowerCase().includes(s))
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [recipes, search])

  async function handleSave(payload) {
    if (editing === 'new') {
      await addRecipe(payload)
    } else if (editing) {
      await updateRecipe(editing.id, payload)
    }
    setEditing(null)
  }

  async function handleDuplicate(id) {
    await duplicateRecipe(id)
  }

  async function handleDelete(recipe) {
    const result = await deleteRecipe(recipe.id)
    if (!result.ok) {
      setDeleteBlocker({ recipe, blockers: result.blockers })
    }
  }

  return (
    <div className="px-4 pt-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-body">Recipes</h1>
        <Button onClick={() => setEditing('new')} size="sm">
          <Plus className="w-4 h-4" /> New
        </Button>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search recipes…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={recipes.filter(r => !r.isLeftover).length === 0 ? 'No recipes yet' : 'No matches'}
          description={recipes.filter(r => !r.isLeftover).length === 0 ? 'Add your first recipe to use in meal plans.' : 'Try a different search.'}
          action={recipes.filter(r => !r.isLeftover).length === 0 && (
            <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> New Recipe</Button>
          )}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map(recipe => (
            <li key={recipe.id}>
              <Card className="p-3 flex items-center gap-3">
                <button className="flex-1 min-w-0 text-left" onClick={() => setEditing(recipe)}>
                  <div className="font-medium text-body truncate">{recipe.name}</div>
                  <div className="text-xs text-muted">
                    {recipe.ingredients?.length || 0} {(recipe.ingredients?.length === 1) ? 'ingredient' : 'ingredients'}
                  </div>
                </button>
                <button onClick={() => handleDuplicate(recipe.id)} className="text-subtle hover:text-body p-2" aria-label="Duplicate">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => setEditing(recipe)} className="text-subtle hover:text-body p-2" aria-label="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(recipe)} className="text-subtle hover:text-danger p-2" aria-label="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <RecipeEditor
        open={!!editing}
        recipe={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />

      <DeleteBlockerModal
        blocker={deleteBlocker}
        onClose={() => setDeleteBlocker(null)}
      />
    </div>
  )
}

function DeleteBlockerModal({ blocker, onClose }) {
  if (!blocker) return null
  return (
    <Modal open={!!blocker} onClose={onClose} title="Can't Delete Recipe">
      <div className="space-y-3">
        <p className="text-sm text-body">
          <strong>{blocker.recipe.name}</strong> is used by these upcoming meal plans:
        </p>
        <ul className="text-sm text-muted space-y-1 bg-surface2 rounded-xl p-3">
          {blocker.blockers.map(b => (
            <li key={b.id}>
              {b.date} — {b.slot}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          Remove these meal plans first, then try deleting again.
        </p>
        <Button variant="secondary" onClick={onClose} className="w-full">Got it</Button>
      </div>
    </Modal>
  )
}
