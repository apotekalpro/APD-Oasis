# Scanning System Changes - Pallet ID Implementation

## Summary of Changes

### What Changed
1. **Warehouse Loading**: Now scans **Pallet ID** (Column G) instead of Transfer Number
2. **Outlet Unloading**: Two-step process:
   - Step 1: Scan **Outlet Short Code** (e.g., "MKC", "JBB")
   - Step 2: Scan **Pallet ID** for that outlet
3. **Outlet Code Mapping**: Automatically maps numeric code (Column E) to short code (Column B)

### Why This Change
- **Excel Column E** contains numeric outlet codes (e.g., "0001", "0002", "0003")
- **Database/Login** uses short codes (e.g., "JKJSTT1", "JKJSVR1", "JKJBTM1")
- **Drivers/Outlets** need to see short codes, not numeric codes
- **Pallet ID** is more efficient for scanning multiple transfers at once

## Data Flow

### 1. Excel Import (DC Pick & Pack Report)
```
Column E (Store Code) → Numeric code "0001"
Column F (Store Name) → "JKJSTT1 - APOTEK ALPRO TEBET TIMUR"  
Column G (Pallet ID)  → "PLT-001"
Column V (Transfer No)→ "TRF-2024-001"
```

### 2. Outlet Mapping (from Outlet List 2026.xlsx)
```
Column A (Store Code)      → "0001" (numeric)
Column B (Short Store Name)→ "JKJSTT1" (short code)
Column C (Store Name)      → "APOTEK ALPRO TEBET TIMUR"
```

### 3. Database Storage
```
outlets table:
  - outlet_code: "0001" (numeric - PRIMARY)
  - outlet_code_short: "JKJSTT1" (short code for display)
  - outlet_name: "APOTEK ALPRO TEBET TIMUR"

parcels table:
  - outlet_code: "0001" (numeric)
  - outlet_code_short: "JKJSTT1" (for display)
  - pallet_id: "PLT-001"
  - status: pending/loaded/delivered

transfer_details table:
  - outlet_code: "0001" (numeric)
  - outlet_code_short: "JKJSTT1" (for display)
  - pallet_id: "PLT-001"
  - transfer_number: "TRF-2024-001"
```

### 4. User Login
```
Username: JKJSTT1 (short code from Column B)
Password: Alpro@123
outlet_code: "0001" (linked to numeric code)
```

## New Warehouse Workflow

### Loading Process
1. **View**: List of outlets with their pallet IDs
2. **Scan**: Enter/scan **Pallet ID** (e.g., "PLT-001")
3. **System**:
   - Finds all transfers with this pallet ID
   - Marks all transfers under this pallet as scanned
   - Updates pallet status to "loaded"
4. **Display**: Show outlet short code (e.g., "JKJSTT1"), not numeric code
5. **Complete**: Warehouse staff signature

## New Outlet Workflow

### Unloading Process
1. **Step 1 - Select Outlet**:
   - Scan/enter outlet short code (e.g., "JKJSTT1")
   - System finds all available pallet IDs for this outlet
   - Display: List of pending pallet IDs

2. **Step 2 - Scan Pallet**:
   - Scan/enter pallet ID (e.g., "PLT-001")
   - System verifies pallet belongs to this outlet
   - Marks pallet as delivered
   - Updates all transfers under this pallet

3. **Confirmation**:
   - Outlet receiver signature
   - Timestamp recorded

## API Changes

### New Endpoints

**1. Warehouse - Scan Pallet ID**
```
POST /api/warehouse/scan-pallet
Body: { "pallet_id": "PLT-001" }
Response: { 
  "success": true, 
  "pallet_id": "PLT-001",
  "outlet_code_short": "JKJSTT1",
  "outlet_name": "APOTEK ALPRO TEBET TIMUR",
  "transfer_count": 5
}
```

