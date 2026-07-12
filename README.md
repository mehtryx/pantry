# Pantry

A personal PWA for tracking household food inventory, grocery lists, and meal planning. Shared across all members of a household via Google sign-in restricted to a single email domain.

**Tech:** React + Vite · Tailwind CSS · Firebase (Firestore + Google Auth) · Cloudflare Pages · vite-plugin-pwa

**Cost:** free at typical household scale. Firebase Spark (free) plan and Cloudflare Pages free tier are both used well under their limits by a family of a few people with a few hundred items.

---

## Features

- Multi-location inventory (7 default storage locations plus a protected "Waiting to be Stored" staging area; storage locations are user-editable — rename, add, remove, reorder)
- Metric and imperial units (g, kg, mL, L, cup, tbsp, tsp, count, package)
- Grocery list with autocomplete against existing items, per-item store tagging, and a "checkout mode" with enlarged tap targets for shopping
- Automatic three-quantity tracking per item (on-hand, incoming, reserved) with color-coded status
- Recipe library — create, edit, duplicate, delete recipes with per-ingredient quantities and pantry-item autocomplete
- 9-day meal planner with breakfast/lunch/dinner slots, multiple entries per slot, and quick "leftover" placeholders that don't consume stock
- Reservations from planned meals automatically add shortfalls to the grocery list; removing a plan cleans them up
- Auto-cook: meals planned for past dates automatically drain their ingredients from stock (defaults to your location display order; Phase 2 v1.2 will add per-meal source overrides)
- Meal history: past cooked meals kept as snapshots so editing recipes later doesn't rewrite history; individually deletable, and a bulk purge for anything older than 30 days
- Household-shared data — everyone in the household sees the same pantry
- 6 color palettes × light/dark/auto modes × small/medium/large font size — all persist per device
- Offline-capable PWA installable on iOS/Android home screen

**Roadmap (not yet built):**
- Per-meal ingredient sourcing (choose which locations to draw from for each ingredient) — Phase 2 v1.2
- Additional recipe fields UI (servings, notes/instructions, prep/cook times, tags, photos) — Phase 3

---

## Setup from scratch

Time budget: ~30 minutes the first time.

### Prerequisites

You'll need:
- **Node.js 18 or newer** — download the LTS from https://nodejs.org
- **Git** — https://git-scm.com/downloads
- A **GitHub account** (free) — https://github.com
- A **Google account** for Firebase
- A **Cloudflare account** (free) — https://dash.cloudflare.com/sign-up
- A Google Workspace or shared email domain if you want to restrict access. If you'd rather use personal Gmail addresses, that works too — see "Optional: domain restriction" below.

Verify Node is installed by opening a terminal and running:
```
node --version
```
You should see `v18.x.x` or higher.

---

### Step 1: Get the code

```
git clone https://github.com/YOUR-USERNAME/pantry-app.git
cd pantry-app
npm install
```

If you're starting from a downloaded zip instead, extract it, `cd` into the folder, and run `npm install`.

---

### Step 2: Create the Firebase project

Firebase provides the database (Firestore) and authentication. The Spark plan (free) is enough for household use.

#### 2a. Create the project

1. Go to https://console.firebase.google.com
2. Click **Add project**
3. Name it (e.g. `pantry-app`), click **Continue**
4. When asked about **Google Analytics**, turn it **off** (not needed, simpler without it) and click **Create project**
5. Wait a minute, then click **Continue**

#### 2b. Enable Anonymous and Google authentication

1. Left sidebar → **Build → Authentication**
2. Click **Get started**
3. Click **Sign-in method** tab
4. Find **Anonymous** in the list, click it, toggle **Enable** on, **Save**
5. Find **Google** in the list, click it, toggle **Enable** on
   - **Project public-facing name:** something like "Pantry"
   - **Project support email:** pick your email from the dropdown
   - Click **Save**

Anonymous is needed as an initial placeholder auth state before the user signs in with Google. Google is what your household members actually use.

#### 2c. Create the Firestore database

1. Left sidebar → **Build → Firestore Database**
2. Click **Create database**
3. Choose a location close to you — for Canada, `northamerica-northeast1 (Montréal)` is a good pick
4. Choose **Start in production mode**, click **Create**

#### 2d. Publish security rules

1. In Firestore Database, click the **Rules** tab
2. Delete everything in the editor
3. Copy the contents of `firestore.rules` from this project and paste in
4. **If you want to restrict access to a specific email domain** (recommended), edit the regex on the `isDomainUser()` line to match your domain. For example, if your family email domain is `smith-family.com`:
   ```
   && request.auth.token.email.matches('.*@smith-family[.]com$');
   ```
   The `[.]` escapes the dot in the regex.
   If you don't want domain restriction, replace that whole check with just `request.auth.token.email != null`.
5. Click **Publish**

#### 2e. Register your web app and copy the config

1. Left sidebar → gear icon → **Project settings**
2. Scroll to **Your apps**, click the **`</>`** (web) icon
3. Nickname it (e.g. `pantry-web`), **do not** check "Firebase Hosting", click **Register app**
4. You'll see a `firebaseConfig` object with values. Keep this page open — you'll need these values in the next step.

