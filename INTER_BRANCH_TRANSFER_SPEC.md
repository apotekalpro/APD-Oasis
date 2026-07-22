# 📦 Inter-Branch Transfer System - Specification

**Feature**: Inter-Branch Transfer with Crossdock Support
**Status**: Ready for Implementation
**Database**: Development Supabase (isolated from production)

---

## 🎯 SYSTEM OVERVIEW

Allow outlets and warehouse to transfer parcels between locations with:
- Unique transfer codes (TN format)
- Barcode generation for scanning
- Crossdock support at APD Warehouse
- Complete tracking and status history
- Dashboard visibility for all parties

---

## 🔢 TRANSFER NUMBER FORMAT

### Format Specification:
```
TN[SenderCode][ReceiverCode][DDMM][Serial]
```

### Examples:
- `TNJKJSTT1JKJSVR1220701` = JKJSTT1 → JKJSVR1 on July 22, Serial #01
- `TNJKJSTT1APDWHS1220702` = JKJSTT1 → Warehouse on July 22, Serial #02
- `TNAPDWHS1JKJSVR1220703` = Warehouse → JKJSVR1 on July 22, Serial #03

### Generation Logic:
```typescript
function generateTransferNumber(senderCode: string, receiverCode: string): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const dateStr = day + month;
    
    // Get today's serial number (count of transfers today)
    const serial = await getTodayTransferCount(senderCode, receiverCode) + 1;
    const serialStr = String(serial).padStart(2, '0');
    
    return `TN${senderCode}${receiverCode}${dateStr}${serialStr}`;
}
```

---

## 🗄️ DATABASE SCHEMA

### Table: inter_branch_transfers

```sql
CREATE TABLE inter_branch_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transfer Identification
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    barcode_data TEXT, -- Barcode-compatible format
    
    -- Sender Information
    sender_outlet_code VARCHAR(50) NOT NULL,
    sender_outlet_name VARCHAR(255) NOT NULL,
    
    -- Receiver Information
    receiver_outlet_code VARCHAR(50) NOT NULL,
    receiver_outlet_name VARCHAR(255) NOT NULL,
    
    -- Status Flow: created → loaded → in_transit → crossdock/unloaded → completed
    status VARCHAR(50) DEFAULT 'created',
    
    -- Timestamps for Status Transitions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    loaded_at TIMESTAMP WITH TIME ZONE,        -- Loaded to lorry at sender
    in_transit_at TIMESTAMP WITH TIME ZONE,    -- Left sender location
    crossdock_at TIMESTAMP WITH TIME ZONE,     -- Arrived at warehouse (if crossdock)
    unloaded_at TIMESTAMP WITH TIME ZONE,      -- Unloaded at receiver
    completed_at TIMESTAMP WITH TIME ZONE,     -- Confirmed received
    
    -- User Tracking (Who performed each action)
    created_by UUID,
    created_by_name VARCHAR(255),
    loaded_by UUID,
    loaded_by_name VARCHAR(255),
    unloaded_by UUID,
    unloaded_by_name VARCHAR(255),
    completed_by UUID,
    completed_by_name VARCHAR(255),
    
    -- Crossdock Handling
    is_crossdock BOOLEAN DEFAULT false,
    crossdock_warehouse_code VARCHAR(50),      -- Usually 'APDWHS1'
    crossdock_by UUID,
    crossdock_by_name VARCHAR(255),
    requires_reload BOOLEAN DEFAULT false,     -- True if waiting for reload
    reloaded_at TIMESTAMP WITH TIME ZONE,      -- Reloaded to destination lorry
    reloaded_by UUID,
    reloaded_by_name VARCHAR(255),
    
    -- Additional Information
    notes TEXT,
    package_count INTEGER DEFAULT 1,
    
    -- Metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_transfer_number ON inter_branch_transfers(transfer_number);
CREATE INDEX idx_sender_outlet ON inter_branch_transfers(sender_outlet_code);
CREATE INDEX idx_receiver_outlet ON inter_branch_transfers(receiver_outlet_code);
CREATE INDEX idx_status ON inter_branch_transfers(status);
CREATE INDEX idx_is_crossdock ON inter_branch_transfers(is_crossdock);
CREATE INDEX idx_created_at ON inter_branch_transfers(created_at DESC);
CREATE INDEX idx_requires_reload ON inter_branch_transfers(requires_reload) WHERE requires_reload = true;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inter_branch_transfers_updated_at 
    BEFORE UPDATE ON inter_branch_transfers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 📊 STATUS FLOW

### Standard Transfer (Direct):
```
created → loaded → in_transit → unloaded → completed
```

### Crossdock Transfer (Via Warehouse):
```
created → loaded → in_transit → crossdock → requires_reload → reloaded → in_transit → unloaded → completed
```

### Status Definitions:
- **created**: Transfer request created, TN code generated
- **loaded**: Parcel loaded to lorry at sender
- **in_transit**: Lorry left sender location
- **crossdock**: Arrived at warehouse (crossdock detection)
- **requires_reload**: Waiting at warehouse for destination route
- **reloaded**: Loaded to lorry for final destination
- **unloaded**: Unloaded at receiver location
- **completed**: Receiver confirmed receipt

---

## 🚛 CROSSDOCK DETECTION LOGIC

### Detection Rules:
```typescript
// Crossdock is detected when:
// 1. Transfer is unloaded at warehouse (APDWHS1)
// 2. Receiver is NOT the warehouse
function detectCrossdock(
    transfer: InterBranchTransfer, 
    scanLocation: string
): boolean {
    const isWarehouse = scanLocation === 'APDWHS1';
    const receiverNotWarehouse = transfer.receiver_outlet_code !== 'APDWHS1';
    
    return isWarehouse && receiverNotWarehouse;
}

