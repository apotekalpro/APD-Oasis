-- APD OASIS Warehouse Logistic System Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication and access control)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'warehouse', 'driver', 'outlet')),
    outlet_code VARCHAR(50), -- For outlet users
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outlets table
CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_code VARCHAR(50) UNIQUE NOT NULL,
    outlet_name VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Imports table (tracking import sessions)
CREATE TABLE IF NOT EXISTS imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_date DATE NOT NULL,
    imported_by UUID REFERENCES users(id),
    total_parcels INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parcels table (combined by Pallet ID)
CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID REFERENCES imports(id) ON DELETE CASCADE,
    outlet_code VARCHAR(50) NOT NULL,
    outlet_name VARCHAR(255) NOT NULL,
    pallet_id VARCHAR(255) NOT NULL,
    transfer_numbers TEXT[], -- Array of transfer numbers
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'loaded', 'delivered', 'error')),
    scanned_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    loaded_at TIMESTAMP WITH TIME ZONE,
    loaded_by UUID REFERENCES users(id),
    loaded_by_name VARCHAR(255),
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivered_by UUID REFERENCES users(id),
    delivered_by_name VARCHAR(255),
    received_by_name VARCHAR(255), -- Outlet receiver name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer details table (individual transfer numbers)
CREATE TABLE IF NOT EXISTS transfer_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
    transfer_number VARCHAR(255) NOT NULL,
    outlet_code VARCHAR(50) NOT NULL,
    outlet_name VARCHAR(255) NOT NULL,
    pallet_id VARCHAR(255) NOT NULL,
    is_scanned_loading BOOLEAN DEFAULT false,
    scanned_loading_at TIMESTAMP WITH TIME ZONE,
    scanned_loading_by UUID REFERENCES users(id),
    is_scanned_unloading BOOLEAN DEFAULT false,
    scanned_unloading_at TIMESTAMP WITH TIME ZONE,
    scanned_unloading_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'loaded', 'delivered', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transfer_number, parcel_id)
);

-- Audit logs table (for tracking all actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error parcels table (for unmatched/error parcels)
CREATE TABLE IF NOT EXISTS error_parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(255) NOT NULL,
    scanned_by UUID REFERENCES users(id),
    scanned_by_name VARCHAR(255),
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('not_found', 'already_scanned', 'wrong_outlet', 'other')),
    error_message TEXT,
    outlet_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_outlet_code ON users(outlet_code);
CREATE INDEX IF NOT EXISTS idx_outlets_code ON outlets(outlet_code);
CREATE INDEX IF NOT EXISTS idx_parcels_import_id ON parcels(import_id);
CREATE INDEX IF NOT EXISTS idx_parcels_outlet_code ON parcels(outlet_code);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_pallet_id ON parcels(pallet_id);
CREATE INDEX IF NOT EXISTS idx_transfer_details_parcel_id ON transfer_details(parcel_id);
CREATE INDEX IF NOT EXISTS idx_transfer_details_transfer_number ON transfer_details(transfer_number);
CREATE INDEX IF NOT EXISTS idx_transfer_details_status ON transfer_details(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_parcels_transfer_number ON error_parcels(transfer_number);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlets_updated_at BEFORE UPDATE ON outlets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_imports_updated_at BEFORE UPDATE ON imports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcels_updated_at BEFORE UPDATE ON parcels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_details_updated_at BEFORE UPDATE ON transfer_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System Administrator', 'admin', true)
ON CONFLICT (username) DO NOTHING;

-- Insert sample outlets (you can modify these)
INSERT INTO outlets (outlet_code, outlet_name, address, is_active)
VALUES 
    ('A001', 'Outlet A - KL Central', 'Kuala Lumpur', true),
    ('B002', 'Outlet B - Petaling Jaya', 'Selangor', true),
    ('C003', 'Outlet C - Shah Alam', 'Selangor', true)
ON CONFLICT (outlet_code) DO NOTHING;

-- Grant permissions (if needed)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
