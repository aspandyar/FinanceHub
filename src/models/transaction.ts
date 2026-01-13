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
  recurringTransactionId?: string | null;
  isOverride?: boolean;
}

export interface UpdateTransactionInput {
  categoryId?: string;
  amount?: number;
  type?: TransactionType;
  description?: string | null;
  date?: string; // ISO date string (YYYY-MM-DD)
  recurringTransactionId?: string | null;
  isOverride?: boolean;
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
  // Parse date string manually to avoid timezone issues
  // If input.date is a string in YYYY-MM-DD format, parse it manually
  let dateObj: Date;
  if (typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    // Format: YYYY-MM-DD - create date at UTC midnight to avoid timezone issues
    // This ensures Prisma stores the correct date regardless of server timezone
    const parts = input.date.split('-').map(Number);
    if (parts.length === 3 && parts.every(p => !isNaN(p))) {
      const year = parts[0]!;
      const month = parts[1]!;
      const day = parts[2]!;
      // Use Date.UTC to create date at UTC midnight
      dateObj = new Date(Date.UTC(year, month - 1, day));
    } else {
      // Fallback to standard parsing if format is unexpected
      dateObj = new Date(input.date);
      dateObj.setUTCHours(0, 0, 0, 0);
    }
  } else {
    // Already a Date object or different format
    dateObj = new Date(input.date);
    dateObj.setUTCHours(0, 0, 0, 0);
  }

  const data: {
    userId: string;
    categoryId: string;
    amount: number;
    type: TransactionType;
    description: string | null;
    date: Date;
    recurringTransactionId?: string | null;
    isOverride: boolean;
  } = {
    userId: input.userId,
    categoryId: input.categoryId,
    amount: input.amount,
    type: input.type,
    description: input.description || null,
    date: dateObj,
    isOverride: input.isOverride !== undefined ? input.isOverride : false,
  };

  if (input.recurringTransactionId !== undefined) {
    data.recurringTransactionId = input.recurringTransactionId;
  }

  return prisma.transaction.create({
    data,
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
    recurringTransactionId?: string | null;
    isOverride?: boolean;
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
    // Parse date string manually to avoid timezone issues
    // If input.date is a string in YYYY-MM-DD format, parse it manually
    if (typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      // Format: YYYY-MM-DD - create date at UTC midnight to avoid timezone issues
      const parts = input.date.split('-').map(Number);
      if (parts.length === 3 && parts.every(p => !isNaN(p))) {
        const year = parts[0]!;
        const month = parts[1]!;
        const day = parts[2]!;
        // Use Date.UTC to create date at UTC midnight
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        updateData.date = dateObj;
      } else {
        // Fallback to standard parsing if format is unexpected
        const dateObj = new Date(input.date);
        dateObj.setUTCHours(0, 0, 0, 0);
        updateData.date = dateObj;
      }
    } else {
      // Already a Date object or different format
      const dateObj = new Date(input.date);
      dateObj.setUTCHours(0, 0, 0, 0);
      updateData.date = dateObj;
    }
  }
  if (input.recurringTransactionId !== undefined) {
    updateData.recurringTransactionId = input.recurringTransactionId || null;
  }
  if (input.isOverride !== undefined) {
    updateData.isOverride = input.isOverride;
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