// Auto-update transfer status on crossdock detection
async function handleUnloadScan(transferNumber: string, userInfo: UserInfo) {
    const transfer = await getTransfer(transferNumber);
    const scanLocation = userInfo.outlet_code;
    
    if (detectCrossdock(transfer, scanLocation)) {
        await updateTransfer(transferNumber, {
            status: 'crossdock',
            is_crossdock: true,
            crossdock_at: new Date(),
            crossdock_warehouse_code: scanLocation,
            crossdock_by: userInfo.id,
            crossdock_by_name: userInfo.full_name,
            requires_reload: true  // Flag for warehouse loading queue
        });
    } else {
        // Normal unload at final destination
        await updateTransfer(transferNumber, {
            status: 'unloaded',
            unloaded_at: new Date(),
            unloaded_by: userInfo.id,
            unloaded_by_name: userInfo.full_name
        });
    }
}
```

---

## 🖨️ A5 LANDSCAPE PRINT LAYOUT

### Dimensions:
- Paper: A5 Landscape (210mm × 148mm)
- Orientation: Landscape
- Margins: 10mm all sides

### Layout Structure:
```
┌────────────────────────────────────────────────────────────┐
│  APD OASIS - INTER-BRANCH TRANSFER                         │
│                                                            │
│  Transfer Number: TNJKJSTT1JKJSVR1220701                  │
│  Date: 22 July 2026                                        │
│                                                            │
│  ┌──────────────┐               ┌──────────────┐          │
│  │ FROM:        │               │ TO:          │          │
│  │ JKJSTT1      │      ────→    │ JKJSVR1      │          │
│  │ Outlet Name  │               │ Outlet Name  │          │
│  └──────────────┘               └──────────────┘          │
│                                                            │
│  ┌────────────────────────────────────────┐               │
│  │     BARCODE:                           │               │
│  │  ▐│ ││ │││││ │││ ││ │▐│ │││ │││ ││▐  │               │
│  │     TNJKJSTT1JKJSVR1220701             │               │
│  └────────────────────────────────────────┘               │
│                                                            │
│  Created By: John Doe                                      │
│  Created At: 22 July 2026, 14:30                          │
│                                                            │
│  Notes: _____________________________________________       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📱 USER INTERFACE

### 1. Create Transfer Page (Outlet/Warehouse)

**Page: Inter-Branch Transfer > Create New**

