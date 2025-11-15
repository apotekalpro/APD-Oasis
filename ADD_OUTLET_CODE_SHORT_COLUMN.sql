-- Add outlet_code_short column to parcels and transfer_details tables
-- This column stores the short code (e.g., "JKJBJR1", "MKC") for display to users
-- while outlet_code stores the numeric code (e.g., "0001", "2018") for database integrity

-- Add outlet_code_short to parcels table
ALTER TABLE parcels 
ADD COLUMN IF NOT EXISTS outlet_code_short TEXT;

-- Add outlet_code_short to transfer_details table
ALTER TABLE transfer_details 
ADD COLUMN IF NOT EXISTS outlet_code_short TEXT;

-- Add index for faster queries by short code
CREATE INDEX IF NOT EXISTS idx_parcels_outlet_code_short ON parcels(outlet_code_short);
CREATE INDEX IF NOT EXISTS idx_transfer_details_outlet_code_short ON transfer_details(outlet_code_short);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('parcels', 'transfer_details') 
  AND column_name = 'outlet_code_short'
ORDER BY table_name;
