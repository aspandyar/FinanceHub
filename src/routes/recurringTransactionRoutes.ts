import { Router } from 'express';
import {
  createRecurringTransaction,
  getRecurringTransactions,
  getRecurringTransactionById,
  getRecurringTransactionsByUserId,
  getDueRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from '../controllers/recurringTransactionController.js';

const router = Router();

// Get all recurring transactions (with optional query params: user_id, is_active)
router.get('/', getRecurringTransactions);

// Get due recurring transactions (with optional query param: date)
router.get('/due', getDueRecurringTransactions);

// Get recurring transactions by user ID
router.get('/user/:user_id', getRecurringTransactionsByUserId);

// Get recurring transaction by ID
router.get('/:id', getRecurringTransactionById);

// Create a new recurring transaction
router.post('/', createRecurringTransaction);

// Update a recurring transaction
router.put('/:id', updateRecurringTransaction);

// Delete a recurring transaction
router.delete('/:id', deleteRecurringTransaction);

export default router;

