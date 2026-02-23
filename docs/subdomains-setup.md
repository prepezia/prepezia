# Prepezia Live Launch & Subdomains Guide

This guide explains how to manage your live environment, campus-specific subdomains, and security.

## 1. Your Deployment URLs
Based on your Firebase configuration:
- **Primary Backend URL:** `prepezia--studio-4412321193-4bb31.us-central1.hosted.app`
- **Campus Hubs:** `*.prepezia.com` (e.g., `ug.prepezia.com`)

## 2. DNS Configuration (Namecheap/GoDaddy)
You have already configured the **Wildcard Record**. This is the most important step for campus personalization.

| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | prepezia--studio-4412321193-4bb31.us-central1.hosted.app |

---

## 3. Hosting vs. App Hosting (CRITICAL)
Firebase has two types of hosting. For Prepezia to work, **you must use App Hosting**.

- **Hosting (Classic):** Only serves static files. Zia/AI will NOT work here.
- **App Hosting:** Runs your Next.js server. This is where the "brain" of the app lives.

### How to point your main domain (`prepezia.com`) to the App:
1. Go to the **App Hosting** tab in Firebase.
2. Click on your backend (`prepezia-backend`).
3. Go to **Settings** > **Custom Domains**.
4. Click **Connect Domain** and enter `prepezia.com`.
5. Firebase will provide **A Records** (IP addresses).
6. Copy these into Namecheap (replacing any existing @ records).

---

## 4. Security & API Key Leaks (Action Required)
If you received an email about a "Publicly accessible API key," don't panic. Firebase client keys are meant to be in the browser, but they should be restricted.

### Step 1: Restrict the Key
1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the API key mentioned in the email (starts with `AIza...`).
3. Click the **Edit** icon next to it.
4. Under **Website restrictions**, click **Add**.
5. Add the following patterns:
   - `prepezia.com/*`
   - `*.prepezia.com/*`
   - `localhost:3000/*` (for testing)
6. Under **API restrictions**, select "Restrict key" and choose:
   - Identity Toolkit API
   - Firebase Management API
   - Token Service API
   - Cloud Firestore API
   - Cloud Storage API
7. Click **Save**.

### Step 2: Update App Hosting
1. Go to **App Hosting** in the Firebase Console.
2. Go to your backend -> **Settings** -> **Environment Variables**.
3. Add the variables found in your `.env` file here (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`).
4. This ensures Zia can still talk to Firebase on the live site.

---

## 5. How Personalization Works
The app detects the subdomain automatically. 
- If a user visits `ug.prepezia.com`, the app sets the campus to **University of Ghana**.
- Zia will greet them as a UG student.
- The Past Questions hub will pre-filter for UG papers.

## 6. Testing the Logic
You can test the campus logic without waiting for DNS propagation by adding a query parameter to your local or live URL:
- `https://prepezia.com?campus=ug`
- `http://localhost:3000?campus=knust`
