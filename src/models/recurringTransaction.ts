import { query } from '../config/database.js';

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TransactionType = 'income' | 'expense';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  category_id: string;
  amount: string; // DECIMAL is returned as string from PostgreSQL
  type: TransactionType;
  description: string | null;
  frequency: FrequencyType;
  start_date: string; // DATE is returned as string from PostgreSQL
  end_date: string | null;
  next_occurrence: string; // DATE is returned as string from PostgreSQL
  is_active: boolean;
  created_at?: Date;
}

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
  let sql = 'SELECT * FROM recurring_transactions WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (user_id) {
    sql += ` AND user_id = $${paramCount}`;
    params.push(user_id);
    paramCount++;
  }

  if (is_active !== undefined) {
    sql += ` AND is_active = $${paramCount}`;
    params.push(is_active);
    paramCount++;
  }

  sql += ' ORDER BY next_occurrence ASC, created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

// Get recurring transaction by ID
export const getRecurringTransactionById = async (
  id: string
): Promise<RecurringTransaction | null> => {
  const result = await query(
    'SELECT * FROM recurring_transactions WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

// Get recurring transactions by user_id
export const getRecurringTransactionsByUserId = async (
  user_id: string
): Promise<RecurringTransaction[]> => {
  const result = await query(
    `SELECT * FROM recurring_transactions 
     WHERE user_id = $1 
     ORDER BY next_occurrence ASC, created_at DESC`,
    [user_id]
  );
  return result.rows;
};

// Get active recurring transactions due on or before a date
export const getDueRecurringTransactions = async (
  date: string
): Promise<RecurringTransaction[]> => {
  const result = await query(
    `SELECT * FROM recurring_transactions 
     WHERE is_active = TRUE 
     AND next_occurrence <= $1 
     AND (end_date IS NULL OR end_date >= $1)
     ORDER BY next_occurrence ASC`,
    [date]
  );
  return result.rows;
};

// Create a new recurring transaction
export const createRecurringTransaction = async (
  input: CreateRecurringTransactionInput
): Promise<RecurringTransaction> => {
  const result = await query(
    `INSERT INTO recurring_transactions 
     (user_id, category_id, amount, type, description, frequency, start_date, end_date, next_occurrence, is_active) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
     RETURNING *`,
    [
      input.user_id,
      input.category_id,
      input.amount,
      input.type,
      input.description || null,
      input.frequency,
      input.start_date,
      input.end_date || null,
      input.next_occurrence,
      input.is_active !== undefined ? input.is_active : true,
    ]
  );
  return result.rows[0];
};

// Update a recurring transaction
export const updateRecurringTransaction = async (
  id: string,
  input: UpdateRecurringTransactionInput
): Promise<RecurringTransaction | null> => {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (input.category_id !== undefined) {
    updates.push(`category_id = $${paramCount++}`);
    values.push(input.category_id);
  }
  if (input.amount !== undefined) {
    updates.push(`amount = $${paramCount++}`);
    values.push(input.amount);
  }
  if (input.type !== undefined) {
    updates.push(`type = $${paramCount++}`);
    values.push(input.type);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(input.description);
  }
  if (input.frequency !== undefined) {
    updates.push(`frequency = $${paramCount++}`);
    values.push(input.frequency);
  }
  if (input.start_date !== undefined) {
    updates.push(`start_date = $${paramCount++}`);
    values.push(input.start_date);
  }
  if (input.end_date !== undefined) {
    updates.push(`end_date = $${paramCount++}`);
    values.push(input.end_date);
  }
  if (input.next_occurrence !== undefined) {
    updates.push(`next_occurrence = $${paramCount++}`);
    values.push(input.next_occurrence);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${paramCount++}`);
    values.push(input.is_active);
  }

  if (updates.length === 0) {
    return getRecurringTransactionById(id);
  }

  values.push(id);

  const result = await query(
    `UPDATE recurring_transactions 
     SET ${updates.join(', ')} 
     WHERE id = $${paramCount} 
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Delete a recurring transaction
export const deleteRecurringTransaction = async (
  id: string
): Promise<boolean> => {
  const result = await query(
    'DELETE FROM recurring_transactions WHERE id = $1',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
};

