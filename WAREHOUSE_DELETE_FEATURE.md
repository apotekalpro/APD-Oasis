# 🗑️ Warehouse Delete Feature Guide

## Overview

The warehouse page now includes detailed view and delete functionality for managing transfers.

---

## 🎯 New Features

### 1️⃣ **View Outlet Details**
Click "Details" button on any outlet to see:
- ✅ Complete list of all transfers for that outlet
- ✅ Pallet ID for each transfer
- ✅ Scan status (Scanned/Pending)
- ✅ Scan timestamp
- ✅ Visual color coding (green for scanned, white for pending)

### 2️⃣ **Delete Individual Transfer**
- Click trash icon on any transfer to delete it
- Confirmation prompt before deletion
- Automatically updates parcel counts
- Removes parcel if last transfer is deleted

### 3️⃣ **Delete All Outlet Transfers**
- Click "Delete All" button on outlet card
- Or click "Delete All Transfers" in details modal
- Confirmation prompt shows total count
- Deletes all transfers and parcels for that outlet

---

## 🖱️ How to Use

### View Outlet Details:

1. **Navigate to Warehouse Page**
   - Login as admin or warehouse user
   - Go to Warehouse section

2. **Click Details Button**
   - Find the outlet in the summary
   - Click "Details" button
   - Modal opens with all transfers

3. **Review Information**
   - See all transfer numbers
   - Check scan status
   - View pallet IDs
   - Identify which are scanned/pending

### Delete Single Transfer:

1. **Open Outlet Details**
   - Click "Details" on outlet card

2. **Find Transfer to Delete**
   - Scroll through the list
   - Locate the specific transfer

3. **Click Delete Icon**
   - Click trash button on the right
   - Confirm deletion in popup
   - Transfer immediately removed

4. **System Updates**
   - Transfer deleted from database
   - Parcel count updated
   - If last transfer, parcel also deleted
   - View refreshes automatically

### Delete All Outlet Transfers:

**Method 1: From Outlet Card**
1. Find outlet in summary
2. Click "Delete All" button
3. Confirm deletion
4. All transfers removed

**Method 2: From Details Modal**
1. Click "Details" on outlet
2. Click "Delete All Transfers" at bottom
3. Confirm deletion
4. All transfers removed

---

## ⚠️ Important Notes

### Confirmation Required:
- ✅ All delete actions require confirmation
- ✅ Shows count of items to be deleted
- ✅ Cannot be undone
- ✅ Clear warning messages

### Permission Control:
- ✅ Only **admin** and **warehouse** roles can delete
- ❌ Drivers cannot delete
- ❌ Outlets cannot delete
- ✅ Enforced at backend API level

### Database Operations:
- When deleting single transfer:
  - Transfer detail record deleted
  - Parcel counts updated
  - If last transfer, parcel deleted
- When deleting outlet:
  - All transfer details deleted
  - All parcels deleted
  - Complete cleanup

---

## 🎨 UI Features

### Outlet Details Modal:

```
┌─────────────────────────────────────────────┐
│ [X] 0101 - APOTEK ALPRO TAMAN CILEUNGSI    │
│     Scanned: 2 / 5 transfers                │
├─────────────────────────────────────────────┤
│                                              │
│ ┌─────────────────────────────────────┐    │
│ │ 10663 [SCANNED] 🗑️                  │    │
│ │ Pallet: F10010012494                │    │
│ │ Scanned: 2025-11-15 10:30:00        │    │
│ └─────────────────────────────────────┘    │
│                                              │
│ ┌─────────────────────────────────────┐    │
│ │ 10664 [PENDING] 🗑️                  │    │
│ │ Pallet: F10010012494                │    │
│ └─────────────────────────────────────┘    │
│                                              │
├─────────────────────────────────────────────┤
│ [Delete All Transfers (5)]  [Close]        │
└─────────────────────────────────────────────┘
```

### Color Coding:
- **Green background**: Scanned transfers
- **White background**: Pending transfers
- **Green badge**: "SCANNED" status
- **Gray badge**: "PENDING" status

---

## 🔄 Use Cases

### Use Case 1: Wrong Import
**Scenario**: Imported wrong day's report

**Solution**:
1. Open warehouse page
2. For each outlet, click "Delete All"
3. Confirm deletion
4. Import correct report

### Use Case 2: Duplicate Entry
**Scenario**: Same transfer number imported twice

**Solution**:
1. Click "Details" on affected outlet
2. Find duplicate transfer
3. Click delete on one copy
4. Keep the correct one

### Use Case 3: Wrong Outlet Assignment
**Scenario**: Transfer assigned to wrong outlet

**Solution**:
1. Open details for wrong outlet
2. Delete the specific transfer
3. Re-import or manually add to correct outlet

### Use Case 4: Cancelled Delivery
**Scenario**: Outlet won't receive delivery today

**Solution**:
1. Open warehouse page
2. Find outlet in summary
3. Click "Delete All"
4. Confirm to remove all transfers

### Use Case 5: Clean Up Test Data
**Scenario**: Testing with sample data

