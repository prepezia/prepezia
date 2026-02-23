# Campus Subdomains Setup Guide

This guide explains how to configure your external domain and Firebase project to support campus-specific subdomains like `ug.prepezia.com`, `knust.prepezia.com`, etc.

## 1. Deploy Your Code to GitHub

Before setting up subdomains, your code must be on GitHub so Firebase App Hosting can see it.

1.  **Create the repo**: You've already created the `prepezia` repo on GitHub.
2.  **Push your code**: Open the **Terminal** in Firebase Studio and run these commands one by one:

```bash
git init
git add .
git commit -m "Initial commit of Prepezia"
git branch -M main
git remote add origin https://github.com/prepezia/prepezia.git
git push -u origin main
```

---

## 2. Configure Firebase App Hosting

1.  In the Firebase Console, go to **App Hosting** -> **Get Started**.
2.  **Region**: Select `us-central1` (Iowa).
3.  **Connect GitHub**: Select your `prepezia` repository.
4.  **Deployment Settings**: Leave as default (Root directory `/`, Branch `main`).
5.  **Environment Variables**: If you have a `GEMINI_API_KEY`, add it as a **Secret** here.
6.  **Default Domain**: Once deployed, look for the **Default Domain** (e.g., `prepezia-123.hosting.app`). **Copy this URL.**

---

## 3. DNS Configuration (Your Domain Provider)

Log in to your registrar (Namecheap, GoDaddy, etc.) and add the following record to your **Advanced DNS** settings:

| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | [Your App Hosting Default Domain URL] |

*Note: The `*` (asterisk) is the wildcard. It ensures that `ug`, `knust`, and any other school name will point to your app.*

---

## 4. Testing Locally
You can test the campus logic immediately without waiting for DNS. Open your browser to:
*   `http://localhost:3000?campus=ug`
*   `http://localhost:3000?campus=knust`

The app will behave exactly as if you were on the live subdomain (greeting you as a student of that campus and pre-filtering past questions).
