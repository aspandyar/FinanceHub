import prisma from '../config/database.js';

export type RecurringTransaction = NonNullable<Awaited<ReturnType<typeof prisma.recurringTransaction.findUnique>>>;
export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TransactionType = 'income' | 'expense';

export interface CreateRecurringTransactionInput {
  userId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  description?: string | null;
  frequency: FrequencyType;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate?: string | null; // ISO date string (YYYY-MM-DD)
  nextOccurrence: string; // ISO date string (YYYY-MM-DD)
  isActive?: boolean;
}

export interface UpdateRecurringTransactionInput {
  categoryId?: string;
  amount?: number;
  type?: TransactionType;
  description?: string | null;
  frequency?: FrequencyType;
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string | null; // ISO date string (YYYY-MM-DD)
  nextOccurrence?: string; // ISO date string (YYYY-MM-DD)
  isActive?: boolean;
}

// Get all recurring transactions (optionally filtered by userId, isActive)
export const getAllRecurringTransactions = async (
  userId?: string,
  isActive?: boolean
): Promise<RecurringTransaction[]> => {
  const where: {
    userId?: string;
    isActive?: boolean;
  } = {};

  if (userId) {
    where.userId = userId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
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

// Get recurring transactions by userId
export const getRecurringTransactionsByUserId = async (
  userId: string
): Promise<RecurringTransaction[]> => {
  return prisma.recurringTransaction.findMany({
    where: { userId: userId },
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
      userId: input.userId,
      categoryId: input.categoryId,
      amount: input.amount,
      type: input.type,
      description: input.description || null,
      frequency: input.frequency,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      nextOccurrence: new Date(input.nextOccurrence),
      isActive: input.isActive !== undefined ? input.isActive : true,
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

  if (input.categoryId !== undefined) {
    updateData.categoryId = input.categoryId;
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
  if (input.startDate !== undefined) {
    updateData.startDate = new Date(input.startDate);
  }
  if (input.endDate !== undefined) {
    updateData.endDate = input.endDate ? new Date(input.endDate) : null;
  }
  if (input.nextOccurrence !== undefined) {
    updateData.nextOccurrence = new Date(input.nextOccurrence);
  }
  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
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

