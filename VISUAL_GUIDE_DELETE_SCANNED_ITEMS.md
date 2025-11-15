# Visual Guide: Delete Scanned Items Feature

## 📸 User Interface Screenshots Guide

This guide shows what users will see when using the delete scanned items feature.

## 🎭 Role-Based Visibility

### As Admin or Warehouse Supervisor ✅

```
┌─────────────────────────────────────────────────────────┐
│ Scanned Items (3)                                       │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟩 F10010011087                    14:30:25  [🗑️]  │ │ ← DELETE BUTTON VISIBLE
│ │    JKJSTT1 - APOTEK ALPRO TEBET TIMUR              │ │
│ │    15 transfers                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟩 F10010011088                    14:29:18  [🗑️]  │ │ ← DELETE BUTTON VISIBLE
│ │    MKC - APOTEK ALPRO MAMPANG                      │ │
│ │    8 transfers                                      │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟩 F10010011089                    14:28:05  [🗑️]  │ │ ← DELETE BUTTON VISIBLE
│ │    JBB - APOTEK ALPRO JAKBAR                       │ │
│ │    12 transfers                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### As Warehouse Worker ❌

```
┌─────────────────────────────────────────────────────────┐
│ Scanned Items (3)                                       │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟩 F10010011087                    14:30:25        │ │ ← NO DELETE BUTTON
│ │    JKJSTT1 - APOTEK ALPRO TEBET TIMUR              │ │
│ │    15 transfers                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟩 F10010011088                    14:29:18        │ │ ← NO DELETE BUTTON
│ │    MKC - APOTEK ALPRO MAMPANG                      │ │
│ │    8 transfers                                      │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟩 F10010011089                    14:28:05        │ │ ← NO DELETE BUTTON
│ │    JBB - APOTEK ALPRO JAKBAR                       │ │
│ │    12 transfers                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🖱️ User Flow Diagram

### Step 1: Click Delete Button

```
User clicks [🗑️] button → Confirmation Modal Opens
```

### Step 2: Confirmation Modal Appears

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  ⚠️ Delete Scanned Item?                                 ║
║                                                           ║
║  Are you sure you want to delete this scan?              ║
║                                                           ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ 📦 F10010011087                                     │ ║
║  │ JKJSTT1 - APOTEK ALPRO TEBET TIMUR                  │ ║
║  │ 15 transfers • Scanned at 14:30:25                  │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                           ║
║  ℹ️ This will remove the item from your current         ║
║     session only. The parcels will remain in "loaded"    ║
║     status in the database.                              ║
║                                                           ║
║  ┌──────────────────┐  ┌──────────────────┐            ║
║  │  🗑️ Delete      │  │     Cancel       │            ║
║  │  (RED BUTTON)    │  │  (GRAY BUTTON)   │            ║
║  └──────────────────┘  └──────────────────┘            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### Step 3A: User Clicks "Delete"

```
Item Removed → Success Toast → List Refreshes
```

### Step 3B: User Clicks "Cancel"

```
Modal Closes → No Changes → Back to List
```

## 🎯 Success Toast

After successful deletion:

```
┌─────────────────────────────────────────────┐
│ ✅ Scan removed: F10010011087               │
└─────────────────────────────────────────────┘
```

## 📱 Mobile View

### Warehouse Page (Mobile)

