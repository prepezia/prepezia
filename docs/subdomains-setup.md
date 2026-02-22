# Campus Subdomains Setup Guide

This guide explains how to configure your external domain and Firebase project to support campus-specific subdomains like `ug.prepezia.com`, `knust.prepezia.com`, etc.

## 1. DNS Configuration (Your Domain Provider)

To allow any university slug to work, you should set up a **Wildcard Record**. This tells the internet that any subdomain of `prepezia.com` should be handled by your app.

1.  Log in to your domain registrar (e.g., Namecheap, GoDaddy, Google Domains).
2.  Navigate to **Advanced DNS** or **DNS Management**.
3.  Add a new record:
    *   **Type**: `CNAME Record` (or `A Record` if using IP addresses provided by Firebase).
    *   **Host**: `*` (The asterisk is the wildcard character).
    *   **Value**: The target URL provided by Firebase App Hosting (e.g., `your-app.hosting.app`).
    *   **TTL**: `Automatic` or `3600`.

*Note: If you only want to support specific schools for now, you can create individual CNAME records for `ug`, `knust`, etc., instead of using the `*` wildcard.*

## 2. Firebase Console Configuration

Once the DNS is pointing to Firebase, you must tell Firebase to "listen" for these domains.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project.
3.  Navigate to **App Hosting** (or **Hosting** if using standard hosting).
4.  Click on **Settings** or the **Dashboard** for your specific backend.
5.  Find the **Custom Domains** section.
6.  Click **Add Domain**.
7.  Enter your main domain (e.g., `prepezia.com`).
8.  Firebase will provide you with specific `A` or `TXT` records to verify ownership. Add these to your DNS provider as instructed.

## 3. Handling SSL (HTTPS)

*   Firebase provides SSL certificates automatically for all domains added to the console.
*   Once you add the domain and point the DNS, it may take anywhere from **1 hour to 24 hours** for the SSL certificate to provision and the subdomains to become "Secure."

## 4. Testing Locally

You don't need to wait for DNS to test the logic! The code I implemented supports a fallback query parameter. 

Open your browser and navigate to:
*   `http://localhost:3000?campus=ug`
*   `http://localhost:3000?campus=knust`

The app will behave exactly as if you were on the live subdomain.

## 5. Adding New Universities

To add a new university to the detection engine:
1.  Open `src/lib/campus-mapping.ts`.
2.  Add a new entry to the `campusMapping` object using the desired subdomain as the key.
3.  Ensure the `fullName` matches exactly how it appears in the `PastQuestion` database entries.
