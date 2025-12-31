import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  name: string;
  version: number;
  up: string;
  down?: string;
}

// Create migrations table if it doesn't exist
const ensureMigrationsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      version INTEGER NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Get all executed migrations
const getExecutedMigrations = async (): Promise<number[]> => {
  const result = await prisma.$queryRawUnsafe<Array<{ version: number }>>('SELECT version FROM migrations ORDER BY version');
  return result.map((row) => row.version);
};

// Record a migration as executed (not used, but kept for compatibility)
const recordMigration = async (version: number, name: string) => {
  await prisma.$executeRaw(Prisma.sql`INSERT INTO migrations (version, name) VALUES (${version}, ${name})`);
};

// Parse migration filename to extract version and name
const parseMigrationFile = (filename: string): { version: number; name: string; type: 'up' | 'down' } | null => {
  const match = filename.match(/^(\d+)_(.+)\.(up|down)\.sql$/);
  if (!match) return null;

  return {
    version: parseInt(match[1]!, 10),
    name: match[2]!,
    type: match[3] as 'up' | 'down',
  };
};

// Load UP migration file
const loadUpMigration = async (filepath: string): Promise<Migration> => {
  const content = await readFile(filepath, 'utf-8');
  const filename = filepath.split('/').pop() || '';
  const parsed = parseMigrationFile(filename);

  if (!parsed || parsed.type !== 'up') {
    throw new Error(`Invalid UP migration filename: ${filename}`);
  }

  return {
    name: parsed.name,
    version: parsed.version,
    up: content.trim(),
  };
};

// Load DOWN migration file
const loadDownMigration = async (filepath: string): Promise<Migration> => {
  const content = await readFile(filepath, 'utf-8');
  const filename = filepath.split('/').pop() || '';
  const parsed = parseMigrationFile(filename);

  if (!parsed || parsed.type !== 'down') {
    throw new Error(`Invalid DOWN migration filename: ${filename}`);
  }

  return {
    name: parsed.name,
    version: parsed.version,
    up: '', // Not used for down migrations
    down: content.trim(),
  };
};

// Run a single migration
const runMigration = async (migration: Migration) => {
  try {
    await prisma.$transaction(async (tx) => {
      // Execute the UP migration
      await tx.$executeRawUnsafe(migration.up);

      // Record the migration
      await tx.$executeRaw(Prisma.sql`INSERT INTO migrations (version, name) VALUES (${migration.version}, ${migration.name})`);
    });
    console.log(`✓ Migration ${migration.version}_${migration.name} executed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${migration.version}_${migration.name} failed:`, error);
    throw error;
  }
};

