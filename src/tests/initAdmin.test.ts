import { jest } from '@jest/globals';

// Mock database FIRST to prevent real DB calls
jest.mock('../config/database.js', () => ({
  default: { query: jest.fn() },
  query: jest.fn(),
}));

// 1. Create mock functions FIRST with proper types
const mockGetUserByEmail = jest.fn<() => Promise<any>>();
const mockCreateUser = jest.fn<() => Promise<any>>();
const mockHashPassword = jest.fn<() => Promise<any>>();

// 2. Mock modules
jest.mock('../models/models.js', () => ({
  UserModel: {
    getUserByEmail: mockGetUserByEmail,
    createUser: mockCreateUser,
  },
}));

jest.mock('../utils/password.js', () => ({
  hashPassword: mockHashPassword,
}));

// 3. Import utils AFTER mocks
import { initializeAdmin } from '../utils/initAdmin.js';
import type { User } from '../models/user.js';

describe('initializeAdmin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should skip admin creation when ADMIN_EMAIL is not set', async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;

    await initializeAdmin();

    expect(mockGetUserByEmail).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('should skip admin creation when ADMIN_PASSWORD is not set', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    delete process.env.ADMIN_PASSWORD;

    await initializeAdmin();

    expect(mockGetUserByEmail).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('should skip admin creation when email format is invalid', async () => {
    process.env.ADMIN_EMAIL = 'invalid-email';
    process.env.ADMIN_PASSWORD = 'password123';

    await initializeAdmin();

    expect(mockGetUserByEmail).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('should skip admin creation when admin user already exists', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'password123';

    const existingUser: User = {
      id: 'user-id',
      email: 'admin@example.com',
      full_name: 'Admin User',
      currency: 'USD',
      role: 'admin',
      password_hash: 'hashed-password',
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockGetUserByEmail.mockResolvedValue(existingUser);

    await initializeAdmin();

    expect(mockGetUserByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('should create admin user when it does not exist', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'password123';

    const hashedPassword = 'hashed-password';
    const createdUser: User = {
      id: 'user-id',
      email: 'admin@example.com',
      full_name: 'Admin User',
      currency: 'USD',
      role: 'admin',
      password_hash: hashedPassword,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockGetUserByEmail.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue(hashedPassword);
    mockCreateUser.mockResolvedValue(createdUser);

    await initializeAdmin();

    expect(mockGetUserByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(mockHashPassword).toHaveBeenCalledWith('password123');
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password_hash: hashedPassword,
      full_name: 'Admin User',
      currency: 'USD',
      role: 'admin',
    });
  });

  it('should normalize email to lowercase and trim', async () => {
    process.env.ADMIN_EMAIL = '  ADMIN@EXAMPLE.COM  ';
    process.env.ADMIN_PASSWORD = 'password123';

    const hashedPassword = 'hashed-password';
    const createdUser: User = {
      id: 'user-id',
      email: 'admin@example.com',
      full_name: 'Admin User',
      currency: 'USD',
      role: 'admin',
      password_hash: hashedPassword,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockGetUserByEmail.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue(hashedPassword);
    mockCreateUser.mockResolvedValue(createdUser);

    await initializeAdmin();

    expect(mockGetUserByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
      })
    );
  });

  it('should handle unique constraint violation gracefully', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'password123';

    const error = new Error('Duplicate key');
    (error as any).code = '23505';

    mockGetUserByEmail.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue('hashed-password');
    mockCreateUser.mockRejectedValue(error);

    await expect(initializeAdmin()).resolves.not.toThrow();
    expect(console.log).toHaveBeenCalledWith('Admin user already exists');
  });

  it('should handle other errors gracefully without throwing', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'password123';

    const error = new Error('Database error');
    mockGetUserByEmail.mockRejectedValue(error);

    await expect(initializeAdmin()).resolves.not.toThrow();
    expect(console.error).toHaveBeenCalledWith('Error initializing admin user:', error);
  });
});
