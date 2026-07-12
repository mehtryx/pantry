# Update to v1.1 — Phase 2 Part 1: Recipes and Meal Planner

Big release. Adds the recipe library, 9-day meal planner, meal history, and rearranges the bottom nav. Automatic grocery reconciliation from planned meals is included; per-meal ingredient sourcing overrides land in v1.2.

No Firebase changes and no environment variable changes.

---

## Deploy

```
git add .
git commit -m "v1.1: recipe library, meal planner, meal history"
git push
```

Cloudflare auto-deploys.

---

## What's new

### Recipes (new bottom-nav tab, replacing Put Away)

- Library view searchable by name, sorted alphabetically
- Create a recipe: give it a name and add ingredients
- Ingredient row is autocomplete-driven: type "cinna" and get any matching pantry items
- If the ingredient isn't in your pantry yet, "Create new item" appears at the bottom of the suggestions — one tap creates a zero-stock pantry item with a chosen unit, and adds it to the recipe
- Each ingredient has an editable quantity and unit
- Duplicate button on any recipe creates a copy with "(copy)" appended, which you can rename
- Delete is blocked if any future or current uncooked meal plan references the recipe (with a helpful modal listing the blockers)
- Editing a recipe: if you change the ingredient list, any *past* uncooked meal plans of this recipe are removed (they were about to auto-cook with stale numbers); future/today plans update their reservations automatically

Phase 3 will expose Servings, Notes, Prep Time, Cook Time, Tags, and Photo fields. The schema already stores them, so no data migration will be needed later.

### Meal Planner

- New sticky top bar with three icons: **Today** (jumps view to today's card), **History** (opens the history modal), **Recipes** (jumps to the recipe library)
- 9-day rolling view starting today. "Show more days" button at the bottom to extend the view in 7-day chunks
- Each day is a card with Breakfast / Lunch / Dinner sections
- Each section is a list of entries — tap "+ Add" to append; slots can hold multiple entries (e.g. Dinner: "Beef Stroganoff" + "Birthday Cake")
- Adding an entry opens a picker with a **"+ Add a leftover"** button at the top and a recipe search list below

### Leftovers

- Leftovers are lightweight — no ingredients, no recipe doc, no stock impact
- Type "Spaghetti" and the app displays "Leftover Spaghetti" in the meal slot
- Auto-clears when the day passes (goes into history for the record)

### Status dots on planned meals

Each planned recipe entry gets a color dot:
- **Green:** you have enough of every ingredient on hand
- **Yellow:** short on something, but the grocery list already has it
- **Red:** short and not yet on the grocery list (though auto-add should catch this — see below)
- **Gray:** leftover, or the recipe was deleted

### Automatic grocery reconciliation

When you plan a meal, if your on-hand + grocery-list-pending falls short of what's reserved across all planned meals, the shortfall is auto-added to the grocery list (labeled "from meal plan"). When you remove a plan, those auto-adds are cleaned up if nothing else needs them.

This runs on plan add, plan delete, and continuously as inventory changes.

### Meal history

- History modal (top-bar icon) shows all cooked meals, most recent first, searchable by name
- Each entry shows recipe name (frozen at cook time), date, and slot
- "Cook again" button: opens a date/slot picker to re-plan the same recipe (or leftover) on a future day
- Individual entries can be deleted if they're less than 30 days old
- Bottom of the modal: bulk "Delete all entries older than 30 days" button

Because history uses a snapshot of the recipe as it was when auto-cooked, editing the recipe later doesn't change what appears in history.

### Auto-cook

Meals with a past date are automatically marked cooked on:
- App load
- Each time the tab/PWA becomes visible after being backgrounded
- A 5-minute interval while the app is open (catches midnight rollover)

When a meal auto-cooks:
- Its ingredients drain from stock in your location display order (kitchen locations first if that's how you've ordered them)
- A `snapshot` of the recipe ingredients is written into the meal plan doc — this becomes the history record
- Leftovers just mark cooked; no stock change

### Pantry page: Put Away chip

The Put Away tab was removed from the bottom nav. Instead:
- When any item has quantity in "Waiting to be Stored", a warm chip appears at the top of the Pantry page: "N items waiting to be stored →"
- Tap the chip to go to the Put Away view

### Pantry page: Empty / no demand filter

- New option at the bottom of the location filter dropdown: **"Empty / no demand"**
- Selecting it shows only items with zero on-hand, zero incoming, and zero reservations
- Useful for cleaning up unused pantry items after building a recipe library
- Empty items are hidden from the default view (they used to clutter the list once you added many recipe-only items)
- Search still finds empty items — so if you type "cinna" while adding a recipe ingredient, existing "Cinnamon" shows up even if it's not currently stocked

---

## Behavior notes worth flagging

**When editing a recipe changes reservations mid-week:** if a future meal plan referencing this recipe now needs a different amount of an ingredient, the grocery-list auto-additions update on the fly.

**Deleting a recipe with cooked history:** allowed. The history entries survive because they use the snapshot, not the live recipe. Cooking again from history assumes the recipe still exists — if it doesn't, "Cook again" will not work (the entry shows "(deleted recipe)" and the button just fails silently).

**Timezones:** auto-cook uses the device's local date. So if you're in Toronto, a Tuesday meal will auto-cook when the app is first opened/visible on Wednesday (Toronto time).

---

## Coming in v1.2

Per-meal ingredient sourcing: tap an ingredient in an upcoming meal to see which locations currently have stock and choose how much to draw from each. Auto-cook will respect these overrides, falling back to default order for anything left unassigned.
