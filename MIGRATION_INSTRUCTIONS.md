# Database Migration Instructions

## A Code Container Support - Database Schema Update

**Date:** 2025-11-25  
**Purpose:** Add box and container tracking to parcels table

### Step 1: Run SQL Migration

Open Supabase SQL Editor and run:

```sql
-- File: sql_migrations/add_box_container_fields.sql

ALTER TABLE parcels 
ADD COLUMN IF NOT EXISTS box_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS container_count INTEGER DEFAULT 0;

COMMENT ON COLUMN parcels.box_count IS 'Number of boxes for this pallet';
COMMENT ON COLUMN parcels.container_count IS 'Number of A code containers linked to this outlet';

UPDATE parcels 
SET box_count = 0, container_count = 0 
WHERE box_count IS NULL OR container_count IS NULL;

CREATE INDEX IF NOT EXISTS idx_parcels_container_count ON parcels(container_count);
```

### Step 2: Verify Migration

Run this query to verify:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'parcels' 
AND column_name IN ('box_count', 'container_count');
```

**Expected Result:**
```
column_name      | data_type | column_default
-----------------+-----------+----------------
box_count        | integer   | 0
container_count  | integer   | 0
```

### Step 3: Deploy Updated Backend

After running the SQL migration, deploy the updated backend code which includes:
- API support for box_count and container_count
- Warehouse loading endpoint with container prompt
- A code scanning support

### What This Enables

✅ Warehouse can input box and container counts per outlet  
✅ A codes can be scanned and linked to outlets  
✅ Outlet unloading tracks both F codes (boxes) and A codes (containers)  
✅ Dashboard shows separate boxes and containers counts  
✅ Existing data backfilled with 0 containers (no breaking changes)
