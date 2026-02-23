
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
You must use **App Hosting** custom domains to ensure Zia works on your main domain. Update these records in Namecheap:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `@` | `35.219.200.14` |
| **TXT** | `@` | `fah-claim=002-02-c0a96bdf-06a8-40fa-b4cb-6ed3ece7929a` |
| **CNAME**| `_acme-challenge...` | `...authorize.certificate-manager.goog.` |

*Note: Delete the old A record (199.36.158.100) pointing to static hosting.*

---

## 3. Gemini AI (Zia) Setup
Zia requires a Gemini API key to function. To set this up securely:

1.  **Generate a Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API Key.
2.  **Add to Live Site**: 
    - Go to **App Hosting** in Firebase Console.
    - Select your `prepezia` backend.
    - Go to **Settings** -> **Environment Variables**.
    - Click **"Add Secret"**.
    - Key: `GEMINI_API_KEY`
    - Value: [Paste your key here]
3.  **Local Testing**: Add `GEMINI_API_KEY=your_key` to your `.env` file in the editor.

---

## 4. Security & API Key Restrictions
If you received an email about a "Publicly accessible API key," follow these steps to restrict it:

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
git commit -m "Secure configuration and update docs"
git push origin main
```