// Rollback a single migration
const rollbackMigration = async (migration: Migration) => {
  if (!migration.down) {
    throw new Error(`No DOWN migration for ${migration.version}_${migration.name}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Execute the DOWN migration
      await tx.$executeRawUnsafe(migration.down!);

      // Remove the migration record
      await tx.$executeRaw(Prisma.sql`DELETE FROM migrations WHERE version = ${migration.version}`);
    });
    console.log(`✓ Migration ${migration.version}_${migration.name} rolled back successfully`);
  } catch (error) {
    console.error(`✗ Rollback of ${migration.version}_${migration.name} failed:`, error);
    throw error;
  }
};

// Run all pending migrations
export const migrate = async () => {
  try {
    console.log('Starting migrations...');
    await ensureMigrationsTable();

    const migrationsDir = join(__dirname, 'files');
    const files = await readdir(migrationsDir);
    const upMigrationFiles = files
      .filter((f) => f.endsWith('.up.sql'))
      .sort();

    const executed = await getExecutedMigrations();
    let runCount = 0;

    for (const file of upMigrationFiles) {
      const filepath = join(migrationsDir, file);
      const migration = await loadUpMigration(filepath);

      if (executed.includes(migration.version)) {
        console.log(`⊘ Migration ${migration.version}_${migration.name} already executed, skipping`);
        continue;
      }

      await runMigration(migration);
      runCount++;
    }

    if (runCount === 0) {
      console.log('No pending migrations found.');
    } else {
      console.log(`\n✓ Successfully ran ${runCount} migration(s)`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Rollback the last migration
export const rollback = async () => {
  try {
    console.log('Rolling back last migration...');
    await ensureMigrationsTable();

    const executed = await getExecutedMigrations();
    if (executed.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }

    const lastVersion = executed[executed.length - 1]!;
    const migrationsDir = join(__dirname, 'files');
    const files = await readdir(migrationsDir);
    const downMigrationFile = files.find((f) => {
      if (!f.endsWith('.down.sql')) return false;
      const parsed = parseMigrationFile(f);
      return parsed && parsed.version === lastVersion && parsed.type === 'down';
    });

    if (!downMigrationFile) {
      throw new Error(`DOWN migration file for version ${lastVersion} not found`);
    }

    const filepath = join(migrationsDir, downMigrationFile);
    const migration = await loadDownMigration(filepath);

    await rollbackMigration(migration);
    console.log(`\n✓ Successfully rolled back migration ${lastVersion}_${migration.name}`);
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
};

// Rollback all migrations (drop all tables)
export const rollbackAll = async () => {
  try {
    console.log('Rolling back all migrations...');
    await ensureMigrationsTable();

    const executed = await getExecutedMigrations();
    if (executed.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }

    const migrationsDir = join(__dirname, 'files');
    const files = await readdir(migrationsDir);

    // Rollback migrations in reverse order (newest first)
    const executedSorted = [...executed].sort((a, b) => b - a);
    let rollbackCount = 0;

    for (const version of executedSorted) {
      const downMigrationFile = files.find((f) => {
        if (!f.endsWith('.down.sql')) return false;
        const parsed = parseMigrationFile(f);
        return parsed && parsed.version === version && parsed.type === 'down';
      });

      if (!downMigrationFile) {
        console.warn(`⚠ Warning: DOWN migration file for version ${version} not found, skipping`);
        continue;
      }

      const filepath = join(migrationsDir, downMigrationFile);
      const migration = await loadDownMigration(filepath);

      if (!migration.down) {
        console.warn(`⚠ Warning: No DOWN migration content for ${version}_${migration.name}, skipping`);
        continue;
      }

      await rollbackMigration(migration);
      rollbackCount++;
    }

    // Drop the migrations table itself
    try {
      await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS migrations CASCADE');
      console.log('✓ Dropped migrations tracking table');
    } catch (error) {
      console.warn('⚠ Warning: Could not drop migrations table:', error);
    }

    if (rollbackCount === 0) {
      console.log('No migrations were rolled back.');
    } else {
      console.log(`\n✓ Successfully rolled back ${rollbackCount} migration(s)`);
      console.log('✓ All tables have been dropped');
    }
  } catch (error) {
    console.error('Rollback all failed:', error);
    throw error;
  }
};

// Drop all tables directly (without using migrations)
export const dropAllTables = async () => {
  try {
    console.log('Dropping all tables...');
    
    // Get all table names
    const result = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = result.map((row) => row.tablename);

    if (tables.length === 0) {
      console.log('No tables to drop.');
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Drop all tables with CASCADE to handle foreign keys
        for (const table of tables) {
          await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table} CASCADE`);
          console.log(`✓ Dropped table: ${table}`);
        }
      });
      console.log(`\n✓ Successfully dropped ${tables.length} table(s)`);
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Drop all tables failed:', error);
    throw error;
  }
};

// Get migration status
export const status = async () => {
  try {
    await ensureMigrationsTable();

    const migrationsDir = join(__dirname, 'files');
    const files = await readdir(migrationsDir);
    const upMigrationFiles = files
      .filter((f) => f.endsWith('.up.sql'))
      .sort();

    const executed = await getExecutedMigrations();
    const executedSet = new Set(executed);

    console.log('\nMigration Status:');
    console.log('================\n');

    for (const file of upMigrationFiles) {
      const parsed = parseMigrationFile(file);
      if (!parsed) continue;

      const status = executedSet.has(parsed.version) ? '✓ EXECUTED' : '⊘ PENDING';
      console.log(`${status} - ${file}`);
    }

    const pending = upMigrationFiles.filter((f) => {
      const parsed = parseMigrationFile(f);
      return parsed && !executedSet.has(parsed.version);
    });

    console.log(`\nTotal: ${upMigrationFiles.length} migration(s), ${executed.length} executed, ${pending.length} pending\n`);
  } catch (error) {
    console.error('Failed to get migration status:', error);
    throw error;
  }
};

