
# Prepezia Live Launch & Security Guide

This guide explains how to manage your live environment, wildcard subdomains for campuses, and security.

## 1. DNS Configuration (Full Multi-Campus Setup)

You are using **App Hosting** (the engine that runs Zia). To support all campus subdomains automatically, use these exact records in Namecheap:

### For Main Site (prepezia.com)
| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `@` | `35.219.200.14` |
| **TXT** | `@` | `fah-claim=002-02-c0a96bdf-06a8-40fa-b4cb-6ed3ece7929a` |

### For All Campuses (*.prepezia.com) - WILDCARD
To support every possible campus (ug, knust, etc.) automatically without adding them one by one:

1. **Remove** any old CNAME records where Host is `*`.
2. **Add** these new records:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `*` | `35.219.200.14` |
| **TXT** | `*` | `fah-claim=002-02-c5c571a3-8b16-4d90-aeb4-8557e32305b0` |

---

## 2. How to Preview Personalization (Dev vs. Live)

### Live (On your domain)
Simply visit the subdomain. The app detects the "ug" or "knust" part of `ug.prepezia.com` and personalizes everything.

### Development (In the editor preview)
Since you don't have subdomains in development, use the **Testing Parameter**:
*   **UG Preview**: Add `?campus=ug` to any URL (e.g., `.../home?campus=ug`)
*   **KNUST Preview**: Add `?campus=knust` to any URL.
*   **Ashesi Preview**: Add `?campus=ashesi` to any URL.

Zia will respond exactly as if you were on the live campus subdomain.

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
