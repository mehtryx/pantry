import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { DataProvider, useData } from './contexts/DataContext'
import BottomNav from './components/BottomNav'
import PantryPage from './pages/PantryPage'
import GroceryPage from './pages/GroceryPage'
import PutAwayPage from './pages/PutAwayPage'
import MealsPage from './pages/MealsPage'
import RecipesPage from './pages/RecipesPage'
import SettingsPage from './pages/SettingsPage'
import SignInPage from './pages/SignInPage'

function Shell() {
  const { user, ready, householdId } = useData()

  // While auth is initializing
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sage-500">
        Connecting…
      </div>
    )
  }

  // Signed in as anonymous — show the sign-in gate
  if (user.isAnonymous) {
    return <SignInPage />
  }

  // Signed in with Google but household not resolved yet
  if (!householdId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sage-500">
        Setting up…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-sage-900 pb-20">
      <div className="max-w-2xl mx-auto safe-top">
        {ready ? (
          <Routes>
            <Route path="/" element={<PantryPage />} />
            <Route path="/grocery" element={<GroceryPage />} />
            <Route path="/putaway" element={<PutAwayPage />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        ) : (
          <div className="p-8 text-center text-sage-500">Loading…</div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </ThemeProvider>
  )
}
