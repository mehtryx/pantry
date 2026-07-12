import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence, doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import {
  getAuth, signInAnonymously, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  linkWithPopup, linkWithRedirect,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || null

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

function emailAllowed(email) {
  if (!ALLOWED_DOMAIN) return true
  if (!email) return false
  return email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN.toLowerCase())
}

/** Derive household ID from the user's email domain. */
export function householdIdForEmail(email) {
  if (!email) return null
  const domain = email.split('@')[1]
  if (!domain) return null
  return domain.toLowerCase()
}

export class DomainRestrictedError extends Error {
  constructor() {
    super('This app is restricted. Please sign in with an authorized account.')
    this.code = 'app/domain-restricted'
  }
}

/**
 * Ensure the household document exists and the current user is listed as a
 * member. Called after any real (non-anonymous) sign-in.
 */
export async function ensureHouseholdMembership(user) {
  const hid = householdIdForEmail(user.email)
  if (!hid) throw new Error('User has no email')
  const ref = doc(db, 'households', hid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      domain: user.email.split('@')[1].toLowerCase(),
      members: [user.uid],
      memberEmails: [user.email.toLowerCase()],
      createdAt: serverTimestamp(),
    })
  } else {
    const data = snap.data()
    if (!(data.members || []).includes(user.uid)) {
      await updateDoc(ref, {
        members: arrayUnion(user.uid),
        memberEmails: arrayUnion(user.email.toLowerCase()),
      })
    }
  }
  return hid
}

export function initAuth() {
  return new Promise((resolve, reject) => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user && !result.user.isAnonymous) {
          if (!emailAllowed(result.user.email)) {
            await signOut(auth)
            reject(new DomainRestrictedError())
            return
          }
        }
      })
      .catch((err) => {
        console.warn('Redirect result error:', err)
      })
      .finally(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
          if (user) {
            if (!user.isAnonymous && !emailAllowed(user.email)) {
              await signOut(auth)
              signInAnonymously(auth).catch(() => {})
              return
            }
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
  })
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const currentUser = auth.currentUser
  const shouldLink = currentUser && currentUser.isAnonymous

  try {
    let result
    if (shouldLink) {
      result = await linkWithPopup(currentUser, provider)
    } else {
      result = await signInWithPopup(auth, provider)
    }
    if (!emailAllowed(result.user.email)) {
      await signOut(auth)
      await signInAnonymously(auth)
      throw new DomainRestrictedError()
    }
    return result.user
  } catch (err) {
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/operation-not-supported-in-this-environment' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      // fallthrough
    } else if (err.code === 'auth/credential-already-in-use') {
      await signInWithRedirect(auth, provider)
      return
    } else if (err instanceof DomainRestrictedError) {
      throw err
    } else {
      console.warn('Popup sign-in failed, falling back to redirect:', err)
    }

    if (shouldLink) {
      await linkWithRedirect(currentUser, provider)
    } else {
      await signInWithRedirect(auth, provider)
    }
  }
}

export async function signOutUser() {
  await signOut(auth)
  window.location.reload()
}
