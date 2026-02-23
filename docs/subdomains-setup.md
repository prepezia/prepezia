
# Prepezia Live Launch & Subdomains Guide

This guide explains how to manage your live environment, campus-specific subdomains, and security.

## 1. Your Deployment Status
- **Primary Backend URL:** `prepezia--studio-4412321193-4bb31.us-central1.hosted.app`
- **Campus Hubs:** `*.prepezia.com` (e.g., `ug.prepezia.com`)

---

## 2. DNS Configuration (Final Step)

### For Subdomains (Campus Hubs)
You have already configured the **Wildcard Record** in Namecheap. Keep this:

| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | `prepezia--studio-4412321193-4bb31.us-central1.hosted.app` |

### For Main Site (prepezia.com)
Transitioning from Static to App Hosting requires updating these records in Namecheap:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A** | `@` | `35.219.200.14` |
| **TXT** | `@` | `fah-claim=...` (Copy from Firebase Console) |
| **CNAME**| `_acme-challenge...` | `...authorize.certificate-manager.goog.` |

*Note: Delete the old A record (199.36.158.100) and any old acme-challenge CNAMEs.*

---

## 3. Deployment & Redeploying
If you encounter build errors, run these commands in your Terminal to push fixes:

```bash
git add .
git commit -m "Apply fixes and redeploy"
git push origin main
```

Firebase App Hosting will automatically start a new **Rollout**.

---

## 4. Security & API Key Restrictions
Google may email you about a "Publicly accessible API key." This is normal for Firebase, but you should restrict it for safety:

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

## 5. How Personalization Works
The app detects the subdomain automatically. 
- If a user visits `ug.prepezia.com`, the app sets the campus to **University of Ghana**.
- Zia will greet them as a UG student.
- The Past Questions hub will pre-filter for UG papers.

---

## 6. Support
If subdomains show an SSL error initially, wait 30-60 minutes. Firebase is automatically generating certificates for each new school hub as they are visited.
