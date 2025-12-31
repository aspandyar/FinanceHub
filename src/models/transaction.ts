import prisma from '../config/database.js';

export type Transaction = NonNullable<Awaited<ReturnType<typeof prisma.transaction.findUnique>>>;
export type TransactionType = 'income' | 'expense';

export interface CreateTransactionInput {
  user_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  description?: string | null;
  date: string; // ISO date string (YYYY-MM-DD)
}

export interface UpdateTransactionInput {
  category_id?: string;
  amount?: number;
  type?: TransactionType;
  description?: string | null;
  date?: string; // ISO date string (YYYY-MM-DD)
}

// Get all transactions (optionally filtered by user_id, type, category_id, date range)
export const getAllTransactions = async (
  user_id?: string,
  type?: TransactionType,
  category_id?: string,
  start_date?: string,
  end_date?: string
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

  if (user_id) {
    where.userId = user_id;
  }

  if (type) {
    where.type = type;
  }

  if (category_id) {
    where.categoryId = category_id;
  }

  if (start_date || end_date) {
    where.date = {};
    if (start_date) {
      where.date.gte = new Date(start_date);
    }
    if (end_date) {
      where.date.lte = new Date(end_date);
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

// Get transactions by user_id
export const getTransactionsByUserId = async (
  user_id: string
): Promise<Transaction[]> => {
  return prisma.transaction.findMany({
    where: { userId: user_id },
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
      userId: input.user_id,
      categoryId: input.category_id,
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