---

### Step 3: Configure environment variables locally

1. Copy `.env.example` to `.env.local` in the project root
2. Open `.env.local` and fill in each value from the Firebase config screen:

   | Firebase config key    | .env.local variable                    |
   |------------------------|----------------------------------------|
   | `apiKey`               | `VITE_FIREBASE_API_KEY`                |
   | `authDomain`           | `VITE_FIREBASE_AUTH_DOMAIN`            |
   | `projectId`            | `VITE_FIREBASE_PROJECT_ID`             |
   | `storageBucket`        | `VITE_FIREBASE_STORAGE_BUCKET`         |
   | `messagingSenderId`    | `VITE_FIREBASE_MESSAGING_SENDER_ID`    |
   | `appId`                | `VITE_FIREBASE_APP_ID`                 |

3. **Optional but recommended: domain restriction.** If you set up the domain check in Firestore rules (step 2d), also set:
   ```
   VITE_ALLOWED_EMAIL_DOMAIN=smith-family.com
   ```
   Just the bare domain — no `@`, no quotes. This makes the app show "This app is restricted" for wrong-domain users, before they hit the Firestore rules.

The `.env.local` file is gitignored, so it will not be committed.

---

### Step 4: Test it runs locally

```
npm run dev
```

Open http://localhost:5173. You should see the sign-in screen. Click **Sign In With Google**, pick your account.

- If you set a domain restriction and used the right account: you should land in the Pantry (empty).
- If it says "This app is restricted": you're using an account that doesn't match. Either sign in with an account from the allowed domain, or remove the restriction.

Add a test item on the Pantry tab. Go to Firebase console → Firestore Database → Data. You should see an `items` collection with your test doc.

If any of this fails, see the **Troubleshooting** section at the bottom.

---

### Step 5: Push to GitHub

