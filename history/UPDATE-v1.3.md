# Update to v1.3 — Departments and Recipe Row Fix

Two changes in this release:

1. **Departments** — organize pantry items by grocery-store section (Produce, Dairy, Frozen, etc.). New Settings section for editing the department list. New sort option on both the Pantry and Grocery pages that groups items under department headers — perfect for reading the grocery list aisle-by-aisle while shopping.
2. **Recipe editor row fix** — the ingredient name was getting squeezed off-screen on narrow phones when the qty/unit controls took over the row. Rows now use a two-line layout: name on top, controls below.

No Firebase changes and no environment variable changes.

---

## Deploy

```
git add .
git commit -m "v1.3: departments, recipe row fix"
git push
```

Cloudflare auto-deploys.

---

## What's new

### Departments (in Settings → Departments)

A new Settings section lets either of you rename, add, remove, or reorder the household's department list. Shared across all household members in real time, same as Locations.

Default seed (auto-populated on first launch of v1.3): Produce, Meat & Seafood, Dairy & Eggs, Frozen, Bakery, Deli, Pantry, Beverages, Snacks, Household, Other.

- **Rename:** tap the pencil icon. Renaming changes the label everywhere; items assigned to that department follow along automatically.
- **Add:** type a name and confirm. A stable ID is generated.
- **Delete:** confirmation dialog warns how many items reference it. Confirming clears those items' department (sets to null) but leaves the items themselves untouched.
- **Reorder:** up/down arrows. The display order here controls the sort order in the grocery list — put "Frozen" last if you want to grab it last.

### Assigning items to a department

- **Adding a new pantry item** (Pantry tab → Add): new "Department (optional)" dropdown, defaults to "No department".
- **Editing an existing item** (tap in Pantry list): new Department picker in the item detail modal. Change it any time.
- **From the Recipe editor** (Recipes → New Recipe → search → Create new item): when creating a fresh pantry item this way, the create-new panel now also asks for department (in addition to unit).
- **Existing items** get `department: null` after upgrade. Assign as you go — no bulk migration needed.

### Sort by department

**On the Pantry page:** new "Sort: Department" option in the sort dropdown. Items are grouped under their department heading in the display order you set in Settings. Unassigned items land under "No department" at the end.

**On the Grocery page:** new Sort dropdown with three options — Added (default, natural add order), Name, and Department. Choosing Department groups the active list under department headings, in your Settings-defined order. Bought items still appear in their own section below (no grouping there — checked-off items don't benefit from it).

Store filter still works alongside department sort — filter to "Costco" while sorted by department to see the aisle-by-aisle Costco list.

### Recipe editor bug fix

When adding an ingredient to a recipe, the row previously tried to fit name + qty input + unit picker + delete button on a single row. On narrow phones the name got crushed. Now:

- Line 1: ingredient name (full width) and a delete button on the right
- Line 2: quantity input and unit picker (unit picker now uses remaining space instead of a fixed width)

Much easier to see what you added.

---

## Behavior notes

- **Sort by Department + Store filter combined** works correctly: filter first, then group the remaining entries by department.
- **Auto-added grocery entries from meal plans** inherit the department of their linked pantry item, so they automatically fall into the right group.
- **The store field** stays independent of department — you might buy dairy at either Costco or Loblaws, so the two are separate axes. Store filter controls "where you're shopping"; department sort controls "how to walk the aisles once inside."
