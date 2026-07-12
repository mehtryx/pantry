import { useState } from 'react'
import { Sun, Moon, Monitor, Download, Mail, LogOut, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useData } from '../contexts/DataContext'
import { sendMagicLink, signOutUser } from '../lib/firebase'
import { Button, Card, Input } from '../components/UI'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { items, grocery, recipes, mealPlans, user } = useData()
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const isAnonymous = user?.isAnonymous
  const userEmail = user?.email

  async function handleSendLink() {
    if (!email.trim()) return
    setSending(true); setError('')
    try {
      await sendMagicLink(email.trim())
      setLinkSent(true)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to send sign-in link')
    } finally {
      setSending(false)
    }
  }

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

      {/* Account */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-3">Account</h3>

        {!isAnonymous && userEmail ? (
          <>
            <div className="flex items-center gap-2 text-sm text-sage-700 dark:text-cream-200 mb-3">
              <CheckCircle2 className="w-4 h-4 text-sage-400" />
              Signed in as <strong>{userEmail}</strong>
            </div>
            <p className="text-xs text-sage-500 dark:text-cream-400 mb-3">
              Your data is safe. Sign in with this email on any device to access it.
            </p>
            <Button variant="secondary" onClick={signOutUser} className="w-full">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </>
        ) : linkSent ? (
          <div className="bg-sage-400/10 border border-sage-400/30 rounded-xl p-3 text-sm">
            <strong>Check your email.</strong> Tap the sign-in link we sent to <strong>{email}</strong>. Open it on this same device to keep your existing pantry data.
            <button
              onClick={() => { setLinkSent(false); setEmail('') }}
              className="block mt-2 text-xs text-sage-500 underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-sage-500 dark:text-cream-400 mb-3">
              Right now your data is tied to this device only. Add your email to keep it safe — you'll be able to access it from any device and it won't be lost if Safari clears its storage. No password needed; we send you a sign-in link.
            </p>
            <div className="space-y-2">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {error && <div className="text-xs text-terracotta-500">{error}</div>}
              <Button onClick={handleSendLink} disabled={sending || !email.trim()} className="w-full">
                <Mail className="w-4 h-4" /> {sending ? 'Sending…' : 'Send Sign-In Link'}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Theme */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} icon={Sun} label="Light" />
          <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} icon={Moon} label="Dark" />
          <ThemeButton active={theme === 'system'} onClick={() => setTheme('system')} icon={Monitor} label="Auto" />
        </div>
      </Card>

      {/* Data */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-2">Data</h3>
        <div className="text-xs text-sage-500 mb-3">
          {items.length} items · {grocery.length} grocery entries · {recipes.length} recipes · {mealPlans.length} meal plans
        </div>
        <Button variant="secondary" onClick={exportData} className="w-full">
          <Download className="w-4 h-4" /> Export Backup (JSON)
        </Button>
      </Card>

      {/* About */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-sage-600 dark:text-cream-300 mb-2">About</h3>
        <p className="text-xs text-sage-500 dark:text-cream-400">
          Pantry v0.2 — Phase 1 with email sign-in. Meal planner coming next.
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
