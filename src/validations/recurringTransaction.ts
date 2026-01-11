import type { Response } from 'express';
import type { TransactionType, FrequencyType } from '../models/recurringTransaction.js';
import { CategoryModel } from '../models/models.js';
import { isValidUUID, isValidDate, isValidAmount } from './common.js';

/**
 * Validate transaction type
 */
export const isValidTransactionType = (type: string): type is TransactionType => {
  return type === 'income' || type === 'expense';
};

/**
 * Validate frequency type
 */
export const isValidFrequencyType = (frequency: string): frequency is FrequencyType => {
  return (
    frequency === 'daily' ||
    frequency === 'weekly' ||
    frequency === 'monthly' ||
    frequency === 'yearly'
  );
};

/**
 * Validate recurring transaction category_id
 */
export const validateCategoryId = (category_id: any, res?: Response): boolean => {
  if (!category_id || typeof category_id !== 'string' || !isValidUUID(category_id)) {
    if (res) {
      res.status(400).json({ error: 'Valid category ID is required' });
    }
    return false;
  }
  return true;
};

/**
 * Validate recurring transaction amount
 */
export const validateAmount = (amount: any, res?: Response): boolean => {
  if (!isValidAmount(amount)) {
    if (res) {
      res.status(400).json({
        error: 'Amount must be a positive number less than or equal to 9999999999.99',
      });
    }
    return false;
  }
  return true;
};

/**
 * Validate transaction type
 */
export const validateTransactionType = (type: any, res?: Response): boolean => {
  if (!type || !isValidTransactionType(type)) {
    if (res) {
      res.status(400).json({ error: "Transaction type must be 'income' or 'expense'" });
    }
    return false;
  }
  return true;
};

/**
 * Validate frequency
 */
export const validateFrequency = (frequency: any, res?: Response): boolean => {
  if (!frequency || !isValidFrequencyType(frequency)) {
    if (res) {
      res.status(400).json({
        error: "Frequency must be 'daily', 'weekly', 'monthly', or 'yearly'",
      });
    }
    return false;
  }
  return true;
};

/**
 * Validate date format
 */
export const validateDate = (date: any, res?: Response): boolean => {
  if (!date || typeof date !== 'string' || !isValidDate(date)) {
    if (res) {
      res.status(400).json({ error: 'Valid date is required (format: YYYY-MM-DD)' });
    }
    return false;
  }
  return true;
};

/**
 * Validate description
 */
export const validateDescription = (description: any, res?: Response): boolean => {
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      if (res) {
        res.status(400).json({ error: 'Description must be a string' });
      }
      return false;
    }
  }
  return true;
};

/**
 * Validate is_active
 */
export const validateIsActive = (is_active: any, res?: Response): boolean => {
  if (is_active !== undefined && typeof is_active !== 'boolean') {
    if (res) {
      res.status(400).json({ error: 'is_active must be a boolean' });
    }
    return false;
  }
  return true;
};

/**
 * Validate that transaction type matches category type
 */
export const validateTransactionTypeMatchesCategory = async (
  category_id: string,
  type: TransactionType,
  res?: Response
): Promise<boolean> => {
  const category = await CategoryModel.getCategoryById(category_id);
  
  if (!category) {
    if (res) {
      res.status(400).json({
        error: 'Invalid category_id',
        message: 'The specified category does not exist',
      });
    }
    return false;
  }

  if (category.type !== type) {
    if (res) {
      res.status(400).json({
        error: 'Transaction type mismatch',
        message: `Transaction type must match category type. Category is of type '${category.type}', but transaction type is '${type}'`,
      });
    }
    return false;
  }

  return true;
};

/**
 * Validate all recurring transaction creation fields
 */
export const validateCreateRecurringTransaction = async (
  data: {
    categoryId: any;
    amount: any;
    type: any;
    frequency: any;
    startDate: any;
    nextOccurrence: any;
    description?: any;
    endDate?: any;
    isActive?: any;
  },
  res?: Response
): Promise<boolean> => {
  if (!validateCategoryId(data.categoryId, res)) return false;
  if (!validateAmount(data.amount, res)) return false;
  if (!validateTransactionType(data.type, res)) return false;
  if (!validateFrequency(data.frequency, res)) return false;
  if (!validateDate(data.startDate, res)) return false;
  if (!validateDate(data.nextOccurrence, res)) return false;
  
  if (data.endDate !== undefined && data.endDate !== null) {
    if (!validateDate(data.endDate, res)) return false;
  }
  
  if (!validateDescription(data.description, res)) return false;
  if (!validateIsActive(data.isActive, res)) return false;
  
  // Validate type matches category
  if (!(await validateTransactionTypeMatchesCategory(data.categoryId, data.type, res))) {
    return false;
  }

  return true;
};

/**
 * Validate recurring transaction update fields (all optional)
 */
export const validateUpdateRecurringTransaction = async (
  data: {
    categoryId?: any;
    amount?: any;
    type?: any;
    frequency?: any;
    startDate?: any;
    endDate?: any;
    nextOccurrence?: any;
    description?: any;
    isActive?: any;
  },
  existingCategoryId: string,
  existingType: TransactionType,
  res?: Response
): Promise<boolean> => {
  if (data.categoryId !== undefined) {
    if (!validateCategoryId(data.categoryId, res)) return false;
  }

  if (data.amount !== undefined) {
    if (!validateAmount(data.amount, res)) return false;
  }

  if (data.type !== undefined) {
    if (!validateTransactionType(data.type, res)) return false;
  }

  if (data.frequency !== undefined) {
    if (!validateFrequency(data.frequency, res)) return false;
  }

  if (data.startDate !== undefined) {
    if (!validateDate(data.startDate, res)) return false;
  }

  if (data.endDate !== undefined) {
    if (data.endDate === null) {
      // null is allowed for endDate
    } else if (!validateDate(data.endDate, res)) {
      return false;
    }
  }

  if (data.nextOccurrence !== undefined) {
    if (!validateDate(data.nextOccurrence, res)) return false;
  }

  if (data.description !== undefined) {
    if (data.description === null) {
      // null is allowed for description
    } else if (!validateDescription(data.description, res)) {
      return false;
    }
  }

  if (data.isActive !== undefined) {
    if (!validateIsActive(data.isActive, res)) return false;
  }

  // Validate type/category consistency if either is being updated
  if (data.categoryId !== undefined || data.type !== undefined) {
    const categoryIdToCheck = data.categoryId || existingCategoryId;
    const typeToCheck = data.type || existingType;
    
    if (!(await validateTransactionTypeMatchesCategory(categoryIdToCheck, typeToCheck, res))) {
      return false;
    }
  }

  return true;
};

