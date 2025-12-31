-- Drop indexes
DROP INDEX IF EXISTS idx_recurring_transactions_user_active;
DROP INDEX IF EXISTS idx_recurring_transactions_user_next;

-- Drop recurring_transactions table
DROP TABLE IF EXISTS recurring_transactions;

-- Drop frequency type enum
DROP TYPE IF EXISTS frequency_type;

