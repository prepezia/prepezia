
# Prepezia Live Launch & Security Guide

This guide explains how to manage your live environment, campus-specific subdomains, and security.

## 1. Your Deployment Status
- **Primary Backend URL:** `prepezia--studio-4412321193-4bb31.us-central1.hosted.app`
- **Campus Hubs:** `*.prepezia.com` (e.g., `ug.prepezia.com`)

---

## 2. DNS Configuration (Final Step)

### For Subdomains (Campus Hubs)
| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | `prepezia--studio-4412321193-4bb31.us-central1.hosted.app` |

### For Main Site (prepezia.com)
Update these records in Namecheap to switch from static hosting to the full Zia App engine:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `@` | `35.219.200.14` |
| **TXT** | `@` | `fah-claim=002-02-c0a96bdf-06a8-40fa-b4cb-6ed3ece7929a` |
| **CNAME**| `_acme-challenge...` | `...authorize.certificate-manager.goog.` |

*Note: Delete the old A record pointing to 199.36.158.100.*

---

## 3. Gemini AI (Zia) & Firebase Setup (FIXING THE BUILD)
The "Misconfigured Secret" error happens because the code expects keys that aren't in the console yet.

1.  **Generate a Gemini Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API Key.
2.  **Go to App Hosting Settings**: 
    - Go to **App Hosting** in Firebase Console.
    - Select your `prepezia` backend.
    - Go to **Settings** -> **Environment**.
3.  **OPEN THE ENVIRONMENT**:
    - You will see a list/table with the word **"production"**.
    - **CRITICAL**: Click on the word **"production"** to enter that environment's settings.
4.  **Add Secret (Zia Key)**:
    - Click **"Add Secret"**.
    - Key: `GEMINI_API_KEY`
    - Value: [Paste your Gemini key]
    - **IMPORTANT**: If prompted to "Grant Access" to the service account, click **GRANT**.
5.  **Add Variables (Firebase Config)**:
    - Click **"Add Variable"** for each item in your `.env` file:
    - `NEXT_PUBLIC_FIREBASE_API_KEY`
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    - `NEXT_PUBLIC_FIREBASE_APP_ID`

---

## 4. Security & API Key Restrictions
To protect your account from unauthorized usage:

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

## 5. Deployment Commands
Run these in the terminal to push fixes and redeploy:

```bash
git add .
git commit -m "Update docs and clean config"
git push origin main
```
