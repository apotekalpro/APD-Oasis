-- Migration: Add Short Code Support for Outlet Mapping
-- Execute this in Supabase SQL Editor AFTER initial schema is created

-- Step 1: Add outlet_code_short column to outlets table
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS outlet_code_short VARCHAR(50);

-- Step 2: Add outlet_code_short column to parcels table
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS outlet_code_short VARCHAR(50);

-- Step 3: Add outlet_code_short column to transfer_details table
ALTER TABLE transfer_details ADD COLUMN IF NOT EXISTS outlet_code_short VARCHAR(50);

-- Step 4: Create indexes for short codes
CREATE INDEX IF NOT EXISTS idx_outlets_short_code ON outlets(outlet_code_short);
CREATE INDEX IF NOT EXISTS idx_parcels_short_code ON parcels(outlet_code_short);
CREATE INDEX IF NOT EXISTS idx_transfer_details_short_code ON transfer_details(outlet_code_short);

-- Step 5: Update existing outlets with short codes (if any data exists)
-- This assumes outlet_code_short is extracted from outlet names or set manually
-- You may need to run a custom update script based on your data

-- Step 6: Update users table to use short codes for outlet users
-- No changes needed - users.outlet_code remains numeric, username is short code

COMMENT ON COLUMN outlets.outlet_code IS 'Numeric outlet code from Excel Column E (e.g., 0001, 0002)';
COMMENT ON COLUMN outlets.outlet_code_short IS 'Short outlet code from Excel Column B (e.g., JKJSTT1, JKJSVR1) - used for display';
COMMENT ON COLUMN parcels.outlet_code IS 'Numeric outlet code for data integrity';
COMMENT ON COLUMN parcels.outlet_code_short IS 'Short outlet code for display to users';
COMMENT ON COLUMN transfer_details.outlet_code IS 'Numeric outlet code for data integrity';
COMMENT ON COLUMN transfer_details.outlet_code_short IS 'Short outlet code for display to users';