1. Create a new **empty** repo on GitHub (don't initialize with README or gitignore)
2. In your project folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/pantry-app.git
   git push -u origin main
   ```

Your `.env.local` file with Firebase credentials is not pushed (it's gitignored).

---

### Step 6: Deploy to Cloudflare Pages

1. In the Cloudflare dashboard → left sidebar → **Workers & Pages**
2. Click the **Overview** page for Workers & Pages
3. Click **Create application** → **Pages** tab → **Connect to Git**
4. If prompted, authorize Cloudflare's GitHub app and grant access to your `pantry-app` repo
5. Pick the repo, click **Begin setup**

If you don't see a **Pages** tab and only get the newer Workers-style setup, look for a **Pages** option in the sub-menu. If the UI truly only offers Workers, this direct URL forces the classic flow:

```
https://dash.cloudflare.com/?to=/:account/pages/new/provider/github
```

6. Setup screen:
   - **Framework preset:** None (or Vite if it's an option — but the Vite preset in the newer UI is actually VitePress, which is wrong; use None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`

7. Click **Environment variables**, add each of these (values from your `.env.local`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_ALLOWED_EMAIL_DOMAIN` (if you set one)

   All should be added to the **Production** environment (also Preview if the option appears).

8. Click **Save and Deploy**. Wait ~2 minutes.
9. You'll get a URL like `https://pantry-app-abc.pages.dev`.

#### 6a. Authorize the deployed domain in Firebase

1. Copy your `pages.dev` URL
2. Firebase console → **Authentication → Settings** tab → **Authorized domains**
3. Click **Add domain**, paste just the hostname (e.g. `pantry-app-abc.pages.dev`), click **Add**

If you skip this step, Google sign-in on the deployed URL will silently fail.

---

### Step 7: Install on a phone

1. Open the `pages.dev` URL in Safari (iOS) or Chrome (Android)
2. Sign in with Google
3. Verify you land in the Pantry
4. Install to home screen:
   - **iOS:** tap Share → **Add to Home Screen**
   - **Android:** Chrome may prompt automatically, or tap ⋮ → **Install app**

The icon lives on the home screen and opens full-screen like a native app.

Repeat for any other household member on their own phone. They sign in with their own Google account (if their email matches your allowed domain, they instantly share the same pantry data).

---

## Ongoing: updating the app

Any time the code changes:

```
git add .
git commit -m "describe the change"
git push
```

Cloudflare Pages auto-builds and deploys within ~2 minutes. Users get the new version next time they open the app.

**If you change environment variables** on Cloudflare, you must manually trigger a rebuild (env vars are baked in at build time): Cloudflare dashboard → your project → Deployments → three-dot menu on latest → **Retry deployment**.

**If you change Firestore rules**, publish them via the Firebase console. No deploy needed.

---

## Customization inside the app

All of these live under Settings and persist per device (each household member can pick their own):

- **Palette:** Sage, Terracotta, Ocean, Honey, Wine, Slate
- **Mode:** Light, Dark, Auto (follows system)
- **Font Size:** Small, Medium, Large — scales the entire app proportionally
- **Locations:** rename, add, remove, or reorder storage locations. Location changes ARE shared across the household in real time.

---

## Data model overview

Four Firestore collections, all keyed on `householdId` (which equals your email domain):

- **`items`** — pantry items with per-location stock, unit, name
- **`grocery`** — grocery list entries; each links back to an item once bought, plus auto-added entries from meal-plan shortfalls
- **`recipes`** — recipe library with name, ingredients (each linked to an itemId), plus placeholder fields for Phase 3 (servings, notes, prep/cook times, tags, photo)
- **`mealPlans`** — date + slot + either `recipeId` or `leftoverText`, plus a `snapshot` written at auto-cook time so history stays stable when recipes change

Plus a **`households`** collection with one doc per domain, tracking members and storage-location configuration.

Rules enforce that only signed-in users on the allowed domain can read or write, and only within their own household.

---

## Local development

- `npm run dev` — start dev server at localhost:5173
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally

To test the PWA install flow, use `npm run preview` (dev mode disables service worker registration for hot-reload).

---

## Optional: domain restriction

The app supports (and this README assumes you want) restricting access to a single email domain. This is the sensible default for a household app.

If you'd rather allow any Google account (e.g. mixing personal Gmail + Outlook + iCloud emails):

1. In `firestore.rules`, change:
   ```
   && request.auth.token.email.matches('.*@YOUR-DOMAIN[.]com$');
   ```
   to:
   ```
   && request.auth.token.email != null;
   ```
2. Do NOT set `VITE_ALLOWED_EMAIL_DOMAIN` in your `.env.local` (leave it blank or delete the line)

Anyone who signs in with any Google account will get their own separate household (keyed by their email domain). Multiple households on separate domains stay isolated from each other.

---

## Troubleshooting

**Local `npm run dev` shows "Connecting…" forever**
→ `.env.local` values are wrong or missing. Double-check they match your Firebase config exactly (no quotes needed around values).

**"Missing or insufficient permissions" errors in the browser console**
→ Firestore rules didn't publish, or the account you're signed in with doesn't match your allowed domain. Check both.

**"This app is restricted. Please sign in with an authorized account."**
→ Working as intended if you're signed in with a non-matching email. Sign out, sign in with an allowed-domain email.

**Deployed app is blank**
→ Environment variables not set on Cloudflare Pages. Add them, then trigger a rebuild.

**Google sign-in on deployed URL flashes and returns unsigned in**
→ Your `pages.dev` URL isn't in Firebase's authorized domains list (step 6a).

**Deployed app still shows old version after pushing**
→ Cloudflare hasn't rebuilt yet (check Deployments page), OR the PWA service worker hasn't updated. Force-close the PWA and reopen it. In stubborn cases, delete and reinstall the PWA to the home screen.

**Signed in on Safari but the installed PWA still shows the sign-in screen**
→ iOS keeps separate auth storage for Safari vs installed PWAs. Sign in inside the PWA specifically: tap the Pantry icon on the home screen → sign in there.

**Firebase Authentication → Users list shows multiple accounts for the same person**
→ Anonymous placeholder sessions accumulate from testing. Delete anonymous users (keep the Google-authenticated ones).

---

## Costs / free-tier limits

**Firebase Spark plan (free):**
- 1 GB Firestore storage — you'll use a few MB
- 50,000 reads/day — you'd have to open the app hundreds of times a day to hit this
- 20,000 writes/day — same
- 50,000 auth users / month — n/a for household use

**Cloudflare Pages (free):**
- Unlimited requests / bandwidth
- 500 builds/month — plenty for the level of change here

Neither service will bill you at household scale. If you get near any limit, something is very wrong (or the household has grown a lot).

---

## Project structure

```
src/
  App.jsx                — routes + sign-in gate
  main.jsx               — entry point
  index.css              — tailwind + theme variables
  contexts/
    DataContext.jsx      — Firestore subscriptions + mutations
    ThemeContext.jsx     — palette + mode + font size state
  lib/
    firebase.js          — auth + Firestore init
    constants.js         — locations, units, quantity formatter
    palettes.js          — theme definitions
    status.js            — color-coded stock status logic
  components/
    UI.jsx               — Button, Input, Card, Modal, EmptyState
    BottomNav.jsx        — tab bar
    LocationsEditor.jsx  — rename/add/remove/reorder storage locations
    RecipeEditor.jsx     — create/edit recipe with ingredient autocomplete
  pages/
    SignInPage.jsx       — pre-auth screen
    PantryPage.jsx       — house inventory (with Put Away chip when items are waiting)
    GroceryPage.jsx      — grocery list
    PutAwayPage.jsx      — assign locations to bought items (accessed via chip)
    MealsPage.jsx        — 9-day meal planner with history
    RecipesPage.jsx      — recipe library
    SettingsPage.jsx     — palette, mode, font size, locations, sign out, backup

firestore.rules          — security rules (paste into Firebase console)
.env.example             — template for local env vars
vite.config.js           — Vite + PWA config
tailwind.config.js       — semantic color tokens
history/                 — per-version release notes
README.md                — this file
```

---

## Contributing to README maintenance

When adding a new feature or setting in a release, update the **Features** section at the top and the **Customization inside the app** section if it's user-facing. If the data model changes, update **Data model overview**. Keeping the README current with each release keeps setup instructions and roadmap trustworthy.
