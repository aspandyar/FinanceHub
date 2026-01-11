import type { Request, Response, NextFunction } from 'express';
import { BudgetModel } from '../models/models.js';
import { handleForeignKeyError, handleUniqueConstraintError } from '../utils/prismaErrors.js';
import { isValidUUID, isValidDate, normalizeMonth } from '../validations/common.js';
import { validateCreateBudget, validateUpdateBudget } from '../validations/budget.js';

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

    const { categoryId, amount, month } = req.body;

    // Use authenticated user's ID (users can only create budgets for themselves)
    const userId = req.user.id;

    // Validate all fields
    const validation = validateCreateBudget({ categoryId, amount, month }, res);
    if (!validation.isValid) {
      return;
    }
    const normalizedMonth = validation.normalizedMonth!;

    const budget = await BudgetModel.createBudget({
      userId: userId,
      categoryId: categoryId,
      amount,
      month: normalizedMonth,
    });

    res.status(201).json(budget);
  } catch (error: any) {
    // Handle unique constraint violation
    if (handleUniqueConstraintError(
      error,
      res,
      'A budget for this user, category, and month already exists'
    )) {
      return;
    }
    // Handle foreign key constraint violations
    if (handleForeignKeyError(error, res)) {
      return;
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

    const { categoryId, month } = req.query;

    // Regular users can only see their own budgets
    // Admin and manager can see all budgets
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
      // Regular users can only see their own budgets
      parsedUserId = req.user.id;
    }

    let parsedCategoryId: string | undefined = undefined;
    if (categoryId !== undefined) {
      if (typeof categoryId === 'string' && isValidUUID(categoryId)) {
        parsedCategoryId = categoryId;
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

    const { userId } = req.params;

    if (!userId || !isValidUUID(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Regular users can only see their own budgets
    // Admin and manager can see any user's budgets
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own budgets',
        });
      }
    }

    const budgets = await BudgetModel.getBudgetsByUserId(userId);
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

    const { userId, month } = req.params;

    if (!userId || !isValidUUID(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Regular users can only see their own budgets
    // Admin and manager can see any user's budgets
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (userId !== req.user.id) {
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
      userId,
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
      if (existingBudget.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own budgets',
        });
      }
    }

    const { categoryId, amount, month } = req.body;

    // Validate all fields
    const validation = validateUpdateBudget({ categoryId, amount, month }, res);
    if (!validation.isValid) {
      return;
    }

    // Build update object, only including defined properties
    const updateData: {
      categoryId?: string;
      amount?: number;
      month?: string;
    } = {};
    
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId;
    }
    if (amount !== undefined) {
      updateData.amount = amount;
    }
    if (validation.normalizedMonth !== undefined) {
      updateData.month = validation.normalizedMonth;
    }

    const budget = await BudgetModel.updateBudget(id, updateData);

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (error: any) {
    // Handle unique constraint violation
    if (handleUniqueConstraintError(
      error,
      res,
      'A budget for this user, category, and month already exists'
    )) {
      return;
    }
    // Handle foreign key constraint violations
    if (handleForeignKeyError(error, res)) {
      return;
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
      if (existingBudget.userId !== req.user.id) {
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

