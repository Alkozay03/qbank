# Deployment Guide - Answer Voting System & Rotation Management

## 📦 What's Being Deployed

### New Features:
1. **Answer Voting System**
   - Students can vote on unconfirmed IDU answers during rotation periods
   - Live vote counts with percentages
   - Historical votes preserved across rotations
   - Votes locked after rotation period ends

2. **Rotation Schedule Management**
   - Admin page to create/manage rotation periods
   - Set 10-week rotation schedules (R1-R4)
   - End rotations manually
   - View voting statistics

3. **Vote Management**
   - Archive votes when confirming answers (hides from students)
   - Delete votes permanently
   - Keep votes visible option

4. **Profile Enhancement**
   - Rotation number dropdown (R1/R2/R3/R4)

---

## 🗄️ Database Migration Required

### Migration Files Created:
1. `20251008_add_answer_confirmation/migration.sql`
   - Adds `isAnswerConfirmed` column to Question table
   - Creates index for filtering

2. `20251008_add_answer_voting_system/migration.sql`
   - Creates `RotationPeriod` table
   - Creates `AnswerVote` table
   - Adds `rotationNumber` column to User table
   - Creates all necessary indexes and foreign keys

### To Run Migrations:

**Option 1: Automatic (Recommended)**
```bash
npx prisma migrate deploy
```

**Option 2: Manual SQL Execution**
If you prefer to run SQL directly:
```bash
# Connect to your database and run:
cat prisma/migrations/20251008_add_answer_confirmation/migration.sql | psql $DATABASE_URL
cat prisma/migrations/20251008_add_answer_voting_system/migration.sql | psql $DATABASE_URL
```

**Option 3: Vercel/Platform Auto-Migration**
If deploying to Vercel with automatic migrations enabled:
- Migrations will run automatically during deployment
- Ensure `postinstall` script includes `prisma generate`
- Check deployment logs for migration success

---

## 🚀 Deployment Steps

### 1. Pre-Deployment Checklist
- [x] All code committed to Git
- [x] Migration files created
- [x] Code pushed to GitHub (main branch)
- [ ] Database backup completed
- [ ] Environment variables verified

### 2. Database Backup (IMPORTANT!)
Before running migrations, backup your production database:

**Supabase:**
```bash
# Via Supabase Dashboard:
# Project Settings > Database > Backups > Download Backup
```

**Direct PostgreSQL:**
```bash
pg_dump $DATABASE_URL > backup_before_voting_system_$(date +%Y%m%d_%H%M%S).dump
```

### 3. Run Migrations

**If using Supabase Studio:**
1. Go to SQL Editor
2. Copy contents of `prisma/migrations/20251008_add_answer_confirmation/migration.sql`
3. Run it
4. Copy contents of `prisma/migrations/20251008_add_answer_voting_system/migration.sql`
5. Run it
6. Verify tables exist:
   ```sql
   SELECT * FROM "RotationPeriod" LIMIT 1;
   SELECT * FROM "AnswerVote" LIMIT 1;
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'Question' AND column_name = 'isAnswerConfirmed';
   ```

**If using Prisma CLI:**
```bash
# Make sure database is accessible
npx prisma migrate deploy

# Verify with Prisma Studio
npx prisma studio
```

### 4. Deploy Application

**Vercel:**
```bash
vercel --prod
# or via GitHub integration (automatic)
```

**Other Platforms:**
```bash
# Build the application
npm run build

# Deploy built files
# (platform-specific commands)
```

### 5. Post-Deployment Verification

#### Check Database Schema:
```sql
-- Verify new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('RotationPeriod', 'AnswerVote');

-- Verify Question column added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Question' 
AND column_name = 'isAnswerConfirmed';

-- Verify User column added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name = 'rotationNumber';
```

#### Test Application Features:
1. **Profile Settings:**
   - [ ] Can see rotation number dropdown (R1/R2/R3/R4)
   - [ ] Can save rotation number
   - [ ] Rotation number persists after refresh

2. **Admin Rotation Management:**
   - [ ] Can access `/year4/admin/rotation-schedule`
   - [ ] Can create new rotation period
   - [ ] Can view existing periods in table
   - [ ] Can edit rotation dates
   - [ ] Can end rotation (locks votes)
   - [ ] Can delete rotation period

3. **Voting System (Year 4):**
   - [ ] Student sees voting UI after submitting answer (unconfirmed questions only)
   - [ ] Can cast vote (A-E buttons)
   - [ ] Can change vote during active period
   - [ ] See live vote counts with percentages
   - [ ] See historical votes in accordion (if previous rotations exist)
   - [ ] Voting hidden when answer is confirmed

