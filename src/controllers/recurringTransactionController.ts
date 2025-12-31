import type { Request, Response, NextFunction } from 'express';
import { RecurringTransactionModel } from '../models/models.js';
import type {
  TransactionType,
  FrequencyType,
} from '../models/recurringTransaction.js';

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

// Validate frequency type
const isValidFrequencyType = (frequency: string): frequency is FrequencyType => {
  return (
    frequency === 'daily' ||
    frequency === 'weekly' ||
    frequency === 'monthly' ||
    frequency === 'yearly'
  );
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

// Create a recurring transaction
export const createRecurringTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      category_id,
      amount,
      type,
      description,
      frequency,
      start_date,
      end_date,
      next_occurrence,
      is_active,
    } = req.body;

    // Use authenticated user's ID (users can only create recurring transactions for themselves)
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

    // Validate frequency
    if (!frequency || !isValidFrequencyType(frequency)) {
      return res
        .status(400)
        .json({
          error: "Frequency must be 'daily', 'weekly', 'monthly', or 'yearly'",
        });
    }

    // Validate start_date
    if (!start_date || typeof start_date !== 'string' || !isValidDate(start_date)) {
      return res
        .status(400)
        .json({ error: 'Valid start_date is required (format: YYYY-MM-DD)' });
    }

    // Validate next_occurrence
    if (
      !next_occurrence ||
      typeof next_occurrence !== 'string' ||
      !isValidDate(next_occurrence)
    ) {
      return res
        .status(400)
        .json({
          error: 'Valid next_occurrence is required (format: YYYY-MM-DD)',
        });
    }

    // Validate end_date if provided
    if (end_date !== undefined && end_date !== null) {
      if (typeof end_date !== 'string' || !isValidDate(end_date)) {
        return res
          .status(400)
          .json({ error: 'Invalid end_date format (expected: YYYY-MM-DD)' });
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

    // Validate is_active if provided
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const recurringTransaction =
      await RecurringTransactionModel.createRecurringTransaction({
        user_id,
        category_id,
        amount,
        type,
        description: description || null,
        frequency,
        start_date,
        end_date: end_date || null,
        next_occurrence,
        is_active: is_active !== undefined ? is_active : true,
      });

    res.status(201).json(recurringTransaction);
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

// Get all recurring transactions (optionally filtered by query params)
export const getRecurringTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { is_active } = req.query;

    // Regular users can only see their own recurring transactions
    // Admin and manager can see all recurring transactions
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
      // Regular users can only see their own recurring transactions
      parsedUserId = req.user.id;
    }

    let parsedIsActive: boolean | undefined = undefined;
    if (is_active !== undefined) {
      if (typeof is_active === 'string') {
        if (is_active === 'true') {
          parsedIsActive = true;
        } else if (is_active === 'false') {
          parsedIsActive = false;
        } else {
          return res.status(400).json({ error: 'is_active must be true or false' });
        }
      } else {
        return res.status(400).json({ error: 'is_active must be a string' });
      }
    }

    const recurringTransactions =
      await RecurringTransactionModel.getAllRecurringTransactions(
        parsedUserId,
        parsedIsActive
      );
    res.json(recurringTransactions);
  } catch (error) {
    next(error);
  }
};

// Get recurring transaction by ID
export const getRecurringTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res
        .status(400)
        .json({ error: 'Invalid recurring transaction ID format' });
    }

    const recurringTransaction =
      await RecurringTransactionModel.getRecurringTransactionById(id);
    if (!recurringTransaction) {
      return res
        .status(404)
        .json({ message: 'Recurring transaction not found' });
    }

    res.json(recurringTransaction);
  } catch (error) {
    next(error);
  }
};

// Get recurring transactions by user ID
export const getRecurringTransactionsByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { user_id } = req.params;

    if (!user_id || !isValidUUID(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Regular users can only see their own recurring transactions
    // Admin and manager can see any user's recurring transactions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own recurring transactions',
        });
      }
    }

    const recurringTransactions =
      await RecurringTransactionModel.getRecurringTransactionsByUserId(user_id);
    res.json(recurringTransactions);
  } catch (error) {
    next(error);
  }
};

// Get due recurring transactions (for a specific date)
export const getDueRecurringTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date } = req.query;

    let parsedDate: string | undefined = undefined;
    if (date !== undefined) {
      if (typeof date === 'string' && isValidDate(date)) {
        parsedDate = date;
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid date format (expected: YYYY-MM-DD)' });
      }
    } else {
      // Default to today if no date provided
      const today = new Date();
      parsedDate = today.toISOString().split('T')[0]!;
    }

    const recurringTransactions =
      await RecurringTransactionModel.getDueRecurringTransactions(parsedDate);
    res.json(recurringTransactions);
  } catch (error) {
    next(error);
  }
};

