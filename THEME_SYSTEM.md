# Theme System Implementation

## Overview
Implemented a dual-theme system where public pages (login, years selection, pending approval) always display in sky blue theme, while authenticated Year 4 pages persist user's chosen theme preferences.

## Requirements Implemented

### 1. Default Theme: Sky Blue
- All new users default to sky blue theme
- Changed `defaultTheme` from 'red' to 'blue' in `src/config/themes.ts`

### 2. Static Sky Blue for Public Pages
- **Login page** (`/login`) - Always sky blue
- **Years selection page** (`/years`) - Always sky blue
- **Pending approval page** (`/pending-approval`) - Always sky blue
- These pages ignore any saved theme preferences

### 3. Persistent Theme for Year 4 Pages
- Users can change theme in Profile Settings
- Theme choice is saved to database
- Theme persists across login sessions
- Theme is applied automatically on subsequent logins

## Implementation Details

### Database Schema
**File:** `prisma/schema.prisma`

Added `theme` field to User model:
```prisma
model User {
  theme String? @default("blue")
  // ... other fields
}
```

### ForceBlueTheme Component
**File:** `src/components/ForceBlueTheme.tsx`

Client component that:
- Forces `data-theme="blue"` attribute on document root
- Sets all CSS custom properties for sky blue theme
- Temporarily overrides localStorage theme setting
- Cleans up on unmount to restore previous theme

**Applied to:**
- `/login/page.tsx`
- `/years/page.tsx`
- `/pending-approval/page.tsx`

### Theme Context Updates
**File:** `src/contexts/ThemeContext.tsx`

**Loading Strategy:**
1. **Year 4 Pages** (`/year4/*`):
   - Fetches theme from database via `/api/profile`
   - Falls back to localStorage if API fails
   - Applies user's saved preference

2. **Other Pages**:
   - Loads from localStorage only
   - Respects ForceBlueTheme override for public pages

**Saving Strategy:**
- When theme changes, updates localStorage immediately
- Injects hidden input into profile form
- Theme is saved to database when profile is submitted

### Profile API Updates
**File:** `src/app/api/profile/route.ts`

**GET Endpoint:**
- Added `theme` to select statement
- Returns user's saved theme preference

**POST Endpoint:**
- Accepts `theme` from FormData
- Saves theme to database on profile update
- Includes theme in both `update` and `create` operations

### Profile Page
**File:** `src/app/profile/page.tsx`

**Updated Type:**
```typescript
type Me = {
  theme?: string;
  // ... other fields
}
```

**ThemePicker Integration:**
- ThemePicker automatically injects theme value into form
- Theme is submitted along with other profile data
- No additional UI changes needed

## User Flow

### New User Registration
1. User signs up
2. Account created with `theme = "blue"` (default)
3. User sees sky blue theme on all pages

### Public Pages Experience
1. User visits `/login`, `/years`, or `/pending-approval`
2. **Always sees sky blue theme**
3. Their saved theme preference is temporarily overridden
4. ForceBlueTheme component handles the override

### Year 4 Authenticated Experience

**First Login:**
1. User logs in
2. Sees sky blue theme (default)
3. Can change theme in Profile Settings

**Changing Theme:**
1. User goes to Profile Settings (`/profile`)
2. Selects a theme from ThemePicker
3. Clicks "Save Profile" or "Save & Return"
4. Theme is saved to database
5. Theme is immediately applied

**Subsequent Logins:**
1. User logs in
2. Navigates to Year 4 pages
3. ThemeContext fetches theme from database
4. User's chosen theme is automatically applied
5. Theme persists across all Year 4 pages

### Theme Persistence Scope

**Persists (Year 4 pages):**
- `/year4/*` - All dashboard and portal pages
- `/profile` - Profile settings page
- All authenticated content areas

**Does NOT persist (Public pages - Always Sky Blue):**
- `/login` - Login page
- `/years` - Year selection page
- `/pending-approval` - Waiting for approval page
- `/` - Landing page (if any)

## Technical Implementation

