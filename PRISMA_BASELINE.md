# Prisma Migration Baseline Guide

If you're migrating from the old custom migration system to Prisma and your database already has tables, you need to **baseline** the existing migration. This tells Prisma that the initial migration has already been applied.

## When to Use This

Use this guide if you see the error:
```
Error: P3005
The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
```

## Prerequisites

1. **Verify your database schema matches `schema.prisma`**
   - All tables, columns, and constraints should match
   - Use `npx prisma db pull` to introspect if needed (but don't commit the changes if schema is already correct)

2. **Ensure the migration file exists**
   - Check `prisma/migrations/20251231084023_create_tables/migration.sql` exists

## Baseline Steps

### Step 1: Generate Prisma Client
```bash
npm run prisma:generate
```

### Step 2: Mark the Migration as Applied
```bash
npm run prisma:baseline
```

Or manually:
```bash
npx prisma migrate resolve --applied 20251231084023_create_tables
```

This command:
- Marks the migration `20251231084023_create_tables` as already applied
- Does NOT run the migration SQL (since tables already exist)
- Updates Prisma's internal migration tracking table

### Step 3: Verify Migration Status
```bash
npx prisma migrate status
```

You should see:
```
Database schema is up to date!
```

### Step 4: Deploy Future Migrations
Now you can safely deploy new migrations:
```bash
npm run prisma:migrate:deploy
```

## What Happens

1. **Before baselining**: Prisma sees tables exist but no migration record → Error P3005
2. **After baselining**: Prisma sees the migration is marked as applied → No error
3. **Future migrations**: Will apply normally on top of the baseline

## Important Notes

- ⚠️ **Only baseline if your database schema matches the migration exactly**
- ⚠️ **This is a one-time operation** - don't run it multiple times
- ✅ **Safe for production** - it only updates Prisma's tracking, doesn't modify your data
- ✅ **Reversible** - you can manually remove the migration record if needed

## Troubleshooting

### "Migration not found"
Make sure the migration name matches exactly:
```bash
ls prisma/migrations/
```

### "Migration already applied"
If you see this, the baseline was successful. You can proceed with normal migrations.

### Schema Mismatch
If your database schema doesn't match `schema.prisma`:
1. Option A: Update your database to match the schema
2. Option B: Update `schema.prisma` to match your database (then create a new migration)

## Production Deployment

For production (Heroku, etc.):
```bash
# Build includes prisma:generate
npm run build

# Deploy migrations (will skip baseline migration, apply any new ones)
npm run prisma:migrate:deploy
```

The `heroku-postbuild` script automatically runs these steps.

