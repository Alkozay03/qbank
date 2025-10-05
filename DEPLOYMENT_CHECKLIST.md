# 🚀 Quick Deployment Checklist

Use this checklist to ensure smooth deployment to Clerkship.me

## Pre-Deployment

- [ ] **Database Ready**
  - [ ] Production PostgreSQL database created
  - [ ] Connection strings copied
  - [ ] Database accessible from external sources

- [ ] **Email Service Ready**
  - [ ] SMTP service selected (Resend recommended)
  - [ ] API key obtained
  - [ ] Domain verified (if required)
  - [ ] Sender email configured

- [ ] **Secrets Generated**
  - [ ] AUTH_SECRET generated (32+ chars)
  - [ ] NEXTAUTH_SECRET generated (same as AUTH_SECRET)

## Vercel Setup

- [ ] **Project Created**
  - [ ] Logged into Vercel
  - [ ] Project imported from Git (or manual deployment)
  - [ ] Framework detected as Next.js

- [ ] **Environment Variables Set**
  - [ ] DATABASE_URL
  - [ ] DIRECT_DATABASE_URL
  - [ ] AUTH_SECRET
  - [ ] NEXTAUTH_URL (https://clerkship.me)
  - [ ] NEXTAUTH_SECRET
  - [ ] EMAIL_SERVER_HOST
  - [ ] EMAIL_SERVER_PORT
  - [ ] EMAIL_SERVER_USER
  - [ ] EMAIL_SERVER_PASSWORD
  - [ ] EMAIL_FROM
  - [ ] AUTH_ALLOW_ANY_EMAIL (true)
  - [ ] AUTH_DEV_NO_SMTP (false)

- [ ] **Build Settings Verified**
  - [ ] Build Command: `vercel-build`
  - [ ] Output Directory: `.next`
  - [ ] Install Command: `npm install`
  - [ ] Node.js Version: 18.x or higher

## Database Migration

- [ ] **Migrations Applied**
  - [ ] Pulled production env vars
  - [ ] Ran `npx prisma migrate deploy`
  - [ ] Verified tables created
  - [ ] Checked database schema

## Domain Configuration

- [ ] **DNS Records Added**
  - [ ] A record for @ → 76.76.21.21
  - [ ] CNAME for www → cname.vercel-dns.com
  - [ ] DNS propagation checked (can take 24-48hrs)

- [ ] **Domain in Vercel**
  - [ ] clerkship.me added
  - [ ] www.clerkship.me added
  - [ ] SSL certificate issued
  - [ ] Domain verified

## Post-Deployment Testing

- [ ] **Basic Functionality**
  - [ ] Homepage loads: https://clerkship.me
  - [ ] Login page works: https://clerkship.me/login
  - [ ] Can request magic link
  - [ ] Magic link email received
  - [ ] Can authenticate with magic link
  - [ ] Redirected to /years after login

- [ ] **User Features**
  - [ ] Year 4 dashboard loads
  - [ ] Questions display correctly
  - [ ] Quiz functionality works
  - [ ] Performance tracking works
  - [ ] Theme switching works
  - [ ] Dark mode works (including messages panel)
  - [ ] Profile updates persist

- [ ] **Admin Features**
  - [ ] Create master admin user (SQL update)
  - [ ] Admin dashboard accessible
  - [ ] Can approve users
  - [ ] Can manage questions
  - [ ] Messages panel works
  - [ ] Blue theme forces on admin pages

## Security Verification

- [ ] **Production Security**
  - [ ] No .env files in Git
  - [ ] AUTH_SECRET is secure
  - [ ] Database credentials secure
  - [ ] SMTP credentials secure
  - [ ] SSL certificate active (https://)
  - [ ] No sensitive data in client code

## Monitoring Setup

- [ ] **Analytics & Monitoring**
  - [ ] Vercel Analytics enabled
  - [ ] Error logs accessible
  - [ ] Database monitoring active
  - [ ] Email delivery monitoring

## Documentation

- [ ] **Updated Documentation**
  - [ ] Production URLs documented
  - [ ] Deployment process documented
  - [ ] Emergency rollback plan ready
  - [ ] Team members have access

## Final Checks

- [ ] **Go Live Ready**
  - [ ] All critical paths tested
  - [ ] Performance acceptable
  - [ ] No console errors
  - [ ] Mobile responsive
  - [ ] All features working
  - [ ] Backup plan ready

---

## Quick Commands Reference

### Deploy
```bash
vercel --prod
```

### Pull Environment Variables
```bash
vercel env pull
```

### Run Migrations
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

### View Logs
```bash
vercel logs
```

### Create Master Admin
```sql
UPDATE "User" 
SET role = 'MASTER_ADMIN', "approvalStatus" = 'approved' 
WHERE email = 'your-email@example.com';
```

---

## Emergency Rollback

If something goes wrong:

1. **Rollback in Vercel Dashboard**
   - Go to Deployments
   - Find last working deployment
   - Click "..." → "Promote to Production"

2. **Or via CLI**
   ```bash
   vercel rollback
   ```

---

## Support Contacts

- Vercel Support: https://vercel.com/support
- Database Provider Support: [Your provider]
- Email Provider Support: [Your provider]

---

**Last Updated**: October 5, 2025
**Deployment Target**: https://clerkship.me
