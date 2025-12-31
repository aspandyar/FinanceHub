import type { Request, Response, NextFunction } from 'express';
import { TransactionModel } from '../models/models.js';
import type { TransactionType } from '../models/transaction.js';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Date validation regex (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Validate UUID
const isValidUUID = (id: string): boolean => {
  return UUID_REGEX.test(id);
};

// Validate transaction type
const isValidTransactionType = (type: string): type is TransactionType => {
  return type === 'income' || type === 'expense';
};

// Validate date format (YYYY-MM-DD)
const isValidDate = (date: string): boolean => {
  if (!DATE_REGEX.test(date)) {
    return false;
  }
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

// Validate amount (must be positive number)
const isValidAmount = (amount: any): amount is number => {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    isFinite(amount) &&
    amount > 0 &&
    amount <= 9999999999.99 // Max value for DECIMAL(12,2)
  );
};

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

    const { category_id, amount, type, description, date } = req.body;

    // Use authenticated user's ID (users can only create transactions for themselves)
    const user_id = req.user.id;

    // Validate category_id
    if (
      !category_id ||
      typeof category_id !== 'string' ||
      !isValidUUID(category_id)
    ) {
      return res.status(400).json({ error: 'Valid category ID is required' });
    }

    // Validate amount
    if (!isValidAmount(amount)) {
      return res
        .status(400)
        .json({
          error:
            'Amount must be a positive number less than or equal to 9999999999.99',
        });
    }

    // Validate type
    if (!type || !isValidTransactionType(type)) {
      return res
        .status(400)
        .json({ error: "Transaction type must be 'income' or 'expense'" });
    }

    // Validate date
    if (!date || typeof date !== 'string' || !isValidDate(date)) {
      return res
        .status(400)
        .json({ error: 'Valid date is required (format: YYYY-MM-DD)' });
    }

    // Validate description if provided
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return res
          .status(400)
          .json({ error: 'Description must be a string' });
      }
    }

    const transaction = await TransactionModel.createTransaction({
      user_id,
      category_id,
      amount,
      type,
      description: description || null,
      date,
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    // Handle foreign key constraint violations
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Invalid user_id or category_id',
      });
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

    const { type, category_id, start_date, end_date } = req.query;

    // Regular users can only see their own transactions
    // Admin and manager can see all transactions
    let parsedUserId: string | undefined = undefined;
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      // Admin/manager can filter by any user_id or see all
      const { user_id } = req.query;
      if (user_id !== undefined) {
        if (typeof user_id === 'string' && isValidUUID(user_id)) {
          parsedUserId = user_id;
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
    if (category_id !== undefined) {
      if (typeof category_id === 'string' && isValidUUID(category_id)) {
        parsedCategoryId = category_id;
      } else {
        return res.status(400).json({ error: 'Invalid category ID format' });
      }
    }

    let parsedStartDate: string | undefined = undefined;
    if (start_date !== undefined) {
      if (typeof start_date === 'string' && isValidDate(start_date)) {
        parsedStartDate = start_date;
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid start_date format (expected: YYYY-MM-DD)' });
      }
    }

    let parsedEndDate: string | undefined = undefined;
    if (end_date !== undefined) {
      if (typeof end_date === 'string' && isValidDate(end_date)) {
        parsedEndDate = end_date;
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid end_date format (expected: YYYY-MM-DD)' });
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
    const { user_id } = req.params;

    if (!user_id || !isValidUUID(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const transactions = await TransactionModel.getTransactionsByUserId(user_id);
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
      if (existingTransaction.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own transactions',
        });
      }
    }

    const { category_id, amount, type, description, date } = req.body;

    // Validate category_id if provided
    if (category_id !== undefined) {
      if (typeof category_id !== 'string' || !isValidUUID(category_id)) {
        return res.status(400).json({ error: 'Invalid category ID format' });
      }
    }

    // Validate amount if provided
    if (amount !== undefined && !isValidAmount(amount)) {
      return res
        .status(400)
        .json({
          error:
            'Amount must be a positive number less than or equal to 9999999999.99',
        });
    }

    // Validate type if provided
    if (type !== undefined && !isValidTransactionType(type)) {
      return res
        .status(400)
        .json({ error: "Transaction type must be 'income' or 'expense'" });
    }

    // Validate date if provided
    if (date !== undefined) {
      if (typeof date !== 'string' || !isValidDate(date)) {
        return res
          .status(400)
          .json({ error: 'Invalid date format (expected: YYYY-MM-DD)' });
      }
    }

    // Validate description if provided
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return res
          .status(400)
          .json({ error: 'Description must be a string' });
      }
    }

    const transaction = await TransactionModel.updateTransaction(id, {
      category_id,
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
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Invalid category_id',
      });
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
      if (existingTransaction.user_id !== req.user.id) {
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

