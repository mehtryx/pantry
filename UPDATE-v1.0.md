# Update to v1.0 — Documentation cleanup, milestone release

Phase 1 is done. This release contains no functional changes — just documentation and language cleanup — and marks the transition point before starting Phase 2 (meal planner + recipes).

Changes:

1. **README updates:**
   - Locations description reflects that they're now user-editable (not just the fixed default 7)
   - New "Customization inside the app" section describing palette, mode, font size, and locations settings
   - Data model section notes that the `households` collection now holds location configuration
   - Feature list mentions font size scaling
   - Roadmap notes that Phase 2 meal planning will support per-meal location and quantity selection
   - New "Contributing to README maintenance" note at the bottom, reminding future updates to keep the README current
2. **Gender-neutral language:** all he/him and she/her pronouns replaced with they/them or role-based phrasing throughout README, code comments, and any other text.
3. **Version bump to 1.0** — Phase 1 complete milestone.
4. **History housekeeping:** v0.9's update file moved into `history/` at the start of this changeset.

No Firebase changes, no environment variable changes, no code behavior changes.

---

## Deploy

```
git add .
git commit -m "v1.0: README updates, gender-neutral language, Phase 1 complete"
git push
```

Cloudflare auto-deploys.

---

## What's next: Phase 2

The remaining features from the original ask:

- Recipe library — create, edit, duplicate, rename recipes
- 9-day meal planner — assign recipes to days and meal slots (breakfast/lunch/dinner)
- Per-meal ingredient sourcing — when planning a meal, expand each ingredient row to see which locations have stock and choose which to draw from and how much
- Automatic grocery list reconciliation — when a meal is planned, if there isn't enough stock, the shortfall is auto-added to the grocery list; deleting a planned meal removes those grocery items if nothing else needs them

The plumbing for the meal planner is already in `DataContext` (recipes and mealPlans collections are already subscribed to, reservation calculation is already there, `reconcileGroceryList` and `autoCookPastMeals` are already implemented). Phase 2 is primarily UI work — building out the placeholder MealsPage and RecipesPage.
