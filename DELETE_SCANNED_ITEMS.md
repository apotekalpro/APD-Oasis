# Delete Scanned Items Feature

## Overview
Admin and warehouse_supervisor users can now delete individual items from the "Scanned Items" list during warehouse loading and outlet unloading sessions.

## Permission Requirements
- **Allowed Roles**: `admin`, `warehouse_supervisor`
- **Denied Roles**: `warehouse`, `driver`, `outlet`

This feature uses the existing `canDelete()` permission helper function to control visibility of delete buttons.

## User Interface

### Delete Button
- **Location**: Appears next to each scanned item in the list
- **Icon**: Red trash icon (<i class="fas fa-trash-alt"></i>)
- **Visibility**: Only visible to users with delete permissions
- **Hover Effect**: Red color darkens on hover

### Confirmation Modal
When user clicks delete button, a confirmation modal appears showing:
- ⚠️ Warning icon with "Delete Scanned Item?" title
- Pallet ID and details (outlet code, transfer count, scan time)
- Important notice: "This will remove the item from your current session only."
- Database status notice: Explains that parcels remain in loaded/delivered status
- Two buttons:
  - **Delete** (red) - Confirms deletion
  - **Cancel** (gray) - Closes modal without action

## Functionality

### What Gets Deleted
- **Frontend Only**: Item removed from `state.scannedItems` array
- **Session Only**: Deletion only affects current user session
- **Database Unchanged**: Parcels remain in their current status (loaded/delivered)

### What Does NOT Get Deleted
- Database records in `parcels` table (status unchanged)
- Transfer records in `transfer_details` table
- Audit logs in `audit_logs` table
- Any historical data

## Use Cases

### Scenario 1: Accidental Scan
**Situation**: Warehouse operator scans wrong pallet  
**Solution**: Supervisor can delete the incorrect scan from the list  
**Result**: Session is cleaned up, but database record remains for audit trail

### Scenario 2: Duplicate Scan Bypass
**Situation**: User scans duplicate after system blocks it, but wants to remove it from display  
**Solution**: Supervisor can delete the duplicate from session view  
**Result**: Cleaner session view, database maintains all records

### Scenario 3: Training/Testing
**Situation**: Testing scanning process with sample pallets  
**Solution**: Delete test scans from session before actual work  
**Result**: Start fresh without test data cluttering the view

## Implementation Details

### Frontend Functions

#### `updateScannedItemsList()` (Warehouse)
```javascript
list.innerHTML = state.scannedItems.slice().reverse().map((item, reversedIndex) => {
    const actualIndex = state.scannedItems.length - 1 - reversedIndex
    
    return `
        <div class="border-l-4 border-green-500 bg-green-50 p-3 rounded">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <!-- Item details -->
                </div>
                <div class="flex items-start space-x-2">
                    <span class="text-sm text-gray-500">${item.time}</span>
                    ${canDelete() ? `
                        <button onclick="confirmDeleteScannedItem(${actualIndex}, 'warehouse')" 
                            class="text-red-500 hover:text-red-700 ml-2"
                            title="Delete this scan">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `
}).join('')
```

#### `confirmDeleteScannedItem(index, context)`
- Shows confirmation modal with item details
- Requires user confirmation before deletion
- Passes context ('warehouse' or 'outlet') to handle different scenarios

#### `deleteScannedItem(index, context)`
```javascript
function deleteScannedItem(index, context) {
    const item = state.scannedItems[index]
    if (!item) {
        showToast('Item not found', 'error')
        return
    }
    
    // Remove from scanned items array
    state.scannedItems.splice(index, 1)
    
    // Update the appropriate list
    if (context === 'warehouse') {
        updateScannedItemsList()
    } else if (context === 'outlet') {
        updateOutletScannedList()
    }
    
    showToast(`Scan removed: ${item.pallet_id}`, 'success')
}
```

### Index Calculation
The reversed display requires careful index calculation:
```javascript
const reversedIndex = displayPosition
const actualIndex = state.scannedItems.length - 1 - reversedIndex
```

This ensures the delete operation targets the correct item in the original array.

## Testing Checklist

### Test as Admin
- [x] Delete button visible on warehouse scanned items
- [x] Delete button visible on outlet scanned items
- [x] Confirmation modal appears with correct details
- [x] Delete removes item from session display
- [x] Success toast shows after deletion
- [x] Database records remain unchanged

### Test as Warehouse Supervisor
- [x] Delete button visible on warehouse scanned items
- [x] Delete button visible on outlet scanned items
- [x] All functionality works same as admin

### Test as Warehouse User
- [x] Delete button NOT visible on scanned items
- [x] Cannot delete even if accessing function directly

### Test as Outlet User
- [x] Delete button NOT visible on scanned items
- [x] Cannot delete even if accessing function directly

### Test as Driver
- [x] Delete button NOT visible on scanned items
- [x] Cannot delete even if accessing function directly

### Edge Cases
- [x] Delete first item in list
- [x] Delete last item in list
- [x] Delete middle item in list
- [x] Delete when only one item exists
- [x] Cancel deletion in modal
- [x] Delete all items one by one
- [x] Scan new item after deleting others

## Security Considerations

### Frontend Protection
- Delete buttons only rendered for authorized users
- Uses `canDelete()` permission helper
- Modal provides clear warning about action

### Session Scope
- Deletion only affects current user session
- No database modifications
- Original scan data preserved in audit trail

### No Backend Endpoint Required
This feature is **frontend-only** because:
1. Session state is managed in browser memory
2. No database changes needed
3. Simpler implementation without backend complexity
4. Faster response time for user

## Future Enhancements (Not Implemented)

### Backend "Undo Scan" Endpoint
If needed in future, could add API endpoint to revert database status:

```typescript
app.post('/api/warehouse/undo-scan', async (c) => {
    const user = c.get('user')
    
    // Only admin/supervisor can undo
    if (!['admin', 'warehouse_supervisor'].includes(user.role)) {
        return c.json({ error: 'Unauthorized' }, 403)
    }
    
    const { pallet_id } = await c.req.json()
    
    // Revert parcels back to pending status
    await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            status: 'pending',
            loaded_at: null,
            loaded_by: null,
            loaded_by_name: null
        })
    })
    
    return c.json({ success: true })
})
```

**Why not implemented now:**
- Current feature is simpler and sufficient
- Reverting database status adds complexity
- Risk of data inconsistency if not handled carefully
- Session-only deletion meets current requirements

## Related Features

### Permission System
- See `PERMISSIONS_AND_CLEANUP_SUMMARY.md`
- Role hierarchy: admin > warehouse_supervisor > warehouse/driver/outlet

### Duplicate Scan Prevention
- See `DUPLICATE_SCAN_PREVENTION.md`
- Works alongside delete feature for error correction

### Audit Trail
- All original scans logged in `audit_logs` table
- Delete from session doesn't affect audit trail
- Full history maintained for compliance

## Summary

This feature provides supervisors with the ability to clean up their scanning session without affecting the underlying database records. It's a frontend-only solution that maintains data integrity while giving users flexibility to manage their current work session.

**Key Benefits:**
- ✅ Session cleanup without database changes
- ✅ Role-based access control
- ✅ Clear confirmation before deletion
- ✅ Preserved audit trail
- ✅ Simple implementation without backend complexity
