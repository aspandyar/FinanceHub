import prisma from '../config/database.js';
import type { Prisma } from '@prisma/client';

export type Category = NonNullable<Awaited<ReturnType<typeof prisma.category.findUnique>>>;
export type CategoryType = 'income' | 'expense';

export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string | null;
  isSystem?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
  color?: string;
  icon?: string | null;
}

// Get all categories (optionally filtered by userId and type)
export const getAllCategories = async (
  userId?: string,
  type?: CategoryType
): Promise<Category[]> => {
  const where: {
    userId?: string;
    type?: CategoryType;
  } = {};

  if (userId !== undefined) {
    where.userId = userId;
  }

  if (type !== undefined) {
    where.type = type;
  }

  return prisma.category.findMany({
    where,
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });
};

// Get category by ID
export const getCategoryById = async (id: string): Promise<Category | null> => {
  return prisma.category.findUnique({
    where: { id },
  });
};

// Get categories by userId
export const getCategoriesByUserId = async (
  userId: string
): Promise<Category[]> => {
  return prisma.category.findMany({
    where: {
      userId: userId,
    },
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });
};

// Create a new category
export const createCategory = async (
  input: CreateCategoryInput
): Promise<Category> => {
  return prisma.category.create({
    data: {
      userId: input.userId,
      name: input.name,
      type: input.type,
      color: input.color || '#6B7280',
      icon: input.icon || null,
      isSystem: input.isSystem || false,
    },
  });
};

// Update a category
export const updateCategory = async (
  id: string,
  input: UpdateCategoryInput
): Promise<Category | null> => {
  const updateData: {
    name?: string;
    type?: CategoryType;
    color?: string;
    icon?: string | null;
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  if (input.type !== undefined) {
    updateData.type = input.type;
  }
  if (input.color !== undefined) {
    updateData.color = input.color;
  }
  if (input.icon !== undefined) {
    updateData.icon = input.icon;
  }

  if (Object.keys(updateData).length === 0) {
    return getCategoryById(id);
  }

  return prisma.category.update({
    where: { id },
    data: updateData,
  });
};

// Delete a category
export const deleteCategory = async (id: string): Promise<boolean> => {
  // Prevent deletion of system categories
  const category = await getCategoryById(id);
  if (category && category.isSystem) {
    throw new Error('Cannot delete system categories');
  }

  const result = await prisma.category.delete({
    where: { id },
  });
  return !!result;
};

