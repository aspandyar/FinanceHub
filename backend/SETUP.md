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

4. **Start the development server**:
   ```bash
   npm run dev
   ```

The database tables will be automatically created when the server starts.

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

## Database Schema

The `items` table includes:
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255) NOT NULL)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

