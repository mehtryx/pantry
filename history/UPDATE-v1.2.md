# Update to v1.2 — Phase 2 Part 2: Per-Meal Sourcing and Concurrency Safety

Two-part release rounds out Phase 2:

1. **Per-meal ingredient sourcing** — tap any planned recipe entry to open a detail view where you can choose which locations to draw each ingredient from. Auto-cook respects the assignments and falls back to default drain order for anything you don't assign.
2. **Concurrency safety** — all the mutations that could race between two devices editing the same data are now protected. No more risk of double-drained stock when both of you open the app at the same time after a meal auto-cooked.

No Firebase changes and no environment variable changes.

---

## Deploy

```
git add .
git commit -m "v1.2: per-meal sourcing, concurrency safety"
git push
```

Cloudflare auto-deploys.

---

## What's new

### Per-meal ingredient sourcing

Tap any upcoming recipe entry in the meal planner. A detail modal opens showing every ingredient with an expandable panel.

For each ingredient:
- Header shows the name, needed quantity, and status:
  - **"Auto (in stock)"** — you have enough; auto-cook will draw from default order
  - **"Auto — short 2 cup"** — you don't have enough total, and no assignments have been made
  - **"3 cup / 5 cup assigned"** — you've partially assigned; the rest falls back to auto
  - **"Not in stock"** — nothing anywhere
- Tap to expand. See every location that currently has stock of this item, with the amount available at each.
- Type or use the "all" shortcut to assign amounts per location.
- The running total at the bottom shows how much you've assigned vs how much is needed.
- **"Reset to auto"** clears assignments for that ingredient.

Auto-cook logic when the day passes:
1. For each ingredient, if you assigned locations, deduct those exact amounts first
2. Any remaining shortfall drains from your default location order (Settings → Locations)
3. If total available is still less than needed, the shortfall gets logged in the meal snapshot and cooking proceeds

A small **"sourced"** badge appears next to any planned meal that has assignments configured — quick visual so you know which meals have been customized.

Leftovers still don't reserve or drain anything; the detail modal shows a note explaining this if you tap one.

### Concurrency safety (the invisible upgrade)

Every mutation that reads-then-writes the same document is now transaction-protected. Real-world scenarios where this matters:

- **Both of you at the grocery store checking off "milk" at the same time**: the pantry milk stock now correctly gains +2 (one from each grocery entry) instead of racing.
- **Both of you opening the app the morning after a planned meal**: only one device actually cooks the meal; the second one sees "already cooked" and no-ops. Stock is drained exactly once.
- **Both of you editing item stock from item detail simultaneously**: no lost updates. Concurrent changes to different locations of the same item both apply.
- **Both of you putting things away simultaneously**: works correctly. Even into the same target location, quantities add rather than clobber.
- **One person renaming a location while another reorders**: both changes preserved.

Under the hood, this uses Firestore transactions and atomic field increments. It's invisible to normal use — the app feels the same — but it eliminates a class of subtle bugs that would only show up when two of you happen to interact with the same data within seconds.

**One race remains as documented tradeoff:** the automatic grocery-list reconciliation (adding shortfalls when you plan a meal) is not fully transactional because Firestore doesn't allow queries inside transactions. In practice this means if you both plan meals for the same recipe within a couple seconds of each other, you might briefly see a duplicate auto-added grocery entry. The next reconciliation run (triggered by any subsequent plan add/delete) cleans it up. Self-healing, not incorrect for long.

---

## How the per-meal sourcing interacts with reservations

Reservations (which drive the color-coded status on the Pantry page) still count total ingredient needs from all uncooked planned meals, regardless of assignments. This is intentional: reservations track total demand; assignments only affect *where* the app draws from at cook time. So the pantry status colors, grocery list auto-adds, and the meal planner status dots all work the same way whether or not you've assigned sources.

---

## Coming in Phase 3

- UI for the additional recipe fields already in schema: servings, notes/instructions, prep and cook times, tags, photos (photo upload will need Firebase Storage enabled — a separate small setup step)
- Potentially: search across the full history log, mobile widgets, or whatever else emerges as you use the app
