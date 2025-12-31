import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock database FIRST to prevent real DB calls
jest.mock('../config/database.js', () => ({
  default: { query: jest.fn() },
  query: jest.fn(),
}));

// 1. Create mock functions FIRST with proper types
const mockVerifyToken = jest.fn<() => any>();
const mockGetUserById = jest.fn<() => Promise<any>>();

// 2. Mock modules
jest.mock('../utils/jwt.js', () => ({
  verifyToken: mockVerifyToken,
}));

jest.mock('../models/models.js', () => ({
  UserModel: {
    getUserById: mockGetUserById,
  },
}));

// 3. Import middleware AFTER mocks
import { authenticate, requireRole, requireOwnershipOrRole } from '../middlewares/auth.js';
import type { User } from '../models/user.js';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let responseStatus: jest.Mock;
  let responseJson: jest.Mock;

  beforeEach(() => {
    responseStatus = jest.fn().mockReturnThis();
    responseJson = jest.fn().mockReturnThis();

    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: responseStatus as any,
      json: responseJson as any,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 when no authorization header', async () => {
      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockRequest.headers = { authorization: 'Invalid token' };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    it('should authenticate user with valid token', async () => {
      const token = 'valid-token';
      const decoded = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        full_name: 'Test User',
        currency: 'USD',
        password_hash: 'hash',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockVerifyToken.mockReturnValue(decoded);
      mockGetUserById.mockResolvedValue(user);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith(token);
      expect(mockGetUserById).toHaveBeenCalledWith('user-123');
      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      const token = 'invalid-token';
      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      const token = 'valid-token';
      const decoded = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockVerifyToken.mockReturnValue(decoded);
      mockGetUserById.mockResolvedValue(null);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      const token = 'valid-token';
      mockRequest.headers = { authorization: `Bearer ${token}` };
      const error = new Error('Database error');
      mockVerifyToken.mockImplementation(() => {
        throw error;
      });

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should handle error in catch block, not call next with error
      expect(responseStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('requireRole', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = requireRole('admin');
      delete mockRequest.user;

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access when user has required role', () => {
      const middleware = requireRole('admin');
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
      };

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(responseStatus).not.toHaveBeenCalled();
    });

    it('should deny access when user does not have required role', () => {
      const middleware = requireRole('admin');
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'This action requires one of the following roles: admin',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple required roles', () => {
      const middleware = requireRole('admin', 'manager');
      mockRequest.user = {
        id: 'user-123',
        email: 'manager@example.com',
        role: 'manager',
      };

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireOwnershipOrRole', () => {
    it('should return 401 when user is not authenticated', async () => {
      const getResourceUserId = jest.fn<(req: Request) => Promise<string | null>>();
      const middleware = requireOwnershipOrRole(getResourceUserId);
      delete mockRequest.user;

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(getResourceUserId).not.toHaveBeenCalled();
    });

    it('should allow access for admin role', async () => {
      const getResourceUserId = jest.fn<(req: Request) => Promise<string | null>>();
      const middleware = requireOwnershipOrRole(getResourceUserId);
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(getResourceUserId).not.toHaveBeenCalled();
    });

    it('should allow access for manager role', async () => {
      const getResourceUserId = jest.fn<(req: Request) => Promise<string | null>>();
      const middleware = requireOwnershipOrRole(getResourceUserId);
      mockRequest.user = {
        id: 'manager-123',
        email: 'manager@example.com',
        role: 'manager',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(getResourceUserId).not.toHaveBeenCalled();
    });

    it('should allow access when user owns the resource', async () => {
      const getResourceUserId = jest.fn<(req: Request) => Promise<string | null>>().mockResolvedValue('user-123');
      const middleware = requireOwnershipOrRole(getResourceUserId);
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(getResourceUserId).toHaveBeenCalledWith(mockRequest);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user does not own the resource', async () => {
      const getResourceUserId = jest.fn<(req: Request) => Promise<string | null>>().mockResolvedValue('other-user-123');
      const middleware = requireOwnershipOrRole(getResourceUserId);
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You can only access your own resources',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when resource not found', async () => {
      const getResourceUserId = jest.fn<(req: Request) => Promise<string | null>>().mockResolvedValue(null);
      const middleware = requireOwnershipOrRole(getResourceUserId);
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Resource not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when getResourceUserId throws', async () => {
      const error = new Error('Database error');
      const getResourceUserId = jest.fn<(req: Request) => Promise<string | null>>().mockRejectedValue(error);
      const middleware = requireOwnershipOrRole(getResourceUserId);
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
