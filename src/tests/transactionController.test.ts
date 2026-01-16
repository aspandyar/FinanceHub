import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
const { Decimal } = Prisma;

// Mock database FIRST to prevent real DB calls
jest.mock('../config/database.js', () => ({
  default: { query: jest.fn() },
  query: jest.fn(),
}));

// 1. Create mock functions FIRST with proper types
const mockCreateTransaction = jest.fn<() => Promise<any>>();
const mockGetAllTransactions = jest.fn<() => Promise<any>>();
const mockGetTransactionById = jest.fn<() => Promise<any>>();
const mockGetTransactionsByUserId = jest.fn<() => Promise<any>>();
const mockUpdateTransaction = jest.fn<() => Promise<any>>();
const mockDeleteTransaction = jest.fn<() => Promise<any>>();

// 2. Mock modules
jest.mock('../models/models.js', () => ({
  TransactionModel: {
    createTransaction: mockCreateTransaction,
    getAllTransactions: mockGetAllTransactions,
    getTransactionById: mockGetTransactionById,
    getTransactionsByUserId: mockGetTransactionsByUserId,
    updateTransaction: mockUpdateTransaction,
    deleteTransaction: mockDeleteTransaction,
  },
}));

// 3. Import controller AFTER mocks
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionsByUserId,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactionController.js';
import type { Transaction } from '../models/transaction.js';

