import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock database FIRST to prevent real DB calls
jest.mock('../config/database.js', () => ({
  default: { query: jest.fn() },
  query: jest.fn(),
}));

// 1. Create mock functions FIRST with proper types
const mockCreateBudget = jest.fn<() => Promise<any>>();
const mockGetAllBudgets = jest.fn<() => Promise<any>>();
const mockGetBudgetById = jest.fn<() => Promise<any>>();
const mockGetBudgetsByUserId = jest.fn<() => Promise<any>>();
const mockGetBudgetsByUserIdAndMonth = jest.fn<() => Promise<any>>();
const mockUpdateBudget = jest.fn<() => Promise<any>>();
const mockDeleteBudget = jest.fn<() => Promise<any>>();

// 2. Mock modules
jest.mock('../models/models.js', () => ({
  BudgetModel: {
    createBudget: mockCreateBudget,
    getAllBudgets: mockGetAllBudgets,
    getBudgetById: mockGetBudgetById,
    getBudgetsByUserId: mockGetBudgetsByUserId,
    getBudgetsByUserIdAndMonth: mockGetBudgetsByUserIdAndMonth,
    updateBudget: mockUpdateBudget,
    deleteBudget: mockDeleteBudget,
  },
}));

// 3. Import controller AFTER mocks
import {
  createBudget,
  getBudgets,
  getBudgetById,
  getBudgetsByUserId,
  getBudgetsByUserIdAndMonth,
  updateBudget,
  deleteBudget,
} from '../controllers/budgetController.js';
import type { User } from '../models/user.js';
import type { Budget } from '../models/budget.js';

describe('Budget Controller', () => {
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

  describe('createBudget', () => {
    it('should create budget successfully', async () => {
      const budgetData = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000.50,
        month: '2024-01-15',
      };

      const createdBudget: Budget = {
        id: 'budget-123',
        user_id: 'user-123',
        category_id: budgetData.category_id,
        amount: '1000.50', // DECIMAL returned as string
        month: '2024-01-01',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = budgetData;
      mockCreateBudget.mockResolvedValue(createdBudget);

      await createBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockCreateBudget).toHaveBeenCalledWith({
        user_id: 'user-123',
        category_id: budgetData.category_id,
        amount: budgetData.amount,
        month: '2024-01-01', // Normalized to first day
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(createdBudget);
    });

    it('should return 401 when not authenticated', async () => {
      delete mockRequest.user;

      await createBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid category_id', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        category_id: 'invalid-uuid',
        amount: 1000,
        month: '2024-01-15',
      };

      await createBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Valid category ID is required' });
    });

    it('should return 400 for invalid amount', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: -100,
        month: '2024-01-15',
      };

      await createBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid month format', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000,
        month: 'invalid-date',
      };

      await createBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 409 when budget already exists', async () => {
      const error = new Error('Duplicate key');
      (error as any).code = '23505';

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000,
        month: '2024-01-15',
      };

      mockCreateBudget.mockRejectedValue(error);

      await createBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(409);
    });
  });

  describe('getBudgets', () => {
    it('should return budgets for authenticated user', async () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          user_id: 'user-123',
          category_id: 'cat-1',
          amount: '1000',
          month: '2024-01-01',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockGetAllBudgets.mockResolvedValue(budgets);

      await getBudgets(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAllBudgets).toHaveBeenCalledWith('user-123', undefined, undefined);
      expect(responseJson).toHaveBeenCalledWith(budgets);
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

      await getBudgets(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAllBudgets).toHaveBeenCalledWith('other-user-123', undefined, undefined);
    });
  });

  describe('getBudgetById', () => {
    it('should return budget by id', async () => {
      const budget: Budget = {
        id: 'budget-123',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: '1000',
        month: '2024-01-01',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.params = { id: 'budget-123' };
      mockGetBudgetById.mockResolvedValue(budget);

      await getBudgetById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetBudgetById).toHaveBeenCalledWith('budget-123');
      expect(responseJson).toHaveBeenCalledWith(budget);
    });

    it('should return 404 when budget not found', async () => {
      mockRequest.params = { id: 'budget-123' };
      mockGetBudgetById.mockResolvedValue(null);

      await getBudgetById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('updateBudget', () => {
    it('should update budget successfully', async () => {
      const existingBudget: Budget = {
        id: 'budget-123',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: '1000',
        month: '2024-01-01',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedBudget: Budget = {
        ...existingBudget,
        amount: '1500',
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'budget-123' };
      mockRequest.body = { amount: 1500 };
      mockGetBudgetById.mockResolvedValue(existingBudget);
      mockUpdateBudget.mockResolvedValue(updatedBudget);

      await updateBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUpdateBudget).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith(updatedBudget);
    });

    it('should return 403 when user does not own budget', async () => {
      const existingBudget: Budget = {
        id: 'budget-123',
        user_id: 'other-user-123',
        category_id: 'cat-1',
        amount: '1000',
        month: '2024-01-01',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'budget-123' };
      mockGetBudgetById.mockResolvedValue(existingBudget);

      await updateBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteBudget', () => {
    it('should delete budget successfully', async () => {
      const existingBudget: Budget = {
        id: 'budget-123',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: '1000',
        month: '2024-01-01',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'budget-123' };
      mockGetBudgetById.mockResolvedValue(existingBudget);
      mockDeleteBudget.mockResolvedValue(true);

      await deleteBudget(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDeleteBudget).toHaveBeenCalledWith('budget-123');
      expect(responseStatus).toHaveBeenCalledWith(204);
    });
  });
});

