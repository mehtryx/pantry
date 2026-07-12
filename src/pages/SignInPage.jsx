import { useState, useEffect } from 'react'
import { signInWithGoogle, DomainRestrictedError } from '../lib/firebase'
import { useData } from '../contexts/DataContext'
import { Button } from '../components/UI'

export default function SignInPage() {
  const { authError, clearAuthError } = useData()
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (authError) {
      setError(authError.message || 'Sign-in failed.')
      clearAuthError()
    }
  }, [authError, clearAuthError])

  async function handleSignIn() {
    setSigningIn(true); setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      if (err instanceof DomainRestrictedError) {
        setError(err.message)
      } else {
        console.error(err)
        setError(err.message || 'Sign-in failed. Please try again.')
      }
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100 dark:bg-sage-900">
      <div className="max-w-sm w-full text-center safe-top safe-bottom">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-sage-400 shadow-lg flex items-center justify-center mb-6">
          <PantryLogo />
        </div>
        <h1 className="text-3xl font-semibold text-sage-800 dark:text-cream-100 mb-2">Pantry</h1>
        <p className="text-sage-500 dark:text-cream-300 mb-10 leading-relaxed">
          Track what's in your kitchen, plan meals, never buy duplicates.
        </p>

        {error && (
          <div className="mb-4 text-sm text-terracotta-500 bg-terracotta-500/10 border border-terracotta-500/30 rounded-xl p-3">
            {error}
          </div>
        )}

        <Button onClick={handleSignIn} disabled={signingIn} size="lg" className="w-full">
          <GoogleIcon /> {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </Button>

        <p className="mt-6 text-xs text-sage-400 dark:text-cream-400">
          Access is restricted to authorized accounts.
        </p>
      </div>
    </div>
  )
}

function PantryLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="14" width="36" height="6" rx="3" fill="#faf7f2" />
      <rect x="14" y="26" width="36" height="6" rx="3" fill="#faf7f2" />
      <rect x="14" y="38" width="36" height="6" rx="3" fill="#faf7f2" />
    </svg>
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
