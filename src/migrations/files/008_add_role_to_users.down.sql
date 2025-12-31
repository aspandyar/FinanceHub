-- Drop index
DROP INDEX IF EXISTS idx_users_role;

-- Drop check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_role_valid;

-- Drop role column
ALTER TABLE users DROP COLUMN IF EXISTS role;

