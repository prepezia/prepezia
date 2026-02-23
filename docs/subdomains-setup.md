# Prepezia Live Launch & Subdomains Guide

This guide explains how to manage your live environment, campus-specific subdomains, and security.

## 1. Your Deployment URLs
Based on your Firebase configuration:
- **Primary Backend URL:** `prepezia--studio-4412321193-4bb31.us-central1.hosted.app`
- **Campus Hubs:** `*.prepezia.com` (e.g., `ug.prepezia.com`)

---

## 2. DNS Configuration (Namecheap/GoDaddy)
You have already configured the **Wildcard Record**. 

| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | prepezia--studio-4412321193-4bb31.us-central1.hosted.app |

---

## 3. Triggering Your First Release
If your dashboard says "Waiting on your first release":
1. Click the **"Create rollout"** button.
2. Select the **`main`** branch.
3. Click **"Rollout"**.
4. Firebase will now pull your code from GitHub and start the build. This takes about 3-5 minutes.

---

## 4. Hosting vs. App Hosting (CRITICAL)
Firebase has two types of hosting. For Prepezia to work, **you must use App Hosting**.

- **Hosting (Classic):** Only serves static files. Zia/AI will NOT work here.
- **App Hosting:** Runs your Next.js server. This is where the "brain" of the app lives.

### How to point your main domain (`prepezia.com`) to the App:
1. Go to the **App Hosting** tab in Firebase.
2. Click on your backend (`prepezia`).
3. Go to **Settings** > **Custom Domains**.
4. Click **Connect Domain** and enter `prepezia.com`.
5. Firebase will provide **A Records** (IP addresses).
6. Copy these into Namecheap (replacing any existing @ records).

---

## 5. Security & Environment Variables
If the rollout fails or Zia doesn't respond, ensure your environment variables are set.

### Step 1: Add Secrets (Best Practice)
1. Go to **App Hosting** > **Settings** > **Environment Variables**.
2. For sensitive keys (like `GEMINI_API_KEY`), use the **"Add Secret"** button.
3. For public client-side keys (like `NEXT_PUBLIC_FIREBASE_API_KEY`), you can add them as regular variables.

### Step 2: Update App Hosting
1. Add all `NEXT_PUBLIC_` variables found in your `.env` file to the App Hosting backend settings.
2. This ensures the live site knows which Firebase project to talk to.

---

## 6. How Personalization Works
The app detects the subdomain automatically. 
- If a user visits `ug.prepezia.com`, the app sets the campus to **University of Ghana**.
- Zia will greet them as a UG student.
- The Past Questions hub will pre-filter for UG papers.

## 7. Testing the Logic
You can test the campus logic without waiting for DNS propagation by adding a query parameter to your local or live URL:
- `https://prepezia.com?campus=ug`
- `http://localhost:3000?campus=knust`
