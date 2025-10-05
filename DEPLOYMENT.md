# 🚀 Deployment Guide - Clerkship.me

## Prerequisites
- ✅ Vercel account
- ✅ Domain: Clerkship.me
- ✅ PostgreSQL database (recommended: Vercel Postgres, Neon, or Supabase)
- ✅ SMTP email service (for magic links)

---

## Step 1: Database Setup

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Click "Storage" → "Create Database" → "Postgres"
3. Name it: `qbank-production`
4. Copy the connection strings:
   - `POSTGRES_URL` → Use as `DATABASE_URL`
   - `POSTGRES_URL_NON_POOLING` → Use as `DIRECT_DATABASE_URL`

### Option B: Neon (Alternative)
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string
4. Use it for both `DATABASE_URL` and `DIRECT_DATABASE_URL`

### Option C: Supabase (Alternative)
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" (URI mode)
5. Use it for both `DATABASE_URL` and `DIRECT_DATABASE_URL`

---

## Step 2: Email Service Setup

### Option A: Resend (Recommended - Free tier available)
1. Go to https://resend.com
2. Sign up and verify your domain (clerkship.me)
3. Get your API key
4. Configure:
   ```
   EMAIL_SERVER_HOST=smtp.resend.com
   EMAIL_SERVER_PORT=465
   EMAIL_SERVER_USER=resend
   EMAIL_SERVER_PASSWORD=your_api_key_here
   EMAIL_FROM=Clerkship <noreply@clerkship.me>
   ```

### Option B: SendGrid (Alternative)
1. Go to https://sendgrid.com
2. Create API key
3. Configure:
   ```
   EMAIL_SERVER_HOST=smtp.sendgrid.net
   EMAIL_SERVER_PORT=465
   EMAIL_SERVER_USER=apikey
   EMAIL_SERVER_PASSWORD=your_sendgrid_api_key
   EMAIL_FROM=Clerkship <noreply@clerkship.me>
   ```

### Option C: Gmail (Development/Testing Only)
⚠️ Not recommended for production
```
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-gmail@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=Clerkship <your-gmail@gmail.com>
```

---

## Step 3: Deploy to Vercel

### Via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts
   - Link to existing project or create new one
   - Name: `qbank` or `clerkship`

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Via Vercel Dashboard (Alternative)

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `vercel-build` (uses: `prisma generate && next build`)
   - Output Directory: `.next`
   - Install Command: `npm install`

---

## Step 4: Configure Environment Variables

In your Vercel project dashboard, go to **Settings → Environment Variables** and add:

### 🔒 Required Variables

```bash
# Database
DATABASE_URL="your_production_database_url_here"
DIRECT_DATABASE_URL="your_production_database_url_here"

# Auth
AUTH_SECRET="generate_a_random_32_char_string"
NEXTAUTH_URL="https://clerkship.me"
NEXTAUTH_SECRET="same_as_AUTH_SECRET"

# Email
EMAIL_FROM="Clerkship <noreply@clerkship.me>"
EMAIL_SERVER_HOST="smtp.resend.com"
EMAIL_SERVER_PORT="465"
EMAIL_SERVER_USER="resend"
EMAIL_SERVER_PASSWORD="your_resend_api_key"

# Auth Settings
AUTH_ALLOW_ANY_EMAIL="true"
AUTH_DEV_NO_SMTP="false"
```

### 🔐 Generate Secure Secrets

Run this command to generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output for `AUTH_SECRET` and `NEXTAUTH_SECRET`.

### ⚙️ Optional Variables

```bash
# If you want to disable local DB preference
PREFER_LOCAL_DB="false"

# Shadow database for migrations (if needed)
PRISMA_MIGRATION_SHADOW_DATABASE_URL="your_shadow_database_url"
```

---

## Step 5: Run Database Migration

After deployment, you need to run migrations:

### Option A: Via Vercel CLI
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

### Option B: Via Vercel Dashboard
1. Go to your project → Settings → Environment Variables
2. Copy `DATABASE_URL`
3. Create a temporary `.env.production` file locally:
   ```
   DATABASE_URL="paste_your_production_url_here"
   ```
4. Run migration:
   ```bash
   npx dotenv -e .env.production -- npx prisma migrate deploy
   ```
