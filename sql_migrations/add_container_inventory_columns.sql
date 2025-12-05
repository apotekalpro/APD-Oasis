-- Add missing columns to container_inventory table for A-code tracking
-- Run this in Supabase SQL Editor

-- Add delivery_date column (when container was loaded at warehouse)
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Add status column (tracks container lifecycle: at_outlet, delivered, etc.)
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'at_outlet';

-- Add scanned_at timestamp (when A-code was scanned at warehouse)
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT NOW();

-- Add scanned_by user ID (who scanned the A-code)
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS scanned_by UUID;

-- Add scanned_by_name for easy reference
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS scanned_by_name VARCHAR(255);

-- Add delivered_at timestamp (when container was received at outlet)
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add delivered_by user ID (who received the container at outlet)
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS delivered_by UUID;

-- Add delivered_by_name for easy reference
ALTER TABLE container_inventory 
ADD COLUMN IF NOT EXISTS delivered_by_name VARCHAR(255);

-- Add foreign key to users table for scanned_by
ALTER TABLE container_inventory 
ADD CONSTRAINT fk_container_scanned_by 
FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key to users table for delivered_by
ALTER TABLE container_inventory 
ADD CONSTRAINT fk_container_delivered_by 
FOREIGN KEY (delivered_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index on outlet_code for faster queries
CREATE INDEX IF NOT EXISTS idx_container_inventory_outlet 
ON container_inventory(outlet_code);

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_container_inventory_status 
ON container_inventory(status);

-- Add index on delivery_date for date filtering
CREATE INDEX IF NOT EXISTS idx_container_inventory_delivery_date 
ON container_inventory(delivery_date);

-- Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_container_inventory_outlet_status 
ON container_inventory(outlet_code, status);

-- Update existing rows to have default values
UPDATE container_inventory 
SET 
  status = 'at_outlet',
  scanned_at = NOW(),
  delivery_date = CURRENT_DATE
WHERE status IS NULL;

-- Show the updated table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'container_inventory'
ORDER BY ordinal_position;
