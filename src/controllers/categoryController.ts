import type { Request, Response, NextFunction } from 'express';
import { CategoryModel } from '../models/models.js';
import type { CategoryType } from '../models/category.js';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hex color validation regex (# followed by 6 hex digits)
const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;

// Validate UUID
const isValidUUID = (id: string): boolean => {
  return UUID_REGEX.test(id);
};

// Validate category type
const isValidCategoryType = (type: string): type is CategoryType => {
  return type === 'income' || type === 'expense';
};

// Validate hex color
const isValidHexColor = (color: string): boolean => {
  return HEX_COLOR_REGEX.test(color);
};

// Create a category
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, type, color, icon } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    if (name.trim().length > 50) {
      return res
        .status(400)
        .json({ error: 'Category name must be 50 characters or less' });
    }

    // Validate type
    if (!type || !isValidCategoryType(type)) {
      return res
        .status(400)
        .json({ error: "Category type must be 'income' or 'expense'" });
    }

    // Use authenticated user's ID (users can only create categories for themselves)
    const user_id = req.user.id;

    // Validate color if provided
    if (color !== undefined) {
      if (typeof color !== 'string' || !isValidHexColor(color)) {
        return res
          .status(400)
          .json({ error: 'Color must be a valid hex color (e.g., #6B7280)' });
      }
    }

    // Validate icon if provided
    if (icon !== undefined && icon !== null) {
      if (typeof icon !== 'string' || icon.length > 50) {
        return res
          .status(400)
          .json({ error: 'Icon must be a string with 50 characters or less' });
      }
    }

    const category = await CategoryModel.createCategory({
      user_id: user_id, // Always use authenticated user's ID
      name: name.trim(),
      type,
      color,
      icon: icon || null,
      is_system: false, // User-created categories are never system categories
    });

    res.status(201).json(category);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A category with this name and type already exists for this user',
      });
    }
    next(error);
  }
};

// Get all categories (optionally filtered by user_id and type)
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type } = req.query;

    // Regular users can only see their own categories + system categories
    // Admin and manager can see all categories
    let parsedUserId: string | null | undefined = undefined;
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      // Admin/manager can filter by any user_id or see all
      const { user_id } = req.query;
      if (user_id !== undefined) {
        if (user_id === 'null' || user_id === '') {
          parsedUserId = null;
        } else if (typeof user_id === 'string' && isValidUUID(user_id)) {
          parsedUserId = user_id;
        } else {
          return res.status(400).json({ error: 'Invalid user ID format' });
        }
      }
    } else {
      // Regular users can only see their own categories + system categories
      parsedUserId = req.user.id;
    }

    let parsedType: CategoryType | undefined = undefined;
    if (type !== undefined) {
      if (typeof type === 'string' && isValidCategoryType(type)) {
        parsedType = type;
      } else {
        return res
          .status(400)
          .json({ error: "Type must be 'income' or 'expense'" });
      }
    }

    const categories = await CategoryModel.getAllCategories(
      parsedUserId,
      parsedType
    );
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// Get category by ID
export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid category ID format' });
    }

    const category = await CategoryModel.getCategoryById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
};

// Get categories by user ID
export const getCategoriesByUserId = async (
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

    // Regular users can only see their own categories + system categories
    // Admin and manager can see any user's categories
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own categories',
        });
      }
    }

    const categories = await CategoryModel.getCategoriesByUserId(user_id);
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// Update a category
export const updateCategory = async (
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
      return res.status(400).json({ error: 'Invalid category ID format' });
    }

    // Check ownership or role
    const existingCategory = await CategoryModel.getCategoryById(id);
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // System categories cannot be updated
    if (existingCategory.is_system) {
      return res.status(403).json({ error: 'Cannot update system categories' });
    }

    // Check if user owns the category or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (existingCategory.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own categories',
        });
      }
    }

    const { name, type, color, icon } = req.body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Category name cannot be empty' });
      }
      if (name.trim().length > 50) {
        return res
          .status(400)
          .json({ error: 'Category name must be 50 characters or less' });
      }
    }

    // Validate type if provided
    if (type !== undefined && !isValidCategoryType(type)) {
      return res
        .status(400)
        .json({ error: "Category type must be 'income' or 'expense'" });
    }

    // Validate color if provided
    if (color !== undefined) {
      if (typeof color !== 'string' || !isValidHexColor(color)) {
        return res
          .status(400)
          .json({ error: 'Color must be a valid hex color (e.g., #6B7280)' });
      }
    }

    // Validate icon if provided
    if (icon !== undefined && icon !== null) {
      if (typeof icon !== 'string' || icon.length > 50) {
        return res
          .status(400)
          .json({ error: 'Icon must be a string with 50 characters or less' });
      }
    }

    const category = await CategoryModel.updateCategory(id, {
      name: name?.trim(),
      type,
      color,
      icon: icon || null,
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A category with this name and type already exists for this user',
      });
    }
    next(error);
  }
};

// Delete a category
export const deleteCategory = async (
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
      return res.status(400).json({ error: 'Invalid category ID format' });
    }

    // Check ownership or role
    const category = await CategoryModel.getCategoryById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // System categories cannot be deleted
    if (category.is_system) {
      return res.status(403).json({ error: 'Cannot delete system categories' });
    }

    // Check if user owns the category or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (category.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete your own categories',
        });
      }
    }

    try {
      const deleted = await CategoryModel.deleteCategory(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Cannot delete system categories') {
        return res
          .status(403)
          .json({ error: 'Cannot delete system categories' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