// Update a recurring transaction
export const updateRecurringTransaction = async (
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
      return res
        .status(400)
        .json({ error: 'Invalid recurring transaction ID format' });
    }

    // Check ownership or role
    const existingRecurringTransaction =
      await RecurringTransactionModel.getRecurringTransactionById(id);
    if (!existingRecurringTransaction) {
      return res
        .status(404)
        .json({ message: 'Recurring transaction not found' });
    }

    // Check if user owns the recurring transaction or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (existingRecurringTransaction.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own recurring transactions',
        });
      }
    }

    const {
      category_id,
      amount,
      type,
      description,
      frequency,
      start_date,
      end_date,
      next_occurrence,
      is_active,
    } = req.body;

    // Build update object, only including defined properties
    const updateData: {
      category_id?: string;
      amount?: number;
      type?: TransactionType;
      description?: string | null;
      frequency?: FrequencyType;
      start_date?: string;
      end_date?: string | null;
      next_occurrence?: string;
      is_active?: boolean;
    } = {};

    // Validate category_id if provided
    if (category_id !== undefined) {
      if (typeof category_id !== 'string' || !isValidUUID(category_id)) {
        return res.status(400).json({ error: 'Invalid category ID format' });
      }
      updateData.category_id = category_id;
    }

    // Validate amount if provided
    if (amount !== undefined) {
      if (!isValidAmount(amount)) {
        return res
          .status(400)
          .json({
            error:
              'Amount must be a positive number less than or equal to 9999999999.99',
          });
      }
      updateData.amount = amount;
    }

    // Validate type if provided
    if (type !== undefined) {
      if (!isValidTransactionType(type)) {
        return res
          .status(400)
          .json({ error: "Transaction type must be 'income' or 'expense'" });
      }
      updateData.type = type;
    }

    // Validate frequency if provided
    if (frequency !== undefined) {
      if (!isValidFrequencyType(frequency)) {
        return res
          .status(400)
          .json({
            error:
              "Frequency must be 'daily', 'weekly', 'monthly', or 'yearly'",
          });
      }
      updateData.frequency = frequency;
    }

    // Validate start_date if provided
    if (start_date !== undefined) {
      if (typeof start_date !== 'string' || !isValidDate(start_date)) {
        return res
          .status(400)
          .json({ error: 'Invalid start_date format (expected: YYYY-MM-DD)' });
      }
      updateData.start_date = start_date;
    }

    // Validate end_date if provided
    if (end_date !== undefined) {
      if (end_date === null) {
        updateData.end_date = null;
      } else if (typeof end_date === 'string' && isValidDate(end_date)) {
        updateData.end_date = end_date;
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid end_date format (expected: YYYY-MM-DD)' });
      }
    }

    // Validate next_occurrence if provided
    if (next_occurrence !== undefined) {
      if (typeof next_occurrence !== 'string' || !isValidDate(next_occurrence)) {
        return res
          .status(400)
          .json({
            error: 'Invalid next_occurrence format (expected: YYYY-MM-DD)',
          });
      }
      updateData.next_occurrence = next_occurrence;
    }

    // Validate description if provided
    if (description !== undefined) {
      if (description === null) {
        updateData.description = null;
      } else if (typeof description === 'string') {
        updateData.description = description;
      } else {
        return res
          .status(400)
          .json({ error: 'Description must be a string' });
      }
    }

    // Validate is_active if provided
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean' });
      }
      updateData.is_active = is_active;
    }

    const recurringTransaction =
      await RecurringTransactionModel.updateRecurringTransaction(id, updateData);

    if (!recurringTransaction) {
      return res
        .status(404)
        .json({ message: 'Recurring transaction not found' });
    }

    res.json(recurringTransaction);
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

// Delete a recurring transaction
export const deleteRecurringTransaction = async (
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
      return res
        .status(400)
        .json({ error: 'Invalid recurring transaction ID format' });
    }

    // Check ownership or role
    const existingRecurringTransaction =
      await RecurringTransactionModel.getRecurringTransactionById(id);
    if (!existingRecurringTransaction) {
      return res
        .status(404)
        .json({ message: 'Recurring transaction not found' });
    }

    // Check if user owns the recurring transaction or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (existingRecurringTransaction.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete your own recurring transactions',
        });
      }
    }

    const deleted =
      await RecurringTransactionModel.deleteRecurringTransaction(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ message: 'Recurring transaction not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

