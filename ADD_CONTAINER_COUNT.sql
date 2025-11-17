-- Add container count feature to APD OASIS
-- Execute this migration in Supabase SQL Editor

-- Add container_count columns to parcels table
ALTER TABLE parcels 
ADD COLUMN IF NOT EXISTS container_count_loaded INTEGER,
ADD COLUMN IF NOT EXISTS container_count_delivered INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN parcels.container_count_loaded IS 'Number of containers when loaded at warehouse';
COMMENT ON COLUMN parcels.container_count_delivered IS 'Number of containers when delivered to outlet';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_parcels_container_counts ON parcels(container_count_loaded, container_count_delivered);

-- Add audit log for this migration
INSERT INTO audit_logs (user_name, action, entity_type, details)
VALUES (
    'SYSTEM',
    'DATABASE_MIGRATION',
    'parcels',
    '{"migration": "ADD_CONTAINER_COUNT", "description": "Added container count tracking for loaded and delivered parcels"}'::jsonb
);
