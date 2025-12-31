import prisma from '../config/database.js';

export type RecurringTransaction = NonNullable<Awaited<ReturnType<typeof prisma.recurringTransaction.findUnique>>>;
export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TransactionType = 'income' | 'expense';

export interface CreateRecurringTransactionInput {
  user_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  description?: string | null;
  frequency: FrequencyType;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date?: string | null; // ISO date string (YYYY-MM-DD)
  next_occurrence: string; // ISO date string (YYYY-MM-DD)
  is_active?: boolean;
}

export interface UpdateRecurringTransactionInput {
  category_id?: string;
  amount?: number;
  type?: TransactionType;
  description?: string | null;
  frequency?: FrequencyType;
  start_date?: string; // ISO date string (YYYY-MM-DD)
  end_date?: string | null; // ISO date string (YYYY-MM-DD)
  next_occurrence?: string; // ISO date string (YYYY-MM-DD)
  is_active?: boolean;
}

// Get all recurring transactions (optionally filtered by user_id, is_active)
export const getAllRecurringTransactions = async (
  user_id?: string,
  is_active?: boolean
): Promise<RecurringTransaction[]> => {
  const where: {
    userId?: string;
    isActive?: boolean;
  } = {};

  if (user_id) {
    where.userId = user_id;
  }

  if (is_active !== undefined) {
    where.isActive = is_active;
  }

  return prisma.recurringTransaction.findMany({
    where,
    orderBy: [
      { nextOccurrence: 'asc' },
      { createdAt: 'desc' },
    ],
  });
};

// Get recurring transaction by ID
export const getRecurringTransactionById = async (
  id: string
): Promise<RecurringTransaction | null> => {
  return prisma.recurringTransaction.findUnique({
    where: { id },
  });
};

// Get recurring transactions by user_id
export const getRecurringTransactionsByUserId = async (
  user_id: string
): Promise<RecurringTransaction[]> => {
  return prisma.recurringTransaction.findMany({
    where: { userId: user_id },
    orderBy: [
      { nextOccurrence: 'asc' },
      { createdAt: 'desc' },
    ],
  });
};

// Get active recurring transactions due on or before a date
export const getDueRecurringTransactions = async (
  date: string
): Promise<RecurringTransaction[]> => {
  const dateObj = new Date(date);
  return prisma.recurringTransaction.findMany({
    where: {
      AND: [
        { isActive: true },
        { nextOccurrence: { lte: dateObj } },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: dateObj } },
          ],
        },
      ],
    },
    orderBy: { nextOccurrence: 'asc' },
  });
};

// Create a new recurring transaction
export const createRecurringTransaction = async (
  input: CreateRecurringTransactionInput
): Promise<RecurringTransaction> => {
  return prisma.recurringTransaction.create({
    data: {
      userId: input.user_id,
      categoryId: input.category_id,
      amount: input.amount,
      type: input.type,
      description: input.description || null,
      frequency: input.frequency,
      startDate: new Date(input.start_date),
      endDate: input.end_date ? new Date(input.end_date) : null,
      nextOccurrence: new Date(input.next_occurrence),
      isActive: input.is_active !== undefined ? input.is_active : true,
    },
  });
};

// Update a recurring transaction
export const updateRecurringTransaction = async (
  id: string,
  input: UpdateRecurringTransactionInput
): Promise<RecurringTransaction | null> => {
  const updateData: {
    categoryId?: string;
    amount?: number;
    type?: TransactionType;
    description?: string | null;
    frequency?: FrequencyType;
    startDate?: Date;
    endDate?: Date | null;
    nextOccurrence?: Date;
    isActive?: boolean;
  } = {};

  if (input.category_id !== undefined) {
    updateData.categoryId = input.category_id;
  }
  if (input.amount !== undefined) {
    updateData.amount = input.amount;
  }
  if (input.type !== undefined) {
    updateData.type = input.type;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.frequency !== undefined) {
    updateData.frequency = input.frequency;
  }
  if (input.start_date !== undefined) {
    updateData.startDate = new Date(input.start_date);
  }
  if (input.end_date !== undefined) {
    updateData.endDate = input.end_date ? new Date(input.end_date) : null;
  }
  if (input.next_occurrence !== undefined) {
    updateData.nextOccurrence = new Date(input.next_occurrence);
  }
  if (input.is_active !== undefined) {
    updateData.isActive = input.is_active;
  }

  if (Object.keys(updateData).length === 0) {
    return getRecurringTransactionById(id);
  }

  return prisma.recurringTransaction.update({
    where: { id },
    data: updateData,
  });
};

// Delete a recurring transaction
export const deleteRecurringTransaction = async (
  id: string
): Promise<boolean> => {
  const result = await prisma.recurringTransaction.delete({
    where: { id },
  });
  return !!result;
};

