# 📊 Sample Import Template

This document explains the Excel import format for APD OASIS.

## Excel Format Requirements

The system reads specific columns from your Excel file:

| Column | Field Name | Description | Required |
|--------|------------|-------------|----------|
| E | Store Code | Outlet/Store code (e.g., A001, B002) | Yes |
| F | Store Name | Outlet/Store name | Yes |
| G | Pallet ID | Pallet identifier (items with same ID grouped) | Yes |
| V | Transfer No | Individual transfer number | Yes |

## Important Notes

1. **Same Pallet ID = One Parcel**: All rows with the same Pallet ID will be combined into a single parcel
2. **Column Positions Matter**: The system reads fixed columns (E, F, G, V), not column names
3. **First Row**: Can be header row or data row (system skips empty rows)
4. **Transfer Numbers**: Each transfer number should be unique

## Sample Data Structure

```
| A | B | C | D | E (Code) | F (Name) | G (Pallet) | ... | V (Transfer) |
|---|---|---|---|----------|----------|------------|-----|--------------|
| - | - | - | - | A001     | Store A  | PAL-001    | ... | TN-00001    |
| - | - | - | - | A001     | Store A  | PAL-001    | ... | TN-00002    |
| - | - | - | - | A001     | Store A  | PAL-001    | ... | TN-00003    |
| - | - | - | - | B002     | Store B  | PAL-002    | ... | TN-00004    |
| - | - | - | - | B002     | Store B  | PAL-002    | ... | TN-00005    |
```

**Result After Import:**
- **Store A (A001)**: 1 parcel (PAL-001) with 3 transfer numbers
- **Store B (B002)**: 1 parcel (PAL-002) with 2 transfer numbers

## Creating Test Data

### Option 1: Manual Excel Creation

1. Open Excel or Google Sheets
2. Create columns A through V (at least)
3. In column E: Add outlet codes (A001, B002, C003)
4. In column F: Add outlet names
5. In column G: Add pallet IDs (can repeat for same outlet)
6. In column V: Add unique transfer numbers
7. Save as `.xlsx` file

### Option 2: Sample Test Data

Create an Excel file with this sample data:

**Outlet A (Code: A001)**
- Pallet PAL-A-001: Transfer numbers TN-A-001, TN-A-002, TN-A-003
- Pallet PAL-A-002: Transfer numbers TN-A-004, TN-A-005

**Outlet B (Code: B002)**
- Pallet PAL-B-001: Transfer numbers TN-B-001, TN-B-002, TN-B-003, TN-B-004

**Outlet C (Code: C003)**
- Pallet PAL-C-001: Transfer numbers TN-C-001, TN-C-002

**Total**: 3 outlets, 4 parcels, 12 transfer numbers

## Import Process Flow

```
Excel File Upload
    ↓
System reads columns E, F, G, V
    ↓
Groups by Pallet ID
    ↓
Creates Parcels (one per Pallet ID)
    ↓
Creates Transfer Details (individual tracking)
    ↓
Ready for Warehouse Scanning
```

## Validation Rules

The system validates:

✅ **Required Fields**: All four columns must have data
✅ **Unique Transfers**: Transfer numbers should be unique (duplicates may cause issues)
✅ **Grouping Logic**: Same Pallet ID → Same Parcel
✅ **Outlet Matching**: Outlet code must match when unloading

## Common Import Issues

### Issue: Import shows 0 parcels

**Cause**: Required columns are empty or in wrong position
**Solution**: Verify columns E, F, G, V have data

### Issue: Too many/few parcels created

**Cause**: Pallet IDs not grouped correctly
**Solution**: Check Pallet ID column (G) - same ID should be for same parcel

### Issue: Cannot scan transfer numbers after import

**Cause**: Transfer numbers don't match imported data
**Solution**: Verify transfer numbers in column V are correct

## Quick Test Steps

1. **Create Test File**:
   - Simple Excel with 5-10 rows
   - Use columns E, F, G, V
   - 2-3 different outlets
   - 2-3 pallets per outlet

2. **Import in System**:
   - Login as admin
   - Go to Import page
   - Upload file
   - Verify preview shows correct counts

3. **Test Scanning**:
   - Go to Warehouse page
   - Scan one transfer number from import
   - Should show success message

4. **Complete Workflow**:
   - Scan all transfers for one outlet
   - Complete loading
   - Go to Outlet page
   - Select that outlet
   - Scan transfers again
   - Complete unloading

## Excel Template Download

To create a proper template:

1. Create Excel file with these exact column headers:
```
A: Reference
B: Date
C: Item
D: Quantity
E: Store Code
F: Store Name
G: Pallet ID
H-U: (any other data)
V: Transfer No
```

2. Fill sample data in columns E, F, G, V
3. Save as `Pick_and_Pack_Template.xlsx`
4. Use this template for all imports

## Data Entry Best Practices

- **Consistent Codes**: Use consistent outlet code format (e.g., A001, A002, not a001 or A1)
- **Clear Pallet IDs**: Use readable pallet IDs (PAL-001, not random strings)
- **Sequential Transfer Numbers**: Easier to track (TN-00001, TN-00002, etc.)
- **Complete Data**: Don't leave required columns empty
- **Test Small First**: Import 5-10 rows first to verify format

## Production Recommendations

1. **Standardize Format**: Create official template and train staff
2. **Validation Before Import**: Check Excel before uploading
3. **Regular Exports**: Export Pick & Pack reports in correct format
4. **Error Checking**: Review import preview before confirming
5. **Backup Data**: Keep original Excel files as backup

---

For questions about import format, contact your system administrator.
