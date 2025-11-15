# 🏪 Outlet Import Guide - APD OASIS

This guide explains how to import all 2,370 outlets from your Excel file and create their login accounts.

## 📋 What Will Be Created

From the **Outlet List 2026.xlsx** file, the system will:

1. **Create 2,370 outlet records** in the database
2. **Create 2,370 user accounts** (one per outlet)

Each outlet will get:
- **Username**: Column B (Short Store Name) - e.g., `JKJSTT1`, `JKJSVR1`
- **Password**: `Alpro@123` (default for all outlets)
- **Outlet Code**: Column A (Store Code) - e.g., `0001`, `0002`
- **Full Name**: Column C (Store Name) - e.g., `APOTEK ALPRO TEBET TIMUR`
- **Role**: `outlet` (restricted access)

## 🔐 Outlet User Permissions

When outlet users login, they will ONLY see:
- ✅ Their own outlet's delivery history
- ✅ Their own outlet's pending parcels
- ✅ Their own outlet's error records
- ✅ Reports filtered to their outlet only
- ✅ Outlet unloading page (auto-selected to their outlet)
- ❌ Cannot see other outlets' data
- ❌ Cannot access admin functions
- ❌ Cannot access warehouse functions
- ❌ Cannot change outlet selection

## ⚠️ Prerequisites

**CRITICAL**: You MUST execute the database schema first!

1. Go to: https://ptfnmivvowgiqzwyznmu.supabase.co
2. Navigate to **SQL Editor**
3. Execute the entire `supabase-schema.sql` file
4. Wait for completion (5-10 seconds)

## 🚀 Import Process

### Step 1: Verify Excel File

The Excel file should be at: `/home/user/webapp/Outlet List 2026.xlsx`

```bash
cd /home/user/webapp
ls -lh "Outlet List 2026.xlsx"
```

You should see: `45.25 KB` (2,370 outlets)

### Step 2: Run Import Script

```bash
cd /home/user/webapp
python3 import-outlets.py
```

**What happens:**
- Reads Excel file (Column A, B, C)
- Creates outlet record in database
- Creates user account for each outlet
- Shows progress every 100 outlets
- Displays final summary

**Expected output:**
```
================================================================================
APD OASIS - Outlet Import Tool
================================================================================

Loading outlets from Outlet List 2026.xlsx...
Loaded 2370 outlets from Excel

Processing 2370 outlets...
================================================================================

[1/2370] Processing: 0001 - JKJSTT1
  ✓ Outlet created
  ✓ User created (username: JKJSTT1, password: Alpro@123)

[2/2370] Processing: 0002 - JKJSVR1
  ✓ Outlet created
  ✓ User created (username: JKJSVR1, password: Alpro@123)

...

--- Progress: 100/2370 outlets processed ---
--- Progress: 200/2370 outlets processed ---
...
--- Progress: 2300/2370 outlets processed ---

================================================================================
IMPORT SUMMARY
================================================================================
Total outlets processed: 2370

Outlets:
  Created:        2370
  Already exists: 0
  Failed:         0

Users:
  Created:        2370
  Already exists: 0
  Failed:         0

================================================================================
✓ Import completed!
Default password for all outlets: Alpro@123
================================================================================
```

**Time estimate**: 5-10 minutes (depending on network speed)

### Step 3: Verify Import

Check in Supabase:
1. Go to **Table Editor**
2. Open `outlets` table - should see 2,370 records
3. Open `users` table - should see 2,371 records (2370 outlets + 1 admin)

## 🧪 Test Outlet Login

After import, test with any outlet:

1. **Open Application**: https://3000-i8ezurtfnv7jlbrg994fh-02b9cc79.sandbox.novita.ai
2. **Logout** if already logged in
3. **Login with outlet credentials**:
   - Username: `JKJSTT1` (or any Short Store Name from Excel)
   - Password: `Alpro@123`
4. **Verify access**:
   - Should see only Outlet and Reports pages
   - Cannot see Admin, Import, or Warehouse pages
   - Outlet page auto-selects their outlet
   - Cannot change outlet selection
   - Reports show only their outlet's data

## 📊 Sample Outlet Accounts

Here are some test outlets you can use:

