# ⚠️ URGENT: Database Migration Required

## Current Issue

The application is **failing to import files and load dashboard** because the database is missing the `delivery_date` column.

**Error Message:**
```
Could not find the 'delivery_date' column of 'parcels' in the schema cache
```

## Solution: Run the Migration NOW

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project: **https://ptfnmivvowgiqzwyznmu.supabase.co**
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

### Step 2: Copy and Execute the Migration

Copy the **ENTIRE content** from the file `ADD_DELIVERY_DATE_COLUMN.sql` and paste it into the SQL Editor, then click **"Run"**.

Or copy this SQL directly:

```sql
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
```

### Step 3: Verify Success

After running the SQL, you should see a result table showing:

| table_name | total_rows | with_delivery_date |
|------------|------------|-------------------|
| imports | X | X |
| parcels | X | X |
| transfer_details | X | X |

The `total_rows` and `with_delivery_date` should be the **same number**, meaning all records have been updated.

### Step 4: Refresh the Application

After the migration is complete:
1. Refresh your browser (press F5 or Ctrl+R)
2. Try importing a file again
3. Check the dashboard

## What This Migration Does

1. ✅ Adds `delivery_date` column to 3 tables
2. ✅ Creates indexes for fast queries
3. ✅ Backfills existing data with import dates
4. ✅ Enables multi-day dashboard feature
5. ✅ Allows planning for next-day deliveries

## After Migration

Once the migration is complete, you will be able to:

- ✅ **Import files** successfully
- ✅ **View dashboard** with Yesterday/Today/Tomorrow tabs
- ✅ **Select delivery date** when importing (e.g., import tonight for tomorrow)
- ✅ **Filter warehouse** by delivery date
- ✅ **Track timestamps** for loaded and delivered pallets with dates

## Why This Happened

The multi-day dashboard feature (Version 1.7.0) requires a new `delivery_date` column in the database. This is a **breaking change** that requires manual migration.

We couldn't automatically add this column because:
- Supabase doesn't allow auto-migrations from application code
- Database schema changes must be done manually for safety
- You have full control over when to apply migrations

## Need Help?

If you encounter any errors while running the migration:
1. Copy the error message
2. Check if you're connected to the correct Supabase project
3. Verify you have admin permissions in Supabase
4. Contact support with the error details

---

**This migration is REQUIRED** for the application to work with Version 1.7.0 and above.