**Solution**:
1. After testing, go to warehouse
2. Delete all test outlets one by one
3. System ready for real data

---

## 🛡️ Safety Features

### 1. Confirmation Dialogs
Every delete action shows:
- What will be deleted
- How many items
- Warning that it's permanent
- Cancel button

### 2. Role-Based Security
```javascript
// Backend validation
if (!['admin', 'warehouse'].includes(user.role)) {
  return c.json({ error: 'Forbidden' }, 403)
}
```

### 3. Automatic Cleanup
- Deleting last transfer → Parcel auto-deleted
- Deleting outlet → All related data removed
- No orphaned records left

### 4. Real-time Updates
- Modal refreshes after delete
- Summary updates automatically
- Counts recalculated instantly

---

## 📊 API Endpoints

### Delete Outlet Transfers:
```
DELETE /api/warehouse/outlet/:outlet_code
```
- Deletes all transfers for outlet
- Deletes all parcels for outlet
- Returns success message

### Delete Single Transfer:
```
DELETE /api/warehouse/transfer/:transfer_id
```
- Deletes one transfer detail
- Updates parcel counts
- Deletes parcel if last transfer
- Returns success message

---

## 🧪 Testing

### Test Delete Single Transfer:

1. **Setup**:
   - Import sample Pick & Pack report
   - Verify transfers appear in warehouse

2. **Test**:
   - Open outlet details
   - Click delete on one transfer
   - Confirm deletion
   - Verify transfer removed
   - Check count updated

3. **Expected Result**:
   - Transfer deleted
   - Count: (X-1) / Total
   - Modal refreshes
   - Success message shown

### Test Delete All Outlet:

1. **Setup**:
   - Have outlet with multiple transfers
   - Note the count

2. **Test**:
   - Click "Delete All" button
   - Confirm deletion
   - Wait for success message

3. **Expected Result**:
   - Outlet disappears from summary
   - All transfers gone
   - All parcels removed
   - Database cleaned

---

## 🔧 Troubleshooting

### Issue: Delete button not showing
**Solution**: 
- Check you're logged in as admin or warehouse
- Drivers and outlets cannot delete
- Refresh page if needed

### Issue: Confirmation not appearing
**Solution**:
- Check browser console for errors
- Try different browser
- Clear cache and reload

### Issue: Delete fails
**Causes**:
- Network issue
- Permission denied
- Transfer already deleted

**Solution**:
- Check internet connection
- Verify user role
- Refresh page and try again

### Issue: Outlet still showing after delete
**Solution**:
- Wait a moment and refresh
- Check if delete actually completed
- Look for error messages

---

## 💡 Best Practices

### For Warehouse Team:

1. **Before Deleting**:
   - Double-check it's the right outlet
   - Verify the data is incorrect
   - Consider if partial delete is better

2. **During Deletion**:
   - Read confirmation message carefully
   - Verify count matches expectation
   - Note which outlet you're deleting

3. **After Deletion**:
   - Verify outlet removed from summary
   - Check no transfers remain
   - Import correct data if needed

### For Administrators:

1. **Access Control**:
   - Only give warehouse role to trusted staff
   - Monitor deletion activity
   - Review audit logs regularly

2. **Data Management**:
   - Keep backup of import files
   - Can re-import if deleted by mistake
   - Train staff on proper use

3. **System Maintenance**:
   - Use delete for cleanup
   - Remove test data before production
   - Clean up old completed deliveries

---

## 📱 Mobile Experience

The delete functionality works on mobile:
- ✅ Touch-friendly buttons
- ✅ Clear confirmation dialogs
- ✅ Responsive modal design
- ✅ Easy to tap icons
- ✅ Scrollable lists

---

## ✅ Feature Summary

| Feature | Description | Who Can Use |
|---------|-------------|-------------|
| **View Details** | See all transfers for outlet | Admin, Warehouse, Driver |
| **Delete Transfer** | Remove single transfer | Admin, Warehouse |
| **Delete Outlet** | Remove all outlet transfers | Admin, Warehouse |
| **Confirmation** | Required for all deletes | All users |
| **Auto-refresh** | Updates after deletion | Automatic |

---

## 🎓 Training Summary

**For Warehouse Staff:**

1. **View Details**: Click "Details" to see all transfers
2. **Delete One**: Click trash icon on specific transfer
3. **Delete All**: Click "Delete All" button on outlet
4. **Confirm**: Always read confirmation message
5. **Verify**: Check summary updates after delete

**Key Points:**
- ✅ Deletes are permanent (cannot undo)
- ✅ Confirmation required every time
- ✅ Useful for corrections and cleanup
- ✅ Works on both desktop and mobile

---

## 🔄 Workflow Integration

### Normal Workflow:
```
Import → Scan → Complete → Deliver
```

### With Corrections:
```
Import → Review → Delete Wrong Items → Re-import → Scan → Complete → Deliver
```

### Cleanup:
```
Test Import → Test Scanning → Delete All Test Data → Real Import → Production
```

---

**Last Updated**: November 15, 2025  
**Feature Version**: 1.2.0  
**Compatible With**: APD OASIS v1.2.0+
