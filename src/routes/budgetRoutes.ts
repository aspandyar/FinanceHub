import { Router } from 'express';
import {
  createBudget,
  getBudgets,
  getBudgetById,
  getBudgetsByUserId,
  getBudgetsByUserIdAndMonth,
  updateBudget,
  deleteBudget,
} from '../controllers/budgetController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All budget routes require authentication
router.use(authenticate);

// Get all budgets (with optional query params: user_id, category_id, month)
router.get('/', getBudgets);

// Get budgets by user ID and month
router.get('/user/:user_id/month/:month', getBudgetsByUserIdAndMonth);

// Get budgets by user ID
router.get('/user/:user_id', getBudgetsByUserId);

// Get budget by ID
router.get('/:id', getBudgetById);

// Create a new budget
router.post('/', createBudget);

// Update a budget
router.put('/:id', updateBudget);

// Delete a budget
router.delete('/:id', deleteBudget);

export default router;