describe('Transaction Controller', () => {
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

  describe('createTransaction', () => {
    it('should create transaction successfully', async () => {
      const transactionData = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100.50,
        type: 'expense' as const,
        description: 'Grocery shopping',
        date: '2024-01-15',
      };

      const createdTransaction: Transaction = {
        id: 'transaction-123',
        userId: 'user-123',
        categoryId: transactionData.category_id,
        amount: new Decimal(transactionData.amount),
        type: transactionData.type,
        description: transactionData.description,
        date: new Date(transactionData.date),
        recurringTransactionId: null,
        isOverride: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = transactionData;
      mockCreateTransaction.mockResolvedValue(createdTransaction);

      await createTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockCreateTransaction).toHaveBeenCalledWith({
        user_id: 'user-123',
        ...transactionData,
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(createdTransaction);
    });

    it('should return 401 when not authenticated', async () => {
      delete mockRequest.user;

      await createTransaction(
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
        amount: 100,
        type: 'expense',
        date: '2024-01-15',
      };

      await createTransaction(
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
        type: 'expense',
        date: '2024-01-15',
      };

      await createTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid type', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        type: 'invalid',
        date: '2024-01-15',
      };

      await createTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: "Transaction type must be 'income' or 'expense'",
      });
    });

    it('should return 400 for invalid date format', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        type: 'expense',
        date: 'invalid-date',
      };

      await createTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Valid date is required (format: YYYY-MM-DD)',
      });
    });

    it('should return 400 for invalid description type', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        type: 'expense',
        date: '2024-01-15',
        description: 123, // Invalid type
      };

      await createTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Description must be a string',
      });
    });

    it('should handle foreign key constraint violation', async () => {
      const error = new Error('Foreign key violation');
      (error as any).code = '23503';

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.body = {
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        type: 'expense',
        date: '2024-01-15',
      };

      mockCreateTransaction.mockRejectedValue(error);

      await createTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Invalid user_id or category_id',
      });
    });
  });

  describe('getTransactions', () => {
    it('should return transactions for authenticated user', async () => {
      const transactions: Transaction[] = [
        {
          id: 'transaction-1',
          userId: 'user-123',
          categoryId: 'cat-1',
          amount: new Decimal('100'),
          type: 'expense' as const,
          description: null,
          date: new Date('2024-01-15'),
          recurringTransactionId: null,
          isOverride: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockGetAllTransactions.mockResolvedValue(transactions);

      await getTransactions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAllTransactions).toHaveBeenCalledWith('user-123', undefined, undefined, undefined, undefined);
      expect(responseJson).toHaveBeenCalledWith(transactions);
    });

    it('should allow admin to filter by user_id', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      mockRequest.query = {
        user_id: 'other-user-123',
        type: 'expense',
      };

      await getTransactions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAllTransactions).toHaveBeenCalledWith(
        'other-user-123',
        'expense',
        undefined,
        undefined,
        undefined
      );
    });

    it('should filter by date range', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      await getTransactions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAllTransactions).toHaveBeenCalledWith(
        'user-123',
        undefined,
        undefined,
        '2024-01-01',
        '2024-01-31'
      );
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction by id', async () => {
      const transaction: Transaction = {
        id: 'transaction-123',
        userId: 'user-123',
        categoryId: 'cat-1',
        amount: new Decimal('100'),
        type: 'expense' as const,
        description: null,
        date: new Date('2024-01-15'),
        recurringTransactionId: null,
        isOverride: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: 'transaction-123' };
      mockGetTransactionById.mockResolvedValue(transaction);

      await getTransactionById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetTransactionById).toHaveBeenCalledWith('transaction-123');
      expect(responseJson).toHaveBeenCalledWith(transaction);
    });

    it('should return 404 when transaction not found', async () => {
      mockRequest.params = { id: 'transaction-123' };
      mockGetTransactionById.mockResolvedValue(null);

      await getTransactionById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Transaction not found' });
    });
  });

  describe('getTransactionsByUserId', () => {
    it('should return transactions for user', async () => {
      const transactions: Transaction[] = [
        {
          id: 'transaction-1',
          userId: 'user-123',
          categoryId: 'cat-1',
          amount: new Decimal('100'),
          type: 'expense' as const,
          description: null,
          date: new Date('2024-01-15'),
          recurringTransactionId: null,
          isOverride: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRequest.params = { user_id: 'user-123' };
      mockGetTransactionsByUserId.mockResolvedValue(transactions);

      await getTransactionsByUserId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetTransactionsByUserId).toHaveBeenCalledWith('user-123');
      expect(responseJson).toHaveBeenCalledWith(transactions);
    });

    it('should return 400 for invalid user_id format', async () => {
      mockRequest.params = { user_id: 'invalid-uuid' };

      await getTransactionsByUserId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid user ID format' });
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction successfully', async () => {
      const existingTransaction: Transaction = {
        id: 'transaction-123',
        userId: 'user-123',
        categoryId: 'cat-1',
        amount: new Decimal('100'),
        type: 'expense' as const,
        description: null,
        date: new Date('2024-01-15'),
        recurringTransactionId: null,
        isOverride: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedTransaction: Transaction = {
        ...existingTransaction,
        amount: new Decimal('150'),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'transaction-123' };
      mockRequest.body = { amount: 150 };
      mockGetTransactionById.mockResolvedValue(existingTransaction);
      mockUpdateTransaction.mockResolvedValue(updatedTransaction);

      await updateTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUpdateTransaction).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith(updatedTransaction);
    });

    it('should return 403 when user does not own transaction', async () => {
      const existingTransaction: Transaction = {
        id: 'transaction-123',
        userId: 'other-user-123',
        categoryId: 'cat-1',
        amount: new Decimal('100'),
        type: 'expense' as const,
        description: null,
        date: new Date('2024-01-15'),
        recurringTransactionId: null,
        isOverride: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'transaction-123' };
      mockGetTransactionById.mockResolvedValue(existingTransaction);

      await updateTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You can only update your own transactions',
      });
    });

    it('should return 404 when transaction not found', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'transaction-123' };
      mockGetTransactionById.mockResolvedValue(null);

      await updateTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Transaction not found' });
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction successfully', async () => {
      const existingTransaction: Transaction = {
        id: 'transaction-123',
        userId: 'user-123',
        categoryId: 'cat-1',
        amount: new Decimal('100'),
        type: 'expense' as const,
        description: null,
        date: new Date('2024-01-15'),
        recurringTransactionId: null,
        isOverride: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'transaction-123' };
      mockGetTransactionById.mockResolvedValue(existingTransaction);
      mockDeleteTransaction.mockResolvedValue(true);

      await deleteTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDeleteTransaction).toHaveBeenCalledWith('transaction-123');
      expect(responseStatus).toHaveBeenCalledWith(204);
    });

    it('should return 403 when user does not own transaction', async () => {
      const existingTransaction: Transaction = {
        id: 'transaction-123',
        userId: 'other-user-123',
        categoryId: 'cat-1',
        amount: new Decimal('100'),
        type: 'expense' as const,
        description: null,
        date: new Date('2024-01-15'),
        recurringTransactionId: null,
        isOverride: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      mockRequest.params = { id: 'transaction-123' };
      mockGetTransactionById.mockResolvedValue(existingTransaction);

      await deleteTransaction(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });
  });
});
