import type { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/models.js';
import { hashPassword, comparePassword, validatePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { validateEmailForAuth, validatePasswordForAuth, validateFullName } from '../validations/user.js';
import { handleUniqueConstraintError } from '../utils/prismaErrors.js';

// Register a new user
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, fullName, currency } = req.body;

    // Validate email
    if (!validateEmailForAuth(email, res)) {
      return;
    }

    // Validate password
    if (!validatePasswordForAuth(password, res)) {
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
    }

    // Validate fullName
    if (!validateFullName(fullName, res, 100)) {
      return;
    }

    // Check if user already exists
    const existingUser = await UserModel.getUserByEmail(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user (default role is 'user')
    const user = await UserModel.createUser({
      email: email.toLowerCase().trim(),
      passwordHash: password_hash,
      fullName: fullName.trim(),
      currency: currency || 'USD',
      role: 'user', // New users always get 'user' role
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user without passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    // Handle unique constraint violation
    if (handleUniqueConstraintError(error, res, 'Email already registered')) {
      return;
    }
    next(error);
  }
};

// Login user
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Validate email
    if (!validateEmailForAuth(email, res)) {
      return;
    }

    // Validate password
    if (!validatePasswordForAuth(password, res)) {
      return;
    }

    // Find user by email
    const user = await UserModel.getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user without passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// Logout user (client-side token removal, but we can add token blacklisting here if needed)
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token. If you need server-side logout, implement token blacklisting
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await UserModel.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user without passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

