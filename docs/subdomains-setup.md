
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
Instead of adding every campus one by one, use a Wildcard.
1. Go to **App Hosting** > **Settings** > **Custom Domains**.
2. Click **Add Domain** and enter `*.prepezia.com`.
3. Firebase will provide an **A Record** and a **TXT Record**.
4. In Namecheap, add these using `*` as the Host.

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `*` | `35.219.200.14` |
| **TXT** | `*` | `[Verification value from Firebase]` |

---

## 2. Fixing "Connection Closed" Errors
If a subdomain like `ug.prepezia.com` shows `ERR_CONNECTION_CLOSED`, it means the SSL certificate is still generating.
*   **Wildcard Verification**: Once `*.prepezia.com` is verified in the console, all campus subdomains will start working within 1-2 hours.
*   **Trailing Dot**: If Namecheap gives an error about the dot at the end of a value, try removing it. Most modern registrars handle it automatically.

---

## 3. Environment Variables (Zia & Firebase)

If Zia is not responding or you see "Misconfigured Secret", reset the variables:

### Step A: Reset the Environment
1. Go to **App Hosting** -> Select your backend.
2. Go to **Settings** -> **Environment**.
3. Click the **TRASH ICON** on the "production" row to delete it.
4. Refresh your browser page.

### Step B: Recreate
1. Click **"Create environment"**.
2. **Name**: `production`, **Branch**: `main`.
3. Click **SAVE**. 
4. **Add the Keys**: Click the now-blue **"production"** link.
5. Add `GEMINI_API_KEY` as a **Secret**.
6. Add `NEXT_PUBLIC_` keys as **Variables**.

---

## 4. Security & API Key Restrictions
To protect your account from unauthorized usage:

1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the key named `Browser key (auto-created by Firebase)`.
3. Under **Application restrictions**, select **Websites**.
4. Add `prepezia.com` and `*.prepezia.com` to the list.
5. Click **Save**.
