import type { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/models.js';

// Create a user
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password_hash, full_name, currency } = req.body;

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (
      !password_hash ||
      typeof password_hash !== 'string' ||
      password_hash.trim().length === 0
    ) {
      return res.status(400).json({ error: 'Password hash is required' });
    }

    if (
      !full_name ||
      typeof full_name !== 'string' ||
      full_name.trim().length === 0
    ) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate currency if provided
    if (currency && (typeof currency !== 'string' || currency.length !== 3)) {
      return res.status(400).json({
        error: 'Currency must be a 3-character code (e.g., USD)',
      });
    }

    const user = await UserModel.createUser({
      email: email.trim().toLowerCase(),
      password_hash: password_hash.trim(),
      full_name: full_name.trim(),
      currency: currency?.trim().toUpperCase() || 'USD',
    });
    res.status(201).json(user);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

// Read all users
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await UserModel.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Read single user
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await UserModel.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Update a user
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { email, password_hash, full_name, currency } = req.body;

    // Validate email format if provided
    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim().length === 0) {
        return res.status(400).json({ error: 'Email must be a non-empty string' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validate password_hash if provided
    if (
      password_hash !== undefined &&
      (typeof password_hash !== 'string' || password_hash.trim().length === 0)
    ) {
      return res.status(400).json({
        error: 'Password hash must be a non-empty string',
      });
    }

    // Validate full_name if provided
    if (
      full_name !== undefined &&
      (typeof full_name !== 'string' || full_name.trim().length === 0)
    ) {
      return res.status(400).json({
        error: 'Full name must be a non-empty string',
      });
    }

    // Validate currency if provided
    if (currency !== undefined) {
      if (typeof currency !== 'string' || currency.length !== 3) {
        return res.status(400).json({
          error: 'Currency must be a 3-character code (e.g., USD)',
        });
      }
    }

    const updateData: any = {};
    if (email !== undefined) {
      updateData.email = email.trim().toLowerCase();
    }
    if (password_hash !== undefined) {
      updateData.password_hash = password_hash.trim();
    }
    if (full_name !== undefined) {
      updateData.full_name = full_name.trim();
    }
    if (currency !== undefined) {
      updateData.currency = currency.trim().toUpperCase();
    }

    const user = await UserModel.updateUser(id, updateData);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

// Delete a user
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const deleted = await UserModel.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

