import { Router } from 'express';
import {
  createRecurringTransaction,
  getRecurringTransactions,
  getRecurringTransactionById,
  getRecurringTransactionsByUserId,
  getDueRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  generateTransactions,
  getEffectiveTransactionsForUser,
} from '../controllers/recurringTransactionController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All recurring transaction routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/recurring-transactions:
 *   get:
 *     summary: Get all recurring transactions
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of recurring transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecurringTransaction'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getRecurringTransactions);

/**
 * @swagger
 * /api/recurring-transactions/due:
 *   get:
 *     summary: Get due recurring transactions
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check for due transactions (YYYY-MM-DD). Defaults to today.
 *     responses:
 *       200:
 *         description: List of due recurring transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecurringTransaction'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/due', getDueRecurringTransactions);

/**
 * @swagger
 * /api/recurring-transactions/user/{user_id}:
 *   get:
 *     summary: Get recurring transactions by user ID
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of recurring transactions for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecurringTransaction'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user/:userId', getRecurringTransactionsByUserId);

/**
 * @swagger
 * /api/recurring-transactions/{id}:
 *   get:
 *     summary: Get recurring transaction by ID
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Recurring transaction ID
 *     responses:
 *       200:
 *         description: Recurring transaction details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecurringTransaction'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Recurring transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getRecurringTransactionById);

/**
 * @swagger
 * /api/recurring-transactions:
 *   post:
 *     summary: Create a new recurring transaction
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - amount
 *               - type
 *               - frequency
 *               - start_date
 *             properties:
 *               category_id:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 example: 100.50
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: expense
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Monthly subscription
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *                 example: monthly
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-01
 *               end_date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: 2024-12-31
 *     responses:
 *       201:
 *         description: Recurring transaction successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecurringTransaction'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createRecurringTransaction);

/**
 * @swagger
 * /api/recurring-transactions/{id}:
 *   put:
 *     summary: Update recurring transaction by ID
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Recurring transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category_id:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 example: 100.50
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: expense
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Monthly subscription
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *                 example: monthly
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-01
 *               end_date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: 2024-12-31
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               scope:
 *                 type: string
 *                 enum: [single, future, all]
 *                 description: |
 *                   Edit scope:
 *                   - 'single': Edit only the occurrence on effectiveDate (creates override transaction)
 *                   - 'future': Edit this occurrence and all future ones (splits series)
 *                   - 'all': Edit entire series (default if not provided, for backward compatibility)
 *                 example: future
 *               effective_date:
 *                 type: string
 *                 format: date
 *                 description: Date from which the edit applies (required if scope is provided)
 *                 example: 2024-06-01
 *     responses:
 *       200:
 *         description: Recurring transaction successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/RecurringTransaction'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     original:
 *                       $ref: '#/components/schemas/RecurringTransaction'
 *                     new:
 *                       $ref: '#/components/schemas/RecurringTransaction'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Recurring transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateRecurringTransaction);

/**
 * @swagger
 * /api/recurring-transactions/{id}:
 *   delete:
 *     summary: Delete recurring transaction by ID
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Recurring transaction ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scope:
 *                 type: string
 *                 enum: [single, future, all]
 *                 description: |
 *                   Delete scope:
 *                   - 'single': Delete only the occurrence on effectiveDate
 *                   - 'future': Delete this occurrence and all future ones (ends series at previous day)
 *                   - 'all': Delete entire series (default if not provided, for backward compatibility)
 *                 example: future
 *               effective_date:
 *                 type: string
 *                 format: date
 *                 description: Date from which the delete applies (required if scope is provided)
 *                 example: 2024-06-01
 *     responses:
 *       204:
 *         description: Recurring transaction successfully deleted (for 'all' scope)
 *       200:
 *         description: Occurrence(s) deleted, recurring transaction still exists (for 'single' or 'future' scope)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 recurringTransaction:
 *                   $ref: '#/components/schemas/RecurringTransaction'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Recurring transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteRecurringTransaction);

/**
 * @swagger
 * /api/recurring-transactions/generate:
 *   post:
 *     summary: Generate transactions from recurring transactions for a specific date
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Target date for generation (YYYY-MM-DD), defaults to today
 *     responses:
 *       200:
 *         description: Transaction generation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 date:
 *                   type: string
 *                   format: date
 *                 created:
 *                   type: number
 *                 skipped:
 *                   type: number
 *       401:
 *         description: Authentication required
 */
router.post('/generate', generateTransactions);

/**
 * @swagger
 * /api/recurring-transactions/effective:
 *   get:
 *     summary: Get effective transactions (real + recurring instances, respecting overrides)
 *     tags: [Recurring Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (admin/manager only)
 *     responses:
 *       200:
 *         description: List of effective transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Authentication required
 */
router.get('/effective', getEffectiveTransactionsForUser);

export default router;

