# Update to v0.3 — Paste-Link Sign-In (iOS PWA fix)

Fixes the iOS problem where the magic sign-in link always opens in Safari instead of the installed PWA. Now she can copy the link and paste it inside the PWA to complete sign-in without ever leaving the app.

No Firebase console changes needed. Just push and deploy.

---

## Deploy

```
git add .
git commit -m "v0.3: paste-link sign-in fallback for iOS PWA"
git push
```

Cloudflare Pages auto-deploys in ~2 min.

---

## First, clean up the mess from the previous attempt

Before she tries again, we need to clear the empty email account that got created in Safari earlier:

1. **Firebase console → Authentication → Users tab**
2. You'll see two users (or more): the anonymous one (her real data) and one or more email accounts
3. **Delete the email account(s)** — click the three-dot menu → Delete account. Keep the anonymous user.
4. **In Safari**, if she's still signed in with her email there, sign out (or just leave it — the empty account is gone from Firebase now)

---

## The new sign-in flow (do this in the PWA on her phone)

1. **First, tap Settings → Export Backup** and save the JSON somewhere safe (safety net)
2. In the PWA, go to Settings → enter her email → **Send Sign-In Link**
3. She'll see a new screen with 3 numbered steps
4. Open Mail, find the email from Firebase
5. **Long-press the sign-in link** (not tap — long-press)
6. From the menu, choose **Copy Link**
7. Switch back to the PWA (double-tap home/swipe up to switcher, or reopen from home screen)
8. Tap **Paste Sign-In Link**
9. If iOS asks "Allow Pantry to paste from Mail?" tap **Allow**
10. Sign-in completes, Settings now shows "Signed in as her@email.com"

If Paste doesn't work (some iOS versions block clipboard reads), there's a fallback: tap "Paste doesn't work? Enter link manually" and paste into the text field, then tap Sign In.

---

## Notes

- If she accidentally taps the link (instead of long-press) and Safari opens: that's fine, it just consumes the token. She'll need to go back to the PWA and start over — tap "Use a different email" then send a fresh link.
- Each sign-in link is single-use and expires after ~1 hour.
- Once signed in, she stays signed in essentially forever on that device.
- Service worker also updated to activate new versions faster — future updates should apply within a minute of Cloudflare deploying, without needing a reinstall.

---

## For your Safari session (optional)

If you were signed in on Safari with a now-deleted email account, when you refresh you'll be dropped to a new anonymous session (empty). To see her data from Safari:

1. Wait until she's completed sign-in on her PWA (linking the email to her real data)
2. In Safari (on your device or hers), go to Settings → send sign-in link → paste it in
3. Because the email is now linked to her real UID, signing in from anywhere gives you access to her data
