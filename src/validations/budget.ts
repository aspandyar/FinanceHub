import type { Response } from 'express';
import { isValidUUID, isValidDate, isValidAmount, normalizeMonth } from './common.js';

/**
 * Validate budget category_id
 */
export const validateCategoryId = (category_id: any, res?: Response): boolean => {
  if (
    !category_id ||
    typeof category_id !== 'string' ||
    !isValidUUID(category_id)
  ) {
    if (res) {
      res.status(400).json({ error: 'Valid category ID is required' });
    }
    return false;
  }
  return true;
};

/**
 * Validate budget amount
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
 * Validate budget month
 */
export const validateMonth = (month: any, res?: Response): boolean => {
  if (!month || typeof month !== 'string' || !isValidDate(month)) {
    if (res) {
      res.status(400).json({ error: 'Valid month is required (format: YYYY-MM-DD)' });
    }
    return false;
  }
  return true;
};

/**
 * Validate all budget creation fields
 */
export const validateCreateBudget = (
  data: {
    categoryId: any;
    amount: any;
    month: any;
  },
  res?: Response
): { isValid: boolean; normalizedMonth?: string } => {
  if (!validateCategoryId(data.categoryId, res)) {
    return { isValid: false };
  }
  if (!validateAmount(data.amount, res)) {
    return { isValid: false };
  }
  if (!validateMonth(data.month, res)) {
    return { isValid: false };
  }

  const normalizedMonth = normalizeMonth(data.month);
  return { isValid: true, normalizedMonth };
};

/**
 * Validate budget update fields (all optional)
 */
export const validateUpdateBudget = (
  data: {
    categoryId?: any;
    amount?: any;
    month?: any;
  },
  res?: Response
): { isValid: boolean; normalizedMonth?: string } => {
  if (data.categoryId !== undefined) {
    if (!validateCategoryId(data.categoryId, res)) {
      return { isValid: false };
    }
  }

  if (data.amount !== undefined) {
    if (!validateAmount(data.amount, res)) {
      return { isValid: false };
    }
  }

  if (data.month !== undefined) {
    if (!validateMonth(data.month, res)) {
      return { isValid: false };
    }
    const normalizedMonth = normalizeMonth(data.month);
    return { isValid: true, normalizedMonth };
  }

  return { isValid: true };
};