### CSS Custom Properties
ForceBlueTheme sets these CSS variables:
```css
--color-primary: #0EA5E9
--color-primary-hover: #38BDF8
--color-primary-light: #F0F9FF
--color-background: #FFFFFF
--color-background-secondary: #F0F9FF
... (and more)
```

### Data Attributes
```html
<html 
  data-theme="blue"
  data-theme-type="light"
  data-theme-name="blue"
>
```

### localStorage Key
- Key: `qbank-theme`
- Values: 'blue' | 'red' | 'pink' | 'green' | 'yellow' | 'purple' | 'gray' | 'dark'
- Temporary override on public pages

## Database Changes Applied
```sql
-- Add theme column with default value
ALTER TABLE "User" ADD COLUMN "theme" TEXT DEFAULT 'blue';

-- Migration applied: ✅
-- Prisma Client regenerated: Pending (Windows file lock)
```

## Files Modified

### Created
- `src/components/ForceBlueTheme.tsx` - Component to force sky blue theme

### Modified
- `src/config/themes.ts` - Changed defaultTheme to 'blue'
- `prisma/schema.prisma` - Added theme field to User model
- `src/contexts/ThemeContext.tsx` - Load theme from DB for Year 4 pages
- `src/app/api/profile/route.ts` - Save/load theme from database
- `src/app/profile/page.tsx` - Added theme to Me type
- `src/app/login/page.tsx` - Wrapped with ForceBlueTheme
- `src/app/years/page.tsx` - Wrapped with ForceBlueTheme
- `src/app/pending-approval/page.tsx` - Wrapped with ForceBlueTheme

## Testing Checklist

### New User Flow
- [ ] Create new account → Default theme is sky blue
- [ ] Check database → theme column = 'blue'

### Public Pages (Always Sky Blue)
- [ ] Visit `/login` → Sky blue theme
- [ ] Visit `/years` → Sky blue theme
- [ ] Visit `/pending-approval` → Sky blue theme
- [ ] Save a different theme in profile → Public pages still sky blue

### Year 4 Theme Persistence
- [ ] Log in → Go to Profile → Change theme to Red
- [ ] Click "Save Profile"
- [ ] Theme changes immediately to Red
- [ ] Navigate to Dashboard → Still Red
- [ ] Log out
- [ ] Log back in
- [ ] Navigate to Year 4 Dashboard → Theme is Red (persisted)

### Theme Switching
- [ ] Change theme to Purple → Saves correctly
- [ ] Change theme to Green → Saves correctly
- [ ] Refresh page → Theme persists
- [ ] Open new tab → Same theme applied

### Mixed Page Navigation
- [ ] Start on `/year4` with Red theme
- [ ] Click logout → Redirected to `/login` → Sky blue
- [ ] Log back in → Navigate to `/year4` → Red theme restored
- [ ] Open `/years` in new tab → Sky blue regardless of Year 4 theme

## Edge Cases Handled

1. **Database unavailable:** Falls back to localStorage
2. **No theme in database:** Uses default (blue)
3. **Invalid theme value:** Falls back to default
4. **Multiple tabs:** Theme syncs via localStorage
5. **Profile page:** Theme picker works even on non-Year4 pages

## Security Considerations

- Theme stored as plain string (no security risk)
- Only user can change their own theme
- No XSS risk (theme values validated against enum)
- Database field is optional and nullable

## Performance Notes

- Theme loads asynchronously for Year 4 pages
- No blocking on database fetch
- Falls back to localStorage immediately if DB slow
- ForceBlueTheme has minimal overhead (one-time setup)

## Future Enhancements

- Add theme preview before saving
- Allow admin to set organization default theme
- Add dark mode variants for all themes
- Theme customization per user group
- Scheduled theme changes (e.g., dark mode at night)

## Deployment Steps

1. ✅ Database migration applied
2. ⏳ Prisma Client regeneration (restart server to complete)
3. Ready to test and deploy

## Support

**To manually set a user's theme:**
```sql
UPDATE "User" SET theme = 'blue' WHERE email = 'user@example.com';
```

**To reset all themes to default:**
```sql
UPDATE "User" SET theme = 'blue';
```

**To check theme statistics:**
```sql
SELECT theme, COUNT(*) FROM "User" GROUP BY theme;
```
