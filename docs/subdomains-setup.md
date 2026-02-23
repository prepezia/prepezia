# Campus Subdomains Setup Guide

This guide explains how to configure your external domain and Firebase project to support campus-specific subdomains like `ug.prepezia.com`, `knust.prepezia.com`, etc., based on your Firebase Console settings.

## 1. Identify Your Service
In your Firebase Console sidebar, you see two options: **Hosting** and **App Hosting**.
*   **Hosting (Standard):** Used for static sites or Next.js apps using the "Frameworks" integration. (This is what is shown in your screenshot).
*   **App Hosting (New):** The dedicated Next.js server-side hosting.

### If using App Hosting (Recommended for Zia)
1.  Click the **App Hosting** tab in the sidebar.
2.  Set up your backend by connecting your GitHub repo.
3.  Once deployed, look for the **Default Domain**. It looks like `something.hosting.app`.
4.  **CNAME Setup:** 
    *   **Host:** `*`
    *   **Value:** Your `something.hosting.app` URL.

### If using Standard Hosting (Your current screenshot)
Since you already have `prepezia.com` connected:
1.  Check the "IP Addresses" Firebase provided when you verified `prepezia.com`.
2.  **A Record Setup:**
    *   **Type:** `A Record`
    *   **Host:** `*`
    *   **Value:** Use the same IP addresses assigned to your root domain.

## 2. DNS Configuration (Your Domain Provider)

Log in to your registrar (Namecheap, GoDaddy, etc.) and add the record:

| Type | Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| A | `*` | [Your Firebase IP 1] | 3600 |
| A | `*` | [Your Firebase IP 2] | 3600 |

*Note: Wildcard records tell the internet that any subdomain (ug, knust, etc.) should lead to your app.*

## 3. Deployment is Required
Your screenshot shows **"Waiting for your first release."** 
Subdomains and the main domain will not resolve to your code until you successfully run a deployment. 
*   **Local Command:** `firebase deploy`
*   Or, if using App Hosting, push your code to your connected GitHub branch.

## 4. Testing Locally
You can test the logic right now without waiting for DNS! Open your browser to:
*   `http://localhost:3000?campus=ug`
*   `http://localhost:3000?campus=knust`

The app will behave exactly as if you were on the live subdomain.
