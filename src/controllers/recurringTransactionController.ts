import type { Request, Response, NextFunction } from 'express';
import { RecurringTransactionModel } from '../models/models.js';
import { handleForeignKeyError } from '../utils/prismaErrors.js';
import { isValidUUID, isValidDate } from '../validations/common.js';
import { 
  validateCreateRecurringTransaction, 
  validateUpdateRecurringTransaction,
  validateScope,
  validateEffectiveDate,
} from '../validations/recurringTransaction.js';
import type { TransactionType, FrequencyType } from '../models/recurringTransaction.js';
import { 
  editRecurringTransaction, 
  deleteRecurringTransaction as deleteRecurringTransactionService,
  generateTransactionsFromRecurring,
  getEffectiveTransactions,
} from '../services/recurringTransactionService.js';


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
      categoryId,
      amount,
      type,
      description,
      frequency,
      startDate,
      endDate,
      nextOccurrence,
      isActive,
    } = req.body;

    // Use authenticated user's ID (users can only create recurring transactions for themselves)
    const userId = req.user.id;

    // Validate all fields
    if (!(await validateCreateRecurringTransaction({
      categoryId,
      amount,
      type,
      frequency,
      startDate,
      endDate,
      nextOccurrence,
      description,
      isActive,
    }, res))) {
      return;
    }

    const recurringTransaction =
      await RecurringTransactionModel.createRecurringTransaction({
        userId: userId,
        categoryId: categoryId,
        amount,
        type,
        description: description || null,
        frequency,
        startDate: startDate,
        endDate: endDate || null,
        nextOccurrence: nextOccurrence,
        isActive: isActive !== undefined ? isActive : true,
      });
      
    res.status(201).json(recurringTransaction);
  } catch (error: any) {
    // Handle foreign key constraint violations
    if (handleForeignKeyError(error, res)) {
      return;
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

    const { isActive } = req.query;

    // Regular users can only see their own recurring transactions
    // Admin and manager can see all recurring transactions
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
      // Regular users can only see their own recurring transactions
      parsedUserId = req.user.id;
    }

    let parsedIsActive: boolean | undefined = undefined;
    if (isActive !== undefined) {
      if (typeof isActive === 'string') {
        if (isActive === 'true') {
          parsedIsActive = true;
        } else if (isActive === 'false') {
          parsedIsActive = false;
        } else {
          return res.status(400).json({ error: 'isActive must be true or false' });
        }
      } else {
        return res.status(400).json({ error: 'isActive must be a string' });
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

    const { userId } = req.params;

    if (!userId || !isValidUUID(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Regular users can only see their own recurring transactions
    // Admin and manager can see any user's recurring transactions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own recurring transactions',
        });
      }
    }

    const recurringTransactions =
      await RecurringTransactionModel.getRecurringTransactionsByUserId(userId);
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
      categoryId,
      amount,
      type,
      description,
      frequency,
      startDate,
      endDate,
      nextOccurrence,
      isActive,
      scope, // 'single' | 'future' | 'all'
      effectiveDate, // Date from which the edit applies (YYYY-MM-DD)
    } = req.body;

    // If scope is provided, use the new service-based approach
    if (scope !== undefined) {
      // Validate scope
      if (!validateScope(scope, res)) {
        return;
      }

      // Validate effectiveDate
      if (!validateEffectiveDate(effectiveDate, res)) {
        return;
      }

      // Validate update fields
      if (!(await validateUpdateRecurringTransaction(
        {
          categoryId,
          amount,
          type,
          frequency,
          startDate,
          endDate,
          nextOccurrence,
          description,
          isActive,
        },
        existingRecurringTransaction.categoryId,
        existingRecurringTransaction.type,
        res
      ))) {
        return;
      }

      // Use the service to handle scope-based editing
      const result = await editRecurringTransaction(
        id,
        effectiveDate,
        scope,
        {
          categoryId,
          amount,
          type,
          description,
          frequency,
          endDate,
          isActive,
        }
      );

      // Return appropriate response based on scope
      if (scope === 'single') {
        // For single scope, an override transaction was created/updated
        // Return the recurring transaction (unchanged) with a message
        return res.json({
          message: 'Override transaction created/updated for this occurrence. Recurring transaction unchanged.',
          recurringTransaction: result.recurringTransaction,
          effectiveDate: effectiveDate,
        });
      }

      if (scope === 'future' && result.newRecurringTransaction) {
        // For future scope, the series was split into two
        return res.json({
          message: 'Recurring transaction updated. Series split into two.',
          original: result.recurringTransaction,
          new: result.newRecurringTransaction,
        });
      }

      if (scope === 'all') {
        // For all scope, the entire series was updated
        return res.json({
          message: 'Entire recurring transaction series updated.',
          recurringTransaction: result.recurringTransaction,
        });
      }

      // Fallback (shouldn't reach here, but just in case)
      return res.json(result.recurringTransaction);
    }

    // Legacy behavior: update entire series (backward compatibility)
    // Validate all fields
    if (!(await validateUpdateRecurringTransaction(
      {
        categoryId,
        amount,
        type,
        frequency,
        startDate,
        endDate,
        nextOccurrence,
        description,
        isActive,
      },
      existingRecurringTransaction.categoryId,
      existingRecurringTransaction.type,
      res
    ))) {
      return;
    }

    // Build update object, only including defined properties
    const updateData: {
      categoryId?: string;
      amount?: number;
      type?: TransactionType;
      description?: string | null;
      frequency?: FrequencyType;
      startDate?: string;
      endDate?: string | null;
      nextOccurrence?: string;
      isActive?: boolean;
    } = {};

    if (categoryId !== undefined) {
      updateData.categoryId = categoryId;
    }
    if (amount !== undefined) {
      updateData.amount = amount;
    }
    if (type !== undefined) {
      updateData.type = type;
    }
    if (frequency !== undefined) {
      updateData.frequency = frequency;
    }
    if (startDate !== undefined) {
      updateData.startDate = startDate;
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate;
    }
    if (nextOccurrence !== undefined) {
      updateData.nextOccurrence = nextOccurrence;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
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
    if (handleForeignKeyError(error, res)) {
      return;
    }
    
    // Handle service errors
    if (error.message) {
      return res.status(400).json({ error: error.message });
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
    const { scope, effectiveDate } = req.body; // Query params or body

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

    // If scope is provided, use the new service-based approach
    if (scope !== undefined) {
      // Validate scope
      if (!validateScope(scope, res)) {
        return;
      }

      // Validate effectiveDate
      if (!validateEffectiveDate(effectiveDate, res)) {
        return;
      }

      console.log('scope', scope);
      console.log('effectiveDate', effectiveDate);

      // Use the service to handle scope-based deletion
      const result = await deleteRecurringTransactionService(id, effectiveDate, scope);
      console.log('result', result);

      if (result.deleted) {
        return res.status(204).send();
      } else {
        // For 'single' and 'future' scopes, the recurring transaction still exists
        const updated = await RecurringTransactionModel.getRecurringTransactionById(id);
        return res.json({
          message: scope === 'single' 
            ? 'Occurrence deleted. Recurring transaction still active.'
            : 'Future occurrences deleted. Recurring transaction ended.',
          recurringTransaction: updated,
        });
      }
    }

    // Legacy behavior: delete entire series (backward compatibility)
    const deleted =
      await RecurringTransactionModel.deleteRecurringTransaction(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ message: 'Recurring transaction not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    // Handle service errors
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    
    next(error);
  }
};

/**
 * Generate transactions from recurring transactions for a specific date
 * This endpoint is intended to be called by a cron job or scheduler
 */
export const generateTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date } = req.query;

    let targetDate: string | undefined = undefined;
    if (date !== undefined) {
      if (typeof date === 'string' && isValidDate(date)) {
        targetDate = date;
      } else {
        return res
          .status(400)
          .json({ error: 'Invalid date format (expected: YYYY-MM-DD)' });
      }
    }

    const result = await generateTransactionsFromRecurring(targetDate);

    res.json({
      message: 'Transaction generation completed',
      date: targetDate || new Date().toISOString().split('T')[0],
      created: result.created,
      skipped: result.skipped,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get effective transactions for a user (real transactions + recurring instances, respecting overrides)
 */
export const getEffectiveTransactionsForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { startDate, endDate } = req.query;

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

    // Regular users can only see their own transactions
    // Admin and manager can see any user's transactions
    let userId: string = req.user.id;
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      const { userId: queryUserId } = req.query;
      if (queryUserId !== undefined) {
        if (typeof queryUserId === 'string' && isValidUUID(queryUserId)) {
          userId = queryUserId;
        } else {
          return res.status(400).json({ error: 'Invalid user ID format' });
        }
      }
    }

    const effectiveTransactions = await getEffectiveTransactions(
      userId,
      parsedStartDate,
      parsedEndDate
    );

    res.json(effectiveTransactions);
  } catch (error) {
    next(error);
  }
};

