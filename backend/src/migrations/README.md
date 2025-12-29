# Database Migrations

This directory contains database migration files and the migration runner.

## Structure

- `migrate.ts` - Migration runner logic
- `cli.ts` - Command-line interface for running migrations
- `files/` - Directory containing SQL migration files

## Migration Files

Migration files should follow this naming convention:

- UP migrations: `{version}_{description}.up.sql`
- DOWN migrations: `{version}_{description}.down.sql`

Example:

- `001_create_items_table.up.sql` - for creating tables
- `001_create_items_table.down.sql` - for dropping tables

Each migration requires TWO separate files:

1. `.up.sql` file - contains SQL for applying the migration
2. `.down.sql` file - contains SQL for rolling back the migration

Example UP file (`001_create_items_table.up.sql`):

```sql
CREATE TABLE items (...);
CREATE INDEX idx_items_name ON items(name);
```

Example DOWN file (`001_create_items_table.down.sql`):

```sql
DROP INDEX IF EXISTS idx_items_name;
DROP TABLE IF EXISTS items;
```

## Usage

### Run all pending migrations

```bash
npm run migrate:up
# or
npm run migrate up
```

### Rollback the last migration

```bash
npm run migrate:down
# or
npm run migrate down
```

### Rollback all migrations (drop all tables)

```bash
npm run migrate:down:all
# or
npm run migrate down:all
```

### Drop all tables directly (without migrations)

```bash
npm run migrate:drop
# or
npm run migrate drop
```

### Check migration status

```bash
npm run migrate:status
# or
npm run migrate status
```

## Creating a New Migration

1. Create TWO new SQL files in `files/` directory:
   - `{next_number}_{description}.up.sql` - for the UP migration
   - `{next_number}_{description}.down.sql` - for the DOWN migration
2. Use the next sequential number (e.g., `002`, `003`, etc.)
3. Write the UP migration SQL in the `.up.sql` file
4. Write the DOWN migration SQL in the `.down.sql` file

Example:

- `002_add_items_description.up.sql`:

```sql
ALTER TABLE items ADD COLUMN description TEXT;
```

- `002_add_items_description.down.sql`:

```sql
ALTER TABLE items DROP COLUMN IF EXISTS description;
```

## How It Works

1. The migration system creates a `migrations` table to track executed migrations
2. Each migration file is parsed and executed in version order
3. Migrations are wrapped in transactions - if one fails, all changes are rolled back
4. Only pending migrations (not in the migrations table) are executed
