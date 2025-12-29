# Setup Instructions

## Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed

## Setup Steps

1. **Create .env file** (copy from .env.example):

   ```bash
   cp .env.example .env
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start PostgreSQL database with Docker Compose**:

   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**:

   ```bash
   npm run migrate:up
   ```

5. **Start the development server**:

   ```bash
   npm run dev
   ```

Note: Migrations can also be run automatically when the server starts, but it's recommended to run them manually first.

## Environment Variables

Make sure your `.env` file contains:

- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USER=financehub_user`
- `DB_PASSWORD=financehub_password`
- `DB_NAME=financehub_db`

These values should match the ones in your `docker-compose.yml` file.

## API Endpoints

### Items

- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create a new item
- `PUT /api/items/:id` - Update an item
- `DELETE /api/items/:id` - Delete an item

## Database Migrations

The project uses a migration system to manage database schema changes.

### Migration Commands

- `npm run migrate:up` - Run all pending migrations
- `npm run migrate:down` - Rollback the last migration
- `npm run migrate:down:all` - Rollback all migrations (drops all tables)
- `npm run migrate:drop` - Drop all tables directly (without migrations)
- `npm run migrate:status` - Check migration status

### Creating New Migrations

1. Create a new SQL file in `src/migrations/files/` with the naming pattern: `{number}_{description}.sql`
2. Include both UP and DOWN migrations separated by `-- DOWN`
3. Run `npm run migrate:up` to apply the migration

See `src/migrations/README.md` for more details.

## Database Schema

The `items` table includes:

- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255) NOT NULL)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
