import { query } from '../config/database.js';

export interface Item {
  id: number;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateItemInput {
  name: string;
}

export interface UpdateItemInput {
  name?: string;
}

// Get all items
export const getAllItems = async (): Promise<Item[]> => {
  const result = await query('SELECT * FROM items ORDER BY created_at DESC');
  return result.rows;
};

// Get item by ID
export const getItemById = async (id: number): Promise<Item | null> => {
  const result = await query('SELECT * FROM items WHERE id = $1', [id]);
  return result.rows[0] || null;
};

// Create a new item
export const createItem = async (input: CreateItemInput): Promise<Item> => {
  const result = await query(
    `INSERT INTO items (name) 
     VALUES ($1) 
     RETURNING *`,
    [input.name]
  );
  return result.rows[0];
};

// Update an item
export const updateItem = async (
  id: number,
  input: UpdateItemInput
): Promise<Item | null> => {
  if (input.name === undefined) {
    return getItemById(id);
  }

  const result = await query(
    `UPDATE items 
     SET name = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 
     RETURNING *`,
    [input.name, id]
  );

  return result.rows[0] || null;
};

// Delete an item
export const deleteItem = async (id: number): Promise<boolean> => {
  const result = await query('DELETE FROM items WHERE id = $1', [id]);
  return result.rowCount !== null && result.rowCount > 0;
};
