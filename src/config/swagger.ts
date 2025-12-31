import swaggerJsdoc from 'swagger-jsdoc';
import config from './config.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Hub API',
      version: '1.0.0',
      description: 'API documentation for Finance Hub - A personal finance management system',
      contact: {
        name: 'Finance Hub API Support',
      },
    },
    servers: [
      {
        url: config.apiUrl.dev,
        description: 'Development server',
      },
      {
        url: config.apiUrl.prod,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            full_name: {
              type: 'string',
              description: 'User full name',
              maxLength: 100,
            },
            currency: {
              type: 'string',
              description: 'User preferred currency',
              default: 'USD',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
              default: 'user',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
          required: ['id', 'email', 'full_name', 'currency', 'role'],
        },
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Category unique identifier',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User who owns this category',
            },
            name: {
              type: 'string',
              description: 'Category name',
              maxLength: 100,
            },
            type: {
              type: 'string',
              enum: ['income', 'expense'],
              description: 'Category type',
            },
            color: {
              type: 'string',
              description: 'Category color code',
              maxLength: 7,
            },
            icon: {
              type: 'string',
              description: 'Category icon identifier',
              maxLength: 50,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'user_id', 'name', 'type'],
        },
        Transaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Transaction unique identifier',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User who owns this transaction',
            },
            category_id: {
              type: 'string',
              format: 'uuid',
              description: 'Category this transaction belongs to',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Transaction amount',
              minimum: 0.01,
              maximum: 9999999999.99,
            },
            type: {
              type: 'string',
              enum: ['income', 'expense'],
              description: 'Transaction type',
            },
            description: {
              type: 'string',
              description: 'Transaction description',
              nullable: true,
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Transaction date (YYYY-MM-DD)',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'user_id', 'category_id', 'amount', 'type', 'date'],
        },
        Budget: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Budget unique identifier',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User who owns this budget',
            },
            category_id: {
              type: 'string',
              format: 'uuid',
              description: 'Category this budget is for',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Budget amount',
              minimum: 0.01,
            },
            month: {
              type: 'string',
              format: 'date',
              description: 'Budget month (YYYY-MM-DD)',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'user_id', 'category_id', 'amount', 'month'],
        },
        RecurringTransaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Recurring transaction unique identifier',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User who owns this recurring transaction',
            },
            category_id: {
              type: 'string',
              format: 'uuid',
              description: 'Category this recurring transaction belongs to',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Transaction amount',
              minimum: 0.01,
            },
            type: {
              type: 'string',
              enum: ['income', 'expense'],
              description: 'Transaction type',
            },
            description: {
              type: 'string',
              description: 'Transaction description',
              nullable: true,
            },
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly'],
              description: 'Recurrence frequency',
            },
            start_date: {
              type: 'string',
              format: 'date',
              description: 'Start date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              format: 'date',
              description: 'End date (YYYY-MM-DD), nullable',
              nullable: true,
            },
            next_due_date: {
              type: 'string',
              format: 'date',
              description: 'Next due date (YYYY-MM-DD)',
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the recurring transaction is active',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'user_id', 'category_id', 'amount', 'type', 'frequency', 'start_date', 'next_due_date', 'is_active'],
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Additional error details',
            },
          },
          required: ['error'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            token: {
              type: 'string',
              description: 'JWT authentication token',
            },
          },
          required: ['user', 'token'],
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Categories',
        description: 'Category management endpoints',
      },
      {
        name: 'Transactions',
        description: 'Transaction management endpoints',
      },
      {
        name: 'Budgets',
        description: 'Budget management endpoints',
      },
      {
        name: 'Recurring Transactions',
        description: 'Recurring transaction management endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(options);

