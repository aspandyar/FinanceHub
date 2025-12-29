import { jest } from '@jest/globals';
import { ItemModel } from '../models/itemProxy.js';
import request from 'supertest';
import app from '../app.js';
import * as itemController from '../controllers/itemController.js';
import type { Request, Response, NextFunction } from 'express';

describe('Item Controller', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/items', () => {
    it('should return a list of items', async () => {
      const mockItems = [{ id: 1, name: 'Item 1' }];

      jest.spyOn(ItemModel, 'getAllItems').mockResolvedValue(mockItems);

      const response = await request(app).get('/api/items');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockItems);
    });

    it('should return empty array when no items exist', async () => {
      jest.spyOn(ItemModel, 'getAllItems').mockResolvedValue([]);

      const response = await request(app).get('/api/items');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(ItemModel, 'getAllItems').mockRejectedValue(error);

      const response = await request(app).get('/api/items');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/items/:id', () => {
    it('should return a single item by id', async () => {
      const mockItem = { id: 1, name: 'Item 1' };

      jest.spyOn(ItemModel, 'getItemById').mockResolvedValue(mockItem);

      const response = await request(app).get('/api/items/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockItem);
    });

    it('should return 404 when item not found', async () => {
      jest.spyOn(ItemModel, 'getItemById').mockResolvedValue(null);

      const response = await request(app).get('/api/items/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Item not found' });
    });

    it('should return 400 for invalid item ID', async () => {
      const response = await request(app).get('/api/items/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid item ID' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(ItemModel, 'getItemById').mockRejectedValue(error);

      const response = await request(app).get('/api/items/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItem = { id: 1, name: 'New Item' };
      const requestBody = { name: 'New Item' };

      jest.spyOn(ItemModel, 'createItem').mockResolvedValue(newItem);

      const response = await request(app)
        .post('/api/items')
        .send(requestBody);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newItem);
      expect(ItemModel.createItem).toHaveBeenCalledWith({ name: 'New Item' });
    });

    it('should trim whitespace from item name', async () => {
      const newItem = { id: 1, name: 'Trimmed Item' };
      const requestBody = { name: '  Trimmed Item  ' };

      jest.spyOn(ItemModel, 'createItem').mockResolvedValue(newItem);

      const response = await request(app)
        .post('/api/items')
        .send(requestBody);

      expect(response.status).toBe(201);
      expect(ItemModel.createItem).toHaveBeenCalledWith({ name: 'Trimmed Item' });
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Item name is required' });
    });

    it('should return 400 when name is empty string', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Item name is required' });
    });

    it('should return 400 when name is only whitespace', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Item name is required' });
    });

    it('should return 400 when name is not a string', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Item name is required' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(ItemModel, 'createItem').mockRejectedValue(error);

      const response = await request(app)
        .post('/api/items')
        .send({ name: 'New Item' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/items/:id', () => {
    it('should update an existing item', async () => {
      const updatedItem = { id: 1, name: 'Updated Item' };
      const requestBody = { name: 'Updated Item' };

      jest.spyOn(ItemModel, 'updateItem').mockResolvedValue(updatedItem);

      const response = await request(app)
        .put('/api/items/1')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedItem);
      expect(ItemModel.updateItem).toHaveBeenCalledWith(1, requestBody);
    });

    it('should return 404 when item not found', async () => {
      jest.spyOn(ItemModel, 'updateItem').mockResolvedValue(null);

      const response = await request(app)
        .put('/api/items/999')
        .send({ name: 'Updated Item' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Item not found' });
    });

    it('should return 400 for invalid item ID', async () => {
      const response = await request(app)
        .put('/api/items/invalid')
        .send({ name: 'Updated Item' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid item ID' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(ItemModel, 'updateItem').mockRejectedValue(error);

      const response = await request(app)
        .put('/api/items/1')
        .send({ name: 'Updated Item' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an existing item', async () => {
      jest.spyOn(ItemModel, 'deleteItem').mockResolvedValue(true);

      const response = await request(app).delete('/api/items/1');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should return 404 when item not found', async () => {
      jest.spyOn(ItemModel, 'deleteItem').mockResolvedValue(false);

      const response = await request(app).delete('/api/items/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Item not found' });
    });

    it('should return 400 for invalid item ID', async () => {
      const response = await request(app).delete('/api/items/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid item ID' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(ItemModel, 'deleteItem').mockRejectedValue(error);

      const response = await request(app).delete('/api/items/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Controller functions with undefined params.id', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let responseStatus: jest.Mock;
    let responseJson: jest.Mock;
    let responseSend: jest.Mock;

    beforeEach(() => {
      responseStatus = jest.fn().mockReturnThis();
      responseJson = jest.fn().mockReturnThis();
      responseSend = jest.fn().mockReturnThis();

      mockRequest = {
        params: {},
        body: {},
      };
      mockResponse = {
        status: responseStatus as any,
        json: responseJson as any,
        send: responseSend as any,
      };
      mockNext = jest.fn();
    });

    it('should handle undefined params.id in getItemById', async () => {
      jest.spyOn(ItemModel, 'getItemById').mockResolvedValue(null);

      await itemController.getItemById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(ItemModel.getItemById).toHaveBeenCalledWith(0);
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Item not found' });
    });

    it('should handle undefined params.id in updateItem', async () => {
      jest.spyOn(ItemModel, 'updateItem').mockResolvedValue(null);

      await itemController.updateItem(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(ItemModel.updateItem).toHaveBeenCalledWith(0, { name: undefined });
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Item not found' });
    });

    it('should handle undefined params.id in deleteItem', async () => {
      jest.spyOn(ItemModel, 'deleteItem').mockResolvedValue(false);

      await itemController.deleteItem(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(ItemModel.deleteItem).toHaveBeenCalledWith(0);
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Item not found' });
    });
  });
});
