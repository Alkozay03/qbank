# Quick Local Database Setup (if Supabase is down)

## Step 1: Run PostgreSQL in Docker
```bash
docker run --name qbank-local-db -e POSTGRES_PASSWORD=localdev123 -e POSTGRES_DB=qbank_dev -p 5432:5432 -d postgres:15
```

## Step 2: Update .env.local (temporarily)
Replace DATABASE_URL with:
```
DATABASE_URL="postgresql://postgres:localdev123@localhost:5432/qbank_dev"
DIRECT_DATABASE_URL="postgresql://postgres:localdev123@localhost:5432/qbank_dev"
PRISMA_MIGRATION_SHADOW_DATABASE_URL="postgresql://postgres:localdev123@localhost:5432/qbank_dev?schema=_prisma_migrate_shadow"
```

## Step 3: Run migrations to set up local database
```bash
npx prisma migrate deploy
npx prisma db seed
```

## Step 4: Test the application
The question mode fixes we implemented will work with either database setup.

## When Supabase comes back online
1. Stop the local Docker container: `docker stop qbank-local-db`
2. Restore .env.local from .env.local.backup
3. Continue with Supabase

This is just a temporary solution for development/testing while Supabase is unavailable.