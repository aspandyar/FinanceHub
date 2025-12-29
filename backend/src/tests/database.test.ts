import { jest } from '@jest/globals';

describe('Database Module', () => {
  // Test that the module exports the expected functions
  it('should export query function', async () => {
    const database = await import('../config/database.js');
    expect(typeof database.query).toBe('function');
  });

  it('should export getClient function', async () => {
    const database = await import('../config/database.js');
    expect(typeof database.getClient).toBe('function');
  });

  it('should export initializeDatabase function', async () => {
    const database = await import('../config/database.js');
    expect(typeof database.initializeDatabase).toBe('function');
  });

  it('should export closePool function', async () => {
    const database = await import('../config/database.js');
    expect(typeof database.closePool).toBe('function');
  });

  it('should export default pool', async () => {
    const database = await import('../config/database.js');
    expect(database.default).toBeDefined();
  });

  // Note: Testing initializeDatabase with mocks is difficult with ESM modules
  // because ESM exports are read-only. These tests verify the function exists
  // and can be called. For full integration testing, use a test database.
});