5. Delete `.env.production` file

### Option C: Vercel Build Hook (Automated)
The `vercel-build` script already includes `prisma generate`, but migrations need to be run once manually.

---

## Step 6: Configure Custom Domain

1. Go to Vercel project → **Settings → Domains**
2. Add your domain: `clerkship.me`
3. Also add: `www.clerkship.me`
4. Vercel will provide DNS records

### Update Domain DNS (at your registrar)

Add these DNS records at your domain registrar (where you bought clerkship.me):

**For clerkship.me:**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21`

**For www.clerkship.me:**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

**SSL Certificate:**
- Vercel automatically provisions SSL certificates
- Wait 24-48 hours for DNS propagation
- Check status in Vercel dashboard

---

## Step 7: Post-Deployment Checklist

### ✅ Verify Deployment

1. **Check Homepage**: https://clerkship.me
2. **Check Login**: https://clerkship.me/login
3. **Test Magic Link**: Try logging in with your email
4. **Check Email**: Verify magic link emails are sent
5. **Check Database**: Verify data is persisting
6. **Test Theme**: Check if theme switching works
7. **Test Dark Mode**: Verify messages panel dark mode
8. **Check Admin Pages**: Test admin functionality

### ✅ Create Master Admin User

After deployment, promote your user to master admin:

1. Connect to your production database
2. Run this SQL:
   ```sql
   UPDATE "User" 
   SET role = 'MASTER_ADMIN', 
       "approvalStatus" = 'approved' 
   WHERE email = 'your-email@example.com';
   ```

Or use Prisma Studio:
```bash
npx prisma studio
```

---

## Step 8: Monitoring & Maintenance

### 📊 Set Up Monitoring

1. **Vercel Analytics**: Enable in project settings
2. **Error Tracking**: Consider Sentry integration
3. **Database Monitoring**: Use your database provider's dashboard

### 🔄 Future Deployments

#### Automatic (Git Integration)
- Push to `main` branch → Auto-deploys to production
- Push to other branches → Creates preview deployments

#### Manual
```bash
vercel --prod
```

### 🗃️ Database Migrations

When you update the database schema:

1. Create migration locally:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

2. Commit and push the migration files

3. Vercel will NOT automatically run migrations, so after deployment:
   ```bash
   vercel env pull .env.production
   npx prisma migrate deploy
   ```

Or set up a GitHub Action to automate this.

---

## 🆘 Troubleshooting

### Issue: "Module not found" errors
**Solution**: Check that all dependencies are in `dependencies`, not `devDependencies`

### Issue: Database connection fails
**Solution**: 
- Verify `DATABASE_URL` is correct
- Check database is accessible from Vercel (most are)
- Ensure connection string uses SSL: add `?ssl=true` or `?sslmode=require`

### Issue: Magic link emails not sending
**Solution**:
- Verify SMTP credentials
- Check `EMAIL_FROM` matches verified sender domain
- Look at Vercel function logs for errors

### Issue: Theme not persisting
**Solution**:
- Check localStorage is working
- Verify `NEXTAUTH_URL` is set correctly
- Check cookies are being set (not blocked by browser)

### Issue: Prisma migrations fail
**Solution**:
- Ensure `DIRECT_DATABASE_URL` is set (for migrations)
- Check database user has CREATE/ALTER permissions
- Verify shadow database URL if required

### Issue: Build fails
**Solution**:
- Check all environment variables are set
- Verify `DATABASE_URL` is accessible during build
- Check Vercel build logs for specific errors

---

## 🔐 Security Checklist

- ✅ `AUTH_SECRET` is a strong random string (32+ characters)
- ✅ `AUTH_DEV_NO_SMTP` is set to `false`
- ✅ Database credentials are secure
- ✅ SMTP credentials are secure
- ✅ No secrets committed to Git
- ✅ `.env` files are in `.gitignore`
- ✅ SSL certificate is active
- ✅ CORS settings are configured (if using external APIs)

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth Docs**: https://authjs.dev

---

## 🎉 Congratulations!

Your Clerkship QBank is now live at **https://clerkship.me**! 

### Next Steps:
1. Share with your colleagues
2. Set up regular database backups
3. Monitor performance and errors
4. Gather user feedback
5. Iterate and improve

Good luck with your deployment! 🚀
