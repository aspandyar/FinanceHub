import type { Request, Response, NextFunction } from 'express';
import { TransactionModel } from '../models/models.js';
import type { TransactionType } from '../models/transaction.js';
import { handleForeignKeyError } from '../utils/prismaErrors.js';
import { isValidUUID, isValidDate } from '../validations/common.js';
import { isValidTransactionType, validateCreateTransaction, validateUpdateTransaction } from '../validations/transaction.js';

// Create a transaction
export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { categoryId, amount, type, description, date } = req.body;

    // Use authenticated user's ID (users can only create transactions for themselves)
    const userId = req.user.id;

    // Validate all fields
    if (!(await validateCreateTransaction({ categoryId, amount, type, date, description }, res))) {
      return;
    }

    const transaction = await TransactionModel.createTransaction({
      userId: userId,
      categoryId: categoryId,
      amount,
      type,
      description: description || null,
      date,
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    // Handle foreign key constraint violations
    if (handleForeignKeyError(error, res)) {
      return;
    }
    next(error);
  }
};

// Get all transactions (optionally filtered by query params)
export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type, categoryId, startDate, endDate } = req.query;

    // Regular users can only see their own transactions
    // Admin and manager can see all transactions
    let parsedUserId: string | undefined = undefined;
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      // Admin/manager can filter by any userId or see all
      const { userId } = req.query;
      if (userId !== undefined) {
        if (typeof userId === 'string' && isValidUUID(userId)) {
          parsedUserId = userId;
        } else {
          return res.status(400).json({ error: 'Invalid user ID format' });
        }
      }
    } else {
      // Regular users can only see their own transactions
      parsedUserId = req.user.id;
    }

    let parsedType: TransactionType | undefined = undefined;
    if (type !== undefined) {
      if (typeof type === 'string' && isValidTransactionType(type)) {
        parsedType = type;
      } else {
        return res
          .status(400)
          .json({ error: "Type must be 'income' or 'expense'" });
      }
    }

    let parsedCategoryId: string | undefined = undefined;
    if (categoryId !== undefined) {
      if (typeof categoryId === 'string' && isValidUUID(categoryId)) {
        parsedCategoryId = categoryId;
      } else {
        return res.status(400).json({ error: 'Invalid category ID format' });
      }
    }

    let parsedStartDate: string | undefined = undefined;
    if (startDate !== undefined) {
      if (typeof startDate === 'string' && isValidDate(startDate)) {
        parsedStartDate = startDate;
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid startDate format (expected: YYYY-MM-DD)' });
      }
    }

    let parsedEndDate: string | undefined = undefined;
    if (endDate !== undefined) {
      if (typeof endDate === 'string' && isValidDate(endDate)) {
        parsedEndDate = endDate;
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid endDate format (expected: YYYY-MM-DD)' });
      }
    }

    const transactions = await TransactionModel.getAllTransactions(
      parsedUserId,
      parsedType,
      parsedCategoryId,
      parsedStartDate,
      parsedEndDate
    );
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

// Get transaction by ID
export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }

    const transaction = await TransactionModel.getTransactionById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    next(error);
  }
};

// Get transactions by user ID
export const getTransactionsByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    if (!userId || !isValidUUID(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const transactions = await TransactionModel.getTransactionsByUserId(userId);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

// Update a transaction
export const updateTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }

    // Check ownership or role
    const existingTransaction = await TransactionModel.getTransactionById(id);
    if (!existingTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user owns the transaction or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (existingTransaction.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own transactions',
        });
      }
    }

    const { categoryId, amount, type, description, date } = req.body;

    // Validate all fields
    if (!(await validateUpdateTransaction(
      { categoryId, amount, type, date, description },
      existingTransaction.categoryId,
      existingTransaction.type,
      res
    ))) {
      return;
    }

    const transaction = await TransactionModel.updateTransaction(id, {
      categoryId: categoryId,
      amount,
      type,
      description: description !== undefined ? description : undefined,
      date,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error: any) {
    // Handle foreign key constraint violations
    if (handleForeignKeyError(error, res)) {
      return;
    }
    next(error);
  }
};

// Delete a transaction
export const deleteTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }

    // Check ownership or role
    const existingTransaction = await TransactionModel.getTransactionById(id);
    if (!existingTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user owns the transaction or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (existingTransaction.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete your own transactions',
        });
      }
    }

    const deleted = await TransactionModel.deleteTransaction(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

