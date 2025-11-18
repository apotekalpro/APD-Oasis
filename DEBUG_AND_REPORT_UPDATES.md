# APK Debug Logging and Report User Tracking Updates

## Date: 2024-11-18

## Summary
Added comprehensive debug logging for APK delivery date issues and improved user tracking in reports to properly show who performed each operation.

---

## 🐛 APK Debug Logging

### Frontend Debug Logging (app.js)
Added extensive console logging in `handleWarehouseScan()` function:

```javascript
// 🐛 DEBUG: Log date selection details for APK debugging
console.log('=== WAREHOUSE SCAN DEBUG ===')
console.log('Input element exists:', !!deliveryDateInput)
console.log('Input element value:', deliveryDateInput?.value)
console.log('State delivery date:', state.warehouseDeliveryDate)
console.log('Final delivery date:', deliveryDate)
console.log('Pallet ID:', palletId)
console.log('===========================')

// ... when no date found
console.error('❌ No delivery date found!')

// ... before API call
console.log('📤 Sending API request:', payload)

// ... after API response
console.log('📥 API response:', response.data)

// ... on success
console.log('✅ Scan successful!')

// ... on error
console.error('❌ Scan failed:', response.data.error)
console.error('❌ API error:', error)
console.error('Error response:', error.response?.data)
```

### Backend Debug Logging (index.tsx)
Added server-side logging in `/api/warehouse/scan-pallet`:

```typescript
// 🐛 DEBUG: Server-side logging for APK debugging
console.log('=== SERVER SCAN DEBUG ===')
console.log('User:', user.username, '(', user.full_name, ')')
console.log('Pallet ID:', pallet_id)
console.log('Delivery date received:', delivery_date)
console.log('Delivery date type:', typeof delivery_date)
console.log('========================')

// ... when no date
console.error('❌ SERVER: No delivery date in request!')
```

### How to Use Debug Logs
1. Connect APK to Chrome DevTools via USB debugging
2. Open Chrome browser: `chrome://inspect/#devices`
3. Click "Inspect" on your app's WebView
4. Open Console tab
5. Try scanning a pallet
6. Check the console output for:
   - Whether date input element exists
   - What value it contains
   - What's in state
   - What's sent to server
   - What server receives

---

## 📊 Report User Tracking Updates

### Problem
Previously, reports only showed one user name per stage (loaded_by_name, received_by_name), which didn't distinguish between:
- **Loading**: Warehouse staff who scanned vs Driver who signed off
- **Unloading**: Driver who scanned vs Outlet staff who signed off

### Solution
Added separate tracking fields for each role:

### Database Fields (parcels table)
```
Loading Stage:
- scanned_loading_by_name: Warehouse staff who did the scanning
- loaded_by_name: Driver signature who acknowledged receipt

Unloading Stage:
- scanned_unloading_by_name: Driver who did the unloading scan
- received_by_name: Outlet staff signature who confirmed receipt
```

### Backend API Updates

**Warehouse Complete (`/api/warehouse/complete`):**
```typescript
await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.loaded`, {
  method: 'PATCH',
  body: JSON.stringify({
    loaded_at: new Date().toISOString(),
    loaded_by: user.id,  // Warehouse staff who did loading
    loaded_by_name: signature_name || user.full_name,  // Driver signature
    scanned_loading_by_name: user.full_name  // Warehouse staff name
  })
})
```

**Outlet Complete (`/api/outlet/complete`):**
```typescript
await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.delivered`, {
  method: 'PATCH',
  body: JSON.stringify({
    delivered_at: new Date().toISOString(),
    delivered_by: user.id,  // Driver who did unloading
    scanned_unloading_by_name: user.full_name,  // Driver name
    received_by_name: signature_name  // Outlet staff signature
  })
})
```

### Report Display Updates

**Delivery Report Table (app.js):**
```html
<thead class="bg-gray-100">
    <tr>
        <th>Outlet</th>
        <th>Pallet ID</th>
        <th>Transfer Count</th>
        <th>Loaded By (Warehouse)</th>      <!-- NEW -->
        <th>Driver Signature</th>            <!-- RENAMED -->
        <th>Loaded At</th>
        <th>Unloaded By (Driver)</th>        <!-- NEW -->
        <th>Outlet Signature</th>            <!-- RENAMED -->
        <th>Delivered At</th>
        <th>Status</th>
    </tr>
</thead>
<tbody>
    <tr>
        <td>${d.scanned_loading_by_name || '-'}</td>   <!-- Warehouse staff -->
        <td>${d.loaded_by_name || '-'}</td>            <!-- Driver signature -->
        <td>${formatDate(d.loaded_at)}</td>
        <td>${d.scanned_unloading_by_name || '-'}</td> <!-- Driver -->
        <td>${d.received_by_name || '-'}</td>          <!-- Outlet signature -->
        <td>${formatDate(d.delivered_at)}</td>
    </tr>
</tbody>
```

