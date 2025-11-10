-- Add admin_grant to credit_transaction_type enum
ALTER TYPE credit_transaction_type ADD VALUE IF NOT EXISTS 'admin_grant';

-- Add grantedByUserId column to credit_transactions for audit trail
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS granted_by_user_id VARCHAR REFERENCES users(id);

-- Set your account to superadmin (replace with your actual user ID after checking)
-- Run this query to find your user ID first:
-- SELECT id, email, role FROM users WHERE email = 'your@email.com';

-- Example: UPDATE users SET role = 'superadmin' WHERE id = '43575331';
