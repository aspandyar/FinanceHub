import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock database FIRST to prevent real DB calls
jest.mock('../config/database.js', () => ({
  default: { query: jest.fn() },
  query: jest.fn(),
}));

// 1. Create mock functions FIRST with proper types
const mockCreateUser = jest.fn<() => Promise<any>>();
const mockGetAllUsers = jest.fn<() => Promise<any>>();
const mockGetUserById = jest.fn<() => Promise<any>>();
const mockUpdateUser = jest.fn<() => Promise<any>>();
const mockDeleteUser = jest.fn<() => Promise<any>>();

// 2. Mock modules
jest.mock('../models/models.js', () => ({
  UserModel: {
    createUser: mockCreateUser,
    getAllUsers: mockGetAllUsers,
    getUserById: mockGetUserById,
    updateUser: mockUpdateUser,
    deleteUser: mockDeleteUser,
  },
}));

// 3. Import controller AFTER mocks
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import type { User, UserRole } from '../models/user.js';

describe('User Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let responseStatus: jest.Mock;
  let responseJson: jest.Mock;

  beforeEach(() => {
    responseStatus = jest.fn().mockReturnThis();
    responseJson = jest.fn().mockReturnThis();

    mockRequest = {
      body: {},
      params: {},
    };
    mockResponse = {
      status: responseStatus as any,
      json: responseJson as any,
      send: jest.fn() as any,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully as admin', async () => {
      const userData = {
        email: 'newuser@example.com',
        passwordHash: 'hashed-password',
        fullName: 'New User',
        currency: 'USD',
        role: 'user' as UserRole,
      };

      const createdUser: User = {
        id: 'user-123',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.body = userData;
      mockCreateUser.mockResolvedValue(createdUser);

      await createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        passwordHash: 'hashed-password',
        fullName: 'New User',
        currency: 'USD',
        role: 'user',
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(createdUser);
    });

    it('should return 401 when not authenticated', async () => {
      delete mockRequest.user;

      await createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 403 when user is not admin or manager', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      await createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'Only admin and manager can create users',
      });
    });

    it('should return 400 for invalid email', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.body = {
        email: 'invalid-email',
        passwordHash: 'hash',
        fullName: 'User',
      };

      await createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid email format' });
    });

    it('should return 409 when email already exists', async () => {
      const error = new Error('Duplicate key');
      (error as any).code = '23505';
      (error as any).constraint = 'users_email_key';

      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.body = {
        email: 'existing@example.com',
        passwordHash: 'hash',
        fullName: 'User',
      };

      mockCreateUser.mockRejectedValue(error);

      await createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(409);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Email already exists' });
    });
  });

  describe('getUsers', () => {
    it('should return all users for admin', async () => {
      const users: User[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          fullName: 'User 1',
          currency: 'USD',
          role: 'user',
          passwordHash: 'hash1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          fullName: 'User 2',
          currency: 'USD',
          role: 'user',
          passwordHash: 'hash2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockGetAllUsers.mockResolvedValue(users);

      await getUsers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAllUsers).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith([
        expect.not.objectContaining({ passwordHash: expect.anything() }),
        expect.not.objectContaining({ passwordHash: expect.anything() }),
      ]);
    });

    it('should return 403 for regular users', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      await getUsers(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('getUserById', () => {
    it('should return user for admin', async () => {
      const user: User = {
        id: 'user-123',
        email: 'user@example.com',
        fullName: 'User',
        currency: 'USD',
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.params = { id: 'user-123' };
      mockGetUserById.mockResolvedValue(user);

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetUserById).toHaveBeenCalledWith('user-123');
      expect(responseJson).toHaveBeenCalledWith(
        expect.not.objectContaining({ password_hash: expect.anything() })
      );
    });

    it('should allow users to view their own profile', async () => {
      const user: User = {
        id: 'user-123',
        email: 'user@example.com',
        fullName: 'User',
        currency: 'USD',
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'user-123' };
      mockGetUserById.mockResolvedValue(user);

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseJson).toHaveBeenCalled();
    });

    it('should return 403 when user tries to view another user', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'other-user-123' };

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You can only view your own profile',
      });
    });

    it('should return 404 when user not found', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.params = { id: 'non-existent' };
      mockGetUserById.mockResolvedValue(null);

      await getUserById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updatedUser: User = {
        id: 'user-123',
        email: 'updated@example.com',
        fullName: 'Updated User',
        currency: 'EUR',
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {
        email: 'updated@example.com',
        fullName: 'Updated User',
        currency: 'EUR',
      };
      mockGetUserById.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        fullName: 'User',
        currency: 'USD',
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockUpdateUser.mockResolvedValue(updatedUser);

      await updateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUpdateUser).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith(
        expect.not.objectContaining({ password_hash: expect.anything() })
      );
    });

    it('should return 403 when non-admin tries to change role', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { role: 'admin' };
      mockGetUserById.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        fullName: 'User',
        currency: 'USD',
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await updateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'Only admin can change user roles',
      });
    });

    it('should allow admin to change role', async () => {
      const updatedUser: User = {
        id: 'user-123',
        email: 'user@example.com',
        fullName: 'User',
        currency: 'USD',
        role: 'manager',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { role: 'manager' };
      mockGetUserById.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        fullName: 'User',
        currency: 'USD',
        role: 'user',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockUpdateUser.mockResolvedValue(updatedUser);

      await updateUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUpdateUser).toHaveBeenCalledWith('user-123', expect.objectContaining({ role: 'manager' }));
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully as admin', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.params = { id: 'user-123' };
      mockDeleteUser.mockResolvedValue(true);

      await deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
      expect(responseStatus).toHaveBeenCalledWith(204);
    });

    it('should return 403 when non-admin tries to delete', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'other-user-123' };

      await deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'Only admin can delete users',
      });
    });

    it('should return 400 when trying to delete own account', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.params = { id: 'admin-123' };

      await deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Cannot delete your own account',
      });
    });

    it('should return 404 when user not found', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.params = { id: 'non-existent' };
      mockDeleteUser.mockResolvedValue(false);

      await deleteUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });
});

