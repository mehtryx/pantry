import { Sun, Moon, Monitor, Download, LogOut, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useData } from '../contexts/DataContext'
import { signOutUser } from '../lib/firebase'
import { Button, Card } from '../components/UI'
import { PALETTES, PALETTE_ORDER } from '../lib/palettes'

export default function SettingsPage() {
  const { mode, setMode, palette, setPalette } = useTheme()
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
        <h1 className="text-2xl font-semibold text-body">Settings</h1>
      </header>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-muted mb-3">Account</h3>
        <div className="flex items-center gap-2 text-sm text-body mb-3">
          <CheckCircle2 className="w-4 h-4 text-subtle" />
          Signed in as <strong>{user?.email}</strong>
        </div>
        <p className="text-xs text-muted mb-3">
          You share this pantry with everyone in your household.
        </p>
        <Button variant="secondary" onClick={signOutUser} className="w-full">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </Card>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-muted mb-3">Palette</h3>
        <div className="grid grid-cols-3 gap-2">
          {PALETTE_ORDER.map(key => (
            <PaletteButton
              key={key}
              active={palette === key}
              onClick={() => setPalette(key)}
              paletteKey={key}
            />
          ))}
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-muted mb-3">Mode</h3>
        <div className="grid grid-cols-3 gap-2">
          <ModeButton active={mode === 'light'} onClick={() => setMode('light')} icon={Sun} label="Light" />
          <ModeButton active={mode === 'dark'} onClick={() => setMode('dark')} icon={Moon} label="Dark" />
          <ModeButton active={mode === 'system'} onClick={() => setMode('system')} icon={Monitor} label="Auto" />
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-muted mb-2">Data</h3>
        <div className="text-xs text-muted mb-3">
          {items.length} items · {grocery.length} grocery entries · {recipes.length} recipes · {mealPlans.length} meal plans
        </div>
        <Button variant="secondary" onClick={exportData} className="w-full">
          <Download className="w-4 h-4" /> Export Backup (JSON)
        </Button>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted mb-2">About</h3>
        <p className="text-xs text-muted">
          Pantry v0.7 — Themes!
        </p>
      </Card>
    </div>
  )
}

function ModeButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors min-h-[64px] ${
        active
          ? 'bg-primary border-primary text-primary-fg'
          : 'border-border text-muted'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
    </button>
  )
}

function PaletteButton({ active, onClick, paletteKey }) {
  const p = PALETTES[paletteKey]
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors min-h-[72px] ${
        active
          ? 'border-primary bg-surface2'
          : 'border-border bg-surface'
      }`}
    >
      <span
        className="block w-7 h-7 rounded-full shadow-inner"
        style={{ background: p.swatch }}
      />
      <span className={`text-xs ${active ? 'text-body font-medium' : 'text-muted'}`}>
        {p.label}
      </span>
    </button>
  )
}