```
┌─────────────────────────────────────────────┐
│ 📦 Create Inter-Branch Transfer             │
├─────────────────────────────────────────────┤
│                                             │
│ From (Sender):                              │
│ ┌─────────────────────────────────────────┐ │
│ │ JKJSTT1 - Outlet Name    [Auto-filled] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ To (Receiver): *                            │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔍 Search outlet...          ▼         │ │
│ └─────────────────────────────────────────┘ │
│ Dropdown options:                           │
│ • APDWHS1 - APD Warehouse                  │
│ • JKJSVR1 - Outlet A                       │
│ • JKJSVR2 - Outlet B                       │
│ • ... (searchable list)                    │
│                                             │
│ Package Count: (Optional)                   │
│ ┌─────┐                                     │
│ │  1  │                                     │
│ └─────┘                                     │
│                                             │
│ Notes: (Optional)                           │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Cancel]            [Generate Transfer]     │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Print Preview & Barcode Generation

After clicking "Generate Transfer":
- Auto-generate TN code
- Create barcode
- Show A5 landscape print preview
- Options: [Download PDF] [Print] [Back]

### 3. Loading List (Sender Outlet)

**Page: Warehouse/Outlet > Loading**

Shows all transfers with status "created" that need to be loaded:

```
┌─────────────────────────────────────────────┐
│ 🚛 Loading List - JKJSTT1                   │
├─────────────────────────────────────────────┤
│                                             │
│ [Scan Barcode to Load]                      │
│ ┌─────────────────────────────────────────┐ │
│ │ 📷 Scan Transfer Number...              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Pending Loads:                              │
│                                             │
│ ☐ TNJKJSTT1JKJSVR1220701                   │
│    To: JKJSVR1 - Outlet A                  │
│    Created: 22 Jul 14:30                   │
│    [View Details] [Load]                   │
│                                             │
│ ☐ TNJKJSTT1APDWHS1220702                   │
│    To: APDWHS1 - Warehouse                 │
│    Created: 22 Jul 14:45                   │
│    [View Details] [Load]                   │
│                                             │
└─────────────────────────────────────────────┘
```

### 4. Unloading List (Receiver Outlet/Warehouse)

**Page: Warehouse/Outlet > Unloading**

Shows transfers in-transit to current location:

```
┌─────────────────────────────────────────────┐
│ 📥 Unloading List - JKJSVR1                 │
├─────────────────────────────────────────────┤
│                                             │
│ [Scan Barcode to Unload]                    │
│ ┌─────────────────────────────────────────┐ │
│ │ 📷 Scan Transfer Number...              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Expected Deliveries:                        │
│                                             │
│ ☐ TNJKJSTT1JKJSVR1220701                   │
│    From: JKJSTT1 - Outlet B                │
│    Loaded: 22 Jul 15:00                    │
│    [View Details] [Unload]                 │
│                                             │
│ ☐ TNAPDWHS1JKJSVR1220703 🔄 (Crossdock)   │
│    From: APDWHS1 - Warehouse               │
│    Original: JKJSTT1                       │
│    [View Details] [Unload]                 │
│                                             │
└─────────────────────────────────────────────┘
```

### 5. Crossdock Reload List (Warehouse Only)

**Page: Warehouse > Crossdock Reload**

Shows transfers waiting for reload to final destination:

```
┌─────────────────────────────────────────────┐
│ 🔄 Crossdock Reload - APDWHS1               │
├─────────────────────────────────────────────┤
│                                             │
│ Waiting for Reload:                         │
│                                             │
│ ☐ TNJKJSTT1JKJSVR1220701                   │
│    Original: JKJSTT1 → JKJSVR1             │
│    Crossdock: 22 Jul 15:30                 │
│    Destination Route: Route A               │
│    [View Details] [Reload]                 │
│                                             │
│ ☐ TNJKJSTT2JKJSVR2220704                   │
│    Original: JKJSTT2 → JKJSVR2             │
│    Crossdock: 22 Jul 16:00                 │
│    Destination Route: Route B               │
│    [View Details] [Reload]                 │
│                                             │
└─────────────────────────────────────────────┘
```

### 6. Transfer Tracking Dashboard

**Page: Dashboard > Inter-Branch Transfers**

All users can see transfers relevant to them:

```
┌─────────────────────────────────────────────┐
│ 📊 Inter-Branch Transfer Dashboard          │
├─────────────────────────────────────────────┤
│                                             │
│ Filters: [All] [Sent] [Received] [Crossdock]│
│                                             │
│ Transfer History:                           │
│                                             │
│ TNJKJSTT1JKJSVR1220701  ✅ Completed       │
│ JKJSTT1 → JKJSVR1                          │
│ Created: 22 Jul 14:30                      │
│ Completed: 22 Jul 17:45                    │
│ [View Tracking]                            │
│                                             │
│ TNJKJSTT1APDWHS1220702  🔄 Crossdock       │
│ JKJSTT1 → APDWHS1 → JKJSVR2               │
│ Current: Waiting for reload                │
│ [View Tracking]                            │
│                                             │
│ TNJKJSTT1JKJSVR3220705  🚛 In Transit      │
│ JKJSTT1 → JKJSVR3                          │
│ Loaded: 22 Jul 16:00                       │
│ [View Tracking]                            │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔍 TRACKING & VISIBILITY

### Visibility Rules:
- **Sender Outlet**: See all transfers they created
- **Receiver Outlet**: See all transfers coming to them
- **Warehouse**: See all transfers (especially crossdock items)
- **Each party**: Can track status and history

### Tracking Information Displayed:
```
Transfer Number: TNJKJSTT1JKJSVR1220701

Timeline:
✅ Created - 22 Jul 14:30 by John Doe (JKJSTT1)
✅ Loaded - 22 Jul 15:00 by Driver A (JKJSTT1)
✅ In Transit - 22 Jul 15:05
🔄 Crossdock - 22 Jul 15:30 by Warehouse Staff (APDWHS1)
⏳ Waiting Reload - Current status
⏹ Reload - Pending
⏹ In Transit - Pending
⏹ Unloaded - Pending
⏹ Completed - Pending

Route: JKJSTT1 → APDWHS1 → JKJSVR1
Current Location: APDWHS1 (Warehouse)
Expected Delivery: 22 Jul 18:00
```

---

## 📈 REPORTING

### Transfer Reports:
- Daily transfer summary
- Crossdock statistics
- Transit time analysis
- Outstanding transfers
- Completed transfers by date range

---

## 🔧 IMPLEMENTATION CHECKLIST

- [ ] Create development Supabase database
- [ ] Create inter_branch_transfers table
- [ ] Implement transfer number generation logic
- [ ] Create transfer creation API endpoint
- [ ] Implement barcode generation
- [ ] Design A5 landscape print layout
- [ ] Create loading/unloading scan endpoints
- [ ] Implement crossdock detection logic
- [ ] Create reload queue for warehouse
- [ ] Build tracking dashboard UI
- [ ] Add reporting features
- [ ] Test complete flow in UAT

---

**Next Step**: Set up development Supabase database, then I'll implement this system!
