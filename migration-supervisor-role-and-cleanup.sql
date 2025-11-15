-- Migration: Add Warehouse Supervisor Role and Auto-Cleanup System
-- Execute this in Supabase SQL Editor AFTER existing schema

-- ============================================================
-- PART 1: Add Warehouse Supervisor Role
-- ============================================================

-- Step 1: Drop existing role constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new constraint with warehouse_supervisor role
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'warehouse_supervisor', 'warehouse', 'driver', 'outlet'));

-- Step 3: Add Supabase Auth ID column (for future Supabase Auth integration)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Step 4: Add index for faster auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Step 5: Add comments for clarity
COMMENT ON COLUMN users.role IS 'User role: admin (full access), warehouse_supervisor (can delete), warehouse (cannot delete), driver, outlet';
COMMENT ON COLUMN users.auth_id IS 'Link to Supabase auth.users for authentication';

-- ============================================================
-- PART 2: Create Warehouse Supervisor Accounts
-- ============================================================

-- Insert default warehouse supervisor (password: supervisor123)
INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES ('supervisor', 'supervisor123', 'Warehouse Supervisor', 'warehouse_supervisor', true)
ON CONFLICT (username) DO NOTHING;

-- Update existing warehouse user to ensure they cannot delete
-- (No changes needed - just documenting that warehouse role now has restricted permissions)

-- ============================================================
-- PART 3: Auto-Cleanup System (Delete Records > 3 Months)
-- ============================================================

-- Step 1: Create function to delete old records
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS TABLE(
    deleted_transfers INTEGER,
    deleted_parcels INTEGER,
    deleted_errors INTEGER,
    deleted_imports INTEGER,
    deleted_audit_logs INTEGER
) AS $$
DECLARE
    v_deleted_transfers INTEGER;
    v_deleted_parcels INTEGER;
    v_deleted_errors INTEGER;
    v_deleted_imports INTEGER;
    v_deleted_audit_logs INTEGER;
BEGIN
    -- Delete old transfer_details (older than 3 months)
    DELETE FROM transfer_details
    WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_transfers = ROW_COUNT;
    
    -- Delete old parcels (older than 3 months)
    DELETE FROM parcels
    WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_parcels = ROW_COUNT;
    
    -- Delete old error_parcels (older than 3 months)
    DELETE FROM error_parcels
    WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_errors = ROW_COUNT;
    
    -- Delete old imports (older than 3 months)
    DELETE FROM imports
    WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_imports = ROW_COUNT;
    
    -- Delete old audit_logs (older than 3 months)
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_audit_logs = ROW_COUNT;
    
    -- Log cleanup action
    RAISE NOTICE 'Cleanup completed - Deleted: % transfers, % parcels, % errors, % imports, % audit logs',
        v_deleted_transfers, v_deleted_parcels, v_deleted_errors, v_deleted_imports, v_deleted_audit_logs;
    
    -- Return counts
    RETURN QUERY SELECT 
        v_deleted_transfers,
        v_deleted_parcels,
        v_deleted_errors,
        v_deleted_imports,
        v_deleted_audit_logs;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Add comment to function
COMMENT ON FUNCTION cleanup_old_records() IS 'Automatically deletes logistics records older than 3 months to prevent database overload';

-- Step 3: Create view to check records age distribution
CREATE OR REPLACE VIEW records_age_summary AS
SELECT 
    'transfer_details' AS table_name,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month') AS last_month,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '3 months' AND created_at < NOW() - INTERVAL '1 month') AS last_3_months,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '3 months') AS older_than_3_months,
    COUNT(*) AS total
FROM transfer_details
UNION ALL
SELECT 
    'parcels',
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month'),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '3 months' AND created_at < NOW() - INTERVAL '1 month'),
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '3 months'),
    COUNT(*)
FROM parcels
UNION ALL
SELECT 
    'error_parcels',
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month'),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '3 months' AND created_at < NOW() - INTERVAL '1 month'),
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '3 months'),
    COUNT(*)
FROM error_parcels
UNION ALL
SELECT 
    'imports',
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month'),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '3 months' AND created_at < NOW() - INTERVAL '1 month'),
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '3 months'),
    COUNT(*)
FROM imports
UNION ALL
SELECT 
    'audit_logs',
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month'),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '3 months' AND created_at < NOW() - INTERVAL '1 month'),
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '3 months'),
    COUNT(*)
FROM audit_logs;

