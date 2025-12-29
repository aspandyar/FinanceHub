import type { Request, Response, NextFunction } from 'express';
import { ItemModel } from '../models/itemProxy.js';

// Create an item
export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const item = await ItemModel.createItem({ name: name.trim() });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// Read all items
export const getItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const items = await ItemModel.getAllItems();
    res.json(items);
  } catch (error) {
    next(error);
  }
};

// Read single item
export const getItemById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id ?? '0', 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = await ItemModel.getItemById(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
};

// Update an item
export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id ?? '0', 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const { name } = req.body;

    const item = await ItemModel.updateItem(id, { name });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
};

// Delete an item
export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id ?? '0', 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const deleted = await ItemModel.deleteItem(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
