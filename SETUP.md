# Pantry App — Setup Guide

This walks you through getting the app running. Budget ~20 minutes for the first time.

You'll do these in order:

1. **Install Node.js** (5 min, one-time)
2. **Create a Firebase project** (5 min)
3. **Run the app locally** to confirm it works (2 min)
4. **Push to GitHub** (3 min)
5. **Deploy to Cloudflare Pages** (5 min)

---

## 1. Install Node.js

You need Node 18 or newer.

- **Windows / Mac:** Download the LTS version from https://nodejs.org and run the installer.
- **Verify:** Open a terminal (Command Prompt on Windows, Terminal on Mac) and run:
  ```
  node --version
  ```
  You should see something like `v20.x.x`.

Also install **Git** if you don't have it: https://git-scm.com/downloads

---

## 2. Create the Firebase project

Firebase is Google's backend-as-a-service. The free tier (Spark plan) is genuinely free and you'll be nowhere near the limits.

### 2a. Create the project

1. Go to https://console.firebase.google.com
2. Sign in with a Google account
3. Click **Add project**
4. Name it something like `pantry-app` and click **Continue**
5. When asked about **Google Analytics**, turn it **off** (not needed, keeps things simpler) and click **Create project**
6. Wait for it to finish, then click **Continue**

### 2b. Enable Anonymous Authentication

1. In the left sidebar, click **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, find **Anonymous** in the list, click it
4. Toggle **Enable** on, click **Save**

### 2c. Create the Firestore database

1. In the left sidebar, click **Build → Firestore Database**
2. Click **Create database**
3. Choose a location close to you — for Canada, **`nam5 (us-central)`** or **`northamerica-northeast1 (Montréal)`** are good picks
4. Choose **Start in production mode** (we'll add rules next), click **Create**

### 2d. Add security rules

1. In Firestore, click the **Rules** tab
2. Delete everything in the editor
3. Open the file `firestore.rules` from this project, copy its contents, and paste into the editor
4. Click **Publish**

### 2e. Register your web app and get the config

1. In the left sidebar, click the gear icon → **Project settings**
2. Scroll to **Your apps**, click the **`</>`** (web) icon
3. Give it a nickname like `pantry-web`, **do not** check "Firebase Hosting", click **Register app**
4. You'll see a code snippet with a `firebaseConfig` object. Keep this page open — you need these values in step 3.

---

## 3. Run the app locally

1. Open a terminal in the project folder (the folder with `package.json`)
2. Install dependencies:
   ```
   npm install
   ```
   (Takes a minute or two the first time.)

3. Create your local environment file:
   - Copy `.env.example` to a new file named `.env.local`
   - Open `.env.local` and fill in the values from your Firebase config screen (step 2e). The mapping is:

   | Firebase config key    | .env.local variable                    |
   |------------------------|----------------------------------------|
   | `apiKey`               | `VITE_FIREBASE_API_KEY`                |
   | `authDomain`           | `VITE_FIREBASE_AUTH_DOMAIN`            |
   | `projectId`            | `VITE_FIREBASE_PROJECT_ID`             |
   | `storageBucket`        | `VITE_FIREBASE_STORAGE_BUCKET`         |
   | `messagingSenderId`    | `VITE_FIREBASE_MESSAGING_SENDER_ID`    |
   | `appId`                | `VITE_FIREBASE_APP_ID`                 |

4. Start the dev server:
   ```
   npm run dev
   ```
5. Open the URL it prints (usually http://localhost:5173) in your browser. You should see the Pantry app.
6. Try adding an item. If it appears in the Firebase console under Firestore Database → Data → `items`, you're wired up correctly.

If it doesn't work, the most common causes are: `.env.local` values wrong or missing, Anonymous auth not enabled, or rules not published.

---

## 4. Push to GitHub

1. Create a free GitHub account if you don't have one: https://github.com
2. Create a new **empty** repository on GitHub (no README, no gitignore — leave it blank). Name it something like `pantry-app`.
3. In your terminal, in the project folder, run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/pantry-app.git
   git push -u origin main
   ```
   Replace `YOUR-USERNAME` with your actual GitHub username.

Your `.env.local` file is git-ignored, so your Firebase keys will **not** be pushed. Good.

---

## 5. Deploy to Cloudflare Pages

1. Create a free Cloudflare account: https://dash.cloudflare.com/sign-up
2. In the Cloudflare dashboard, go to **Workers & Pages** in the left sidebar
3. Click **Create** → **Pages** tab → **Connect to Git**
4. Authorize Cloudflare to access GitHub, then pick your `pantry-app` repository
5. On the setup screen:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
6. Click **Environment variables**, and add each of these (same values as your `.env.local`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
7. Click **Save and Deploy**. Wait ~2 minutes for the build.
8. When it finishes, you'll get a URL like `https://pantry-app-abc.pages.dev`.

### 5a. Add the domain to Firebase's allowed list

1. Copy your `pages.dev` URL
2. Back in Firebase console → **Authentication → Settings** tab → **Authorized domains**
3. Click **Add domain**, paste just the hostname part (e.g. `pantry-app-abc.pages.dev`), click **Add**

### 5b. Install to her phone

1. On her phone, open the `pages.dev` URL in **Chrome** (Android) or **Safari** (iPhone)
2. **iPhone:** Tap Share → **Add to Home Screen**
3. **Android:** Chrome should prompt "Add to Home Screen" — if not, tap the ⋮ menu → **Install app** or **Add to Home Screen**

The app icon will now live on her home screen and open full-screen like a native app.

---

## Ongoing: updating the app

Any time we make changes:

```
git add .
git commit -m "describe the change"
git push
```

Cloudflare Pages will auto-build and deploy within ~2 minutes. She'll get the new version next time she opens the app (the PWA service worker updates in the background).

---

## Troubleshooting

**"Missing or insufficient permissions" errors in the browser console**
→ Your Firestore rules didn't publish, or Anonymous auth is off. Re-check 2b and 2d.

**App loads but nothing saves**
→ Check the browser DevTools Console (F12) for errors. Usually a missing env variable.

**Deployed app is blank**
→ Environment variables not set on Cloudflare Pages. Add them (step 5.6) and trigger a re-deploy (in Cloudflare, go to your project → Deployments → **Retry deployment**).

**Can she use it on multiple devices?**
Right now, anonymous auth ties data to a single device. If she wants access from a tablet/laptop too, we'd swap anonymous auth for email-link sign-in — a small change we can make later.
