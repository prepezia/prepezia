
# Prepezia Live Launch & Security Guide

This guide explains how to manage your live environment, campus-specific subdomains, and security.

## 1. DNS Configuration (Final Step)

### For Main Site (prepezia.com)
Update these records in Namecheap to switch from static hosting to the full Zia App engine:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `@` | `35.219.200.14` |
| **TXT** | `@` | `fah-claim=002-02-c0a96bdf-06a8-40fa-b4cb-6ed3ece7929a` |
| **CNAME**| `_acme-challenge_5fs6avd454ah3pgk` | `b763e856-13df-493b-9c5d-1bbc4212fa8e.10.authorize.certificate-manager.goog.` |

---

## 2. Fixing Subdomains (ERR_CONNECTION_CLOSED)

Because you are using **App Hosting**, subdomains like `ug.prepezia.com` must be explicitly added to the App Hosting console to receive an SSL certificate.

### How to fix:
1. Go to **Firebase Console** > **App Hosting**.
2. Select your backend (`prepezia`).
3. Go to **Settings** > **Custom Domains**.
4. Click **Add Domain**.
5. Type `ug.prepezia.com` (or your desired campus subdomain).
6. Firebase will begin provisioning an SSL certificate. This can take **1-2 hours**.
7. **Note**: You do NOT need to change Namecheap if you already have the `*` CNAME record. Firebase just needs to "activate" the subdomain on its end.

---

## 3. Fixing Missing Images (Storage Sync)

Images visible in "Studio" are not automatically moved to your production Firebase Storage.

### Status:
- [x] **Logo & Favicon**: Working correctly!
- [x] **Feature Images**: Now visible on the main site.
- [ ] **Dynamic Content**: Waiting for specific user-uploaded assets.

---

## 4. Fixing the Build (Environment Variables)

If you are getting a **"Misconfigured Secret"** error, follow these exact steps to reset the UI:

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

## 5. Security & API Key Restrictions
To protect your account from unauthorized usage:

1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the key named `Browser key (auto-created by Firebase)`.
3. Under **Application restrictions**, select **Websites**.
4. Add `prepezia.com` and `*.prepezia.com` to the list.
5. Click **Save**.
