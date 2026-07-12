import { Sun, Moon, Monitor, Download, LogOut, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useData } from '../contexts/DataContext'
import { signOutUser } from '../lib/firebase'
import { Button, Card } from '../components/UI'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { items, grocery, recipes, mealPlans, user } = useData()

  function exportData() {
    const data = { items, grocery, recipes, mealPlans, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pantry-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 pt-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-sage-800 dark:text-cream-100">Settings</h1>
      </header>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-3">Account</h3>
        <div className="flex items-center gap-2 text-sm text-sage-700 dark:text-cream-200 mb-3">
          <CheckCircle2 className="w-4 h-4 text-sage-400" />
          Signed in as <strong>{user?.email}</strong>
        </div>
        <p className="text-xs text-sage-500 dark:text-cream-400 mb-3">
          You share this pantry with everyone in your household.
        </p>
        <Button variant="secondary" onClick={signOutUser} className="w-full">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </Card>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} icon={Sun} label="Light" />
          <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} icon={Moon} label="Dark" />
          <ThemeButton active={theme === 'system'} onClick={() => setTheme('system')} icon={Monitor} label="Auto" />
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-2">Data</h3>
        <div className="text-xs text-sage-500 mb-3">
          {items.length} items · {grocery.length} grocery entries · {recipes.length} recipes · {mealPlans.length} meal plans
        </div>
        <Button variant="secondary" onClick={exportData} className="w-full">
          <Download className="w-4 h-4" /> Export Backup (JSON)
        </Button>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-2">About</h3>
        <p className="text-xs text-sage-500 dark:text-cream-400">
          Pantry v0.6 — Sign-in required.
        </p>
      </Card>
    </div>
  )
}

function ThemeButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors min-h-[64px] ${
        active
          ? 'bg-sage-400 border-sage-400 text-white'
          : 'border-cream-300 dark:border-sage-700 text-sage-600 dark:text-cream-300'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
    </button>
  )
}
