-- Migration: Add box_count and container_count to parcels table
-- Date: 2025-11-25
-- Purpose: Support A code container tracking per outlet

-- Add new columns to parcels table
ALTER TABLE parcels 
ADD COLUMN IF NOT EXISTS box_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS container_count INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN parcels.box_count IS 'Number of boxes for this pallet (physical boxes)';
COMMENT ON COLUMN parcels.container_count IS 'Number of A code containers linked to this outlet delivery';

-- Update existing records to have 0 containers (backfill)
UPDATE parcels 
SET box_count = 0, container_count = 0 
WHERE box_count IS NULL OR container_count IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_parcels_container_count ON parcels(container_count);

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'parcels' 
AND column_name IN ('box_count', 'container_count');