```
┌───────────────────────────────┐
│ 📦 Warehouse Loading          │
│                               │
│ ┌───────────────────────────┐ │
│ │ Scan Pallet ID            │ │
│ │ ┌─────────────────────┐   │ │
│ │ │ [_____________]  📷 │   │ │
│ │ └─────────────────────┘   │ │
│ └───────────────────────────┘ │
│                               │
│ ✅ Scanned Items (2)          │
│ ┌───────────────────────────┐ │
│ │ 🟩 F10010011087           │ │
│ │    JKJSTT1 - APOTEK...    │ │
│ │    15 transfers           │ │
│ │    14:30:25        [🗑️]  │ │ ← DELETE BTN
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ 🟩 F10010011088           │ │
│ │    MKC - APOTEK...        │ │
│ │    8 transfers            │ │
│ │    14:29:18        [🗑️]  │ │ ← DELETE BTN
│ └───────────────────────────┘ │
│                               │
│ ┌───────────────────────────┐ │
│ │  Complete Loading         │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

### Confirmation Modal (Mobile)

```
┌─────────────────────────────────┐
│                                 │
│ ⚠️ Delete Scanned Item?        │
│                                 │
│ Are you sure you want to       │
│ delete this scan?              │
│                                 │
│ ┌─────────────────────────────┐│
│ │ 📦 F10010011087             ││
│ │ JKJSTT1 - APOTEK ALPRO...   ││
│ │ 15 transfers                ││
│ │ Scanned at 14:30:25         ││
│ └─────────────────────────────┘│
│                                 │
│ ℹ️ This will remove the item   │
│ from your current session only.│
│ The parcels will remain in     │
│ "loaded" status in database.   │
│                                 │
│ ┌─────────────────────────────┐│
│ │      🗑️ Delete             ││
│ └─────────────────────────────┘│
│ ┌─────────────────────────────┐│
│ │         Cancel              ││
│ └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

## 🎨 Color Coding

### Delete Button States

| State | Color | Icon |
|-------|-------|------|
| Normal | `text-red-500` | 🗑️ |
| Hover | `text-red-700` | 🗑️ (darker) |
| Disabled | N/A (hidden) | - |

### Scanned Item Cards

| Status | Border | Background |
|--------|--------|------------|
| Scanned | `border-l-4 border-green-500` | `bg-green-50` |

### Modal Elements

| Element | Color | Purpose |
|---------|-------|---------|
| Delete Button | `bg-red-500` | Destructive action |
| Cancel Button | `bg-gray-300` | Safe action |
| Warning Icon | `text-red-600` | Alert user |
| Info Message | `text-red-600` | Important notice |

## 🔄 State Changes Diagram

### Before Deletion

```
state.scannedItems = [
  { pallet_id: "F10010011087", ... },  ← Index 0
  { pallet_id: "F10010011088", ... },  ← Index 1
  { pallet_id: "F10010011089", ... }   ← Index 2
]

Display Order (reversed):
  Position 0 → F10010011089 (Index 2)  [🗑️]
  Position 1 → F10010011088 (Index 1)  [🗑️]
  Position 2 → F10010011087 (Index 0)  [🗑️]
```

### User Deletes Index 1

```
Click [🗑️] next to F10010011088 (Index 1)
     ↓
Confirmation Modal Opens
     ↓
User Clicks "Delete"
     ↓
state.scannedItems.splice(1, 1)
     ↓
New state.scannedItems = [
  { pallet_id: "F10010011087", ... },  ← Index 0
  { pallet_id: "F10010011089", ... }   ← Index 1 (was 2)
]
```

### After Deletion

```
Display Order (reversed):
  Position 0 → F10010011089 (Index 1)  [🗑️]
  Position 1 → F10010011087 (Index 0)  [🗑️]

✅ Success Toast: "Scan removed: F10010011088"
```

## 🎬 Animation Sequence

### 1. Button Hover Effect

```
Normal State:    [🗑️] text-red-500
                    ↓
Hover State:     [🗑️] text-red-700 (darker)
                    ↓
Click:           Modal Opens
```

### 2. Modal Fade-In

```
Background:  opacity-0 → opacity-50 (dark overlay)
Card:        scale-95 → scale-100 (slight zoom)
Duration:    ~150ms
```

### 3. List Update

```
Item Deleted → List Re-renders → Cards Shift Up
Duration: Instant (React-like re-render)
```

## 📋 User Interaction Checklist

### For Supervisors:

- [ ] Scan some pallets
- [ ] Verify delete buttons appear
- [ ] Click delete button
- [ ] Read confirmation modal carefully
- [ ] Click "Cancel" to test (modal closes, no changes)
- [ ] Click delete button again
- [ ] Click "Delete" to confirm
- [ ] Verify item removed from list
- [ ] Verify success toast appears
- [ ] Check database (item should still be "loaded")
- [ ] Complete loading process normally

### For Warehouse Workers:

- [ ] Scan some pallets
- [ ] Verify NO delete buttons appear
- [ ] If scan error occurs, call supervisor
- [ ] Continue with normal workflow

