# Approval-First Authentication Flow

## Overview
Complete redesign of the authentication flow to require admin approval BEFORE users can log in. This ensures strict gatekeeping - faculty or unauthorized users cannot access any part of the website.

## New Authentication Flow

### For New Users (Registration)
1. User visits `/login`
2. Enters university email (u########@sharjah.ac.ae)
3. **Account created immediately with `PENDING` status**
4. User redirected to `/pending-approval` page
5. **NO magic link email sent yet**
6. User sees message: "Your account is awaiting admin approval"
7. User cannot access any part of the site

### For Existing PENDING Users
1. User visits `/login` and enters email
2. System checks: User exists with `PENDING` status
3. User redirected to `/pending-approval` page
4. **Still no email sent**
5. User must wait for admin approval

### Admin Approval Process
1. Admin logs in and goes to User List page
2. Sees new user in "Awaiting Approval" tab
3. Clicks "Approve" button
4. User status changes to `APPROVED` in database
5. **System logs**: "User approved - They can now request a magic link at login"

### For APPROVED Users (Login)
1. User visits `/login` and enters email
2. System checks: User exists with `APPROVED` status
3. **NOW the magic link email is sent**
4. User redirected to `/login/check` ("Check your email")
5. User clicks magic link from email
6. User is logged in and can access the site

## Security Features

### 1. All Pages Require Authentication
**Protected routes** (require login):
- `/years` - Year selection page
- `/year4` - Year 4 dashboard and all subpages
- `/year5` - Year 5 pages
- `/performance` - Performance tracking
- `/quiz` - Quiz pages
- `/profile` - User profile

**Public routes** (no login required):
- `/` - Landing page
- `/login` - Login page
- `/login/check` - "Check your email" page
- `/pending-approval` - Pending approval message

### 2. Unauthenticated Access Blocked
- User tries to access `/years` without login → Redirected to `/login`
- User tries to access `/year4` without login → Redirected to `/login`
- User manually types `clerkship.me/year4` → Redirected to `/login`
- **Message shown**: "You need to log in to access this page"

### 3. PENDING Users Cannot Bypass
- PENDING user gets magic link somehow → Can't sign in (status check blocks them)
- PENDING user tries any protected route → Redirected to `/pending-approval`
- PENDING user cannot see any content beyond login page

### 4. Strict Email Validation
- Only `u########@sharjah.ac.ae` format allowed
- Faculty emails (e.g., `faculty@sharjah.ac.ae`) rejected
- Random emails rejected immediately

## Implementation Details

### New API Endpoint: `/api/auth/register`
```typescript
POST /api/auth/register
Body: { email: string }

// Creates user with PENDING status
// Returns: { success: true, status: "PENDING" | "APPROVED" | "BLOCKED" }
```

**Behavior**:
- If email invalid → Error
- If user doesn't exist → Create with `PENDING` status
- If user exists with `PENDING` → Return PENDING status
- If user exists with `APPROVED` → Return APPROVED status (trigger magic link)
- If user exists with `BLOCKED` → Return error

### Updated Login Page Flow
```typescript
async function onSubmit() {
  // 1. Call /api/auth/register
  const registerData = await fetch("/api/auth/register", { ... });
  
  // 2. Check status
  if (registerData.status === "PENDING") {
    // Redirect to pending approval page
    router.push("/pending-approval");
    return;
  }
  
  if (registerData.status === "APPROVED") {
    // Send magic link email
    await signIn("email", { email, redirect: false });
    router.push("/login/check");
  }
}
```

### Middleware Protection
```typescript
// middleware.ts
const PUBLIC = [
  "/", "/login", "/login/check", "/pending-approval",
  "/api/auth/register", ...
];

// Everything else requires authentication
// PENDING users redirected to /pending-approval
// Unauthenticated users redirected to /login
```

### Auth Config Protection
```typescript
// auth.config.ts
const protectedRoots = ["/years", "/year4", "/year5", "/performance", "/quiz", "/profile"];

// NextAuth-level protection
// Blocks access before reaching middleware
```

## User Experience

### New Student Trying to Access Site
1. **Discovers website**: `clerkship.me`
2. **Tries to access**: Clicks link or types URL
3. **Redirected to login**: Any protected route → `/login`
4. **Enters email**: u12345678@sharjah.ac.ae
5. **Account created**: Status = PENDING
6. **Sees pending page**: "Your account is awaiting admin approval"
7. **Waits**: Cannot access anything
8. **Admin approves**: Status → APPROVED
9. **Returns to login**: Enters email again
10. **Gets magic link**: Email sent
11. **Clicks link**: Logged in
12. **Access granted**: Can use the site

### Existing Approved User
1. **Visits login**: `/login`
2. **Enters email**: u87654321@sharjah.ac.ae
3. **Magic link sent**: Immediately (already approved)
4. **Checks email**: Clicks link
5. **Logged in**: Access granted

### Faculty Member Trying to Access
1. **Tries to register**: faculty@sharjah.ac.ae
2. **Email rejected**: "Invalid university email format"
3. **Cannot proceed**: Blocked at login page
4. **No account created**: No database entry
5. **Cannot access site**: Ever

### Unauthorized User Direct URL Access
1. **Types URL**: `clerkship.me/year4`
2. **Middleware intercepts**: No authentication
3. **Redirected to login**: `/login?callbackUrl=/year4`
4. **Sees login page**: Cannot proceed without valid email
5. **Blocked**: No access to content

## Database Schema

### User Model
```prisma
model User {
  id             String          @id @default(cuid())
  email          String          @unique
  approvalStatus ApprovalStatus  @default(PENDING)
  role           Role            @default(MEMBER)
  ...
}

enum ApprovalStatus {
  PENDING   // Default for new users
  APPROVED  // Can log in
  BLOCKED   // Cannot log in
}
```

## API Endpoints Modified

### 1. `/api/auth/register` (NEW)
- Creates user with PENDING status
- No magic link sent
- Returns status for client to handle

### 2. `/api/master-admin/users/approve`
- Updates user status to APPROVED
- No longer tries to send magic link
- User must request link at login page

### 3. Login Page (`/login/page.tsx`)
- Calls `/api/auth/register` first
- Checks approval status
- Only sends magic link if APPROVED

## Security Considerations

### ✅ Strengths
1. **No unauthorized access**: All pages require authentication
2. **Admin approval required**: No bypass possible
3. **Email validation**: Only university students
4. **No content leakage**: Unauthenticated users see nothing
5. **PENDING users blocked**: Cannot access site even with magic link
6. **Middleware protection**: Runs on every request
7. **Auth config protection**: NextAuth-level blocking

### ✅ Attack Scenarios Prevented
- **Direct URL access**: Blocked by middleware
- **Magic link bypass**: PENDING users can't sign in
- **Faculty access**: Email validation prevents registration
- **Token scanning**: Email intent removed, NextAuth validation sufficient
- **Session manipulation**: JWT includes approval status
- **Old tokens**: Fresh status loaded on new JWT generation

## Testing Checklist

### New User Registration
- [ ] Enter email → Account created with PENDING
- [ ] Redirected to `/pending-approval` page
- [ ] User appears in admin list with "Awaiting Approval"
- [ ] User cannot access `/years`, `/year4`, etc.
- [ ] No magic link email received

### Admin Approval
- [ ] Admin sees PENDING user in list
- [ ] Click "Approve" → Status changes to APPROVED
- [ ] Success message shown
- [ ] User status updates in database

### Approved User Login
- [ ] Visit `/login` and enter approved email
- [ ] Magic link email sent immediately
- [ ] Redirected to `/login/check`
- [ ] Click magic link → Logged in successfully
- [ ] Can access `/years`, `/year4`, etc.

### Unauthenticated Access Blocking
- [ ] Try to access `/years` without login → Redirected to `/login`
- [ ] Try to access `/year4/dashboard` without login → Redirected to `/login`
- [ ] Try to access `/profile` without login → Redirected to `/login`
- [ ] See message: "You need to log in to access this page"

### PENDING User Blocking
- [ ] PENDING user tries to access protected routes → Redirected to `/pending-approval`
- [ ] PENDING user enters email at login → Redirected to `/pending-approval`
- [ ] PENDING user cannot access any content

### Email Validation
- [ ] Try faculty email `faculty@sharjah.ac.ae` → Rejected
- [ ] Try random email `test@gmail.com` → Rejected
- [ ] Try invalid format `u123@sharjah.ac.ae` → Rejected (not 8 digits)
- [ ] Try valid format `u12345678@sharjah.ac.ae` → Accepted

## Deployment Checklist

- [ ] All environment variables set (EMAIL_SERVER_*, AUTH_SECRET, etc.)
- [ ] Database schema up to date (approvalStatus field exists)
- [ ] Middleware compiled and deployed
- [ ] Login page updated
- [ ] Register API endpoint deployed
- [ ] Approve API endpoint updated
- [ ] Test complete user flow end-to-end

## Future Enhancements

1. **Email notification when approved**: Send email to user when admin approves
2. **Bulk approve**: Approve multiple users at once
3. **Auto-approve whitelist**: Certain emails auto-approved
4. **Approval expiry**: PENDING accounts expire after X days
5. **Admin notes**: Add reason for blocking/approval
6. **User notification center**: In-app notifications for status changes

## Migration from Old Flow

### What Changed
- **Before**: Magic link sent immediately → User created on click → Approval check
- **After**: User created immediately → Approval required → Magic link sent after approval

### Breaking Changes
- `/years` is now protected (was public before)
- Users must be APPROVED before receiving magic link
- Existing PENDING users need admin approval before next login

### Data Migration
- All existing users should be set to APPROVED (they were already using the system)
```sql
UPDATE "User" SET "approvalStatus" = 'APPROVED' WHERE "approvalStatus" = 'PENDING';
```

## Support

**For stuck PENDING users**:
```sql
-- Check user status
SELECT email, "approvalStatus", "createdAt" FROM "User" WHERE email = 'u12345678@sharjah.ac.ae';

-- Manually approve
UPDATE "User" SET "approvalStatus" = 'APPROVED' WHERE email = 'u12345678@sharjah.ac.ae';
```

**For testing**:
```sql
-- Reset user to PENDING for testing
UPDATE "User" SET "approvalStatus" = 'PENDING' WHERE email = 'test@sharjah.ac.ae';
```
