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

  it('should export closePool function', async () => {
    const database = await import('../config/database.js');
    expect(typeof database.closePool).toBe('function');
  });

  it('should export default pool', async () => {
    const database = await import('../config/database.js');
    expect(database.default).toBeDefined();
  });
});
