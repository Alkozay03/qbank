# User Approval System Implementation

## Overview
Implemented a comprehensive approval system where new users must be approved by MASTER_ADMIN before they can access the application. Approved users can then log in and out freely.

## Features Implemented

### 1. Database Schema
- Added `ApprovalStatus` enum with values: `PENDING`, `APPROVED`, `BLOCKED`
- Added `approvalStatus` field to User model (defaults to `PENDING` for new users)
- Added index on `approvalStatus` for efficient filtering
- Migrated all existing users to `APPROVED` status to prevent lockout

### 2. Authentication Flow
**File:** `src/auth.ts`
- Enhanced `signIn` callback to check approval status
- PENDING users are redirected to `/pending-approval` page
- BLOCKED users cannot log in at all
- APPROVED users can log in/out normally

### 3. Pending Approval Page
**File:** `src/app/pending-approval/page.tsx`
- Friendly UI explaining that account is awaiting approval
- Informs users they'll receive an email when approved
- Link back to login page

### 4. User Management Interface
**File:** `src/app/(portal)/year4/master-admin/user-list/`

#### Server Component (page.tsx)
- Fetches all users with approval status
- Restricts access to MASTER_ADMIN only

#### Client Component (client.tsx)
- Filter dropdown with 4 options:
  - All Users (shows count)
  - Approved (shows count)
  - Awaiting Approval (shows count)
  - Blocked (shows count)
- Real-time counts for each status
- Responsive table with user information
- Action buttons based on status:
  - **PENDING**: Approve (sends login email) | Block
  - **APPROVED**: Block
  - **BLOCKED**: Unblock
- Color-coded status badges:
  - Green for APPROVED
  - Yellow for PENDING
  - Red for BLOCKED
- Success/error messages for admin actions
- Auto-refresh after status changes

### 5. API Endpoints

#### Approve User
**File:** `src/app/api/master-admin/users/approve/route.ts`
- POST endpoint
- Requires MASTER_ADMIN role
- Updates user status to APPROVED
- Sends magic link email via `signIn("email")`
- Returns success/error response

#### Block/Unblock User
**File:** `src/app/api/master-admin/users/block/route.ts`
- POST endpoint
- Requires MASTER_ADMIN role
- Accepts `userId` and `status` (APPROVED or BLOCKED)
- Updates user approval status
- Returns success/error response

### 6. Migration Script
**File:** `migrate-existing-users.js`
- One-time script to update all existing users to APPROVED
- Shows stats breakdown after migration
- Uses direct database URL for reliability

## User Flow

### New User Registration
1. User enters email on login page
2. User receives magic link email
3. User clicks link → account created with `approvalStatus = PENDING`
4. User redirected to `/pending-approval` page
5. Cannot access application until approved

### Admin Approval Workflow
1. Admin goes to Master Admin → User List
2. Filters to "Awaiting Approval"
3. Clicks "Approve" button for user
4. System:
   - Updates user status to APPROVED
   - Sends magic link email to user
5. User receives email with login link
6. User can now log in and access the application

### Approved User Experience
1. User enters email on login page
2. Receives magic link
3. Clicks link → successfully logs in
4. Can log out and log in again without approval

### Blocked User Experience
1. User enters email
2. Receives magic link
3. Clicks link → login fails
4. Cannot access application

## Database Changes Applied
```sql
-- Add enum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');

-- Add column with default
ALTER TABLE "User" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- Add index
CREATE INDEX "idx_user_approval_status" ON "User"("approvalStatus");

-- Migrate existing users (ran via script)
UPDATE "User" SET "approvalStatus" = 'APPROVED';
```

## Testing Checklist

- [ ] New user signup → status is PENDING
- [ ] PENDING user tries to log in → sees pending approval page
- [ ] Admin approves user → user receives email
- [ ] Approved user logs in → successfully accesses app
- [ ] Approved user logs out and back in → works without re-approval
- [ ] Admin blocks approved user → user cannot log in
- [ ] Admin unblocks user → user can log in again
- [ ] Filter dropdown shows correct counts
- [ ] Status badges display correct colors
- [ ] Action buttons change based on user status

## Security Considerations

1. **Authentication Required**: All approval actions require MASTER_ADMIN role
2. **Validation**: User ID and status are validated before updates
3. **Audit Trail**: Created/updated timestamps track changes
4. **Email Security**: Magic links use Next-Auth's secure token system
5. **Database Constraints**: Enum ensures only valid statuses can be set

## Future Enhancements

- Add approval request notifications for admins
- Email templates for approval/rejection notifications
- Approval reason/notes field
- Bulk approve/block actions
- Approval history log
- Auto-expire pending requests after X days
- Department/group-based approval workflows

## Files Modified/Created

### Created
- `src/app/pending-approval/page.tsx`
- `src/app/(portal)/year4/master-admin/user-list/client.tsx`
- `src/app/api/master-admin/users/approve/route.ts`
- `src/app/api/master-admin/users/block/route.ts`
- `migrate-existing-users.js`

### Modified
- `prisma/schema.prisma` - Added ApprovalStatus enum and User.approvalStatus field
- `src/auth.ts` - Added approval status check in signIn callback
- `src/lib/adapter.ts` - Added approvalStatus to user queries
- `src/app/(portal)/year4/master-admin/user-list/page.tsx` - Converted to use client component
- `src/app/api/notifications/list/route.ts` - Fixed rotation filtering
- `src/app/api/admin/schedule/route.ts` - Added targetRotation support

## Deployment Steps

1. ✅ Database migration applied (`npx prisma db push`)
2. ✅ Existing users migrated to APPROVED status
3. ✅ Prisma Client regenerated
4. Ready to deploy to production

## Support

For issues or questions:
- Check user status in database: `SELECT email, approvalStatus FROM "User";`
- Manually approve user: `UPDATE "User" SET "approvalStatus" = 'APPROVED' WHERE email = 'user@example.com';`
- View approval stats: See migration script output or use User Management interface
