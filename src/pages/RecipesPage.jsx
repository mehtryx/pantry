import { EmptyState } from '../components/UI'
import { BookOpen } from 'lucide-react'

export default function RecipesPage() {
  return (
    <div className="px-4 pt-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-sage-800 dark:text-cream-100">Recipes</h1>
      </header>
      <EmptyState icon={BookOpen} title="Coming in Phase 2" description="Recipe library will be added next." />
    </div>
  )
}
