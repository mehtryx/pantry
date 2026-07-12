# Update to v0.2 — Email Sign-In

This update adds optional email sign-in so her data survives Safari clearing storage, phone changes, etc. Anonymous mode still works as the default; email is opt-in from the Settings screen.

**Important:** For existing data to be preserved, she must sign in with email on the device that currently has her data (i.e. her phone). Firebase will link her anonymous account to the email, keeping the same underlying ID.

---

## 1. Firebase console changes (one-time, ~3 min)

### 1a. Enable Email Link sign-in

1. Firebase console → your project → **Build → Authentication**
2. Click the **Sign-in method** tab
3. Find **Email/Password** in the list and click it
4. Toggle **Enable** on
5. **Also toggle on "Email link (passwordless sign-in)"** — this is the setting we actually use
6. Click **Save**

Leave **Anonymous** enabled too — the app still uses it before she signs in with email.

### 1b. Confirm authorized domains

1. Still in Authentication → **Settings** tab → **Authorized domains**
2. Verify `localhost` and your `pages.dev` URL are both listed
3. If your Cloudflare Pages URL isn't there, add it now

That's it for Firebase.

---

## 2. Deploy the update

Replace the contents of your project folder with the new files, then:

```
git add .
git commit -m "Add email sign-in with anonymous linking"
git push
```

Cloudflare Pages will auto-build and deploy in ~2 minutes. No changes needed to environment variables.

---

## 3. Have her sign in (do this on HER phone with her existing data)

**Before starting, have her tap Settings → Export Backup and email the JSON to herself.** This is belt-and-suspenders — if anything goes sideways during linking, we can restore from the JSON.

Then:

1. On her phone, open the app (make sure she sees her existing pantry items)
2. Go to **More** (Settings) tab
3. Under **Account**, type her email address
4. Tap **Send Sign-In Link**
5. She'll see "Check your email"
6. **Important:** She needs to open the email and tap the link **on the same phone** — otherwise Firebase can't link the accounts and her data would stay tied to the anonymous session
7. When she taps the link, the app opens and completes sign-in
8. Settings should now show "Signed in as her@email.com"

Her UID stays the same, so all items, grocery entries, everything continues to work.

### If the link opens in the wrong browser

On iPhone, magic links might open in Safari even if she originally installed the PWA to her home screen. If that happens:
- The sign-in still completes correctly in Safari
- Have her close Safari and open the PWA from her home screen — she'll already be signed in there because it's the same Safari storage under the hood

If she accidentally opens the link on a *different* device (e.g. laptop) before doing so on her phone:
- The linking will fail because there's no anonymous session on that device to link
- She'd end up with a new empty account associated with her email
- Her original data would still be on her phone under the anonymous UID
- Recovery: on her phone, tap "Use a different email" if she wants to try again, or contact me — we can rescue the data via the JSON backup

---

## 4. (Optional) Sign in on additional devices

Once she's signed in on her phone, she can sign in with the same email on a tablet or laptop:

1. Open the app URL on the new device
2. Go to Settings → Account
3. Enter the same email → Send Sign-In Link
4. Open the email on that device, tap the link
5. She now has full access to the same pantry data from that device too

---

## Troubleshooting

**"Failed to send sign-in link"**
→ Email Link provider not enabled in Firebase console (step 1a). Enable it and try again.

**Link email never arrives**
→ Check spam folder. Firebase sends from `noreply@your-project-id.firebaseapp.com` which sometimes gets flagged.

**Tapped the link, still shows Sign In screen**
→ Try refreshing the page. If it persists, check the browser console for errors and let me know.

**She wants to switch which email is associated**
→ Sign out (Settings → Sign Out), then send a fresh link to the new email. Note: signing out drops her back to a *new* anonymous session, so her data won't be there until she signs in with the linked email again.
