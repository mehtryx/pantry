# Update to v0.5 — Shared Household

You and your wife both sign in with your own Google accounts, and see the same pantry, grocery list, meal plans — everything. Any user with a `@benedicthome.com` email is automatically part of the household.

**Migration:** her existing data (currently tagged with her user ID) gets automatically upgraded to household-shared data the first time she signs in with the new version. Zero action needed from her; runs on first load and takes ~1 second.

---

## 1. Update Firestore security rules

The rules changed to enforce the household model.

1. Firebase console → **Firestore Database → Rules**
2. Delete everything in the editor
3. Copy the contents of the new `firestore.rules`, paste in
4. Click **Publish**

**Note:** the rules still enable anonymous users to read/write their own docs. This preserves anonymous fallback (before sign-in) and covers the transition period. It's safe — anonymous users can only see their own data, never household data.

---

## 2. Deploy the code

```
git add .
git commit -m "v0.5: shared household model"
git push
```

Cloudflare auto-deploys.

---

## 3. First sign-in on her phone (migration happens here)

**Safety first:** open the PWA, tap Settings → Export Backup, save the JSON.

Then:

1. She should already be signed in as her Google account (from v0.4)
2. Just open the app — the new code will detect her existing data and migrate it in the background
3. You may see a brief "Migrating data…" indicator in Settings
4. After migration, all her pantry items now belong to the household

If she's still anonymous (didn't complete v0.4 sign-in), have her tap Sign In With Google now. Migration will happen right after linking.

---

## 4. Add yourself to the household

1. On **your** phone, open the app URL from Cloudflare
2. Add to home screen (Share → Add to Home Screen on iOS)
3. Open the PWA → Settings → Sign In With Google
4. Pick your `@benedicthome.com` account
5. You should immediately see her pantry data

Nothing to configure. Because you and she share the domain, you're automatically in the same household.

---

## How the household model works (conceptual)

- Every content doc (items, grocery, recipes, meal plans) has a `householdId` field set to your domain (`benedicthome.com`)
- Firestore rules verify: signed-in user's email domain must equal the doc's householdId
- No membership list to manage — the domain IS the household

If you later want to add a third person with `@benedicthome.com`, they just sign in and they're automatically in.

If you ever need to remove someone: change their email off `@benedicthome.com` in Google Workspace. They'll be denied access on next sign-in (though any device they're already signed in on will keep working until Firebase's auth token refreshes, typically within an hour).

---

## Troubleshooting

**She signs in and her pantry is empty**
→ Migration didn't run. Have her refresh the app. Check the browser console for errors (there should be a "Migrating N legacy items" log). If migration failed, we can restore from the JSON backup.

**You sign in and see your own separate empty pantry**
→ Something went wrong with domain detection. Check the browser console — you should see the household ID resolving to `benedicthome.com`. If it's `undefined` or wrong, share the console output and I'll debug.

**"Permission denied" errors when writing**
→ New Firestore rules didn't publish. Re-publish them.

**Firebase Users list shows two accounts per person (an anonymous and a Google)**
→ Expected if she didn't do the anonymous→Google linking cleanly. Once she's signed in as Google, the anonymous account is orphaned and can be deleted from Firebase console → Authentication → Users. Do not delete her Google account.
