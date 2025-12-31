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
router.get('/user/:user_id', getRecurringTransactionsByUserId);

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
 *     responses:
 *       200:
 *         description: Recurring transaction successfully updated
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
 *     responses:
 *       200:
 *         description: Recurring transaction successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Recurring transaction deleted successfully
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

export default router;

