# 📊 Pick & Pack Report Format Guide

## Overview

APD OASIS is now configured to import the standard DC Pick & Pack Report format.

---

## 📋 File Format

### Standard Pick & Pack Report Structure:

```
Row 1-14:  Report header information (company, DC, dates, etc.)
Row 15:    Column headers (NO, DISTRIBUTION CENTER, PICKING NUMBER, etc.)
Row 16+:   Data rows (actual transfer records)
```

---

## 🔍 Required Columns

The system reads these specific columns:

| Column | Letter | Index | Field Name | Description | Example |
|--------|--------|-------|------------|-------------|---------|
| **E** | E | 4 | STORE CODE | Outlet/Store code | 2018, 0101 |
| **F** | F | 5 | STORE NAME | Full store name | JKJBJR1 - APOTEK ALPRO... |
| **G** | G | 6 | PALLET ID | Pallet identifier | F10010012494 |
| **V** | V | 21 | TRANSFER NO | Transfer number | 10663 |

### Column Details:

**Column E (STORE CODE):**
- Numeric store code
- Example: 2018, 0101, 0205

**Column F (STORE NAME):**
- Format: `[Short Code] - [Full Name]`
- Example: `JKJBJR1 - APOTEK ALPRO EXPRESS JOGLO RAYA`
- System extracts both short code and full name

**Column G (PALLET ID):**
- Unique pallet identifier
- Example: F10010012494
- **Important:** Multiple rows with same Pallet ID = ONE parcel

**Column V (TRANSFER NO):**
- Individual transfer number
- Example: 10663
- Each transfer number can be scanned separately

---

## 📦 Grouping Logic

### How Parcels Are Created:

```
Pallet ID: F10010012494
├── Transfer No: 10663 (Row 16)
├── Transfer No: 10663 (Row 17)
└── Transfer No: 10663 (Row 20)

Result: 1 Parcel with 3 Transfer Numbers
```

**Same Pallet ID** = **One Parcel** (even if different rows)

---

## 📝 Sample Data

### From Your Test File:

```
Row 16:
  Store Code: 2018
  Store Name: JKJBJR1 - APOTEK ALPRO EXPRESS JOGLO RAYA
  Pallet ID: F10010012494
  Transfer No: 10663

Row 17:
  Store Code: 2018
  Store Name: JKJBJR1 - APOTEK ALPRO EXPRESS JOGLO RAYA
  Pallet ID: F10010012494
  Transfer No: 10663

Row 18:
  Store Code: 0101
  Store Name: JBBGTC1 - APOTEK ALPRO TAMAN CILEUNGSI
  Pallet ID: F10010011087
  Transfer No: 10389
```

**Result After Import:**
- **Store 2018**: 1 parcel (F10010012494) with 2+ transfers
- **Store 0101**: 1 parcel (F10010011087) with 1 transfer

---

## 🚀 Import Process

### Step 1: Prepare File
- Export Pick & Pack Report from DC system
- Save as `.xlsx` or `.xls` file
- No need to modify the file!

### Step 2: Login as Admin
1. Go to APD OASIS
2. Login: `admin` / `admin123`
3. Navigate to **Import** page

### Step 3: Upload File
1. Click "Select Excel file"
2. Choose your Pick & Pack Report
3. System automatically:
   - Detects header at Row 15
   - Reads data from Row 16+
   - Groups by Pallet ID
   - Creates parcels

### Step 4: Preview & Confirm
1. Review the preview:
   - Number of parcels
   - Outlets involved
   - Transfer counts
2. Click **Confirm Import**
3. Wait for success message

---

## ✅ Validation Rules

The system validates:

### Required Data:
- ✅ Store Code must exist (Column E)
- ✅ Pallet ID must exist (Column G)
- ✅ Transfer No must exist (Column V)
- ⚠️ Store Name optional (Column F)

### Data Processing:
- Skips rows with missing required columns
- Trims whitespace from all fields
- Converts to strings for consistency
- Groups by exact Pallet ID match

---

## 📊 What Gets Created

### In Database:

**1. Import Record**
```
Import ID: UUID
Import Date: 2025-11-15
Imported By: admin
Total Parcels: 15
Status: active
```

**2. Parcel Records** (Grouped by Pallet ID)
```
Parcel:
  Outlet Code: 2018
  Outlet Name: APOTEK ALPRO EXPRESS JOGLO RAYA
  Pallet ID: F10010012494
  Transfer Numbers: [10663, 10663, 10663]
  Total Count: 3
  Status: pending
```

**3. Transfer Details** (Individual tracking)
```
Transfer Detail:
  Transfer Number: 10663
  Pallet ID: F10010012494
  Outlet Code: 2018
  Status: pending
  Scanned Loading: false
  Scanned Unloading: false
```

---

