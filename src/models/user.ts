import { query } from '../config/database.js';

export type UserRole = 'admin' | 'manager' | 'user';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  currency: string;
  role: UserRole;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  full_name: string;
  currency?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  password_hash?: string;
  full_name?: string;
  currency?: string;
  role?: UserRole;
}

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  const result = await query('SELECT * FROM users ORDER BY created_at DESC');
  return result.rows;
};

// Get user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

// Get user by email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

// Create a new user
export const createUser = async (input: CreateUserInput): Promise<User> => {
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, currency, role) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [
      input.email,
      input.password_hash,
      input.full_name,
      input.currency || 'USD',
      input.role || 'user',
    ]
  );
  return result.rows[0];
};

// Update a user
export const updateUser = async (
  id: string,
  input: UpdateUserInput
): Promise<User | null> => {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (input.email !== undefined) {
    updates.push(`email = $${paramCount++}`);
    values.push(input.email);
  }
  if (input.password_hash !== undefined) {
    updates.push(`password_hash = $${paramCount++}`);
    values.push(input.password_hash);
  }
  if (input.full_name !== undefined) {
    updates.push(`full_name = $${paramCount++}`);
    values.push(input.full_name);
  }
  if (input.currency !== undefined) {
    updates.push(`currency = $${paramCount++}`);
    values.push(input.currency);
  }
  if (input.role !== undefined) {
    updates.push(`role = $${paramCount++}`);
    values.push(input.role);
  }

  if (updates.length === 0) {
    return getUserById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE users 
     SET ${updates.join(', ')} 
     WHERE id = $${paramCount} 
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

// Delete a user
export const deleteUser = async (id: string): Promise<boolean> => {
  const result = await query('DELETE FROM users WHERE id = $1', [id]);
  return result.rowCount !== null && result.rowCount > 0;
};

