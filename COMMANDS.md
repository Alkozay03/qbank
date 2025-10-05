# ⚡ Quick Command Reference

All the commands you need for deployment and maintenance.

---

## 🚀 Initial Deployment

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## 🔐 Environment Variables

```bash
# Pull env vars from Vercel to local
vercel env pull

# Pull production env vars
vercel env pull .env.production

# Add env var via CLI
vercel env add

# Remove env var
vercel env rm VARIABLE_NAME
```

---

## 🗄️ Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Run migrations on production
vercel env pull .env.production
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (CAUTION!)
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

---

## 📊 Monitoring & Logs

```bash
# View real-time logs
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]

# Follow logs (like tail -f)
vercel logs --follow

# View production logs only
vercel logs --prod
```

---

## 🌐 Domain Management

```bash
# List all domains
vercel domains ls

# Add a domain
vercel domains add clerkship.me

# Remove a domain
vercel domains rm clerkship.me

# Verify domain
vercel domains verify clerkship.me
```

---

## 📦 Project Management

```bash
# List all projects
vercel ls

# Link current directory to project
vercel link

# Get project info
vercel inspect

# Remove project (CAUTION!)
vercel remove project-name
```

---

## 🔄 Deployment Management

```bash
# List all deployments
vercel ls

# Promote a deployment to production
vercel promote [deployment-url]

# Rollback to previous deployment
vercel rollback

# Remove a deployment
vercel rm [deployment-url]

# Cancel a running deployment
vercel cancel
```

---

## 🔨 Local Development

```bash
# Install dependencies
npm install

# Run dev server (with Turbopack)
npm run dev

# Run faster dev mode
npm run dev:fast

# Build for production
npm run build

# Start production build locally
npm run start

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run typecheck
```

---

## 🛠️ Database Utilities (Your Custom Scripts)

```bash
# Seed database
npm run db:seed

# Reset QBank data
npm run reset:qbank

# Check database data
node check-database-data.js

# Check questions
node check-questions.js

# Check notifications
node check-notifications.js

# Promote user to master admin
node promote-to-master-admin.js
```

---

## 🔐 Generate Secure Secrets

```bash
# Generate 32-byte random hex string (for AUTH_SECRET)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate UUID
node -e "console.log(require('crypto').randomUUID())"

# Generate random password (20 chars)
node -e "console.log(require('crypto').randomBytes(20).toString('base64'))"
```

---

## 🗃️ SQL Quick Commands (Production)

### Create Master Admin
```sql
UPDATE "User" 
SET role = 'MASTER_ADMIN', "approvalStatus" = 'approved' 
WHERE email = 'your-email@example.com';
```

### Check User Roles
```sql
SELECT email, role, "approvalStatus" FROM "User";
```

### Approve User
```sql
UPDATE "User" 
SET "approvalStatus" = 'approved' 
WHERE email = 'user@example.com';
```

### Count Users
```sql
SELECT role, COUNT(*) 
FROM "User" 
GROUP BY role;
```

### Recent Logins
```sql
SELECT email, "lastLoginAt" 
FROM "User" 
ORDER BY "lastLoginAt" DESC 
LIMIT 10;
```

---

## 🧪 Testing Commands

```bash
# Test API health
curl https://clerkship.me/api/health

# Test homepage
curl -I https://clerkship.me

# Test SSL
curl -vI https://clerkship.me 2>&1 | grep -i ssl

# Test with specific headers
curl -H "Accept: application/json" https://clerkship.me/api/endpoint

# Check response time
time curl -I https://clerkship.me
```

---

## 🔍 Debugging

```bash
# Check Vercel CLI version
vercel --version

# Get help for any command
vercel [command] --help

# Debug deployment
vercel --debug

# Check Node version
node --version

# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Verify package.json
npm run verify

# List outdated packages
npm outdated
```

---

## 🚨 Emergency Commands

```bash
# Quick rollback
vercel rollback

# Cancel current deployment
vercel cancel

# Remove all cache
rm -rf .next node_modules
npm install
vercel --prod

# Force redeploy
vercel --prod --force
```

---

## 📱 Mobile Testing

```bash
# Get deployment URL
vercel inspect --output url

# Use ngrok for local testing
ngrok http 3000

# Test on specific device
# Use: https://www.browserstack.com
# Or: https://appetize.io
```

---

## 🔄 Common Workflows

### Full Fresh Deploy
```bash
npm install
npm run build
vercel --prod
```

### Update with Migration
```bash
# 1. Create migration locally
npx prisma migrate dev --name update_name

# 2. Test locally
npm run dev

# 3. Commit changes
git add .
git commit -m "feat: add new feature"
git push

# 4. Vercel auto-deploys

# 5. Run migration on production
vercel env pull .env.production
npx prisma migrate deploy
```

### Hotfix Deployment
```bash
# 1. Make urgent fix
# 2. Commit
git commit -m "fix: critical bug"

# 3. Deploy immediately
vercel --prod

# 4. Verify
curl https://clerkship.me
```

### Environment Update
```bash
# 1. Update env var in Vercel dashboard
# 2. Redeploy
vercel --prod --force
```

---

## 💡 Pro Tips

```bash
# Alias for quick deploy
alias deploy="vercel --prod"

# Alias for logs
alias vlogs="vercel logs --follow"

# Alias for production env
alias vprod="vercel env pull .env.production"

# Alias for dev with turbo
alias vdev="npm run dev"

# Add these to your .bashrc or .zshrc
```

---

## 📞 Get Help

```bash
# Vercel help
vercel help

# Vercel docs
open https://vercel.com/docs

# Vercel support
open https://vercel.com/support

# Community
open https://github.com/vercel/vercel/discussions
```

---

**Last Updated**: October 5, 2025
**Project**: Clerkship QBank
**Domain**: https://clerkship.me
