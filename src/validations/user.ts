import type { Response } from 'express';
import { isValidUUID } from './common.js';

// Email validation regex
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validate email field
 */
export const validateEmail = (email: any, res?: Response): boolean => {
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    if (res) {
      res.status(400).json({ error: 'Email is required' });
    }
    return false;
  }
  if (!isValidEmail(email)) {
    if (res) {
      res.status(400).json({ error: 'Invalid email format' });
    }
    return false;
  }
  return true;
};

/**
 * Validate password hash (for admin-created users)
 */
export const validatePasswordHash = (password_hash: any, res?: Response): boolean => {
  if (
    !password_hash ||
    typeof password_hash !== 'string' ||
    password_hash.trim().length === 0
  ) {
    if (res) {
      res.status(400).json({ error: 'Password hash is required' });
    }
    return false;
  }
  return true;
};

/**
 * Validate full name
 */
export const validateFullName = (full_name: any, res?: Response, maxLength: number = 100): boolean => {
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
    if (res) {
      res.status(400).json({ error: 'Full name is required' });
    }
    return false;
  }
  if (full_name.trim().length > maxLength) {
    if (res) {
      res.status(400).json({ error: `Full name must be ${maxLength} characters or less` });
    }
    return false;
  }
  return true;
};

/**
 * Validate currency code (3 characters, e.g., USD)
 */
export const validateCurrency = (currency: any, res?: Response): boolean => {
  if (currency !== undefined) {
    if (typeof currency !== 'string' || currency.length !== 3) {
      if (res) {
        res.status(400).json({
          error: 'Currency must be a 3-character code (e.g., USD)',
        });
      }
      return false;
    }
  }
  return true;
};

/**
 * Validate user role
 */
export const isValidUserRole = (role: string): role is 'admin' | 'manager' | 'user' => {
  return ['admin', 'manager', 'user'].includes(role);
};

/**
 * Validate user role field
 */
export const validateRole = (role: any, res?: Response): boolean => {
  if (role !== undefined) {
    if (!isValidUserRole(role)) {
      if (res) {
        res.status(400).json({
          error: 'Role must be admin, manager, or user',
        });
      }
      return false;
    }
  }
  return true;
};

/**
 * Validate user ID
 */
export const validateUserId = (id: any, res?: Response): id is string => {
  if (!id || typeof id !== 'string') {
    if (res) {
      res.status(400).json({ error: 'Invalid user ID' });
    }
    return false;
  }
  // Optionally validate UUID format
  if (!isValidUUID(id)) {
    if (res) {
      res.status(400).json({ error: 'Invalid user ID format' });
    }
    return false;
  }
  return true;
};

/**
 * Validate all user creation fields (for admin/manager creating users)
 */
export const validateCreateUser = (
  data: {
    email: any;
    passwordHash: any;
    fullName: any;
    currency?: any;
    role?: any;
  },
  res?: Response
): boolean => {
  if (!validateEmail(data.email, res)) return false;
  if (!validatePasswordHash(data.passwordHash, res)) return false;
  if (!validateFullName(data.fullName, res)) return false;
  if (!validateCurrency(data.currency, res)) return false;
  if (!validateRole(data.role, res)) return false;
  return true;
};

/**
 * Validate user update fields (all optional)
 */
export const validateUpdateUser = (
  data: {
    email?: any;
    passwordHash?: any;
    fullName?: any;
    currency?: any;
    role?: any;
  },
  res?: Response
): boolean => {
  if (data.email !== undefined) {
    if (typeof data.email !== 'string' || data.email.trim().length === 0) {
      if (res) {
        res.status(400).json({ error: 'Email must be a non-empty string' });
      }
      return false;
    }
    if (!isValidEmail(data.email)) {
      if (res) {
        res.status(400).json({ error: 'Invalid email format' });
      }
      return false;
    }
  }

  if (data.passwordHash !== undefined) {
    if (typeof data.passwordHash !== 'string' || data.passwordHash.trim().length === 0) {
      if (res) {
        res.status(400).json({
          error: 'Password hash must be a non-empty string',
        });
      }
      return false;
    }
  }

  if (data.fullName !== undefined) {
    if (typeof data.fullName !== 'string' || data.fullName.trim().length === 0) {
      if (res) {
        res.status(400).json({
          error: 'Full name must be a non-empty string',
        });
      }
      return false;
    }
  }

  if (!validateCurrency(data.currency, res)) return false;
  if (!validateRole(data.role, res)) return false;

  return true;
};

/**
 * Validate email for login/register (simpler validation)
 */
export const validateEmailForAuth = (email: any, res?: Response): boolean => {
  if (!email || typeof email !== 'string') {
    if (res) {
      res.status(400).json({ error: 'Email is required' });
    }
    return false;
  }
  if (!isValidEmail(email)) {
    if (res) {
      res.status(400).json({ error: 'Valid email is required' });
    }
    return false;
  }
  return true;
};

/**
 * Validate password for login/register
 */
export const validatePasswordForAuth = (password: any, res?: Response): boolean => {
  if (!password || typeof password !== 'string') {
    if (res) {
      res.status(400).json({ error: 'Password is required' });
    }
    return false;
  }
  return true;
};

