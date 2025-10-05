# Auto-Send Magic Link on Approval - Implementation

## Overview
When an admin approves a user, the system now automatically sends them a magic link email so they can log in immediately without having to return to the login page.

## Changes Made

### 1. Created Magic Link Email Utility
**File**: `src/lib/send-magic-link.ts`

**Features**:
- Generates cryptographically secure verification token
- Stores token in database with 24-hour expiry
- Sends beautifully formatted HTML email
- Includes both HTML and plain text versions
- Supports dev mode (logs link to console)
- Production mode (sends via SMTP)

**Email Template**:
- Gradient header with "Clerkship QBank" branding
- Congratulatory message about approval
- Large "Sign in to Clerkship" button
- Fallback text link for copying
- 24-hour expiry notice
- Professional styling

### 2. Updated Approve Endpoint
**File**: `src/app/api/master-admin/users/approve/route.ts`

**New Flow**:
1. Update user status to `APPROVED`
2. **Call `sendMagicLinkEmail()` immediately**
3. Send success response with message
4. If email fails, user can still request at login

**Error Handling**:
- Email sending is wrapped in try-catch
- If email fails, user is still approved
- Graceful fallback: user can request link at login page

### 3. Created Unapprove Endpoint
**File**: `src/app/api/master-admin/users/unapprove/route.ts`

**Purpose**: Testing and development
**Function**: Sets APPROVED users back to PENDING status

**Security**:
- Only MASTER_ADMIN can access
- Requires userId and email
- Logs action to console

### 4. Added Unapprove Button to UI
**File**: `src/app/(portal)/year4/master-admin/user-list/client.tsx`

**UI Changes**:
- Added `handleUnapprove()` function
- Added "Unapprove" button for APPROVED users
- Button styled in orange color (between approve green and block red)
- Confirmation dialog before unapproving
- Success message and auto-refresh

**Button Layout** (for APPROVED users):
```
[Unapprove] [Block]
```

## User Flow - Updated

### Admin Approves User
1. **Admin clicks "Approve"** in user list
2. **Backend**:
   - User status → `APPROVED`
   - Generate verification token
   - Store token in database (expires 24h)
   - Send email with magic link
3. **User receives email** with subject: "Your Clerkship QBank account has been approved! 🎉"
4. **User clicks button/link** in email
5. **User is logged in** immediately
6. **Access granted** to all Year 4 pages

### Old Flow (For Comparison)
1. Admin clicks "Approve"
2. User status → `APPROVED`
3. User must return to login page
4. User enters email again
5. Magic link sent
6. User clicks link
7. User logged in

### New Flow (Current)
1. Admin clicks "Approve"
2. User status → `APPROVED`
3. **Magic link sent automatically**
4. User clicks link from email
5. User logged in immediately

**Improvement**: Removes 2 steps, better UX!

## Testing with Unapprove

### How to Test Repeatedly
1. **Test user registers** → Status: PENDING
2. **Admin approves** → Status: APPROVED, email sent
3. **User clicks link** → Logged in
4. **Admin clicks "Unapprove"** → Status: PENDING (user kicked out)
5. **Repeat from step 2**

### Unapprove Use Cases
- **Testing**: Test the approval flow multiple times with same account
- **Mistake**: Accidentally approved wrong user
- **Development**: Reset test accounts to PENDING
- **Demo**: Show the full flow to stakeholders

### Unapprove Behavior
- APPROVED user → PENDING user
- User's active sessions remain valid (until they expire or logout)
- User won't be able to access protected routes after next request (middleware checks)
- User can be re-approved and will receive a new magic link

## Email Configuration

### Environment Variables Required
```env
AUTH_DEV_NO_SMTP=false          # Set to true for dev mode (console logging)
EMAIL_FROM="Clerkship QBank <clerkship.me@gmail.com>"
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=clerkship.me@gmail.com
EMAIL_SERVER_PASSWORD=your_app_password
NEXTAUTH_URL=http://localhost:3000  # Or production URL
```

### Development Mode
Set `AUTH_DEV_NO_SMTP=true` and magic links will be logged to console instead of emailed:
```
[DEV EMAIL] Magic link for u12345678@sharjah.ac.ae:
http://localhost:3000/api/auth/callback/email?token=abc123...
```

### Production Mode
Set `AUTH_DEV_NO_SMTP=false` and emails will be sent via SMTP (Gmail).

## Email Content

### Subject
"Your Clerkship QBank account has been approved! 🎉"

### HTML Email
- **Header**: Purple gradient with "Clerkship QBank" logo
- **Body**: Gray background with white card
- **Message**: Congratulatory text about approval
- **CTA**: Large purple gradient button "Sign in to Clerkship"
- **Fallback**: Plain text link for copying
- **Footer**: Expiry notice and security note

### Plain Text Email
```
Your Clerkship QBank account has been approved!

Click the link below to sign in:
http://localhost:3000/api/auth/callback/email?token=...

This link will expire in 24 hours and can only be used once.

If you didn't request this, you can safely ignore this email.
```

## Security Features

### Token Security
- **Cryptographically random**: 32 bytes (256 bits) of entropy
- **Hex encoded**: 64 character hex string
- **One-time use**: Token deleted after consumption
- **Time-limited**: 24-hour expiry
- **Database stored**: Verified against database record

