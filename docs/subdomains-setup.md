# Campus Subdomains Setup Guide

This guide explains how to configure your external domain and Firebase project to support campus-specific subdomains like `ug.prepezia.com`, `knust.prepezia.com`, etc.

## 1. Choose Your Hosting Path

### Option A: App Hosting (Recommended for Next.js/AI)
Firebase App Hosting is designed for Next.js. It handles the server-side logic (Zia) perfectly.
1.  **Create a GitHub Repo**: Create a repo named `prepezia` on your new GitHub account.
2.  **Push your code**: Use the terminal to initialize git and push this code to GitHub.
3.  **Create Backend**: In the Firebase Console, go to **App Hosting** -> **Get Started**.
4.  **Connect GitHub**: Select your `prepezia` repository.
5.  **Environment Variables**: If you have a `GEMINI_API_KEY`, add it as a **Secret** during setup.
6.  **Find the URL**: Once deployed, look for the **Default Domain** (e.g., `prepezia-123.hosting.app`).

### Option B: Standard Hosting (If already connected)
If you prefer the standard hosting dashboard where `prepezia.com` is already connected:
1.  Check the **IP Addresses** Firebase provided when you verified your domain.
2.  **A Record Setup**: You will use these IP addresses for your wildcard record.

---

## 2. DNS Configuration (Your Domain Provider)

Log in to your registrar (Namecheap, GoDaddy, etc.) and add the following record to your **Advanced DNS** settings:

| Type | Host | Value |
| :--- | :--- | :--- |
| **CNAME** | `*` | [Your App Hosting Default Domain URL] |

**OR** (if using Option B):

| Type | Host | Value |
| :--- | :--- | :--- |
| **A Record** | `*` | [Firebase IP Address 1] |
| **A Record** | `*` | [Firebase IP Address 2] |

*Note: The `*` (asterisk) is the wildcard. It ensures that `ug`, `knust`, and any other school name will point to your app.*

---

## 3. Testing Locally
You can test the campus logic immediately without waiting for DNS. Open your browser to:
*   `http://localhost:3000?campus=ug`
*   `http://localhost:3000?campus=knust`

The app will behave exactly as if you were on the live subdomain (greeting you as a student of that campus and pre-filtering past questions).