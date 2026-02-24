
# Prepezia Live Launch & Security Guide

This guide explains how to manage your live environment, wildcard subdomains for campuses, and security.

## 1. DNS Configuration (Full Upgrade)

You are moving from static hosting to **App Hosting** (the engine that runs Zia). Replace your old Namecheap records with these:

### For Main Site (prepezia.com)
| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `@` | `35.219.200.14` |
| **TXT** | `@` | `fah-claim=002-02-c0a96bdf-06a8-40fa-b4cb-6ed3ece7929a` |
| **CNAME**| `_acme-challenge...` | `[Value from Firebase Console]` |

### For All Campuses (*.prepezia.com) - WILDCARD
To support all campus subdomains automatically, use these exact records in Namecheap:

1. **Remove** the old CNAME record where Host is `*`.
2. **Add** these new records:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `*` | `35.219.200.14` |
| **TXT** | `*` | `fah-claim=002-02-c5c571a3-8b16-4d90-aeb4-8557e32305b0` |

---

## 2. Fixing "Connection Closed" Errors
If a subdomain like `ug.prepezia.com` shows `ERR_CONNECTION_CLOSED`, it means the SSL certificate is still generating.
*   **Wildcard Verification**: Once you click "Verify" in the Firebase console and the status turns green, all campus subdomains will start working within 1-2 hours.
*   **Propagation**: DNS changes can take up to 24 hours to reach everyone, but usually work within minutes.

---

## 3. Environment Variables (Zia & Firebase)

If Zia is not responding or you see "Misconfigured Secret", follow this reset procedure:

### Step A: Reset the Environment
1. Go to **App Hosting** -> Select your backend.
2. Go to **Settings** -> **Environment**.
3. Click the **TRASH ICON** on the "production" row to delete it.
4. Refresh your browser page.

### Step B: Recreate
1. Click **"Create environment"**.
2. **Name**: `production`, **Branch**: `main`.
3. Click **SAVE**. 
4. **The "Clickable" Step**: Click the now-blue word **"production"** in the list.
5. **Add the Keys**: 
   * Click **"Add Secret"** for `GEMINI_API_KEY`.
   * Click **"Add Variable"** for all `NEXT_PUBLIC_` keys.

---

## 4. Security & API Key Restrictions
To protect your account from unauthorized usage:

1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the key named `Browser key (auto-created by Firebase)`.
3. Under **Application restrictions**, select **Websites**.
4. Add `prepezia.com` and `*.prepezia.com` to the list.
5. Click **Save**.
