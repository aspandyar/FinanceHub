import { jest } from '@jest/globals';

// Mock database module before importing item model
const mockQuery: any = jest.fn();

jest.unstable_mockModule('../config/database.js', () => ({
  query: mockQuery,
}));

describe('Item Model', () => {
  let ItemModel: any;

  beforeAll(async () => {
    // Import after mocks are set up
    ItemModel = await import('../models/item.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllItems', () => {
    it('should return all items', async () => {
      const mockItems = [
        { id: 1, name: 'Item 1', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'Item 2', created_at: new Date(), updated_at: new Date() },
      ];

      mockQuery.mockResolvedValue({
        rows: mockItems,
        rowCount: 2,
      });

      const result = await ItemModel.getAllItems();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM items ORDER BY created_at DESC'
      );
      expect(result).toEqual(mockItems);
    });

    it('should return empty array when no items exist', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await ItemModel.getAllItems();

      expect(result).toEqual([]);
    });
  });

  describe('getItemById', () => {
    it('should return an item by id', async () => {
      const mockItem = {
        id: 1,
        name: 'Item 1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({
        rows: [mockItem],
        rowCount: 1,
      });

      const result = await ItemModel.getItemById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM items WHERE id = $1',
        [1]
      );
      expect(result).toEqual(mockItem);
    });

    it('should return null when item not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await ItemModel.getItemById(999);

      expect(result).toBeNull();
    });
  });

  describe('createItem', () => {
    it('should create a new item', async () => {
      const newItem = {
        id: 1,
        name: 'New Item',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({
        rows: [newItem],
        rowCount: 1,
      });

      const result = await ItemModel.createItem({ name: 'New Item' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO items'),
        ['New Item']
      );
      expect(result).toEqual(newItem);
    });
  });

  describe('updateItem', () => {
    it('should update an item when name is provided', async () => {
      const updatedItem = {
        id: 1,
        name: 'Updated Item',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({
        rows: [updatedItem],
        rowCount: 1,
      });

      const result = await ItemModel.updateItem(1, { name: 'Updated Item' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE items'),
        ['Updated Item', 1]
      );
      expect(result).toEqual(updatedItem);
    });

    it('should return null when update affects no rows', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await ItemModel.updateItem(999, { name: 'Updated Item' });

      expect(result).toBeNull();
    });

    it('should return item by id when name is undefined', async () => {
      const existingItem = {
        id: 1,
        name: 'Existing Item',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // When name is undefined, updateItem calls getItemById internally
      // which uses query, so we mock query to return the item
      mockQuery.mockResolvedValue({
        rows: [existingItem],
        rowCount: 1,
      });

      const result = await ItemModel.updateItem(1, {});

      // Verify query was called with the SELECT statement from getItemById
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM items WHERE id = $1',
        [1]
      );
      expect(result).toEqual(existingItem);
    });
  });

  describe('deleteItem', () => {
    it('should delete an item and return true', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      const result = await ItemModel.deleteItem(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM items WHERE id = $1',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should return false when item not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await ItemModel.deleteItem(999);

      expect(result).toBe(false);
    });

    it('should return false when rowCount is null', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: null,
      });

      const result = await ItemModel.deleteItem(1);

      expect(result).toBe(false);
    });
  });
});
