# Update to v0.8 — Editable Locations, README, cleanup

Three changes in this update:

1. **Editable locations** — Settings now has an "Edit Locations" button. She can rename, add, remove, and reorder storage locations. Deleting a location moves any items with stock there to "Waiting to be Stored" (with a warning before confirming).
2. **Consolidated README** — the setup instructions are all in `README.md` now. The old `SETUP.md` is gone; the individual `UPDATE-v0.*.md` files moved to a `history/` subfolder.
3. **Version stamp** — the footer of Settings now just says "Pantry v0.8" (auto-pulled from `package.json`, so future updates auto-update the version display).

No Firebase changes needed. No environment variable changes.

---

## Deploy

```
git add .
git commit -m "v0.8: editable locations, README consolidation, version stamp"
git push
```

Cloudflare auto-deploys.

---

## First launch after deploy

Locations get stored in the household doc under a `locations` array. The first time either of you opens v0.8, the app seeds the current 7 defaults into that array. Nothing visible changes.

If you or she then goes to Settings → Edit Locations, any changes you make are shared across all household members in real time (same Firestore subscription).

---

## Behavior notes

- **Rename:** tap the pencil icon → edit → checkmark to save. Item stock isn't affected; only the display label changes.
- **Add:** tap "Add Location" → type name → checkmark. A stable ID is generated from the name; if the ID conflicts with an existing one, a suffix is added.
- **Delete:** tap the trash icon → confirmation modal. If any items have stock there, you're warned that their stock will move to "Waiting to be Stored" before you confirm.
- **Reorder:** use the up/down arrows on the left of each row. The display order is also used as the default drain order when meals get cooked (though Phase 2 will let her override per-meal).
- **"Waiting to be Stored"** is a system location and doesn't appear in the editor. It always exists.

---

## Where files went

- `SETUP.md` — merged into `README.md`
- `UPDATE-v0.2.md` through `UPDATE-v0.7.md` — moved to `history/`
- This file — `UPDATE-v0.8.md`, will also live in `history/` after next release
