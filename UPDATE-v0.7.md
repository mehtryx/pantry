# Update to v0.7 — Palette Picker

Adds six palettes she can pick from, each with its own light and dark variants. Palette and Mode are now independent controls in Settings.

**No Firebase changes, no environment variable changes.** Pure UI/styling update.

---

## Deploy

```
git add .
git commit -m "v0.7: palette picker with six themes"
git push
```

Cloudflare auto-deploys.

---

## What she'll see

Settings now has two sections instead of one "Theme" section:

1. **Palette** — 3×2 grid of color swatches: Sage, Terracotta, Ocean, Honey, Wine, Slate. Tap to preview instantly (change is immediate, no confirmation needed).
2. **Mode** — Light, Dark, Auto (same as before).

Each palette works in both light and dark modes. She can mix and match freely (e.g. Ocean + Dark, Wine + Light).

Both settings persist per-device in localStorage.

---

## Behind the scenes

- The palettes are defined as sets of CSS custom properties in `src/lib/palettes.js`
- When she taps a new palette, `applyPalette()` rewrites the CSS variables on `<html>` — the whole app re-styles in one paint
- Status dots (green/yellow/red) stay universal across all palettes and now have a letterbox outline (white in light mode, dark in dark mode) so they read clearly against any background
- Adding a seventh palette in the future is ~5 minutes: add an entry to `PALETTES` and to `PALETTE_ORDER` in `palettes.js`

---

## Quick tour of each palette

- **Sage** — the original: soft greens, cream. Calm, botanical.
- **Terracotta** — warm rust and clay tones. Rustic Mediterranean kitchen.
- **Ocean** — deep teal primary with coral accents. Cool and coastal.
- **Honey** — amber and gold, warm cream backgrounds. Farmhouse / spice pantry.
- **Wine** — burgundy primary with blush surfaces. Rich and grown-up.
- **Slate** — cool blue-grey with copper accents. Modern and understated.

If none of them click and she wants something specific tuned, tell me the general vibe and I'll add a custom one.
