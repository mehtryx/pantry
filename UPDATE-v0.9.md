# Update to v0.9 — Font Size, layout fix

Small but useful changes:

1. **Font size setting** — new "Font Size" control in Settings (between Mode and Locations) with Small (current, default) / Medium / Large. Scales the entire app proportionally.
2. **Bottom padding fix** — the last card in Settings (the version stamp) no longer tucks under the bottom nav.
3. **History housekeeping** — v0.8's update file moved into `history/`. Going forward, this happens automatically with each release.

No Firebase changes, no environment variable changes.

---

## Deploy

```
git add .
git commit -m "v0.9: font size setting, bottom padding fix"
git push
```

Cloudflare auto-deploys.

---

## How font size works

Under the hood, the setting changes the root `<html>` element's font size:

- **Small (default):** 16px root — the browser default. Everything renders at its original size.
- **Medium:** 18px root — everything ~12.5% larger.
- **Large:** 20px root — everything ~25% larger.

Because Tailwind sizes text, spacing, and icons in `rem` (relative units), they all scale together and the layout stays proportional. Tap targets that were declared in absolute pixels (like the 44px minimum button heights for touch accessibility) stay fixed, so buttons don't get inappropriately huge — text and icons inside them just grow a bit.

Setting persists per device via localStorage, alongside palette and mode. If you like Large on your phone and she likes Medium on hers, both are respected.

---

## Preview letter

Each of the three Font Size buttons shows a large "A" that grows across the three options, so she can see the relative sizing at a glance before tapping.
