import type { Response } from 'express';
import type { TransactionType } from '../models/transaction.js';
import { CategoryModel } from '../models/models.js';
import { isValidUUID, isValidDate, isValidAmount } from './common.js';

/**
 * Validate transaction type
 */
export const isValidTransactionType = (type: string): type is TransactionType => {
  return type === 'income' || type === 'expense';
};

/**
 * Validate transaction category_id
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
 * Validate transaction amount
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
 * Validate transaction date
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
 * Validate transaction description
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
 * Validate all transaction creation fields
 */
export const validateCreateTransaction = async (
  data: {
    categoryId: any;
    amount: any;
    type: any;
    date: any;
    description?: any;
  },
  res?: Response
): Promise<boolean> => {
  if (!validateCategoryId(data.categoryId, res)) return false;
  if (!validateAmount(data.amount, res)) return false;
  if (!validateTransactionType(data.type, res)) return false;
  if (!validateDate(data.date, res)) return false;
  if (!validateDescription(data.description, res)) return false;
  
  // Validate type matches category
  if (!(await validateTransactionTypeMatchesCategory(data.categoryId, data.type, res))) {
    return false;
  }

  return true;
};

/**
 * Validate transaction update fields (all optional)
 */
export const validateUpdateTransaction = async (
  data: {
    categoryId?: any;
    amount?: any;
    type?: any;
    date?: any;
    description?: any;
  },
  existingCategoryId: string,
  existingType: TransactionType,
  res?: Response
): Promise<boolean> => {
  // Validate categoryId if provided
  if (data.categoryId !== undefined) {
    if (!validateCategoryId(data.categoryId, res)) return false;
  }

  // Validate amount if provided
  if (data.amount !== undefined) {
    if (!validateAmount(data.amount, res)) return false;
  }

  // Validate type if provided
  if (data.type !== undefined) {
    if (!validateTransactionType(data.type, res)) return false;
  }

  // Validate date if provided
  if (data.date !== undefined) {
    if (!validateDate(data.date, res)) return false;
  }

  // Validate description if provided
  if (data.description !== undefined) {
    if (!validateDescription(data.description, res)) return false;
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

