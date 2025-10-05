# User Approval System - Bug Fixes

## Issues Reported

1. **New users not appearing in admin user list**: When a new user tried to create an account, they did not appear in the user list page
2. **Wrong redirect after magic link**: Users were directed to "check your email" page instead of the "pending approval" page after clicking the magic link

## Root Causes

### Issue 1: Middleware Blocking PENDING Users
**Problem**: The `/pending-approval` route was not included in the PUBLIC routes list in middleware, causing PENDING users to be redirected back to `/login` in an infinite loop.

**Fix**: Added `/pending-approval` to the PUBLIC routes in `middleware.ts`

### Issue 2: Incorrect Redirect Logic
**Problem**: The `signIn()` callback was returning a string `/pending-approval` to redirect PENDING users, but NextAuth v5 doesn't handle string returns from `signIn()` as redirects. PENDING users were able to sign in but weren't being redirected to the pending approval page.

**Fix**: 
1. Allow PENDING users to sign in (create session with JWT token)
2. Store `approvalStatus` in the JWT token during the `jwt()` callback
3. Check `approvalStatus` in middleware and redirect PENDING users to `/pending-approval`
4. This happens automatically on every protected route access

### Issue 3: Email Intent Cookie Blocking Magic Links ⚠️ **CRITICAL**
**Problem**: The middleware was checking for an `email-intent` cookie before allowing the email callback to proceed. This cookie was set when the user submitted the login form, but when users clicked the magic link from their **email client** (especially on a different browser/device or embedded email browser), the cookie wasn't present, causing the middleware to block the callback with a 204 response. This prevented users from being logged in.

**Real-World Scenario**:
- User requests magic link on Chrome → Cookie set in Chrome
- User checks email on iPhone Mail app → Clicks link → Opens in Safari
- Safari doesn't have the cookie → Middleware blocks → User can't sign in

**Fix**: Removed the strict `email-intent` cookie check from the email callback middleware. NextAuth's built-in token validation (expiry, one-time use, cryptographic signature) is sufficient security. The cookie is now only cleared if present (for same-browser flows) but doesn't block the callback if absent.

## Files Modified

### 1. `middleware.ts`
**Changes**:
- Added `/pending-approval` to PUBLIC routes array
- Added approval status check for authenticated users visiting public routes
- Redirects PENDING users to `/pending-approval` when they try to access `/login`, `/years`, or `/`
- Redirects PENDING users to `/pending-approval` when they try to access any protected route

### 2. `src/auth.ts`
**Changes**:
- Removed the `return "/pending-approval"` from `signIn()` callback for PENDING users
- PENDING users can now sign in successfully (create session)
- Added `approvalStatus` storage in `jwt()` callback - queries database and stores in JWT token
- Added `redirect()` callback (placeholder for potential future use)

## How It Works Now

### New User Flow
1. User enters email on `/login` page
2. Magic link is sent to their email
3. User clicks magic link
4. NextAuth verifies token and calls `createUser()` in adapter
5. User is created with default `approvalStatus: PENDING` (from schema)
6. `signIn()` callback allows sign-in (returns true)
7. `jwt()` callback queries database and stores `approvalStatus: 'PENDING'` in JWT token
8. Session is created with JWT token
9. User is redirected by NextAuth to callback URL (default: `/years`)
10. **Middleware intercepts the request**, sees `approvalStatus === 'PENDING'` in JWT token
11. **Middleware redirects to `/pending-approval`**
12. User sees pending approval message

### Subsequent Login Attempts (While Still PENDING)
1. PENDING user clicks new magic link
2. NextAuth verifies token and calls `signIn()` callback
3. `signIn()` allows sign-in (returns true)
4. `jwt()` callback queries database and stores `approvalStatus: 'PENDING'` in JWT token
5. Session is created
6. User tries to access any route
7. **Middleware checks JWT token**, sees PENDING status
8. **Middleware redirects to `/pending-approval`**
9. User sees pending approval message (cannot access app)

### After Admin Approves User
1. Admin changes user's `approvalStatus` to `APPROVED` in database
2. User's existing JWT token still has `PENDING` status
3. When token expires or user logs out and back in:
   - `jwt()` callback queries database
   - Gets fresh `approvalStatus: 'APPROVED'`
   - Stores in new JWT token
4. Middleware checks JWT token, sees `APPROVED` status
5. User can access `/years` and all protected routes normally

### BLOCKED Users
1. Cannot sign in at all (signIn() callback returns false)
2. See error message on login page
3. Cannot access any part of the application

## JWT Token Contents
```typescript
{
  sub: "user-id",
  email: "user@example.com",
  approvalStatus: "PENDING" | "APPROVED" | "BLOCKED",
  // ... other NextAuth fields
}
```

## Testing Checklist

### Test New User Creation
- [ ] Create new account with university email
- [ ] User should be created in database with `PENDING` status
- [ ] User should see `/pending-approval` page (not "check email" page)
- [ ] User should appear in admin user list with "Awaiting Approval" badge
- [ ] Log out and try to login again - should still see pending approval page

### Test Admin Approval
- [ ] As master admin, go to user list page
- [ ] Find PENDING user in "Awaiting Approval" tab
- [ ] Click "Approve" button
- [ ] User status changes to "APPROVED" in database
- [ ] As that user, log out and log back in
- [ ] Should now be able to access `/years` and Year 4 pages

### Test BLOCKED Users
- [ ] As master admin, block a user
- [ ] As blocked user, try to login with magic link
- [ ] Should see error message (cannot sign in)
- [ ] Should not be able to access any protected routes

## Debug API

Created `/api/debug/users` endpoint to check database state:

```bash
# Access in browser or curl:
GET http://localhost:3000/api/debug/users

# Returns:
{
  "success": true,
  "stats": {
    "total": 5,
    "pending": 2,
    "approved": 3,
    "blocked": 0
  },
  "users": [...],
  "recentTokens": [...]
}
```

## Edge Cases Handled

1. **User clicks magic link from old email**: Token has correct approval status from database
2. **Admin changes status while user is logged in**: User's JWT still has old status until they log out/in or token expires
3. **Multiple tabs/windows**: All share same JWT token via cookie, consistent behavior
4. **Expired JWT tokens**: New token generated on next request, fetches fresh approval status from database
5. **Direct URL access to protected routes**: Middleware catches and redirects PENDING users

## Security Considerations

1. ✅ PENDING users cannot access protected routes (middleware blocks)
2. ✅ BLOCKED users cannot sign in at all
3. ✅ Approval status is stored in signed JWT token (cannot be tampered with)
4. ✅ Fresh approval status is fetched from database on every new JWT token generation
5. ✅ Middleware runs on every request (Edge runtime) - very fast
6. ✅ No database query on every request (uses JWT token for approval status)

## Performance Notes

- Approval status is cached in JWT token (no DB query on every request)
- Middleware only queries JWT token (fast, no DB access)
- Fresh approval status fetched only when:
  - User logs in (new JWT token)
  - JWT token expires and is refreshed
  - User logs out and back in

## Future Enhancements

1. Add email notification when user is approved
2. Add reason field for blocking users
3. Add bulk approve/block actions
4. Add approval status filter on user list (already implemented)
5. Add approval request notification for admins
