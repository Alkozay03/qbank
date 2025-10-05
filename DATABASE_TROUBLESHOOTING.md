# Local Development Database Setup

## Option 1: Wake up Supabase Project
1. Go to https://supabase.com/dashboard
2. Login to your account
3. Check if your project is paused
4. Click "Wake up" if it's paused

## Option 2: Use Local PostgreSQL (Quick Setup)
If Supabase continues to have issues, you can use a local database:

1. Install PostgreSQL locally or use Docker
2. Update .env.local with local database URL:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/qbank_dev"
   ```
3. Run migrations:
   ```
   npx prisma migrate deploy
   npx prisma db seed
   ```

## Option 3: Docker PostgreSQL (Recommended for development)
```bash
# Run PostgreSQL in Docker
docker run --name qbank-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=qbank_dev -p 5432:5432 -d postgres:15

# Update .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/qbank_dev"
```

## Checking Connection Status
Run: `node test-db-connection.js`