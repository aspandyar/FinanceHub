import { jest } from '@jest/globals';

// 1. Create mock functions FIRST with proper types
const mockSign = jest.fn<() => any>();
const mockVerify = jest.fn<() => any>();
const mockDecode = jest.fn<() => any>();

// 2. Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  default: {
    sign: mockSign,
    verify: mockVerify,
    decode: mockDecode,
  },
}));

// 3. Mock config
jest.mock('../config/config.js', () => ({
  default: {
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
  },
}));

// 4. Import utils AFTER mocks
import { generateToken, verifyToken, decodeToken, type JWTPayload } from '../utils/jwt.js';
import config from '../config/config.js';

describe('JWT Utils', () => {
  const mockPayload: JWTPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'user',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const expectedToken = 'generated-token';
      mockSign.mockReturnValue(expectedToken);

      const result = generateToken(mockPayload);

      expect(result).toBe(expectedToken);
      expect(mockSign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('should throw error when JWT_SECRET is not configured', () => {
      const originalSecret = config.jwtSecret;
      (config as any).jwtSecret = undefined;

      expect(() => generateToken(mockPayload)).toThrow('JWT_SECRET is not configured');

      (config as any).jwtSecret = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify and return decoded token', () => {
      const token = 'valid-token';
      mockVerify.mockReturnValue(mockPayload);

      const result = verifyToken(token);

      expect(result).toEqual(mockPayload);
      expect(mockVerify).toHaveBeenCalledWith(token, 'test-secret');
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid-token';
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => verifyToken(token)).toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', () => {
      const token = 'expired-token';
      mockVerify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      expect(() => verifyToken(token)).toThrow('Invalid or expired token');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = 'some-token';
      mockDecode.mockReturnValue(mockPayload);

      const result = decodeToken(token);

      expect(result).toEqual(mockPayload);
      expect(mockDecode).toHaveBeenCalledWith(token);
    });

    it('should return null when decode fails', () => {
      const token = 'invalid-token';
      mockDecode.mockReturnValue(null);

      const result = decodeToken(token);

      expect(result).toBeNull();
    });

    it('should return null when decode throws error', () => {
      const token = 'invalid-token';
      mockDecode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      const result = decodeToken(token);

      expect(result).toBeNull();
    });
  });
});
