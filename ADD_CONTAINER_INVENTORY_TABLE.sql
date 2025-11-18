-- Container Inventory Table for Recyclable Containers
-- This migration adds support for tracking recyclable containers (Pallet IDs starting with 'A')
-- Execute this in Supabase SQL Editor

-- Create container_inventory table
CREATE TABLE IF NOT EXISTS container_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id VARCHAR(255) NOT NULL, -- Pallet ID starting with 'A' (e.g., A101123234)
    outlet_code VARCHAR(50) NOT NULL, -- Current outlet location
    outlet_name VARCHAR(255) NOT NULL, -- Outlet display name
    status VARCHAR(50) DEFAULT 'at_outlet' CHECK (status IN ('at_outlet', 'collected', 'in_transit')),
    
    -- Delivery tracking
    delivered_at TIMESTAMP WITH TIME ZONE, -- When container arrived at outlet
    delivered_by UUID REFERENCES users(id), -- Driver who delivered
    delivered_by_name VARCHAR(255), -- Driver name for reporting
    delivery_date DATE, -- Delivery date for filtering
    
    -- Collection tracking
    collected_at TIMESTAMP WITH TIME ZONE, -- When container was collected
    collected_by UUID REFERENCES users(id), -- Driver who collected
    collected_by_name VARCHAR(255), -- Collector name for reporting
    collection_signature VARCHAR(255), -- Signature of person confirming collection
    
    -- Original owner tracking (for cross-outlet validation)
    original_outlet_code VARCHAR(50), -- Outlet that originally received the container
    original_outlet_name VARCHAR(255), -- Original outlet display name
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one container can only be at one location at a time
    UNIQUE(container_id, outlet_code, status)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_container_inventory_container_id ON container_inventory(container_id);
CREATE INDEX IF NOT EXISTS idx_container_inventory_outlet_code ON container_inventory(outlet_code);
CREATE INDEX IF NOT EXISTS idx_container_inventory_status ON container_inventory(status);
CREATE INDEX IF NOT EXISTS idx_container_inventory_delivery_date ON container_inventory(delivery_date);
CREATE INDEX IF NOT EXISTS idx_container_inventory_delivered_at ON container_inventory(delivered_at);
CREATE INDEX IF NOT EXISTS idx_container_inventory_collected_at ON container_inventory(collected_at);

-- Apply updated_at trigger
CREATE TRIGGER update_container_inventory_updated_at BEFORE UPDATE ON container_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE container_inventory IS 'Tracks recyclable containers (Pallet IDs starting with "A") across outlets for collection and reuse';
COMMENT ON COLUMN container_inventory.container_id IS 'Pallet ID starting with "A" (e.g., A101123234)';
COMMENT ON COLUMN container_inventory.status IS 'Current status: at_outlet (available for collection), collected (picked up), in_transit (being transported)';
COMMENT ON COLUMN container_inventory.original_outlet_code IS 'Outlet that originally received the container (for cross-outlet validation)';
