# Prisma Migration Guide

This project has been migrated from raw SQL queries to Prisma ORM. Follow these steps to complete the migration.

## Installation

1. Install Prisma dependencies:

```bash
npm install
```

This will install `@prisma/client` and `prisma` (dev dependency).

## Database Setup

2. Generate Prisma Client:

```bash
npm run prisma:generate
```

1. If you have an existing database, you can introspect it to create the Prisma schema:

```bash
npx prisma db pull
```

4. Create and apply migrations:

```bash
npm run prisma:migrate
```

This will create a new migration based on your schema and apply it to the database.

## Development

- **Generate Prisma Client**: `npm run prisma:generate`
- **Create migration**: `npm run prisma:migrate`
- **Open Prisma Studio** (database GUI): `npm run prisma:studio`
- **Deploy migrations** (production): `npm run prisma:migrate:deploy`

## Key Changes

### Database Connection

- `src/config/database.ts` now uses Prisma Client instead of `pg` pool
- The `query()` function has been removed - use Prisma Client methods instead

### Models

All model files have been updated to use Prisma:

- `src/models/user.ts`
- `src/models/category.ts`
- `src/models/transaction.ts`
- `src/models/budget.ts`
- `src/models/recurringTransaction.ts`

### Type Safety

- Types are now generated from the Prisma schema
- Import types from `@prisma/client` instead of defining them manually
- Decimal fields use Prisma's `Decimal` type

### Error Handling

- Prisma uses different error codes (e.g., `P2002` for unique constraint violations)
- Updated `src/utils/initAdmin.ts` to handle both Prisma and PostgreSQL error codes

## Migration from Existing Database

If you have an existing database:

1. **Backup your database first!**

2. The Prisma schema has been created to match your existing database structure. You can:
   - Use `prisma db pull` to introspect your existing database and update the schema
   - Or manually verify the schema matches your current database

3. Run migrations:

```bash
npm run prisma:migrate
```

4. If you need to reset the database (⚠️ **WARNING: This deletes all data**):

```bash
npx prisma migrate reset
```

## Notes

- The old migration system (`src/migrations/`) is still present but no longer used
- Prisma handles migrations automatically through `prisma/migrations/`
- System categories are now seeded via `prisma/seed.ts` instead of SQL migrations

## Troubleshooting

### "Cannot find module '@prisma/client'"

Run `npm install` and then `npm run prisma:generate`

### Migration conflicts

If you have conflicts, you can reset migrations:

```bash
npx prisma migrate reset
```

### Type errors

After updating the schema, always run:

```bash
npm run prisma:generate
```

This regenerates the Prisma Client with updated types.
