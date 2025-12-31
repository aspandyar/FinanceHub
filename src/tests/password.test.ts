import { jest } from '@jest/globals';
import {
  validatePassword,
  hashPassword,
  comparePassword,
  type PasswordValidationResult,
} from '../utils/password.js';

// Create mock functions with proper typing
const mockHash = jest.fn<() => Promise<string>>();
const mockCompare = jest.fn<() => Promise<boolean>>();

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

describe('Password Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePassword', () => {
    it('should return valid for a strong password', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for password shorter than 8 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return invalid for password longer than 128 characters', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters');
    });

    it('should return invalid for password without lowercase letter', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should return invalid for password without uppercase letter', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should return invalid for password without number', () => {
      const result = validatePassword('NoNumber!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return invalid for password without special character', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for password with multiple issues', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept password with exactly 8 characters', () => {
      const result = validatePassword('Pass123!');
      expect(result.isValid).toBe(true);
    });

    it('should accept password with exactly 128 characters', () => {
      const longPassword = 'A'.repeat(120) + 'a1!';
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(true);
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashed-password';
      mockHash.mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockHash).toHaveBeenCalledWith(password, 10);
    });

    it('should use salt rounds of 10', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashed-password';
      mockHash.mockResolvedValue(hashedPassword);

      await hashPassword(password);

      expect(mockHash).toHaveBeenCalledWith(password, 10);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'TestPassword123!';
      const hash = 'hashed-password';
      mockCompare.mockResolvedValue(true);

      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
      expect(mockCompare).toHaveBeenCalledWith(password, hash);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'TestPassword123!';
      const hash = 'hashed-password';
      mockCompare.mockResolvedValue(false);

      const result = await comparePassword(password, hash);

      expect(result).toBe(false);
      expect(mockCompare).toHaveBeenCalledWith(password, hash);
    });
  });
});