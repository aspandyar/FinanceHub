import prisma from '../config/database.js';

export type Budget = NonNullable<Awaited<ReturnType<typeof prisma.budget.findUnique>>>;

export interface CreateBudgetInput {
  user_id: string;
  category_id: string;
  amount: number;
  month: string; // ISO date string (YYYY-MM-DD) - should be first day of month
}

export interface UpdateBudgetInput {
  category_id?: string;
  amount?: number;
  month?: string; // ISO date string (YYYY-MM-DD) - should be first day of month
}

// Get all budgets (optionally filtered by user_id, category_id, month)
export const getAllBudgets = async (
  user_id?: string,
  category_id?: string,
  month?: string
): Promise<Budget[]> => {
  const where: {
    userId?: string;
    categoryId?: string;
    month?: Date;
  } = {};

  if (user_id) {
    where.userId = user_id;
  }

  if (category_id) {
    where.categoryId = category_id;
  }

  if (month) {
    where.month = new Date(month);
  }

  return prisma.budget.findMany({
    where,
    orderBy: [
      { month: 'desc' },
      { createdAt: 'desc' },
    ],
  });
};

// Get budget by ID
export const getBudgetById = async (id: string): Promise<Budget | null> => {
  return prisma.budget.findUnique({
    where: { id },
  });
};

// Get budgets by user_id
export const getBudgetsByUserId = async (
  user_id: string
): Promise<Budget[]> => {
  return prisma.budget.findMany({
    where: { userId: user_id },
    orderBy: [
      { month: 'desc' },
      { createdAt: 'desc' },
    ],
  });
};

// Get budgets by user_id and month
export const getBudgetsByUserIdAndMonth = async (
  user_id: string,
  month: string
): Promise<Budget[]> => {
  return prisma.budget.findMany({
    where: {
      userId: user_id,
      month: new Date(month),
    },
    orderBy: { createdAt: 'desc' },
  });
};

// Create a new budget
export const createBudget = async (
  input: CreateBudgetInput
): Promise<Budget> => {
  return prisma.budget.create({
    data: {
      userId: input.user_id,
      categoryId: input.category_id,
      amount: input.amount,
      month: new Date(input.month),
    },
  });
};

// Update a budget
export const updateBudget = async (
  id: string,
  input: UpdateBudgetInput
): Promise<Budget | null> => {
  const updateData: {
    categoryId?: string;
    amount?: number;
    month?: Date;
  } = {};

  if (input.category_id !== undefined) {
    updateData.categoryId = input.category_id;
  }
  if (input.amount !== undefined) {
    updateData.amount = input.amount;
  }
  if (input.month !== undefined) {
    updateData.month = new Date(input.month);
  }

  if (Object.keys(updateData).length === 0) {
    return getBudgetById(id);
  }

  return prisma.budget.update({
    where: { id },
    data: updateData,
  });
};

// Delete a budget
export const deleteBudget = async (id: string): Promise<boolean> => {
  const result = await prisma.budget.delete({
    where: { id },
  });
  return !!result;
};

