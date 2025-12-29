import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, type AppError } from '../middlewares/errorHandler.js';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let responseStatus: jest.Mock;
  let responseJson: jest.Mock;

  beforeEach(() => {
    responseStatus = jest.fn().mockReturnThis();
    responseJson = jest.fn().mockReturnThis();

    mockRequest = {};
    mockResponse = {
      status: responseStatus as any,
      json: responseJson as any,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle error with status code', () => {
    const error: AppError = new Error('Not Found') as AppError;
    error.status = 404;

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(responseStatus).toHaveBeenCalledWith(404);
    expect(responseJson).toHaveBeenCalledWith({
      message: 'Not Found',
    });
  });

  it('should handle error without status code (defaults to 500)', () => {
    const error = new Error('Internal Server Error');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(responseStatus).toHaveBeenCalledWith(500);
    expect(responseJson).toHaveBeenCalledWith({
      message: 'Internal Server Error',
    });
  });

  it('should handle error without message (defaults to Internal Server Error)', () => {
    const error = new Error() as AppError;
    error.status = 500;

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(responseStatus).toHaveBeenCalledWith(500);
    expect(responseJson).toHaveBeenCalledWith({
      message: 'Internal Server Error',
    });
  });

  it('should handle error with both status and message', () => {
    const error: AppError = new Error('Bad Request') as AppError;
    error.status = 400;

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(responseStatus).toHaveBeenCalledWith(400);
    expect(responseJson).toHaveBeenCalledWith({
      message: 'Bad Request',
    });
  });
});

