
# Prepezia Live Launch & Security Guide

This guide explains how to manage your live environment, campus-specific subdomains, and security.

## 1. DNS Configuration (Final Step)

### For Main Site (prepezia.com)
Update these records in Namecheap to switch from static hosting to the full Zia App engine:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `@` | `35.219.200.14` |
| **TXT** | `@` | `fah-claim=002-02-c0a96bdf-06a8-40fa-b4cb-6ed3ece7929a` |
| **CNAME**| `_acme-challenge...` | `...authorize.certificate-manager.goog.` |

*Note: Delete the old A record pointing to 199.36.158.100.*

### For Subdomains (Campus Hubs)
| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | `prepezia--studio-4412321193-4bb31.us-central1.hosted.app` |

---

## 2. Fixing the Build (Environment Variables)

The "Misconfigured Secret" error happens because the code expects keys that aren't authorized yet.

### If the "production" environment is not clickable:
1. Go to **App Hosting** -> Select your backend.
2. Go to **Settings** -> **Environment**.
3. If you see "production" in the list but can't click it, **delete it** (using the trash icon on the right).
4. Click **"Create environment"** again.
5. **Name**: `production`
6. **Branch**: Choose `main`.
7. **NOW CLICK SAVE.**
8. Once saved, it should appear in the table. Click on the word **"production"** again. It should now open a sub-page with "Add Variable" and "Add Secret" buttons.

### Adding the Keys:
1. **Add Secret (Zia Key)**:
   - Click **"Add Secret"**.
   - Key: `GEMINI_API_KEY`
   - Value: [Your key from Google AI Studio]
   - **IMPORTANT**: When it asks to **"Grant Access"**, you must click **GRANT**.
2. **Add Variables**:
   - Click **"Add Variable"** for each item in your `.env` file (API Key, Project ID, etc.).

---

## 3. Security & API Key Restrictions
To protect your account from unauthorized usage:

1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the key named `Browser key (auto-created by Firebase)`.
3. Under **Application restrictions**, select **Websites**.
4. Add `prepezia.com` and `*.prepezia.com` to the list.
5. Click **Save**.

---

## 4. Deployment Commands
Run these in the terminal to push the latest build configuration:

```bash
git add .
git commit -m "Update build config for secrets"
git push origin main
```