## 🎓 Training Scenarios

### Scenario 1: Accidental Wrong Scan

**Setup**: Warehouse operator scans F10010011087 (wrong pallet)

**Steps**:
1. Operator realizes mistake
2. Calls supervisor
3. Supervisor reviews scanned items
4. Supervisor clicks [🗑️] next to F10010011087
5. Modal shows pallet details
6. Supervisor confirms it's wrong pallet
7. Supervisor clicks "Delete"
8. Success toast: "Scan removed: F10010011087"
9. Operator can now scan correct pallet

**Result**: Session cleaned, database intact

### Scenario 2: Duplicate Scan Cleanup

**Setup**: System blocks duplicate but shows in session

**Steps**:
1. Operator scans F10010011087
2. Operator accidentally scans F10010011087 again
3. System shows error: "Duplicate scan!"
4. Item still shows in scanned items list (first scan)
5. Supervisor wants clean display
6. Supervisor could delete the item (optional)
7. Or just continue and complete loading

**Note**: Usually not needed as duplicate prevention blocks second scan

### Scenario 3: End of Shift Cleanup

**Setup**: Training session with test pallets

**Steps**:
1. Trainer scans test pallets: F10010011111, F10010011112
2. Training complete
3. Supervisor wants fresh session for real work
4. Supervisor deletes F10010011111
5. Supervisor deletes F10010011112
6. Scanned items list now empty
7. Ready for actual warehouse operations

**Result**: Clean session, test data removed from display

## 🚨 Error Prevention

### What Users Cannot Do:

❌ Delete items without confirmation  
❌ Delete items if not admin/supervisor  
❌ Delete items that affect database  
❌ Accidentally delete (requires 2 clicks)  
❌ Delete all items at once (one by one only)

### What System Protects:

✅ Database integrity (no status changes)  
✅ Audit trail (all logs preserved)  
✅ Role-based access (permission check)  
✅ User confirmation (modal prevents accidents)  
✅ Clear warnings (explains what will happen)

## 📊 Visual Summary

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  USER FLOW: Delete Scanned Item                           │
│                                                            │
│  1. Admin/Supervisor sees delete button [🗑️]             │
│                    ↓                                       │
│  2. Clicks delete button                                  │
│                    ↓                                       │
│  3. Confirmation modal appears                            │
│     Shows: Pallet ID, Details, Warning                    │
│                    ↓                                       │
│  4. User decides:                                          │
│     • Click "Delete" → Item removed from session          │
│     • Click "Cancel" → Modal closes, no changes           │
│                    ↓                                       │
│  5. If deleted:                                            │
│     • Success toast appears                               │
│     • List refreshes                                       │
│     • Database unchanged                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 🎯 Key Visual Elements

### 1. Delete Icon
- **Symbol**: 🗑️ (Font Awesome trash-alt)
- **Color**: Red (#ef4444)
- **Position**: Right side of each scanned item
- **Size**: Standard icon size (matches time display)

### 2. Confirmation Modal
- **Background**: Dark overlay (50% opacity)
- **Card**: White, rounded corners, centered
- **Width**: Max 28rem (mobile responsive)
- **Padding**: 1.5rem all sides

### 3. Success Toast
- **Position**: Top-center of screen
- **Background**: Green gradient
- **Icon**: ✅ checkmark
- **Duration**: 3 seconds
- **Animation**: Fade in → Stay → Fade out

## ✨ Best Practices for UI/UX

1. **Clear Visual Hierarchy**
   - Scanned items: Green (success)
   - Delete button: Red (danger)
   - Cancel button: Gray (neutral)

2. **Consistent Iconography**
   - 📦 for pallets
   - 🗑️ for delete
   - ⚠️ for warnings
   - ℹ️ for information
   - ✅ for success

3. **Responsive Design**
   - Desktop: Side-by-side buttons
   - Mobile: Stacked buttons
   - Touch-friendly: Large tap targets

4. **Accessibility**
   - Clear labels
   - High contrast colors
   - Screen reader compatible
   - Keyboard navigation support

---

**This visual guide helps users understand the delete scanned items feature through clear diagrams and screenshots descriptions.**
