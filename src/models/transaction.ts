import prisma from '../config/database.js';

export type Transaction = NonNullable<Awaited<ReturnType<typeof prisma.transaction.findUnique>>>;
export type TransactionType = 'income' | 'expense';

export interface CreateTransactionInput {
  userId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  description?: string | null;
  date: string; // ISO date string (YYYY-MM-DD)
}

export interface UpdateTransactionInput {
  categoryId?: string;
  amount?: number;
  type?: TransactionType;
  description?: string | null;
  date?: string; // ISO date string (YYYY-MM-DD)
}

// Get all transactions (optionally filtered by userId, type, categoryId, date range)
export const getAllTransactions = async (
  userId?: string,
  type?: TransactionType,
  categoryId?: string,
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> => {
  const where: {
    userId?: string;
    type?: TransactionType;
    categoryId?: string;
    date?: {
      gte?: Date;
      lte?: Date;
    };
  } = {};

  if (userId) {
    where.userId = userId;
  }

  if (type) {
    where.type = type;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      where.date.gte = new Date(startDate);
    }
    if (endDate) {
      where.date.lte = new Date(endDate);
    }
  }

  return prisma.transaction.findMany({
    where,
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' },
    ],
  });
};

// Get transaction by ID
export const getTransactionById = async (
  id: string
): Promise<Transaction | null> => {
  return prisma.transaction.findUnique({
    where: { id },
  });
};

// Get transactions by userId
export const getTransactionsByUserId = async (
  userId: string
): Promise<Transaction[]> => {
  return prisma.transaction.findMany({
    where: { userId: userId },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' },
    ],
  });
};

// Create a new transaction
export const createTransaction = async (
  input: CreateTransactionInput
): Promise<Transaction> => {
  return prisma.transaction.create({
    data: {
      userId: input.userId,
      categoryId: input.categoryId,
      amount: input.amount,
      type: input.type,
      description: input.description || null,
      date: new Date(input.date),
    },
  });
};

// Update a transaction
export const updateTransaction = async (
  id: string,
  input: UpdateTransactionInput
): Promise<Transaction | null> => {
  const updateData: {
    categoryId?: string;
    amount?: number;
    type?: TransactionType;
    description?: string | null;
    date?: Date;
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
  if (input.date !== undefined) {
    updateData.date = new Date(input.date);
  }

  if (Object.keys(updateData).length === 0) {
    return getTransactionById(id);
  }

  return prisma.transaction.update({
    where: { id },
    data: updateData,
  });
};

// Delete a transaction
export const deleteTransaction = async (id: string): Promise<boolean> => {
  const result = await prisma.transaction.delete({
    where: { id },
  });
  return !!result;
};

