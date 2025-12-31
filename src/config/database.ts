import { PrismaClient } from '@prisma/client';
import config from './config.js';

// Create a Prisma Client instance
const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: config.db.url,
    },
  },
});

// Default categories to create for each new user
const defaultUserCategories = [
  // Income categories
  { name: 'Salary', type: 'income' as const, color: '#10B981', icon: 'briefcase' },
  { name: 'Freelance', type: 'income' as const, color: '#3B82F6', icon: 'code' },
  { name: 'Investments', type: 'income' as const, color: '#8B5CF6', icon: 'trending-up' },
  { name: 'Gifts', type: 'income' as const, color: '#EC4899', icon: 'gift' },
  { name: 'Other Income', type: 'income' as const, color: '#6B7280', icon: 'dollar-sign' },
  // Expense categories
  { name: 'Food', type: 'expense' as const, color: '#F59E0B', icon: 'utensils' },
  { name: 'Transport', type: 'expense' as const, color: '#EF4444', icon: 'car' },
  { name: 'Housing', type: 'expense' as const, color: '#6366F1', icon: 'home' },
  { name: 'Utilities', type: 'expense' as const, color: '#14B8A6', icon: 'zap' },
  { name: 'Entertainment', type: 'expense' as const, color: '#A855F7', icon: 'film' },
  { name: 'Shopping', type: 'expense' as const, color: '#F97316', icon: 'shopping-bag' },
  { name: 'Health', type: 'expense' as const, color: '#EC4899', icon: 'heart' },
  { name: 'Education', type: 'expense' as const, color: '#06B6D4', icon: 'book' },
  { name: 'Other Expense', type: 'expense' as const, color: '#6B7280', icon: 'more-horizontal' },
];

// Prisma middleware to automatically create default categories when a user is created
prisma.$use(async (params: any, next: any) => {
  const result = await next(params);

  // After a user is created, automatically create default categories for them
  if (params.model === 'User' && params.action === 'create') {
    const userId = result.id;

    try {
      await Promise.all(
        defaultUserCategories.map((cat) =>
          prisma.category.create({
            data: {
              ...cat,
              userId,
              isSystem: false, // User-specific categories, not system categories
            },
          })
        )
      );
      console.log(`✓ Created default categories for user: ${userId}`);
    } catch (error) {
      // Log error but don't fail user creation if category creation fails
      console.error(`Error creating default categories for user ${userId}:`, error);
    }
  }

  return result;
});

// Test the connection
prisma.$connect()
  .then(() => {
    console.log('Connected to PostgreSQL database via Prisma');
  })
  .catch((err: Error) => {
    console.error('Failed to connect to database', err);
    process.exit(-1);
  });

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('Database connection closed');
});

export default prisma;
