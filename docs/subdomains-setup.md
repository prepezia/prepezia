# Campus Subdomains Setup Guide

This guide explains how to configure your external domain and Firebase project to support campus-specific subdomains like `ug.prepezia.com`, `knust.prepezia.com`, etc.

## 1. Your Target URL
Based on your Firebase App Hosting dashboard, your backend URL is:
`prepezia--studio-4412321193-4bb31.us-central1.hosted.app`

## 2. DNS Configuration (Your Domain Provider)
Log in to your registrar (Namecheap, GoDaddy, etc.) and add the following record to your **Advanced DNS** settings:

| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | prepezia--studio-4412321193-4bb31.us-central1.hosted.app |

*Note: The `*` (asterisk) is the wildcard. It ensures that `ug`, `knust`, and any other school name will point to your app.*

---

## 3. Verify the Deployment
In your Firebase Console:
1. Click the **"View"** button on the `prepezia` backend card.
2. Go to the **Rollouts** tab.
3. Once the status turns green ("Live"), you can visit your site!

## 4. Testing Locally
You can test the campus logic immediately without waiting for DNS. Open your browser to:
*   `http://localhost:3000?campus=ug`
*   `http://localhost:3000?campus=knust`

The app will behave exactly as if you were on the live subdomain (greeting you as a student of that campus and pre-filtering past questions).
