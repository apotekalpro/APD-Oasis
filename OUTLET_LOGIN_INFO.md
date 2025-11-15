# 🏪 Outlet Login System - Quick Reference

## 📊 Overview

APD OASIS now supports **2,370 outlet-specific login accounts** from your Outlet List 2026.

## 🔐 Login Credentials

### For All Outlets:
- **Username**: Column B from Excel (Short Store Name)
- **Password**: `Alpro@123` (same for all outlets)

### Examples:

| Store Code | Username | Password | Store Name |
|------------|----------|----------|------------|
| 0001 | JKJSTT1 | Alpro@123 | APOTEK ALPRO TEBET TIMUR |
| 0002 | JKJSVR1 | Alpro@123 | APOTEK ALPRO VETERAN RAYA |
| 0003 | JKJBTM1 | Alpro@123 | APOTEK ALPRO TOMANG |
| 0004 | JKJSBZ1 | Alpro@123 | APOTEK ALPRO BELLEZA |
| 0005 | BTTSGV1 | Alpro@123 | APOTEK ALPRO GOLDEN VIENNA |

## 🎯 What Outlet Users Can Do

### ✅ Allowed Access:
1. **Outlet Unloading Page**
   - Auto-selected to their own outlet
   - Scan transfer numbers for their outlet
   - Complete unloading with signature
   - Cannot change to other outlets

2. **Reports Page**
   - View delivery history (their outlet only)
   - View error records (their outlet only)
   - Export Excel reports (their data only)
   - Filter by date range

3. **Dashboard**
   - See their outlet's statistics
   - View pending parcels
   - Track delivery status

### ❌ Restricted Access:
- ❌ Cannot see other outlets' data
- ❌ Cannot access Admin panel
- ❌ Cannot access Import function
- ❌ Cannot access Warehouse loading
- ❌ Cannot create/edit users
- ❌ Cannot manage outlets

## 🚀 Quick Start for Outlets

### Step 1: Open Application
**URL**: https://3000-i8ezurtfnv7jlbrg994fh-02b9cc79.sandbox.novita.ai

### Step 2: Login
1. Enter your **Short Store Name** as username (e.g., JKJSTT1)
2. Enter password: **Alpro@123**
3. Click Login

### Step 3: Start Using
- You'll see the Outlet page automatically
- Your outlet is already selected
- Start scanning transfer numbers
- View your reports anytime

## 📱 Mobile Access

The system is fully mobile-friendly:
- Access from any smartphone browser
- Touch-optimized interface
- Large buttons for easy scanning
- Can be packaged as Android APK

## 🔄 Import Process

### For Administrators:

To import all 2,370 outlets and create their accounts:

```bash
cd /home/user/webapp
python3 import-outlets.py
```

**What it does:**
- Reads `Outlet List 2026.xlsx`
- Creates 2,370 outlet records
- Creates 2,370 user accounts
- Takes 5-10 minutes

See `OUTLET_IMPORT_GUIDE.md` for detailed instructions.

## 🔐 Security Features

### Data Isolation
- Each outlet can ONLY see their own data
- Backend enforces outlet_code filtering
- Frontend hides unauthorized functions
- No cross-outlet data access

### Access Control
- Role-based permissions
- JWT token authentication
- Secure password storage
- Session management

## 📊 Finding Your Outlet Code

If you don't know your username:

1. Check the Excel file: `Outlet List 2026.xlsx`
2. Find your store name in Column C
3. Your username is in Column B (same row)
4. Password is always: `Alpro@123`

## 🆘 Troubleshooting

### Can't Login?
- Check username spelling (case-sensitive)
- Password is: `Alpro@123` (case-sensitive)
- Make sure outlets are imported (admin must run import script)

### Can't See My Data?
- Check that your outlet_code is correct in database
- Verify parcels have your outlet_code assigned
- Try refreshing the page

### See Other Outlets?
- You shouldn't! If you do, report to admin
- Each outlet should only see their own data

## 📞 Support

### For Outlet Users:
- Login issues: Check username and password
- Data issues: Contact administrator
- Technical issues: Check internet connection

### For Administrators:
- Import issues: See `OUTLET_IMPORT_GUIDE.md`
- User management: Use Admin panel
- Security concerns: Review access logs

## 🎓 Training Materials

### For Outlet Staff (5-minute training):

1. **Login**: Use your Short Store Name + Alpro@123
2. **View Parcels**: See what's coming to your outlet
3. **Scan**: When driver arrives, scan transfer numbers
4. **Sign**: Complete unloading with your signature
5. **Reports**: View your delivery history anytime

### Key Points:
- ✅ Simple login (username is your Short Store Name)
- ✅ Auto-selected to your outlet
- ✅ Only see your own data
- ✅ Mobile-friendly
- ✅ Real-time updates

## 📈 Usage Statistics

After import, you'll have:
- **2,370 outlet accounts** ready to use
- **1 admin account** (admin/admin123)
- **Total**: 2,371 user accounts

Each outlet can immediately:
- Login to web version
- Login to mobile/APK
- View their data
- Receive parcels
- Generate reports

## 🎉 Benefits

### For Outlets:
- ✅ Self-service portal
- ✅ Real-time delivery tracking
- ✅ Historical records
- ✅ Error tracking
- ✅ Export reports anytime

### For Company:
- ✅ Centralized tracking
- ✅ Automated record keeping
- ✅ Audit trail
- ✅ Performance metrics
- ✅ Error reduction

## 📝 Communication Template

**For sending to all outlets:**

---

Subject: APD OASIS Warehouse Logistic System - Login Access

Dear Outlet Team,

You now have access to the APD OASIS Warehouse Logistic System for tracking your parcel deliveries.

**Your Login Details:**
- Website: https://3000-i8ezurtfnv7jlbrg994fh-02b9cc79.sandbox.novita.ai
- Username: [Your Short Store Name - e.g., JKJSTT1]
- Password: Alpro@123

**What you can do:**
- Track incoming parcels
- Scan and receive deliveries
- View delivery history
- Export reports

**Mobile Access:**
The system works on smartphones and tablets. Just open the website in your mobile browser.

For support, contact: [Your Support Contact]

Thank you!

---

## ✅ Quick Checklist

- [ ] Database schema executed
- [ ] Import script run successfully
- [ ] 2,370 outlets created
- [ ] Test login with sample outlet
- [ ] Verify outlet sees only their data
- [ ] Notify all outlets of their credentials
- [ ] Provide training materials
- [ ] Monitor first week of usage

---

**Ready to use!**

All 2,370 outlets can now login and access their data immediately after import.

---

Last Updated: November 15, 2025
