# How to Force Fresh Login

Your account has been updated to MASTER_ADMIN with APPROVED status, but your browser has an old JWT token cached.

## Quick Fix - Force Logout:

### Method 1: Use DevTools (Fastest)
1. Go to https://clerkship.me
2. Press F12 to open DevTools
3. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
4. Click "Cookies" → "https://clerkship.me"
5. Delete ALL cookies (especially ones starting with "authjs" or "next-auth")
6. Close DevTools
7. Refresh the page
8. Log in again with magic link

### Method 2: Use Incognito/Private Window
1. Open a new Incognito/Private window
2. Go to https://clerkship.me
3. Log in with magic link
4. You should see full dashboard and profile access

### Method 3: Clear Browser Data
1. Settings → Privacy → Clear Browsing Data
2. Select "Cookies and other site data"
3. Time range: "Last hour"
4. Clear data
5. Go to https://clerkship.me and log in

## What We Fixed:

✅ Email authentication with normalized lowercase emails
✅ JWT token now refreshes user data on every request
✅ Your account is MASTER_ADMIN with APPROVED status
✅ TypeScript errors fixed in adapter

## Why This Happened:

Your browser cached a JWT token from when your account was first created (before we promoted you to MASTER_ADMIN). The new JWT callback will fetch fresh data from the database, but you need to trigger it by getting a new session token.

Once you log in fresh, everything should work perfectly!
