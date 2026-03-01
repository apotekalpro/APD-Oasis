# Outlet-to-Outlet/Outlet-to-Warehouse Delivery Module

## Overview
Extension module to enable outlets to create and send parcels to other outlets or back to warehouse, using the same logistics system as warehouse-to-outlet deliveries.

## Database Schema Changes

### Parcels Table - New Fields
```sql
-- Add these columns to existing parcels table
ALTER TABLE parcels ADD COLUMN origin_type VARCHAR DEFAULT 'warehouse'; -- 'warehouse' or 'outlet'
ALTER TABLE parcels ADD COLUMN origin_outlet_code VARCHAR; -- Outlet code if origin_type='outlet'
ALTER TABLE parcels ADD COLUMN origin_outlet_name VARCHAR; -- Outlet name if origin_type='outlet'
ALTER TABLE parcels ADD COLUMN destination_type VARCHAR DEFAULT 'outlet'; -- 'outlet' or 'warehouse'
ALTER TABLE parcels ADD COLUMN created_at_outlet BOOLEAN DEFAULT FALSE; -- Quick filter flag
```

### Transfer Details - No changes needed
Existing fields already support outlet-to-outlet transfers.

## API Endpoints

### 1. GET /api/outlets/list
**Purpose**: Get list of all outlets for destination dropdown
**Response**:
```json
{
  "outlets": [
    {
      "outlet_code": "0001",
      "outlet_code_short": "0001",
      "outlet_name": "Outlet Alpha"
    }
  ]
}
```

### 2. POST /api/outlet/create-parcel
**Purpose**: Create new parcel from outlet
**Request**:
```json
{
  "origin_outlet_code": "0001",
  "origin_outlet_name": "Outlet Alpha",
  "destination_outlet_code": "0029", // or "WAREHOUSE"
  "destination_outlet_name": "Outlet Beta", // or "Main Warehouse"
  "destination_type": "outlet", // or "warehouse"
  "pallet_id": "F1001234567",
  "transfer_numbers": ["TN001", "TN002"],
  "delivery_date": "2025-12-15",
  "notes": "Return shipment"
}
```
**Response**:
```json
{
  "success": true,
  "parcel_id": "uuid",
  "pallet_id": "F1001234567"
}
```

### 3. POST /api/outlet/load-parcel
**Purpose**: Load outlet-created parcel to lorry (similar to warehouse loading)
**Request**:
```json
{
  "pallet_id": "F1001234567",
  "delivery_date": "2025-12-15",
  "signature_name": "Driver Name"
}
```

### 4. GET /api/outlet/my-outgoing-parcels
**Purpose**: Get parcels created by this outlet
**Query**: `?outlet_code=0001&delivery_date=2025-12-15`

### 5. GET /api/outlet/incoming-outlet-parcels
**Purpose**: Get parcels coming from other outlets to this outlet
**Query**: `?outlet_code=0029&delivery_date=2025-12-15`

## Frontend Components

### 1. Outlet Parcel Creation Interface
**Location**: New tab in `/outlet` page
**Features**:
- Destination dropdown with search (all outlets + warehouse)
- Pallet ID input
- Transfer number input (multiple)
- Delivery date picker
- Notes/remarks field
- Create button

### 2. Outlet Loading Interface
**Location**: New section in outlet page
**Features**:
- List of created parcels (status: 'pending')
- Scan pallet ID to load
- Signature capture
- Complete loading button