-- Step 4: Create function to check what will be deleted (dry run)
CREATE OR REPLACE FUNCTION preview_cleanup_old_records()
RETURNS TABLE(
    table_name TEXT,
    records_to_delete BIGINT,
    oldest_record TIMESTAMP WITH TIME ZONE,
    newest_record TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'transfer_details'::TEXT,
        COUNT(*)::BIGINT,
        MIN(created_at),
        MAX(created_at)
    FROM transfer_details
    WHERE created_at < NOW() - INTERVAL '3 months'
    UNION ALL
    SELECT 
        'parcels'::TEXT,
        COUNT(*)::BIGINT,
        MIN(created_at),
        MAX(created_at)
    FROM parcels
    WHERE created_at < NOW() - INTERVAL '3 months'
    UNION ALL
    SELECT 
        'error_parcels'::TEXT,
        COUNT(*)::BIGINT,
        MIN(created_at),
        MAX(created_at)
    FROM error_parcels
    WHERE created_at < NOW() - INTERVAL '3 months'
    UNION ALL
    SELECT 
        'imports'::TEXT,
        COUNT(*)::BIGINT,
        MIN(created_at),
        MAX(created_at)
    FROM imports
    WHERE created_at < NOW() - INTERVAL '3 months'
    UNION ALL
    SELECT 
        'audit_logs'::TEXT,
        COUNT(*)::BIGINT,
        MIN(created_at),
        MAX(created_at)
    FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 4: Schedule Automatic Cleanup (Requires pg_cron extension)
-- ============================================================

-- Note: pg_cron might not be available in all Supabase plans
-- If available, uncomment the following:

/*
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run daily at 2 AM
SELECT cron.schedule(
    'cleanup-old-logistics-records',  -- job name
    '0 2 * * *',                      -- cron expression: every day at 2 AM
    $$ SELECT cleanup_old_records(); $$
);

-- View scheduled jobs
SELECT * FROM cron.job;
*/

-- Alternative: Manual cleanup reminder
-- If pg_cron is not available, admin should manually run:
-- SELECT * FROM cleanup_old_records();
-- Recommended frequency: Weekly or monthly

-- ============================================================
-- PART 5: Create Cleanup Log Table (Optional but Recommended)
-- ============================================================

CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_transfers INTEGER,
    deleted_parcels INTEGER,
    deleted_errors INTEGER,
    deleted_imports INTEGER,
    deleted_audit_logs INTEGER,
    executed_by VARCHAR(255) DEFAULT 'system',
    notes TEXT
);

-- Create index on executed_at
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_executed_at ON cleanup_logs(executed_at);

-- Modified cleanup function that logs results
CREATE OR REPLACE FUNCTION cleanup_old_records_with_log()
RETURNS TABLE(
    deleted_transfers INTEGER,
    deleted_parcels INTEGER,
    deleted_errors INTEGER,
    deleted_imports INTEGER,
    deleted_audit_logs INTEGER
) AS $$
DECLARE
    v_deleted_transfers INTEGER;
    v_deleted_parcels INTEGER;
    v_deleted_errors INTEGER;
    v_deleted_imports INTEGER;
    v_deleted_audit_logs INTEGER;
BEGIN
    -- Delete old records
    DELETE FROM transfer_details WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_transfers = ROW_COUNT;
    
    DELETE FROM parcels WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_parcels = ROW_COUNT;
    
    DELETE FROM error_parcels WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_errors = ROW_COUNT;
    
    DELETE FROM imports WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_imports = ROW_COUNT;
    
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS v_deleted_audit_logs = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO cleanup_logs (
        deleted_transfers,
        deleted_parcels,
        deleted_errors,
        deleted_imports,
        deleted_audit_logs,
        notes
    ) VALUES (
        v_deleted_transfers,
        v_deleted_parcels,
        v_deleted_errors,
        v_deleted_imports,
        v_deleted_audit_logs,
        'Automatic cleanup of records older than 3 months'
    );
    
    RAISE NOTICE 'Cleanup logged - Deleted: % transfers, % parcels, % errors, % imports, % audit logs',
        v_deleted_transfers, v_deleted_parcels, v_deleted_errors, v_deleted_imports, v_deleted_audit_logs;
    
    RETURN QUERY SELECT 
        v_deleted_transfers,
        v_deleted_parcels,
        v_deleted_errors,
        v_deleted_imports,
        v_deleted_audit_logs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check new role exists
SELECT DISTINCT role FROM users ORDER BY role;

-- Check supervisor account created
SELECT username, full_name, role, is_active FROM users WHERE role = 'warehouse_supervisor';

-- Preview what would be deleted (dry run)
SELECT * FROM preview_cleanup_old_records();

-- View records age distribution
SELECT * FROM records_age_summary;

-- Check cleanup logs
SELECT * FROM cleanup_logs ORDER BY executed_at DESC LIMIT 10;

-- ============================================================
-- MANUAL CLEANUP EXECUTION
-- ============================================================

-- To manually run cleanup (returns deletion counts):
-- SELECT * FROM cleanup_old_records_with_log();

-- ============================================================
-- ROLLBACK COMMANDS (If needed)
-- ============================================================

/*
-- Remove supervisor role constraint
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'warehouse', 'driver', 'outlet'));

-- Remove auth_id column
ALTER TABLE users DROP COLUMN IF EXISTS auth_id;

-- Drop cleanup functions
DROP FUNCTION IF EXISTS cleanup_old_records();
DROP FUNCTION IF EXISTS cleanup_old_records_with_log();
DROP FUNCTION IF EXISTS preview_cleanup_old_records();
DROP VIEW IF EXISTS records_age_summary;
DROP TABLE IF EXISTS cleanup_logs;

-- Remove cron job (if created)
-- SELECT cron.unschedule('cleanup-old-logistics-records');
*/
