import { jest } from '@jest/globals';

describe('Database Module', () => {
  // Test that the module exports Prisma Client
  it('should export default Prisma client', async () => {
    const database = await import('../config/database.js');
    expect(database.default).toBeDefined();
    expect(database.default.$connect).toBeDefined();
    expect(typeof database.default.$connect).toBe('function');
  });

  it('should have Prisma client methods', async () => {
    const database = await import('../config/database.js');
    const prisma = database.default;
    expect(prisma.user).toBeDefined();
    expect(prisma.category).toBeDefined();
    expect(prisma.transaction).toBeDefined();
    expect(prisma.budget).toBeDefined();
    expect(prisma.recurringTransaction).toBeDefined();
  });
});
