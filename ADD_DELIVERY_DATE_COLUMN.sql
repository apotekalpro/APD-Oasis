-- Migration: Add delivery_date column for multi-day dashboard support
-- This allows imports to be scheduled for future delivery dates
-- and enables filtering by delivery date in dashboard and warehouse

-- Add delivery_date to imports table
ALTER TABLE imports 
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Add delivery_date to parcels table
ALTER TABLE parcels 
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Add delivery_date to transfer_details table
ALTER TABLE transfer_details 
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Add indexes for faster queries by delivery date
CREATE INDEX IF NOT EXISTS idx_parcels_delivery_date ON parcels(delivery_date);
CREATE INDEX IF NOT EXISTS idx_transfer_details_delivery_date ON transfer_details(delivery_date);
CREATE INDEX IF NOT EXISTS idx_imports_delivery_date ON imports(delivery_date);

-- Set default delivery_date to import_date for existing records
UPDATE imports 
SET delivery_date = import_date 
WHERE delivery_date IS NULL;

UPDATE parcels 
SET delivery_date = (SELECT import_date FROM imports WHERE imports.id = parcels.import_id)
WHERE delivery_date IS NULL;

UPDATE transfer_details 
SET delivery_date = (SELECT import_date FROM imports i JOIN parcels p ON p.id = transfer_details.parcel_id WHERE i.id = p.import_id)
WHERE delivery_date IS NULL;

-- Verify the columns were added and populated
SELECT 
    'imports' as table_name,
    COUNT(*) as total_rows,
    COUNT(delivery_date) as with_delivery_date
FROM imports
UNION ALL
SELECT 
    'parcels' as table_name,
    COUNT(*) as total_rows,
    COUNT(delivery_date) as with_delivery_date
FROM parcels
UNION ALL
SELECT 
    'transfer_details' as table_name,
    COUNT(*) as total_rows,
    COUNT(delivery_date) as with_delivery_date
FROM transfer_details;