**2. Outlet - Get Available Pallets**
```
POST /api/outlet/find-pallets
Body: { "outlet_code_short": "JKJSTT1" }
Response: {
  "success": true,
  "outlet_code": "0001",
  "outlet_code_short": "JKJSTT1",
  "pallets": [
    {
      "pallet_id": "PLT-001",
      "transfer_count": 5,
      "status": "loaded"
    },
    {
      "pallet_id": "PLT-002",
      "transfer_count": 3,
      "status": "loaded"
    }
  ]
}
```

**3. Outlet - Scan Pallet**
```
POST /api/outlet/scan-pallet
Body: { 
  "outlet_code_short": "JKJSTT1", 
  "pallet_id": "PLT-001" 
}
Response: {
  "success": true,
  "pallet_id": "PLT-001",
  "transfer_count": 5
}
```

### Modified Endpoints

**Import Endpoint**: Now includes outlet code mapping
```
POST /api/import
- Extracts numeric code from Column E
- Extracts short code from Column F (before " - ")
- Stores both in database
```

## UI Changes

### Warehouse Page
**Before**:
```
Scan Transfer Number: [____________]
```

**After**:
```
Scan Pallet ID: [____________]
Shows: Outlet Short Code | Outlet Name | Transfer Count
```

### Outlet Page
**Before**:
```
Scan Transfer Number: [____________]
```

**After**:
```
Step 1: Enter Your Outlet Code
Scan Outlet Code: [____________]  (e.g., MKC, JBB, JKJSTT1)

[After outlet found, show:]

Your Available Deliveries:
┌─────────────┬────────────────┬──────────┐
│ Pallet ID   │ Transfer Count │ Status   │
├─────────────┼────────────────┼──────────┤
│ PLT-001     │ 5 transfers    │ Loaded   │
│ PLT-002     │ 3 transfers    │ Loaded   │
└─────────────┴────────────────┴──────────┘

Step 2: Scan Pallet to Receive
Scan Pallet ID: [____________]
```

## Database Schema Updates

### outlets table
```sql
ALTER TABLE outlets ADD COLUMN outlet_code_short VARCHAR(50);
UPDATE outlets SET outlet_code_short = (
  SELECT short_name FROM outlet_list WHERE outlet_list.store_code = outlets.outlet_code
);
CREATE INDEX idx_outlets_short_code ON outlets(outlet_code_short);
```

### parcels table
```sql
ALTER TABLE parcels ADD COLUMN outlet_code_short VARCHAR(50);
CREATE INDEX idx_parcels_pallet_id ON parcels(pallet_id);
```

### transfer_details table
```sql
ALTER TABLE transfer_details ADD COLUMN outlet_code_short VARCHAR(50);
CREATE INDEX idx_transfers_pallet_id ON transfer_details(pallet_id);
```

## Migration Steps

1. **Update Database Schema** - Add outlet_code_short columns
2. **Update Outlet Import Script** - Store short codes
3. **Modify Import Endpoint** - Extract and map codes
4. **Update Backend API** - New scan endpoints
5. **Update Frontend UI** - New scanning interfaces
6. **Test Thoroughly** - Verify all workflows
7. **Deploy to Production**

## Benefits

✅ **Efficiency**: Scan one pallet ID = process multiple transfers
✅ **User-Friendly**: Staff see familiar short codes, not numbers
✅ **Accuracy**: Auto-matching prevents manual code entry errors
✅ **Flexibility**: Outlets can see all their pending deliveries first
✅ **Audit Trail**: Complete tracking at pallet level

## Example Scenario

**Warehouse Loading**:
1. Staff scans "PLT-001"
2. System shows: "JKJSTT1 - APOTEK ALPRO TEBET TIMUR (5 transfers)"
3. Marks 5 transfers as loaded automatically
4. Staff continues with next pallet

**Outlet Unloading**:
1. Outlet staff scans "JKJSTT1"
2. System shows 2 pallets: PLT-001 (5 transfers), PLT-002 (3 transfers)
3. Staff scans "PLT-001"
4. All 5 transfers marked as delivered
5. Staff repeats for PLT-002
