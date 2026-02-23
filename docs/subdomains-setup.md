# Prepezia Live Launch & Subdomains Guide

This guide explains how to manage your live environment, campus-specific subdomains, and security.

## 1. Your Deployment Status
- **Primary Backend URL:** `prepezia--studio-4412321193-4bb31.us-central1.hosted.app`
- **Campus Hubs:** `*.prepezia.com` (e.g., `ug.prepezia.com`)

---

## 2. DNS Configuration (Final Step)
You have already configured the **Wildcard Record** in Namecheap. Ensure it looks exactly like this:

| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | `prepezia--studio-4412321193-4bb31.us-central1.hosted.app` |

---

## 3. Deployment & Redeploying
If you encounter build errors (like the `ScrollArea` error), run these commands in your Terminal to push fixes:

```bash
git add .
git commit -m "Fix build errors and imports"
git push origin main
```

Firebase App Hosting will automatically start a new **Rollout**. You can monitor this in the **Rollouts** tab of your backend.

---

## 4. Hosting vs. App Hosting (CRITICAL)
Firebase has two types of hosting. For Prepezia to work, **you must use App Hosting**.

- **Hosting (Classic):** Only serves static files. AI/Zia will NOT work here.
- **App Hosting:** Runs your Next.js server. This is where the AI logic lives.

### How to point your main domain (`prepezia.com`) to the App:
1. Go to the **App Hosting** tab in Firebase.
2. Click on your backend (`prepezia`).
3. Go to **Settings** > **Custom Domains**.
4. Click **Connect Domain** and enter `prepezia.com`.
5. Firebase will provide **A Records** (IP addresses).
6. Copy these into Namecheap (replacing any existing @ records).

---

## 5. Security & API Keys
Google may email you about a "Publicly accessible API key." **This is normal for Firebase**, but you should restrict it for safety:

### How to Restrict your Key:
1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the key named `Browser key (auto-created by Firebase)`.
3. Under **Application restrictions**, select **Websites**.
4. Add `prepezia.com` and `*.prepezia.com` to the list of allowed referrers.
5. Under **API restrictions**, select **Restrict key** and check:
   - Identity Toolkit API
   - Firebase Management API
   - Cloud Firestore API
   - Cloud Storage API
6. Click **Save**.

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
