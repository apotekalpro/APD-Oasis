-- SIMPLE VERSION: Add missing columns to container_inventory table
-- Run this in Supabase SQL Editor if the full version has permission issues

-- Add all missing columns
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'at_outlet',
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS scanned_by UUID,
ADD COLUMN IF NOT EXISTS scanned_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_by UUID,
ADD COLUMN IF NOT EXISTS delivered_by_name VARCHAR(255);

-- Add basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_container_inventory_outlet ON container_inventory(outlet_code);
CREATE INDEX IF NOT EXISTS idx_container_inventory_status ON container_inventory(status);

-- Update existing rows
UPDATE container_inventory 
SET 
  status = 'at_outlet',
  scanned_at = NOW(),
  delivery_date = CURRENT_DATE
WHERE status IS NULL;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'container_inventory'
ORDER BY ordinal_position;