4. **Vote Management:**
   - [ ] Admin confirming answer shows prompt
   - [ ] Can archive votes (hides from students)
   - [ ] Can delete votes (removes permanently)
   - [ ] Can keep votes (no action)

---

## 🔧 Troubleshooting

### Issue: Migration Fails with "relation already exists"
**Solution:**
The migration already ran previously. Verify with:
```sql
SELECT * FROM "RotationPeriod" LIMIT 1;
```
If table exists, skip that migration.

### Issue: "Cannot reach database server"
**Solution:**
1. Check DATABASE_URL in .env
2. Verify database is running
3. Check firewall/network settings
4. Ensure IP is whitelisted (if using Supabase)

### Issue: Prisma Client Type Errors
**Solution:**
Regenerate Prisma Client:
```bash
npx prisma generate
```

### Issue: Votes Not Showing in UI
**Check:**
1. User has rotation + rotationNumber set in profile
2. Rotation period exists and is active
3. Question has isAnswerConfirmed = false
4. Browser console for errors

### Issue: Admin Page Not Accessible
**Check:**
1. User role is ADMIN or MASTER_ADMIN
2. Check `/api/me/role` endpoint response
3. Clear browser cache
4. Check browser console for errors

---

## 📊 Database Schema Summary

### New Tables:

**RotationPeriod:**
```
- id (cuid)
- academicYear (int)
- rotationNumber (string) // R1, R2, R3, R4
- rotationName (string)   // Pediatrics, Surgery, etc.
- startDate (datetime)
- endDate (datetime)
- isActive (boolean)
- createdAt (datetime)
- updatedAt (datetime)

Unique: [academicYear, rotationNumber, rotationName]
```

**AnswerVote:**
```
- id (cuid)
- questionId (string) FK -> Question
- userId (string) FK -> User
- academicYear (int)
- rotationNumber (string)
- rotationName (string)
- selectedAnswer (string) // A, B, C, D, E
- isFinal (boolean)       // Locked after period ends
- isArchived (boolean)    // Hidden when answer confirmed
- createdAt (datetime)
- updatedAt (datetime)

Unique: [questionId, userId, academicYear, rotationNumber, rotationName]
```

### Modified Tables:

**User:**
```
+ rotationNumber (string nullable) // R1, R2, R3, R4
```

**Question:**
```
+ isAnswerConfirmed (boolean, default: true)
```

---

## 📝 Post-Deployment Tasks

### 1. Create Initial Rotation Periods
Navigate to `/year4/admin/rotation-schedule` and create rotation periods for:
- Current academic year (2027)
- All four rotations (R1, R2, R3, R4)
- Each rotation name:
  - Pediatrics
  - Internal Medicine
  - General Surgery
  - Obstetrics & Gynecology

Example:
```
Academic Year: 2027
Rotation Number: R1
Rotation Name: Pediatrics
Start Date: 2027-01-05
End Date: 2027-03-14 (10 weeks)
```

### 2. Update Student Profiles
Instruct students to:
1. Go to Profile settings
2. Set their current rotation
3. Set their rotation number (R1, R2, R3, or R4)

### 3. Review Existing Questions
Check questions to set isAnswerConfirmed status:
1. Go to `/year4/admin/view-questions`
2. Review questions with IDU screenshots
3. Set confirmation status accordingly

---

## 🎯 Success Criteria

Deployment is successful when:
- [ ] All migrations run without errors
- [ ] No database connection errors in logs
- [ ] Admin can access rotation schedule page
- [ ] Admin can create rotation periods
- [ ] Students can set rotation number in profile
- [ ] Voting UI appears for unconfirmed questions (after student sets rotation)
- [ ] Vote counts display correctly
- [ ] No TypeScript/build errors
- [ ] No console errors in browser

---

## 📞 Support

If issues persist:
1. Check application logs
2. Check database query logs
3. Verify all environment variables
4. Check Prisma Studio for data integrity
5. Review browser console for client-side errors

---

## 🔄 Rollback Plan

If critical issues occur:

1. **Restore Database:**
   ```bash
   # Restore from backup created in step 2
   pg_restore -d $DATABASE_URL backup_before_voting_system_YYYYMMDD_HHMMSS.dump
   ```

2. **Revert Code:**
   ```bash
   git revert HEAD~3  # Reverts last 3 commits
   git push origin main
   ```

3. **Redeploy Previous Version:**
   ```bash
   vercel --prod
   ```

---

## ✅ Deployment Complete!

Once all checks pass, the Answer Voting System is live! 🎉

Monitor for:
- User feedback on voting experience
- Database performance with new tables
- Any unexpected errors in logs
- Vote data accumulation over first rotation period