### 3. Outlet Unloading - Visual Differentiation
**Location**: Existing unload interface
**Changes**:
- Different background color for outlet-originated parcels
  - Warehouse parcels: White/default
  - Outlet parcels: Light blue (#E3F2FD) with icon 🔄
- Show origin outlet name in parcel card
- All existing unload logic applies

## Dashboard Updates

### 1. Warehouse Dashboard
**New Sections**:
- "Outgoing to Outlets" (warehouse-created)
- "Incoming from Outlets" (outlet-created, destination=warehouse)

**Table Columns**:
- Origin Type (icon: 📦 warehouse, 🏪 outlet)
- Origin Location
- Destination
- Pallet ID
- Status
- Delivery Date

### 2. Outlet Dashboard
**New Sections**:
- "My Outgoing Parcels" (created by this outlet)
- "Incoming from Other Outlets" (created by other outlets, destination=this outlet)

**Color Coding**:
- Warehouse → This Outlet: Default blue
- Other Outlet → This Outlet: Light purple (#E1BEE7)
- This Outlet → Others: Light green (#C8E6C9)

### 3. Delivery Progress Dashboard
**Updates**:
- Show origin type in outlet status table
- Different icon for outlet-originated deliveries

## Reports Integration

### 1. Delivery Report
**New Columns**:
- Origin Type
- Origin Location (if outlet)
- Destination Type

**Filtering**:
- Filter by origin type
- Filter by destination type

### 2. Container Report
**No changes needed** - Already supports all container types

## Workflow Examples

### Example 1: Outlet A → Outlet D
```
1. Outlet A creates parcel for Outlet D
   - origin_type: 'outlet'
   - origin_outlet_code: '0001'
   - destination_outlet_code: '0029'
   - destination_type: 'outlet'
   - status: 'pending'

2. Outlet A loads parcel to lorry
   - Driver signs
   - status: 'loaded'
   - Shows in warehouse dashboard as "Outlet-originated delivery"

3. Lorry arrives at Outlet D (if D is in route)
   - Parcel appears in unload list (light blue background)
   - Driver scans and unloads
   - status: 'delivered'

4. Outlet D staff confirms receipt
   - Signs for delivery
   - Parcel marked complete
```

### Example 2: Outlet B → Warehouse
```
1. Outlet B creates return parcel to warehouse
   - origin_type: 'outlet'
   - origin_outlet_code: '0002'
   - destination_type: 'warehouse'
   - status: 'pending'

2. Outlet B loads parcel to return lorry
   - status: 'loaded'

3. Lorry returns to warehouse
   - Warehouse staff scans and receives
   - status: 'delivered'
```

## Integration with Existing System

### Route Matching Logic
```javascript
// When loading delivery route
const allParcels = [
  ...warehouseParcels,  // origin_type='warehouse'
  ...outletParcels      // origin_type='outlet', destination matches route
]

// Group by destination outlet
const byOutlet = {}
allParcels.forEach(parcel => {
  const key = parcel.destination_outlet_code || parcel.outlet_code
  if (!byOutlet[key]) byOutlet[key] = []
  byOutlet[key].push(parcel)
})
```

### Unload List Rendering
```javascript
// Color differentiation
const getParcelColor = (parcel) => {
  if (parcel.origin_type === 'outlet') {
    return 'bg-blue-50 border-blue-200' // Light blue for outlet parcels
  }
  return 'bg-white border-gray-200' // Default for warehouse parcels
}

// Show origin info
<div class="${getParcelColor(parcel)}">
  <span class="text-xs text-gray-500">
    ${parcel.origin_type === 'outlet' 
      ? `🔄 From: ${parcel.origin_outlet_name}` 
      : '📦 From: Warehouse'}
  </span>
  <div>${parcel.pallet_id}</div>
</div>
```

### Double-Confirm Alert
```javascript
// Applies to all parcels (warehouse and outlet)
if (undeliveredParcels.length > 0) {
  const outletParcels = undeliveredParcels.filter(p => p.origin_type === 'outlet')
  const warehouseParcels = undeliveredParcels.filter(p => p.origin_type === 'warehouse')
  
  const message = `
    You have ${undeliveredParcels.length} undelivered parcels:
    - ${warehouseParcels.length} from warehouse
    - ${outletParcels.length} from outlets
    
    Are you sure you want to proceed?
  `
  // Show confirmation dialog
}
```

## Security & Permissions

### Outlet Users Can:
- ✅ Create parcels from their outlet
- ✅ Load parcels from their outlet
- ✅ View their outgoing parcels
- ✅ Receive parcels at their outlet (existing)
- ❌ Create parcels from other outlets
- ❌ Edit/delete parcels from other outlets

### Warehouse Users Can:
- ✅ View all outlet-originated parcels
- ✅ Receive outlet-to-warehouse parcels
- ✅ Create warehouse parcels (existing)
- ❌ Edit outlet-created parcels (data integrity)

## Color Scheme

| Origin → Destination | Color | Background | Icon |
|---------------------|-------|------------|------|
| Warehouse → Outlet | Blue | `bg-white` | 📦 |
| Outlet → Outlet | Light Blue | `bg-blue-50 border-blue-200` | 🔄 |
| Outlet → Warehouse | Light Green | `bg-green-50 border-green-200` | ↩️ |

## Implementation Phases

### Phase 1: Backend API (Priority: HIGH)
- [ ] Add database columns
- [ ] Create outlet parcel creation endpoint
- [ ] Create outlet loading endpoint
- [ ] Create outlet list endpoint
- [ ] Update existing queries to include outlet parcels

### Phase 2: Frontend - Outlet Interface (Priority: HIGH)
- [ ] Create parcel creation form
- [ ] Add destination dropdown with search
- [ ] Create loading interface
- [ ] Update unload list with color differentiation

### Phase 3: Dashboard Integration (Priority: MEDIUM)
- [ ] Update warehouse dashboard
- [ ] Update outlet dashboard
- [ ] Add origin/destination info to tables

### Phase 4: Reports (Priority: MEDIUM)
- [ ] Add origin type to delivery report
- [ ] Add filtering options
- [ ] Update export functionality

### Phase 5: Testing & Refinement (Priority: LOW)
- [ ] End-to-end testing
- [ ] Double-confirm alerts
- [ ] Performance optimization
- [ ] User feedback integration

## Notes

- ✅ **Non-Breaking**: All changes are additive - existing system continues to work
- ✅ **Backward Compatible**: Existing parcels treated as warehouse-originated
- ✅ **Consistent Logic**: Same loading/unloading/delivery flow
- ✅ **Visual Clarity**: Color coding prevents confusion
- ✅ **Audit Trail**: Origin tracking for accountability
