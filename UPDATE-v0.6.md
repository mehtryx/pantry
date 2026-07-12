# Update to v0.6 — Sign-in required, bug fix, cleanup

Three changes in this update:

1. **Bug fix:** Quantity display now spaces `cup`, `count`, and `package` from the number (`3 count` instead of `3count`). Metric units (`500g`, `2L`) stay attached.
2. **Cleanup:** Removed the one-time data migration code, since your data is now in the household model.
3. **Sign-in gate:** The app now shows a sign-in screen on first launch. Anonymous browsing/storage is completely gone. This closes the small window where data could theoretically be created before sign-in.

---

## 1. Update Firestore rules (tightened)

The rules now strictly require a signed-in `@benedicthome.com` user. No more legacy `uid` fallback.

1. Firebase console → **Firestore Database → Rules**
2. Replace with the new `firestore.rules` contents
3. Publish

**Do NOT publish these rules until you've verified all existing data has `householdId` set.** If any docs still have only `uid`, they'll become inaccessible. To check:

- Firebase console → Firestore Database → Data
- Click into any doc under `items` or `grocery`
- Confirm you see `householdId: "benedicthome.com"` on it

If any doc is missing `householdId`, the v0.5 migration didn't complete for that doc. Publish the v0.5 rules again first, sign in as her and refresh (migration will retry), verify, then come back to v0.6 rules.

---

## 2. Deploy the code

```
git add .
git commit -m "v0.6: sign-in gate, formatting fix, migration cleanup"
git push
```

Cloudflare auto-deploys.

---

## 3. Notes on the sign-in gate behavior

- When either of you opens the app, if you're not signed in with Google, you'll see the sign-in screen instead of the pantry
- Sign Out (in Settings) drops back to the sign-in screen
- Anyone opening the app URL from a browser they're not signed in on will see the sign-in screen — no way to accidentally create anonymous data
- First launch on a new device requires network (to complete Google sign-in). After that, Firestore's offline persistence keeps working without network.

---

## Nothing else to do

No environment variable changes, no user cleanup needed. Just publish rules → push → done.
