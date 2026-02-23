# Prepezia Live Launch & Subdomains Guide

This guide explains how to manage your live environment and campus-specific subdomains.

## 1. Your Deployment URLs
Based on your Firebase configuration:
- **Primary Backend URL:** `prepezia--studio-4412321193-4bb31.us-central1.hosted.app`
- **Campus Hubs:** `*.prepezia.com` (e.g., `ug.prepezia.com`)

## 2. DNS Configuration (Namecheap/GoDaddy)
You have already configured the **Wildcard Record**. This is the most important step for campus personalization.

| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | prepezia--studio-4412321193-4bb31.us-central1.hosted.app |

---

## 3. Hosting vs. App Hosting (CRITICAL)
Firebase has two types of hosting. For Prepezia to work, **you must use App Hosting**.

- **Hosting (Classic):** Only serves static files. Zia/AI will NOT work here.
- **App Hosting:** Runs your Next.js server. This is where the "brain" of the app lives.

### How to point your main domain (`prepezia.com`) to the App:
1. Go to the **App Hosting** tab in Firebase.
2. Click on your backend (`prepezia-backend`).
3. Go to **Settings** > **Custom Domains**.
4. Click **Connect Domain** and enter `prepezia.com`.
5. Firebase will provide **A Records** (IP addresses).
6. Copy these into Namecheap (replacing any existing @ records).

---

## 4. How Personalization Works
The app detects the subdomain automatically. 
- If a user visits `ug.prepezia.com`, the app sets the campus to **University of Ghana**.
- Zia will greet them as a UG student.
- The Past Questions hub will pre-filter for UG papers.

## 5. Testing the Logic
You can test the campus logic without waiting for DNS propagation by adding a query parameter to your local or live URL:
- `https://prepezia.com?campus=ug`
- `http://localhost:3000?campus=knust`
