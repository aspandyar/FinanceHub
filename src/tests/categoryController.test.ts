import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock database FIRST to prevent real DB calls
jest.mock('../config/database.js', () => ({
  default: { query: jest.fn() },
  query: jest.fn(),
}));

// 1. Create mock functions FIRST with proper types
const mockCreateCategory = jest.fn<() => Promise<any>>();
const mockGetAllCategories = jest.fn<() => Promise<any>>();
const mockGetCategoryById = jest.fn<() => Promise<any>>();
const mockGetCategoriesByUserId = jest.fn<() => Promise<any>>();
const mockUpdateCategory = jest.fn<() => Promise<any>>();
const mockDeleteCategory = jest.fn<() => Promise<any>>();

// 2. Mock modules
jest.mock('../models/models.js', () => ({
  CategoryModel: {
    createCategory: mockCreateCategory,
    getAllCategories: mockGetAllCategories,
    getCategoryById: mockGetCategoryById,
    getCategoriesByUserId: mockGetCategoriesByUserId,
    updateCategory: mockUpdateCategory,
    deleteCategory: mockDeleteCategory,
  },
}));

// 3. Import controller AFTER mocks
import {
  createCategory,
  getCategories,
  getCategoryById,
  getCategoriesByUserId,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import type { User } from '../models/user.js';

describe('Category Controller', () => {
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
      query: {},
    };
    mockResponse = {
      status: responseStatus as any,
      json: responseJson as any,
      send: jest.fn() as any,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      const categoryData = {
        name: 'Groceries',
        type: 'expense' as const,
        color: '#6B7280',
        icon: 'shopping-cart',
      };

      const createdCategory = {
        id: 'cat-123',
        userId: 'user-123',
        ...categoryData,
        isSystem: false,
        createdAt: new Date(),
        updated_at: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = categoryData;
      mockCreateCategory.mockResolvedValue(createdCategory);

      await createCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockCreateCategory).toHaveBeenCalledWith({
        userId: 'user-123',
        name: 'Groceries',
        type: 'expense',
        color: '#6B7280',
        icon: 'shopping-cart',
        isSystem: false,
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(createdCategory);
    });

    it('should return 401 when not authenticated', async () => {
      delete mockRequest.user;

      await createCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
    });

    it('should return 400 for missing name', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        type: 'expense',
      };

      await createCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Category name is required' });
    });

    it('should return 400 for invalid type', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        name: 'Category',
        type: 'invalid',
      };

      await createCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: "Category type must be 'income' or 'expense'",
      });
    });

    it('should return 400 for invalid color format', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        name: 'Category',
        type: 'expense',
        color: 'invalid-color',
      };

      await createCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Color must be a valid hex color (e.g., #6B7280)',
      });
    });

    it('should return 409 when category already exists', async () => {
      const error = new Error('Duplicate key');
      (error as any).code = '23505';

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        name: 'Existing Category',
        type: 'expense',
      };

      mockCreateCategory.mockRejectedValue(error);

      await createCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(409);
    });
  });

  describe('getCategories', () => {
    it('should return categories for authenticated user', async () => {
      const categories = [
        {
          id: 'cat-1',
          userId: 'user-123',
          name: 'Category 1',
          type: 'expense' as const,
          color: '#6B7280',
          icon: null,
          isSystem: false,
          createdAt: new Date(),
          updated_at: new Date(),
        },
      ];

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockGetAllCategories.mockResolvedValue(categories);

      await getCategories(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAllCategories).toHaveBeenCalledWith('user-123', undefined);
      expect(responseJson).toHaveBeenCalledWith(categories);
    });

    it('should allow admin to filter by user_id', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.query = {
        user_id: 'other-user-123',
      };

      await getCategories(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAllCategories).toHaveBeenCalledWith('other-user-123', undefined);
    });
  });

  describe('getCategoryById', () => {
    it('should return category by id', async () => {
      const category = {
        id: 'cat-123',
        userId: 'user-123',
        name: 'Category',
        type: 'expense' as const,
        color: '#6B7280',
        icon: null,
        isSystem: false,
        createdAt: new Date(),
        updated_at: new Date(),
      };

      mockRequest.params = { id: 'cat-123' };
      mockGetCategoryById.mockResolvedValue(category);

      await getCategoryById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetCategoryById).toHaveBeenCalledWith('cat-123');
      expect(responseJson).toHaveBeenCalledWith(category);
    });

    it('should return 404 when category not found', async () => {
      mockRequest.params = { id: 'cat-123' };
      mockGetCategoryById.mockResolvedValue(null);

      await getCategoryById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const existingCategory = {
        id: 'cat-123',
        userId: 'user-123',
        name: 'Old Name',
        type: 'expense' as const,
        color: '#6B7280',
        icon: null,
        isSystem: false,
        createdAt: new Date(),
        updated_at: new Date(),
      };

      const updatedCategory = {
        ...existingCategory,
        name: 'New Name',
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'cat-123' };
      mockRequest.body = { name: 'New Name' };
      mockGetCategoryById.mockResolvedValue(existingCategory);
      mockUpdateCategory.mockResolvedValue(updatedCategory);

      await updateCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUpdateCategory).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith(updatedCategory);
    });

    it('should return 403 when trying to update system category', async () => {
      const existingCategory = {
        id: 'cat-123',
        user_id: null,
        name: 'System Category',
        type: 'expense' as const,
        color: '#6B7280',
        icon: null,
        isSystem: true,
        createdAt: new Date(),
        updated_at: new Date(),
      };

      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.params = { id: 'cat-123' };
      mockGetCategoryById.mockResolvedValue(existingCategory);

      await updateCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Cannot update system categories' });
    });

    it('should return 403 when user does not own category', async () => {
      const existingCategory = {
        id: 'cat-123',
        user_id: 'other-user-123',
        name: 'Category',
        type: 'expense' as const,
        color: '#6B7280',
        icon: null,
        isSystem: false,
        createdAt: new Date(),
        updated_at: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'cat-123' };
      mockGetCategoryById.mockResolvedValue(existingCategory);

      await updateCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      const existingCategory = {
        id: 'cat-123',
        userId: 'user-123',
        name: 'Category',
        type: 'expense' as const,
        color: '#6B7280',
        icon: null,
        isSystem: false,
        createdAt: new Date(),
        updated_at: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'cat-123' };
      mockGetCategoryById.mockResolvedValue(existingCategory);
      mockDeleteCategory.mockResolvedValue(true);

      await deleteCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDeleteCategory).toHaveBeenCalledWith('cat-123');
      expect(responseStatus).toHaveBeenCalledWith(204);
    });

    it('should return 403 when trying to delete system category', async () => {
      const existingCategory = {
        id: 'cat-123',
        user_id: null,
        name: 'System Category',
        type: 'expense' as const,
        color: '#6B7280',
        icon: null,
        isSystem: true,
        createdAt: new Date(),
        updated_at: new Date(),
      };

      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.params = { id: 'cat-123' };
      mockGetCategoryById.mockResolvedValue(existingCategory);

      await deleteCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Cannot delete system categories' });
    });
  });
});