### Email Security
- **HTTPS links**: Production URLs use HTTPS
- **Domain validation**: Only university emails accepted
- **No sensitive data**: Email doesn't contain password or secrets
- **Clear sender**: From "Clerkship QBank" official email

### API Security
- **MASTER_ADMIN only**: Only master admins can approve/unapprove
- **User ID required**: Can't approve without valid user ID
- **Email verification**: Must provide email to send link
- **Session check**: Verified via NextAuth session

## Error Handling

### Email Sending Fails
```typescript
try {
  await sendMagicLinkEmail({ email });
  return { success: true, message: "User approved and login email sent!" };
} catch (emailError) {
  console.error("Error sending approval email:", emailError);
  return { 
    success: true, 
    message: "User approved (email failed - user can request at login)" 
  };
}
```

### Common Email Errors
1. **SMTP authentication failed**: Check EMAIL_SERVER_PASSWORD
2. **Connection timeout**: Check EMAIL_SERVER_HOST and port
3. **Recipient rejected**: Check email format
4. **Rate limit**: Gmail has sending limits

### Fallback Flow
If email fails:
1. User is still approved in database
2. User can go to login page
3. User enters email
4. Login page detects APPROVED status
5. Sends magic link (second attempt)
6. User receives email and logs in

## Testing Checklist

### Email Sending
- [ ] Admin approves user → Email sent immediately
- [ ] Email arrives within 1 minute
- [ ] Email has correct subject and branding
- [ ] Button link works and logs user in
- [ ] Plain text link works (copy-paste)
- [ ] Link expires after 24 hours
- [ ] Link can only be used once

### Unapprove Feature
- [ ] Unapprove button appears for APPROVED users
- [ ] Click Unapprove → Confirmation dialog shown
- [ ] Confirm → User status changes to PENDING
- [ ] Page refreshes and shows updated status
- [ ] User can be re-approved
- [ ] New email sent on re-approval

### Dev Mode
- [ ] Set AUTH_DEV_NO_SMTP=true
- [ ] Approve user → Link logged to console
- [ ] Copy link from console
- [ ] Paste in browser → User logged in

### Error Recovery
- [ ] Disconnect internet → Approve user
- [ ] Email fails but user is approved
- [ ] User goes to login → Requests link manually
- [ ] Email sent successfully second time

## Monitoring

### Success Logs
```
✅ User approved and magic link sent: u12345678@sharjah.ac.ae
✅ Approval email sent to u12345678@sharjah.ac.ae
```

### Testing Logs
```
⚠️ User unapproved (set to PENDING): u12345678@sharjah.ac.ae
```

### Error Logs
```
Error sending approval email: [error details]
Error sending magic link email: [error details]
```

### Dev Mode Logs
```
[DEV EMAIL] Magic link for u12345678@sharjah.ac.ae:
http://localhost:3000/api/auth/callback/email?token=...
```

## Database Schema

### VerificationToken Model
```prisma
model VerificationToken {
  identifier String   // Email address
  token      String   @unique // 64-char hex token
  expires    DateTime // 24 hours from creation

  @@unique([identifier, token])
}
```

**Token Lifecycle**:
1. Created when email sent
2. Verified when user clicks link
3. Deleted after successful login
4. Auto-expires after 24 hours

## Future Enhancements

1. **Custom email templates**: Allow admins to customize email content
2. **Multiple email providers**: Support SendGrid, AWS SES, etc.
3. **Email tracking**: Track when emails are opened/clicked
4. **Bulk approve**: Approve multiple users and send batch emails
5. **Scheduled sending**: Send approval emails at specific times
6. **Email queue**: Queue emails for retry on failure
7. **Notification preferences**: Let users choose notification settings
8. **SMS notifications**: Send SMS in addition to email
9. **In-app notifications**: Show notification in app when approved
10. **Email analytics**: Dashboard showing email delivery rates

## Troubleshooting

### Email Not Received
1. Check spam/junk folder
2. Verify EMAIL_FROM address is correct
3. Check SMTP credentials (EMAIL_SERVER_PASSWORD)
4. Look for error logs in console
5. Try manual link request at login page

### Link Not Working
1. Check if link expired (24 hours)
2. Verify link hasn't been used already
3. Check NEXTAUTH_URL is correct
4. Look for middleware blocking
5. Try requesting new link

### Unapprove Not Working
1. Verify you're logged in as MASTER_ADMIN
2. Check browser console for errors
3. Verify user ID is correct
4. Check API endpoint is accessible

## Support Commands

### Check User Status
```sql
SELECT email, "approvalStatus", "createdAt" 
FROM "User" 
WHERE email = 'u12345678@sharjah.ac.ae';
```

### Manually Approve User
```sql
UPDATE "User" 
SET "approvalStatus" = 'APPROVED' 
WHERE email = 'u12345678@sharjah.ac.ae';
```

### Check Verification Tokens
```sql
SELECT identifier, expires, 
       CASE WHEN expires > NOW() THEN 'Valid' ELSE 'Expired' END as status
FROM "VerificationToken"
WHERE identifier = 'u12345678@sharjah.ac.ae';
```

### Delete Expired Tokens
```sql
DELETE FROM "VerificationToken" WHERE expires < NOW();
```