| Username | Store Code | Store Name |
|----------|------------|------------|
| JKJSTT1 | 0001 | APOTEK ALPRO TEBET TIMUR |
| JKJSVR1 | 0002 | APOTEK ALPRO VETERAN RAYA |
| JKJBTM1 | 0003 | APOTEK ALPRO TOMANG |
| JKJSBZ1 | 0004 | APOTEK ALPRO BELLEZA |
| BTTSGV1 | 0005 | APOTEK ALPRO GOLDEN VIENNA |

**All use password**: `Alpro@123`

## 🔄 Re-running Import

If import fails or you need to re-run:

**Option 1: Delete and re-import**
```sql
-- In Supabase SQL Editor
DELETE FROM users WHERE role = 'outlet';
DELETE FROM outlets;
```

Then run the import script again.

**Option 2: Update existing**
The script will skip outlets/users that already exist (no duplicates).

## 🔧 Troubleshooting

### Error: "No module named 'openpyxl'"
```bash
pip3 install openpyxl requests
```

### Error: "Connection refused" or "Failed to connect"
- Check internet connection
- Verify Supabase URL is correct
- Verify Supabase Service Key is correct

### Error: "Duplicate key value violates unique constraint"
- Outlet or user already exists
- Either skip or delete existing records first

### Import is very slow
- Normal for 2,370 records over network
- Each record requires 2 API calls (outlet + user)
- Total: ~4,740 API calls
- Expected time: 5-10 minutes

### Some outlets failed to import
- Check the error message in output
- Most common: network timeout or invalid data
- Re-run script (will skip successful ones)
- Check failed outlets manually

## 📝 Post-Import Tasks

### 1. Change Default Password (Recommended)

For security, you may want to:
- Force password change on first login (requires code update)
- Send unique passwords to each outlet (requires email system)
- Keep default password but secure the system with other measures

### 2. Notify Outlets

Send communication to all outlets with:
- Application URL
- Their username (Short Store Name)
- Default password: `Alpro@123`
- Instructions on how to login
- What they can access

### 3. Test Key Outlets

Before full rollout:
- Test with 5-10 key outlets
- Verify they can login
- Verify they only see their data
- Verify scanning works
- Verify reports work

### 4. Monitor First Week

After rollout:
- Monitor error logs
- Check for failed logins
- Verify outlets are using the system
- Gather feedback

## 🔐 Security Best Practices

### Password Management
- ✅ All outlets start with same password (easy rollout)
- ⚠️ Consider implementing password change requirement
- ✅ Passwords stored securely in database
- ✅ JWT tokens for session management

### Access Control
- ✅ Outlet users can only see their own data
- ✅ Backend enforces outlet_code filtering
- ✅ Frontend hides unauthorized functions
- ✅ Role-based access control

### Recommendations
1. Implement password expiry (force change after 90 days)
2. Add password complexity requirements
3. Implement account lockout after failed attempts
4. Add audit logging for all outlet actions
5. Consider 2FA for high-value outlets

## 📱 Mobile App Considerations

When packaging as Android APK:
- Store credentials securely (Android Keystore)
- Implement biometric authentication option
- Add offline mode for viewing history
- Sync when connection restored

## 🆘 Support

### For Import Issues
- Check Python is installed: `python3 --version`
- Check openpyxl: `pip3 list | grep openpyxl`
- Check network: `curl -I https://ptfnmivvowgiqzwyznmu.supabase.co`

### For Access Issues
- Verify outlet exists in database
- Check username spelling (case-sensitive)
- Verify password: `Alpro@123` (case-sensitive)
- Check user is active (is_active = true)

### For Data Issues
- Verify outlet_code matches between users and outlets tables
- Check parcels have correct outlet_code
- Test with admin account first to ensure system works

## ✅ Success Checklist

- [ ] Database schema executed successfully
- [ ] Excel file in correct location
- [ ] Python and openpyxl installed
- [ ] Import script completed without errors
- [ ] 2,370 outlets created in database
- [ ] 2,370 users created with outlet role
- [ ] Test login successful with sample outlet
- [ ] Outlet can only see their own data
- [ ] Reports filtered correctly
- [ ] Outlet page auto-selects their outlet
- [ ] Cannot access admin/warehouse functions

## 📞 Contact

For questions or issues with outlet import:
1. Check this guide first
2. Review error messages from import script
3. Check Supabase dashboard for database status
4. Contact system administrator

---

**Ready to import?**

```bash
cd /home/user/webapp
python3 import-outlets.py
```

**Expected time**: 5-10 minutes  
**Expected result**: 2,370 outlets with login accounts  
**Default password**: `Alpro@123`

---

Last Updated: November 15, 2025
