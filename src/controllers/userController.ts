import type { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/models.js';

// Create a user (admin/manager only - regular users should use /api/auth/register)
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only admin and manager can create users directly
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only admin and manager can create users',
      });
    }

    const { email, password_hash, full_name, currency, role } = req.body;

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

    // Validate role if provided
    if (role !== undefined) {
      if (!['admin', 'manager', 'user'].includes(role)) {
        return res.status(400).json({
          error: 'Role must be admin, manager, or user',
        });
      }
    }

    const user = await UserModel.createUser({
      email: email.trim().toLowerCase(),
      password_hash: password_hash.trim(),
      full_name: full_name.trim(),
      currency: currency?.trim().toUpperCase() || 'USD',
      role: role || 'user',
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

// Read all users (admin/manager only)
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only admin and manager can see all users
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only admin and manager can view all users',
      });
    }

    const users = await UserModel.getAllUsers();
    // Remove passwordHash from response
    const usersWithoutPassword = users.map(({ passwordHash, ...user }) => user);
    res.json(usersWithoutPassword);
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
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Regular users can only see their own profile
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own profile',
        });
      }
    }

    const user = await UserModel.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove passwordHash from response
    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
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
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Regular users can only update their own profile
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own profile',
        });
      }
    }

    const { email, password_hash, full_name, currency, role } = req.body;

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

    // Only admin can change roles
    if (role !== undefined) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only admin can change user roles',
        });
      }
      if (!['admin', 'manager', 'user'].includes(role)) {
        return res.status(400).json({
          error: 'Role must be admin, manager, or user',
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
    if (role !== undefined) {
      updateData.role = role;
    }

    const user = await UserModel.updateUser(id, updateData);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove passwordHash from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

// Delete a user (admin only)
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only admin can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only admin can delete users',
      });
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete your own account',
      });
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

