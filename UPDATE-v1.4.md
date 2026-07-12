# Update to v1.4 — Department on Grocery Add

Adds a Department picker to the Add-to-Grocery modal. Choosing a department writes it back to the linked pantry item (single source of truth), so setting a department once from the grocery list means every future grocery entry for that item inherits it.

No Firebase or environment variable changes.

---

## Deploy

```
git add .
git commit -m "v1.4: department on grocery add"
git push
```

Cloudflare auto-deploys.

---

## What's new

### Add to Grocery modal — Department picker

New field between Unit and Store: **Department (optional)**.

Three behaviors depending on how you're adding:

- **Picking an existing pantry item from autocomplete:** the picker pre-fills with that item's current department, with a small "from item" hint next to the label. Changing the picker updates the pantry item's department for good.
- **Typing a brand-new name (no autocomplete match):** the picker starts empty. Whatever you choose gets carried forward when the item is auto-created at "mark bought" time — so the new pantry item starts with the correct department.
- **Leaving it as "No department":** existing behavior; no change to the item.

### Why it writes back to the pantry item

Rather than storing a department on each grocery entry, the department lives on the pantry item as the single source of truth. This means:

- Setting "Milk → Dairy" once means every future grocery entry for milk inherits Dairy
- The pantry list, grocery list, and any future entries all agree on the same department for the same item
- No divergence between what department shows in the pantry view vs the grocery view

If you want to reclassify an item's department after the fact — for example, moving "Yogurt" from "Dairy & Eggs" to a new "Snacks" department — you can do it from either the pantry item detail (Pantry tab → tap the item) or from a fresh grocery entry, and the change applies everywhere.
