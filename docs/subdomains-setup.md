
# Prepezia Live Launch & Security Guide

This guide explains how to manage your live environment, campus-specific subdomains, and security.

## 1. DNS Configuration (Final Step)

### For Main Site (prepezia.com)
Update these records in Namecheap to switch from static hosting to the full Zia App engine:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `@` | `35.219.200.14` |
| **TXT** | `@` | `fah-claim=002-02-c0a96bdf-06a8-40fa-b4cb-6ed3ece7929a` |
| **CNAME**| `_acme-challenge_...` | `...authorize.certificate-manager.goog.` |

*Note: Delete the old A record pointing to 199.36.158.100.*

### For Subdomains (Campus Hubs)
| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | `prepezia--studio-4412321193-4bb31.us-central1.hosted.app` |

---

## 2. Fixing Missing Images (Storage Sync)

Images visible in "Studio" are not automatically moved to your production Firebase Storage. You must upload them manually:

1.  Go to **Firebase Console** > **Storage**.
2.  Create a folder named `public`.
3.  Upload your logo, favicon, and feature images there.
4.  If you change the filenames, you must update `src/lib/placeholder-images.json` with the new "Download URLs" provided by the Firebase Console.

---

## 3. Fixing the Build (Environment Variables)

If you are getting a **"Misconfigured Secret"** or **"Permission Denied"** error, or if the **"production"** button is not clickable, follow these exact steps to reset the UI:

### Step A: Reset the Environment
1. Go to **App Hosting** -> Select your backend.
2. Go to **Settings** -> **Environment**.
3. If you see "production" but can't click it: **Click the TRASH ICON** on the far right of that row to delete it.
4. Refresh your browser page.

### Step B: Recreate Correct order
1. Click **"Create environment"**.
2. **Name**: `production`
3. **Branch**: `main`
4. Click **SAVE**. 
5. **DO NOT LEAVE THE PAGE.** Now that it is saved, the word **"production"** in the list will become a blue clickable link. **Click it.**

### Step C: Adding the Keys
1. **Add Secret (The AI Key)**:
   - Click **"Add Secret"**.
   - Key: `GEMINI_API_KEY`
   - Value: [Paste your key from Google AI Studio]
   - **IMPORTANT**: When the popup appears, click **GRANT ACCESS**.
2. **Add Variables (The App Keys)**:
   - Click **"Add Variable"** for each item in your `.env` file (API Key, Project ID, etc.).

---

## 4. Security & API Key Restrictions
To protect your account from unauthorized usage:

1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the key named `Browser key (auto-created by Firebase)`.
3. Under **Application restrictions**, select **Websites**.
4. Add `prepezia.com` and `*.prepezia.com` to the list.
5. Click **Save**.

---

## 5. Deployment Commands
Run these in the terminal to push the latest build configuration:

```bash
git add .
git commit -m "Update favicon and docs"
git push origin main
```
