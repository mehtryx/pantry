import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  EmailAuthProvider, linkWithCredential, signOut
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

try {
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn('Firestore persistence failed:', err.code)
  })
} catch (e) {
  console.warn('Firestore persistence not available')
}

const PENDING_EMAIL_KEY = 'pantry_pending_email'

export function initAuth() {
  return new Promise((resolve, reject) => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      completeEmailLinkSignIn()
        .then(() => waitForUser().then(resolve))
        .catch(reject)
      return
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub()
        resolve(user)
      } else {
        signInAnonymously(auth).catch((err) => {
          unsub()
          reject(err)
        })
      }
    })
  })
}

function waitForUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user) }
    })
  })
}

async function completeEmailLinkSignIn() {
  let email = localStorage.getItem(PENDING_EMAIL_KEY)
  if (!email) {
    email = window.prompt('Please confirm your email to finish signing in:')
    if (!email) throw new Error('Email confirmation cancelled')
  }

  const currentUser = auth.currentUser
  try {
    if (currentUser && currentUser.isAnonymous) {
      const credential = EmailAuthProvider.credentialWithLink(email, window.location.href)
      await linkWithCredential(currentUser, credential)
    } else {
      await signInWithEmailLink(auth, email, window.location.href)
    }
  } catch (err) {
    if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
      await signInWithEmailLink(auth, email, window.location.href)
    } else {
      throw err
    }
  } finally {
    localStorage.removeItem(PENDING_EMAIL_KEY)
    if (window.history.replaceState) {
      const url = new URL(window.location.href)
      url.search = ''
      window.history.replaceState({}, '', url.pathname)
    }
  }
}

export async function sendMagicLink(email) {
  const actionCodeSettings = {
    url: window.location.origin + '/',
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  localStorage.setItem(PENDING_EMAIL_KEY, email)
}

export async function signOutUser() {
  await signOut(auth)
  window.location.reload()
}