**Excel Export (app.js):**
```javascript
const deliveriesData = deliveries.map(d => ({
    'Outlet Code': d.outlet_code,
    'Outlet Name': d.outlet_name,
    'Pallet ID': d.pallet_id,
    'Transfer Count': d.total_count,
    'Loaded By (Warehouse)': d.scanned_loading_by_name || '-',
    'Driver Signature': d.loaded_by_name || '-',
    'Loaded At': formatDate(d.loaded_at),
    'Unloaded By (Driver)': d.scanned_unloading_by_name || '-',
    'Outlet Signature': d.received_by_name || '-',
    'Delivered At': formatDate(d.delivered_at),
    'Status': d.status
}))
```

---

## 🎯 User Flow Example

### Warehouse Loading:
1. **Warehouse Staff** (e.g., John) logs in and scans pallets
   - System tracks: `scanned_loading_by_name = "John"`
2. When complete, **Driver** (e.g., Ahmad) signs off
   - System tracks: `loaded_by_name = "Ahmad"`

### Report Shows:
- Loaded By (Warehouse): John
- Driver Signature: Ahmad

### Outlet Unloading:
1. **Driver** (e.g., Ahmad, warehouse_staff role) logs in and scans pallets at outlet
   - System tracks: `scanned_unloading_by_name = "Ahmad"`
2. When complete, **Outlet Staff** (e.g., Sarah) signs off
   - System tracks: `received_by_name = "Sarah"`

### Report Shows:
- Unloaded By (Driver): Ahmad
- Outlet Signature: Sarah

---

## 📝 Files Modified

1. `/home/user/flutter_app/public/static/app.js`
   - Added debug logging in `handleWarehouseScan()`
   - Updated report table columns
   - Updated Excel export columns

2. `/home/user/flutter_app/src/index.tsx`
   - Added server-side debug logging in `/api/warehouse/scan-pallet`
   - Updated `/api/warehouse/complete` to track warehouse staff separately
   - Updated `/api/outlet/complete` to track driver separately

---

## 🔍 Testing Instructions

### APK Debug Testing:
1. Build and install updated APK
2. Connect device via USB
3. Enable USB debugging
4. Open Chrome: `chrome://inspect/#devices`
5. Inspect WebView
6. Select delivery date
7. Scan pallet
8. Check console for debug output

### Report Testing:
1. Complete loading process (warehouse staff scans, driver signs)
2. Complete unloading process (driver scans, outlet staff signs)
3. Go to Reports page
4. Check Delivery Report table shows all 4 user names correctly
5. Export to Excel
6. Verify Excel has all columns with correct user names

---

## 🚀 Deployment Status

Changes committed to Git:
```
commit 95b27e8
Add debug logging for APK and update user tracking in reports

- Add comprehensive debug logging for APK delivery date issue
- Track warehouse staff name separately from driver signature in loading
- Track driver name separately from outlet signature in unloading
- Update report table to show: Loaded By (Warehouse), Driver Signature, Unloaded By (Driver), Outlet Signature
- Update Excel export with all user tracking columns
- Add server-side debug logging for troubleshooting
```

**Next Step**: Push to GitHub and deploy to Cloudflare Pages to apply changes.

---

## 📋 Expected Console Output Example

When scanning in APK with delivery date issue:

```
=== WAREHOUSE SCAN DEBUG ===
Input element exists: true
Input element value: 2024-11-18
State delivery date: 2024-11-18
Final delivery date: 2024-11-18
Pallet ID: PALLET001
===========================
✓ Scanning with delivery date: 2024-11-18
📤 Sending API request: {pallet_id: "PALLET001", delivery_date: "2024-11-18"}

--- Server Console ---
=== SERVER SCAN DEBUG ===
User: warehouse1 ( John Doe )
Pallet ID: PALLET001
Delivery date received: 2024-11-18
Delivery date type: string
========================

📥 API response: {success: true, pallet_id: "PALLET001", ...}
✅ Scan successful!
```

If date is missing:
```
=== WAREHOUSE SCAN DEBUG ===
Input element exists: true
Input element value: undefined
State delivery date: undefined
Final delivery date: undefined
Pallet ID: PALLET001
===========================
❌ No delivery date found!
```

This will help identify exactly where the date value is lost in the APK environment.
