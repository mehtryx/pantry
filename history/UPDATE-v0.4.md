# Update to v0.4 — Google Sign-In with Domain Restriction

This replaces the email link sign-in with Google Sign-In, and restricts access to only accounts on your specified email domain.

There are Firebase console changes AND environment variable changes to make. Please do them in order.

---

## 1. Enable Google as a sign-in provider in Firebase

1. Firebase console → your project → **Authentication → Sign-in method**
2. Find **Google** in the list, click it
3. Toggle **Enable** on
4. **Project public-facing name:** something like "Pantry"
5. **Project support email:** pick your email from the dropdown
6. Click **Save**

You can leave **Email/Password** and **Email link** enabled or disabled — the app no longer uses them. Cleaner to disable both.

Leave **Anonymous** enabled — the app still uses it as a placeholder before Google sign-in.

---

## 2. Update Firestore security rules

The new rules enforce the domain restriction server-side (belt-and-suspenders with the client-side check).

1. Firebase console → **Firestore Database → Rules**
2. Delete everything in the editor
3. Copy the contents of the new `firestore.rules` from this update, paste in
4. **The rules file has `benedicthome[.]com` hardcoded** — if that's wrong or you want to change it later, edit the regex string in the rules file and republish
5. Click **Publish**

Note: the domain in `firestore.rules` isn't a secret because Firestore rules are only visible to project admins (i.e. you). It doesn't appear in any client-side code or the deployed bundle. So hardcoding it there is fine and secure.

---

## 3. Add the environment variable

### Locally (`.env.local`)

Add this line to your `.env.local`:

```
VITE_ALLOWED_EMAIL_DOMAIN=benedicthome.com
```

### On Cloudflare Pages

1. Cloudflare dashboard → your Pages project → **Settings → Environment variables**
2. Add a new variable:
   - **Name:** `VITE_ALLOWED_EMAIL_DOMAIN`
   - **Value:** `benedicthome.com`
   - **Environment:** Production (also Preview if you use it)
3. Save

**Important:** Cloudflare doesn't automatically rebuild when env vars change. After saving:
- Go to **Deployments**
- Click the three-dot menu on the latest deployment → **Retry deployment**
- Or just push a new commit — either triggers a rebuild that picks up the new env var

---

## 4. Deploy the code

```
git add .
git commit -m "v0.4: Google sign-in with domain restriction"
git push
```

Cloudflare auto-deploys.

---

## 5. Clean up leftover Firebase auth users

From all the earlier email-link attempts, you may have stale user accounts in Firebase:

1. Firebase console → **Authentication → Users**
2. Delete any users you don't recognize or don't need
3. **Keep** the anonymous user that holds her real data (if she hasn't yet linked to Google)
4. **Keep** any Google account already linked to real data

If you're unsure which is which, sort by "Created" date — the oldest anonymous user is almost certainly hers.

---

## 6. Sign her in with Google

**Safety first:** In the PWA, tap Settings → Export Backup and save the JSON.

Then:

1. Open the PWA on her phone
2. Settings → tap **Sign in with Google**
3. iOS will show the Google account picker — she picks her `@benedicthome.com` account
4. On iPhone this may open the account picker as a popup or as a redirect (whichever the OS decides). Either way, it comes back to the app when done.
5. Settings should now say "Signed in as her@benedicthome.com"

If she picks a non-`benedicthome.com` account by mistake, she'll see: *"This app is restricted. Please sign in with an authorized account."* — she can try again.

---

## What if the popup doesn't work?

On iOS installed PWAs, sometimes the Google popup gets blocked. The app auto-falls-back to redirect mode. What she'll see:

1. Tap Sign in with Google
2. The app navigates away to `accounts.google.com`
3. She picks her account
4. Google redirects back to the app URL
5. The app opens signed in

The one iOS quirk: after the redirect, iOS may open the URL in Safari instead of the PWA. If that happens:
- The sign-in completes in Safari (she'll see the app running in Safari, signed in)
- Force-close the PWA from the app switcher
- Reopen the PWA from the home screen — she'll be signed in there too (Google auth state is shared between Safari and the PWA for the same origin)

---

## Troubleshooting

**"Sign-in failed" with no clear cause**
→ Check DevTools console (or Safari's Web Inspector connected via cable). Usually a Firebase config issue.

**"This app is restricted" but she used her benedicthome.com account**
→ Double-check the env var on Cloudflare exactly matches the domain (no leading `@`, no typo). Then trigger a redeploy.

**Firestore permission errors after sign-in**
→ The rules didn't publish. Republish them in the Firebase console.

**She wants to switch which Google account is linked**
→ Sign Out (Settings). She'll drop back to a new anonymous session. Sign In With Google again with the different account. Note: her data was tied to the original account, so switching accounts means starting fresh unless you use the JSON backup to restore.
