import { CalendarDays } from 'lucide-react'
import { EmptyState } from '../components/UI'

export default function MealsPage() {
  return (
    <div className="px-4 pt-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-sage-800 dark:text-cream-100">Meal Planner</h1>
      </header>
      <EmptyState
        icon={CalendarDays}
        title="Coming in Phase 2"
        description="The meal planner and recipe library will be added next."
      />
    </div>
  )
}
