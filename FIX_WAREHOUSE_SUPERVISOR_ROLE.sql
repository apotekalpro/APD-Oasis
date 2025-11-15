-- ============================================================
-- CRITICAL FIX: Allow warehouse_supervisor, warehouse_staff, and delivery_staff roles
-- Execute this in Supabase SQL Editor immediately
-- ============================================================

-- This fixes the database constraint to allow all the roles used by the application

-- Step 1: Drop existing role constraint (if exists)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new constraint with ALL roles (standardized names)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN (
    'admin',
    'warehouse_supervisor',
    'warehouse_staff',
    'warehouse',           -- Legacy support
    'delivery_staff',
    'driver',              -- Legacy support
    'outlet'
));

-- Step 3: Add comment for clarity
COMMENT ON COLUMN users.role IS 'User role: admin, warehouse_supervisor, warehouse_staff, delivery_staff (driver), outlet. Legacy: warehouse, driver';

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check the constraint is updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'users_role_check';

-- Try to see existing roles in use
SELECT DISTINCT role, COUNT(*) as user_count
FROM users 
GROUP BY role 
ORDER BY role;

-- ============================================================
-- TEST: Try creating a warehouse_supervisor user
-- ============================================================

/*
-- Uncomment to test:
INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES ('test_supervisor', 'test123', 'Test Supervisor', 'warehouse_supervisor', true)
ON CONFLICT (username) DO NOTHING;

-- Verify it worked:
SELECT username, full_name, role FROM users WHERE username = 'test_supervisor';

-- Clean up test user:
DELETE FROM users WHERE username = 'test_supervisor';
*/

-- ============================================================
-- WHAT THIS FIX DOES
-- ============================================================

/*
PROBLEM:
- Database had role CHECK constraint: ('admin', 'warehouse', 'driver', 'outlet')
- Application uses: 'warehouse_supervisor', 'warehouse_staff', 'delivery_staff'
- Creating warehouse_supervisor → FAILED with constraint violation

SOLUTION:
- Updated constraint to include ALL roles
- Includes both new standardized names AND legacy names
- Backward compatible with existing data

AFTER THIS FIX:
✅ Can create admin users
✅ Can create warehouse_supervisor users
✅ Can create warehouse_staff users  
✅ Can create delivery_staff users
✅ Can create outlet users
✅ Legacy 'warehouse' and 'driver' still work
*/
