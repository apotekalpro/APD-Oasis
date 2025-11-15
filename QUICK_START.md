# ⚡ Quick Start Guide - APD OASIS

Get started with APD OASIS in 5 minutes!

## 🚀 Immediate Access

**Development URL**: https://3000-i8ezurtfnv7jlbrg994fh-02b9cc79.sandbox.novita.ai

**Default Login**:
- Username: `admin`
- Password: `admin123`

## ⚠️ CRITICAL FIRST STEP: Setup Database

**Before using the application, you MUST execute the database schema!**

1. Open Supabase: https://ptfnmivvowgiqzwyznmu.supabase.co
2. Go to **SQL Editor**
3. Open file `supabase-schema.sql` from this project
4. Copy ALL content and paste into SQL Editor
5. Click **Run**
6. Wait 5-10 seconds for completion

✅ Without this step, **NOTHING will work**!

## 📋 5-Minute Test Workflow

### Step 1: Login (30 seconds)

1. Open the app URL
2. Enter: `admin` / `admin123`
3. Click Login
4. You should see the Admin dashboard

### Step 2: Add a Test Outlet (1 minute)

1. Click **Admin** in top navigation
2. Under "Outlet Management", click **Add New Outlet**
3. Fill in:
   - **Outlet Code**: TEST1
   - **Outlet Name**: Test Outlet
   - **Address**: Test Address
4. Click **Add Outlet**

### Step 3: Create a Test User (1 minute)

1. In Admin page, under "User Management", click **Add New User**
2. Fill in:
   - **Username**: driver1
   - **Password**: driver123
   - **Full Name**: Test Driver
   - **Role**: Driver
3. Click **Add User**

### Step 4: Create Test Excel File (2 minutes)

Create a simple Excel file with this data:

| Column E | Column F | Column G | Column V |
|----------|----------|----------|----------|
| TEST1 | Test Outlet | PAL-001 | TN-001 |
| TEST1 | Test Outlet | PAL-001 | TN-002 |
| TEST1 | Test Outlet | PAL-001 | TN-003 |

**Important**: Put data in columns E, F, G, and V specifically!

Save as `test-import.xlsx`

### Step 5: Import Data (30 seconds)

1. Click **Import** in navigation
2. Click to select the Excel file you created
3. Review the preview (should show 1 parcel with 3 transfers)
4. Click **Confirm Import**
5. Success message should appear

### Step 6: Test Warehouse Scanning (1 minute)

1. Click **Warehouse** in navigation
2. You should see TEST1 outlet with 3 pending items
3. In the scan input, type: `TN-001`
4. Press Enter or click Scan
5. ✅ You should hear a beep and see success message
6. Try scanning `TN-002` and `TN-003`
7. Progress bar should reach 100%

### Step 7: Complete Loading (30 seconds)

1. Click **Complete Loading Process** button
2. Enter your name (e.g., "John Doe")
3. Click Complete
4. Success message appears

### Step 8: Test Outlet Unloading (1 minute)

1. Click **Outlet** in navigation
2. Click on **TEST1** outlet
3. Scan the same transfer numbers again:
   - `TN-001` ✅
   - `TN-002` ✅
   - `TN-003` ✅
4. All should scan successfully

### Step 9: Complete Unloading (30 seconds)

1. Click **Complete Unloading** button
2. Enter receiver name (e.g., "Store Manager")
3. Click Complete
4. Success!

### Step 10: View Reports (30 seconds)

1. Click **Reports** in navigation
2. Click **Delivery Report**
3. You should see your completed delivery
4. Click **Export Data** to download Excel report

## 🎉 Success!

You've completed the full workflow:
1. ✅ Import data
2. ✅ Warehouse loading
3. ✅ Outlet unloading
4. ✅ Generate reports

## 🔍 What to Test Next

### Admin Functions
- [ ] Add more users with different roles
- [ ] Add multiple outlets
- [ ] Deactivate/activate users
- [ ] Test role-based access control

### Import Variations
- [ ] Import data for multiple outlets
- [ ] Test Pallet ID grouping (multiple transfers per pallet)
- [ ] Import large datasets (50+ rows)

### Scanning Features
- [ ] Test error scenarios (wrong transfer number)
- [ ] Test wrong outlet scanning
- [ ] Test duplicate scan detection
- [ ] Try scanning in different order

### Reports
- [ ] Export reports with filters
- [ ] View error parcel report
- [ ] Check audit logs
- [ ] Test date range filtering

### Mobile Testing
- [ ] Access from mobile browser
- [ ] Test scanning on mobile
- [ ] Test touch interface
- [ ] Check responsive layout

## 🐛 Common First-Time Issues

### Can't Login
**Problem**: "Invalid credentials" error  
**Solution**: Make sure you executed the database schema first!

### Import Shows No Data
**Problem**: Excel import preview is empty  
**Solution**: Check that your data is in columns E, F, G, V (not A, B, C, D)

### Scan Doesn't Work
**Problem**: Transfer number not found  
**Solution**: Make sure you imported data first, and transfer number matches exactly

### Nothing Happens
**Problem**: Buttons don't work  
**Solution**: Open browser console (F12) and check for errors - might be API connection issue

## 📱 Mobile Testing

1. Open the app URL on your mobile device
2. Login and test the interface
3. Test scanning with mobile keyboard
4. Check if buttons are touch-friendly
5. Verify responsive layout works

## 🔐 Security Notes

- ⚠️ Change the default admin password immediately after first login
- 🔒 Create individual accounts for each user (don't share credentials)
- 📝 Review user permissions regularly
- 🗑️ Delete test users/data before going live

## 📞 Need Help?

### Database Not Set Up
→ Follow Step 1 above - execute `supabase-schema.sql`

### Can't Access Application
→ Check the development URL is correct
→ Try refreshing the page
→ Clear browser cache

### Import Not Working
→ Read `SAMPLE_IMPORT_TEMPLATE.md` for Excel format
→ Verify columns E, F, G, V have data
→ Check browser console for errors

### Scanning Issues
→ Make sure data is imported first
→ Transfer numbers must match exactly
→ Check user has correct role (warehouse/driver/outlet)

## 📚 Next Steps

1. **Read Full Documentation**: Check `README.md` for complete features
2. **Deployment Guide**: See `DEPLOYMENT_GUIDE.md` for production setup
3. **Import Template**: Read `SAMPLE_IMPORT_TEMPLATE.md` for Excel format
4. **Production Setup**: Follow deployment guide for Cloudflare Pages
5. **Mobile App**: Consider packaging as Android APK

## ⏰ Time Investment

- **Quick Test**: 5-10 minutes (this guide)
- **Full Testing**: 30-60 minutes (all features)
- **Production Setup**: 2-3 hours (database + deployment)
- **Staff Training**: 1-2 hours per role

## 🎯 Training Recommendations

### For Warehouse Staff
- Focus on Import and Warehouse pages
- Practice scanning workflow
- Understand error messages
- Learn completion process

### For Drivers
- Focus on Warehouse and Outlet pages
- Practice loading and unloading
- Understand outlet selection
- Learn signature process

### For Outlet Staff
- Focus on Outlet page only
- Practice receiving parcels
- Understand scanning validation
- Learn completion signatures

### For Administrators
- Full system understanding
- User management
- Outlet configuration
- Report generation and analysis

---

**Ready to start? Open the app and login!** 🚀

**Development URL**: https://3000-i8ezurtfnv7jlbrg994fh-02b9cc79.sandbox.novita.ai

---

Last Updated: November 15, 2025
