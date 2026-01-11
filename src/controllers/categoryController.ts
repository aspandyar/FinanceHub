import type { Request, Response, NextFunction } from 'express';
import { CategoryModel } from '../models/models.js';
import { isValidUUID } from '../validations/common.js';
import { validateCreateCategory, validateUpdateCategory } from '../validations/category.js';
import type { CategoryType } from '../models/category.js';
import { isValidCategoryType } from '../validations/category.js';

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

    // Use authenticated user's ID (users can only create categories for themselves)
    const userId = req.user.id;

    // Validate all fields
    if (!validateCreateCategory({ name, type, color, icon }, res)) {
      return;
    }

    const category = await CategoryModel.createCategory({
      userId: userId, // Always use authenticated user's ID
      name: name.trim(),
      type,
      color,
      icon: icon || null,
      isSystem: false, // User-created categories are never system categories
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
      // Admin/manager can filter by any userId or see all
      const { userId } = req.query;
      if (userId !== undefined) {
        if (userId === 'null' || userId === '') {
          parsedUserId = null;
        } else if (typeof userId === 'string' && isValidUUID(userId)) {
          parsedUserId = userId;
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
      parsedUserId ?? undefined,
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

    const { userId } = req.params;

    if (!userId || !isValidUUID(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Regular users can only see their own categories + system categories
    // Admin and manager can see any user's categories
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own categories',
        });
      }
    }

    const categories = await CategoryModel.getCategoriesByUserId(userId);
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
    if (existingCategory.isSystem) {
      return res.status(403).json({ error: 'Cannot update system categories' });
    }

    // Check if user owns the category or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (existingCategory.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own categories',
        });
      }
    }

    const { name, type, color, icon } = req.body;

    // Validate all fields
    if (!validateUpdateCategory({ name, type, color, icon }, res)) {
      return;
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
    if (category.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system categories' });
    }

    // Check if user owns the category or is admin/manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (category.userId !== req.user.id) {
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