## 🔄 Complete Workflow

```
1. Admin imports Pick & Pack Report
   ↓
2. System creates parcels (grouped by Pallet ID)
   ↓
3. Warehouse sees all pending parcels
   ↓
4. Warehouse scans Transfer Numbers during loading
   ↓
5. System tracks: Pallet F10010012494
      Transfer 10663: ✓ Scanned (1/3)
      Transfer 10663: ✓ Scanned (2/3)
      Transfer 10663: ✓ Scanned (3/3)
   ↓
6. All transfers scanned → Parcel status: loaded
   ↓
7. Driver delivers to outlet
   ↓
8. Outlet scans same Transfer Numbers
   ↓
9. All confirmed → Parcel status: delivered
```

---

## 🧪 Testing with Sample File

### Using `20251114_091939_DC_PickedPacked_92021437-test.xlsx`:

**Expected Results:**
- Total data rows: 6 (rows 16-21)
- Parcels created: ~3-4 (depends on unique Pallet IDs)
- Outlets involved: 2-3 different stores

**Test Steps:**
1. Login as admin
2. Go to Import page
3. Upload the test file
4. Verify preview shows correct grouping
5. Confirm import
6. Check Warehouse page - should see the parcels

---

## ❌ Common Issues

### Issue: "No valid data found"

**Causes:**
- File doesn't have data starting at Row 16
- Required columns (E, G, V) are empty
- Wrong file format

**Solution:**
- Verify file has Row 15 as header
- Check Row 16+ has data
- Ensure columns E, G, V have values

### Issue: "Wrong number of parcels created"

**Cause:**
- Pallet IDs not matching expectations

**Solution:**
- Check Pallet ID column (G) carefully
- Same Pallet ID = One Parcel
- Different Pallet ID = Different Parcel

### Issue: "Cannot scan transfer numbers"

**Cause:**
- Transfer numbers in system don't match physical boxes

**Solution:**
- Verify Column V (Transfer No) imported correctly
- Check for extra spaces or formatting
- Ensure transfer numbers are consistent

---

## 📱 After Import

### Warehouse Team:
1. Open Warehouse page
2. See all imported parcels by outlet
3. Scan Transfer Numbers when loading
4. Complete loading with signature

### Outlet Team:
1. Login with outlet credentials
2. See parcels assigned to their outlet
3. Scan Transfer Numbers when receiving
4. Complete unloading with signature

### Reports:
- Track all deliveries with timestamps
- View error parcels (if any)
- Export Excel reports anytime

---

## 🔧 Advanced Features

### Multiple Imports:
- Import multiple Pick & Pack reports
- Each import tracked separately
- All parcels visible in Warehouse view

### Date Filtering:
- Filter reports by import date
- Track daily/weekly/monthly deliveries
- Export filtered data

### Error Handling:
- Wrong transfer number → Error log
- Already scanned → Error log
- Wrong outlet → Error log
- All traceable in reports

---

## 📊 File Specifications

### Supported Formats:
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)

### File Size:
- Tested up to 10MB
- Thousands of rows supported
- No practical limit

### Required Structure:
- Row 15: Header row (mandatory)
- Row 16+: Data rows
- Columns E, F, G, V: Required positions

---

## ✅ Best Practices

### For DC Team:
1. Export Pick & Pack Report as-is (no modifications needed)
2. Use consistent Pallet ID format
3. Ensure Transfer Numbers are unique per day
4. Double-check Store Codes are correct

### For Admin:
1. Import daily Pick & Pack reports
2. Verify preview before confirming
3. Check total parcels matches expectations
4. Monitor warehouse progress

### For Warehouse:
1. Review imported parcels before loading
2. Scan all Transfer Numbers systematically
3. Complete loading only when all scanned
4. Report any mismatches immediately

---

## 📞 Support

### Import Issues:
- Check file format (Row 15 header, Row 16+ data)
- Verify required columns exist (E, F, G, V)
- Try sample file first for testing

### Data Issues:
- Verify Pallet IDs group correctly
- Check Transfer Numbers are unique
- Confirm Store Codes match outlets in system

### Technical Issues:
- Check browser console (F12) for errors
- Verify file size is reasonable (<10MB)
- Try different browser if issues persist

---

## 🎓 Training Summary

**For Admin/Import Team:**
1. Export Pick & Pack Report from DC system
2. Upload to APD OASIS Import page
3. Review preview (parcels grouped by Pallet ID)
4. Confirm import
5. Notify warehouse team

**Key Points:**
- ✅ No file modification needed
- ✅ System auto-detects format
- ✅ Groups by Pallet ID automatically
- ✅ Ready for warehouse scanning

---

**Last Updated**: November 15, 2025  
**Format Version**: DC Pick & Pack Report Standard  
**Compatible With**: APD OASIS v1.1.0+
