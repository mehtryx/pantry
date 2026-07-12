import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Download, LogOut, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useData } from '../contexts/DataContext'
import { signInWithGoogle, signOutUser, DomainRestrictedError } from '../lib/firebase'
import { Button, Card } from '../components/UI'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { items, grocery, recipes, mealPlans, user, authError, clearAuthError, householdId, migrationStatus } = useData()
  const [signInError, setSignInError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  // Surface auth errors from the initial redirect handling
  useEffect(() => {
    if (authError) {
      setSignInError(authError.message || 'Sign-in failed.')
      clearAuthError()
    }
  }, [authError, clearAuthError])

  const isAnonymous = user?.isAnonymous
  const userEmail = user?.email

  async function handleGoogleSignIn() {
    setSigningIn(true); setSignInError('')
    try {
      await signInWithGoogle()
      // If popup succeeded, we return here signed in.
      // If redirect path was taken, the browser has already navigated away.
    } catch (err) {
      if (err instanceof DomainRestrictedError) {
        setSignInError(err.message)
      } else {
        console.error(err)
        setSignInError(err.message || 'Sign-in failed. Please try again.')
      }
    } finally {
      setSigningIn(false)
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
              {householdId
                ? 'You share this pantry with everyone in your household.'
                : 'Setting up your household…'}
            </p>
            {migrationStatus === 'running' && (
              <div className="text-xs text-sage-500 mb-3">Migrating data…</div>
            )}
            {migrationStatus === 'error' && (
              <div className="text-xs text-terracotta-500 mb-3">Migration hit an error — refresh to retry.</div>
            )}
            <Button variant="secondary" onClick={signOutUser} className="w-full">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-sage-500 dark:text-cream-400 mb-3">
              Right now your data is tied to this device only. Sign in with your Google account to keep it safe — you can access it from any device, and it won't be lost if Safari clears storage.
            </p>
            {signInError && (
              <div className="mb-3 text-xs text-terracotta-500 bg-terracotta-500/10 border border-terracotta-500/30 rounded-xl p-2">
                {signInError}
              </div>
            )}
            <Button onClick={handleGoogleSignIn} disabled={signingIn} className="w-full">
              <GoogleIcon /> {signingIn ? 'Signing in…' : 'Sign in with Google'}
            </Button>
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
          Pantry v0.5 — Shared household data.
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}
