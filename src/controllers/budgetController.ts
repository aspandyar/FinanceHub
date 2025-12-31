import type { Request, Response, NextFunction } from 'express';
import { BudgetModel } from '../models/models.js';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Date validation regex (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Validate UUID
const isValidUUID = (id: string): boolean => {
  return UUID_REGEX.test(id);
};

// Validate date format (YYYY-MM-DD)
const isValidDate = (date: string): boolean => {
  if (!DATE_REGEX.test(date)) {
    return false;
  }
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

// Normalize date to first day of month (YYYY-MM-01)
const normalizeMonth = (date: string): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
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

// Create a budget
export const createBudget = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { category_id, amount, month } = req.body;

    // Use authenticated user's ID (users can only create budgets for themselves)
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

    // Validate month
    if (!month || typeof month !== 'string' || !isValidDate(month)) {
      return res
        .status(400)
        .json({ error: 'Valid month is required (format: YYYY-MM-DD)' });
    }

    // Normalize month to first day
    const normalizedMonth = normalizeMonth(month);

    const budget = await BudgetModel.createBudget({
      user_id,
      category_id,
      amount,
      month: normalizedMonth,
    });

    res.status(201).json(budget);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        error:
          'A budget for this user, category, and month already exists',
      });
    }
    // Handle foreign key constraint violations
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Invalid user_id or category_id',
      });
    }
    next(error);
  }
};

// Get all budgets (optionally filtered by query params)
export const getBudgets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { category_id, month } = req.query;

    // Regular users can only see their own budgets
    // Admin and manager can see all budgets
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
      // Regular users can only see their own budgets
      parsedUserId = req.user.id;
    }

    let parsedCategoryId: string | undefined = undefined;
    if (category_id !== undefined) {
      if (typeof category_id === 'string' && isValidUUID(category_id)) {
        parsedCategoryId = category_id;
      } else {
        return res.status(400).json({ error: 'Invalid category ID format' });
      }
    }

    let parsedMonth: string | undefined = undefined;
    if (month !== undefined) {
      if (typeof month === 'string' && isValidDate(month)) {
        parsedMonth = normalizeMonth(month);
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid month format (expected: YYYY-MM-DD)' });
      }
    }

    const budgets = await BudgetModel.getAllBudgets(
      parsedUserId,
      parsedCategoryId,
      parsedMonth
    );
    res.json(budgets);
  } catch (error) {
    next(error);
  }
};

// Get budget by ID
export const getBudgetById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid budget ID format' });
    }

    const budget = await BudgetModel.getBudgetById(id);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    next(error);
  }
};

// Get budgets by user ID
export const getBudgetsByUserId = async (
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

    // Regular users can only see their own budgets
    // Admin and manager can see any user's budgets
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own budgets',
        });
      }
    }

    const budgets = await BudgetModel.getBudgetsByUserId(user_id);
    res.json(budgets);
  } catch (error) {
    next(error);
  }
};

// Get budgets by user ID and month
export const getBudgetsByUserIdAndMonth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { user_id, month } = req.params;

    if (!user_id || !isValidUUID(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Regular users can only see their own budgets
    // Admin and manager can see any user's budgets
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own budgets',
        });
      }
    }

    if (!month || typeof month !== 'string' || !isValidDate(month)) {
      return res
        .status(400)
        .json({ error: 'Invalid month format (expected: YYYY-MM-DD)' });
    }

    const normalizedMonth = normalizeMonth(month);
    const budgets = await BudgetModel.getBudgetsByUserIdAndMonth(
      user_id,
      normalizedMonth
    );
    res.json(budgets);
  } catch (error) {
    next(error);
  }
};

// Update a budget
export const updateBudget = async (
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
      return res.status(400).json({ error: 'Invalid budget ID format' });
    }

    // Check ownership or role
    const existingBudget = await BudgetModel.getBudgetById(id);
    if (!existingBudget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Check if user owns the budget or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (existingBudget.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own budgets',
        });
      }
    }

    const { category_id, amount, month } = req.body;

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

    // Validate month if provided
    let normalizedMonth: string | undefined = undefined;
    if (month !== undefined) {
      if (typeof month !== 'string' || !isValidDate(month)) {
        return res
          .status(400)
          .json({ error: 'Invalid month format (expected: YYYY-MM-DD)' });
      }
      normalizedMonth = normalizeMonth(month);
    }

    // Build update object, only including defined properties
    const updateData: {
      category_id?: string;
      amount?: number;
      month?: string;
    } = {};
    
    if (category_id !== undefined) {
      updateData.category_id = category_id;
    }
    if (amount !== undefined) {
      updateData.amount = amount;
    }
    if (normalizedMonth !== undefined) {
      updateData.month = normalizedMonth;
    }

    const budget = await BudgetModel.updateBudget(id, updateData);

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        error:
          'A budget for this user, category, and month already exists',
      });
    }
    // Handle foreign key constraint violations
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Invalid category_id',
      });
    }
    next(error);
  }
};

// Delete a budget
export const deleteBudget = async (
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
      return res.status(400).json({ error: 'Invalid budget ID format' });
    }

    // Check ownership or role
    const existingBudget = await BudgetModel.getBudgetById(id);
    if (!existingBudget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Check if user owns the budget or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (existingBudget.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete your own budgets',
        });
      }
    }

    const deleted = await BudgetModel.deleteBudget(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

