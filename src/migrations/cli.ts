#!/usr/bin/env node
import { migrate, rollback, rollbackAll, dropAllTables, status } from './migrate.js';
import prisma from '../config/database.js';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await migrate();
        break;
      case 'down':
      case 'rollback':
        await rollback();
        break;
      case 'down:all':
      case 'rollback:all':
        await rollbackAll();
        break;
      case 'drop':
      case 'drop:all':
        await dropAllTables();
        break;
      case 'status':
        await status();
        break;
      default:
        console.log(`
Usage: npm run migrate [command]

Commands:
  up, migrate         Run all pending migrations
  down, rollback      Rollback the last migration
  down:all, rollback:all  Rollback all migrations (drops all tables)
  drop, drop:all      Drop all tables directly (without migrations)
  status              Show migration status
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

