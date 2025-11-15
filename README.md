# APD OASIS - Warehouse Logistic System

A comprehensive full-stack web application for logistics tracking and warehouse management with mobile-friendly design.

## 🎯 Project Overview

**APD OASIS** (Automated Parcel Delivery - Outbound & Sorting Inventory System) is a real-time logistics tracking system designed for warehouse staff, drivers, and outlet personnel to manage parcel deliveries efficiently.

### Main Features

- ✅ **Pick & Pack Report Import** - Excel file import with automatic parcel grouping by Pallet ID
- ✅ **Pallet ID Scanning** - Scan entire pallet to process multiple transfers at once
- ✅ **Outlet Code Mapping** - Automatic mapping between numeric codes and short codes
- ✅ **Warehouse Loading Process** - Real-time pallet scanning with validation
- ✅ **Outlet Two-Step Unloading** - Scan outlet code first, then scan pallet IDs
- ✅ **Warehouse Management** - View outlet details, delete transfers
- ✅ **Advanced Permissions** - Warehouse_supervisor role with enhanced delete/amend rights
- ✅ **Duplicate Scan Prevention** - Multi-layer detection to prevent duplicate pallet scans
- ✅ **Delete Scanned Items** - Admin/supervisor can remove items from scanning session
- ✅ **Multi-Day Dashboard** - Yesterday/Today/Tomorrow tabs with delivery date filtering
- ✅ **Delivery Date Planning** - Import tonight for tomorrow, view scheduled deliveries
- ✅ **Password Management** - Users can change own password, admin can reset to default (NEW!)
- ✅ **Admin Configuration** - User and outlet management system
- ✅ **Error Tracking** - Comprehensive error logging for unmatched parcels
- ✅ **Reports & Analytics** - Delivery reports with Excel export functionality
- ✅ **Mobile-Friendly UI** - Responsive design optimized for mobile devices (APK-ready)
- ✅ **Role-Based Access Control** - Five user roles with granular permissions

## 🌐 URLs

- **Development URL**: https://3000-i8ezurtfnv7jlbrg994fh-02b9cc79.sandbox.novita.ai
- **Default Admin Login**: `admin` / `admin123`
- **Outlet Login**: [Short Store Name] / `Alpro@123` (e.g., `JKJSTT1` / `Alpro@123`)
- **GitHub Repository**: (To be deployed)
- **Production URL**: (To be deployed on Cloudflare Pages)

## 🏪 Outlet System (NEW!)

**2,370 outlet accounts** ready to import from `Outlet List 2026.xlsx`:
- **Username**: Column B (Short Store Name) - e.g., JKJSTT1, JKJSVR1
- **Password**: `Alpro@123` (default for all)
- **Access**: Outlet-specific data only (cannot see other outlets)
- **Features**: Unloading, reports, history (filtered to their outlet)

**Quick Import**: `python3 import-outlets.py` (see `OUTLET_IMPORT_GUIDE.md`)

**Outlet users automatically:**
- See only their outlet's data
- Auto-selected to their outlet page
- Cannot access admin/warehouse functions
- Can view delivery history and generate reports

## 📊 Data Architecture

### Database Schema (Supabase PostgreSQL)

**Main Tables:**
- `users` - User authentication and role management
- `outlets` - Outlet/store information (with numeric and short codes)
- `imports` - Import session tracking
- `parcels` - Parcel records grouped by Pallet ID (with both outlet codes)
- `transfer_details` - Individual transfer number tracking (with both outlet codes)
- `error_parcels` - Error and mismatch tracking
- `audit_logs` - System activity logging

**Outlet Code Mapping:**
```
Outlet Record
├── outlet_code: "0001" (Numeric - from Excel Column E)
├── outlet_code_short: "JKJSTT1" (Short - from Excel Column F)
└── outlet_name: "APOTEK ALPRO TEBET TIMUR"

Used for:
- Database integrity (numeric code)
- User display (short code)
- Login username (short code)
```

**Data Models:**
```
Parcel (grouped by Pallet ID)
├── Pallet ID (scanned identifier)
├── Multiple Transfer Numbers
├── Outlet Code (numeric) & Short Code (display)
├── Outlet Name
├── Loading Status (pending → loaded → delivered)
├── Timestamps (created, loaded, delivered)
└── Signatures (loaded_by, received_by)
```

### Storage Services
- **Supabase Database** - PostgreSQL for all data persistence
- **Supabase REST API** - Real-time data access from Cloudflare Workers
- **Cloudflare Workers** - Edge computing for API routes
- **Cloudflare Pages** - Static asset hosting

## 🚀 User Guide

### 1️⃣ Import Pick & Pack Report (Admin/Warehouse) - WITH DELIVERY DATE!

1. Navigate to **Import** page
2. Select Excel file with pick and pack data (DC Pick & Pack Report format)
3. Required columns:
   - **Column E**: Store Code (Numeric: e.g., "0001", "0002")
   - **Column F**: Store Name (Format: "SHORTCODE - FULL NAME", e.g., "JKJSTT1 - APOTEK ALPRO TEBET TIMUR")
   - **Column G**: Pallet ID (items with same ID are grouped)
   - **Column V**: Transfer Number
4. System automatically extracts:
   - Numeric code from Column E (for database)
   - Short code from Column F (for display to users)
5. **NEW: Select Delivery Date** ⭐
   - Choose the delivery date for this import
   - Example: Import at night (Nov 15) for tomorrow (Nov 16) delivery
   - Defaults to today if not changed
6. Preview data and confirm import

### 2️⃣ Warehouse Loading Process (Warehouse/Driver) - WITH DELIVERY DATE!

1. Navigate to **Warehouse** page
2. **NEW: Select Delivery Date** ⭐
   - Choose which date's parcels to view and load
   - Defaults to today
   - Can view future dates if imported ahead
3. View all outlets with pending pallets for selected date (displayed with short codes like "JKJSTT1", "MKC")
4. **Scan Pallet ID** using barcode scanner or manual input
5. System marks ALL transfers in that pallet as loaded at once
6. View outlet details to see all transfers and delete if needed
7. Complete loading process with signature

**NEW Features:**
- **Delivery date filter** - View and load parcels for specific dates
- **Pallet ID scanning** - One scan = multiple transfers loaded automatically
- **Outlet short codes** - See familiar codes (MKC, JBB) instead of numbers
- **Outlet details view** - Click "Details" to see all transfers for each outlet
- **Delete management** - Delete individual transfers or entire outlet's transfers
- Real-time progress tracking with pallet counts
- Audio feedback for successful/failed scans

### 3️⃣ Outlet Unloading Process (Outlet/Driver) - WAREHOUSE-STYLE WORKFLOW!

**Step 1: Identify Your Outlet**
1. Navigate to **Outlet** page
2. Scan or enter your **Outlet Short Code** (e.g., "MKC", "JKJSTT1")
3. System finds and displays all available pallets for your outlet

**Step 2: Scan All Pallets**
4. View list of pending pallet IDs with transfer counts
5. **Scan each Pallet ID** - system validates and adds to scanned list
6. Scanned pallets show as "Scanned (not confirmed yet)" in blue
7. Repeat scanning for all pallets you're receiving

**Step 3: Complete Receipt with Signature** (NEW!)
8. Click **"Complete Receipt"** button when all scanning is done
9. System shows summary and warns if any pallets are unscanned
10. Enter **Receiver Name/Signature** once for all deliveries
11. Click **"Confirm & Sign"** to complete the entire receipt
12. All scanned pallets marked as delivered at once

**NEW Features:**
- **Warehouse-style workflow** - Scan all first, then one signature at end
- **Bulk completion** - One receiver name for all pallets
- **Incomplete receipt warning** - System alerts if pallets not scanned
- **Unreceived tracking** - Unscanned pallets marked in reports
- **Validation only during scan** - No delivery until completion
- **Pallet-level unloading** - One scan = multiple transfers
- **Visual pallet list** - See all your deliveries before scanning
- **Short code lookup** - Use familiar codes (MKC, JBB) not numbers

### 4️⃣ Multi-Day Dashboard (Warehouse/Driver/Admin) - NEW! ⭐

1. Navigate to **Dashboard** page
2. **NEW: Select Day to View** ⭐
   - **Yesterday** tab - Review yesterday's completed deliveries
   - **Today** tab - Monitor current day's operations (default)
   - **Tomorrow** tab - Preview next day's scheduled deliveries
   - Click tabs to switch between dates
3. View real-time statistics for selected date:
   - **Total Outlets** - Number of unique outlets with deliveries
   - **Total Pallets** - Total number of pallets imported
   - **Loaded Pallets** - Number of pallets scanned at warehouse
   - **Delivered Pallets** - Number of pallets received by outlets
4. Monitor progress bars:
   - **Loading Progress** - Percentage of pallets loaded vs total
   - **Delivery Progress** - Percentage of pallets delivered vs total
5. Check outlet status table:
   - Individual outlet progress
   - Pallets pending/loaded/delivered per outlet
   - **Loaded At** - Date + Time when pallets were scanned at warehouse (e.g., "Nov 15, 08:30 AM")
   - **Delivered At** - Date + Time when outlet completed delivery
   - **Receiver** - Name of person who signed for delivery
   - Completed outlets remain visible with delivery information
   - Auto-refreshes every 30 seconds

### 5️⃣ Reports & Analytics (All Roles)

1. Navigate to **Reports** page
2. View delivery reports with timestamps
3. Check error parcels for investigation
4. Export comprehensive Excel reports
5. Track driver performance and delivery times

### 6️⃣ User Profile & Password Management (All Users) - NEW! ⭐

1. Navigate to **Profile** page (new button in navbar)
2. View your profile information:
   - Username, Full Name, Role, Outlet Code
3. **Change Your Password**:
   - Enter current password
   - Enter new password (minimum 6 characters)
   - Confirm new password
   - Submit to update
4. System validates passwords and provides feedback

### 7️⃣ Admin Configuration (Admin Only)

1. Navigate to **Admin** page
2. Manage users:
   - Add new users (warehouse, driver, outlet, admin)
   - **Edit user details** with optional password update (NEW!)
   - **Reset any user's password** to "Alpro@123" (NEW!)
   - Assign outlet codes to outlet users
   - Activate/deactivate accounts
   - Delete users
3. Manage outlets:
   - Add new outlet locations
   - Update outlet information

## 🔐 User Roles & Permissions (UPDATED!)

| Role | Import | Scan | View Reports | Delete Records | Amend Records | User Mgmt | Outlet Mgmt |
|------|--------|------|--------------|----------------|---------------|-----------|-------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Warehouse Supervisor** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Warehouse** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Driver** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Outlet** | ❌ | ✅ (own outlet) | ✅ (own outlet) | ❌ | ❌ | ❌ | ❌ |

**NEW Features:**
- **Warehouse Supervisor Role** - Can delete/amend records but cannot manage users/outlets
- **Delete Scanned Items** - Only admin and supervisors can delete from scanning session
- **Permission Helpers** - Frontend functions: `canDelete()`, `canAmend()`, `isAdmin()`, `isSupervisor()`
- **Auto-Cleanup** - Database function to delete records older than 3 months (see `PERMISSIONS_AND_CLEANUP_SUMMARY.md`)

## 💻 Technical Stack

- **Frontend**: HTML5, CSS3 (Tailwind CSS), Vanilla JavaScript
- **Backend**: Hono Framework (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Cloudflare Pages
- **Edge Runtime**: Cloudflare Workers
- **Libraries**: 
  - SheetJS (XLSX) - Excel file processing
  - Axios - HTTP client
  - Font Awesome - Icons
  - Tailwind CSS - Styling

## 📱 Mobile Support

The application is fully responsive and optimized for mobile devices:
- Touch-friendly interface
- Large scan buttons
- Mobile-optimized layouts
- Ready for APK packaging using Capacitor or similar tools

## 🔧 Deployment Status

- ✅ **Development**: Active on sandbox environment
- ⏳ **GitHub**: Ready for push
- ⏳ **Cloudflare Pages**: Ready for production deployment
- ⏳ **Supabase Database**: Schema needs to be executed (see `supabase-schema.sql`)

## 📝 Setup Instructions

### Database Setup (Required First)

1. Log in to your Supabase project: https://ptfnmivvowgiqzwyznmu.supabase.co
2. Navigate to SQL Editor
3. Copy and execute the entire `supabase-schema.sql` file
4. **IMPORTANT**: Also execute `migration-add-short-codes.sql` for outlet code mapping
5. **⚠️ NEW REQUIRED**: Execute `ADD_DELIVERY_DATE_COLUMN.sql` for multi-day dashboard support
   - Adds `delivery_date` column to imports, parcels, and transfer_details tables
   - Backfills existing records with import_date as default
   - Creates indexes for performance
6. Verify tables are created successfully
7. Default admin user will be created automatically
8. Import outlets using `import-outlets.py` to populate outlet codes

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables in .dev.vars
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_secret_key

# Build the application
npm run build

# Start development server
npm run dev:sandbox

# Or start with PM2
pm2 start ecosystem.config.cjs
```

### Production Deployment

```bash
# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy:prod

# Set environment variables in Cloudflare
wrangler pages secret put SUPABASE_URL
wrangler pages secret put SUPABASE_ANON_KEY
wrangler pages secret put SUPABASE_SERVICE_KEY
wrangler pages secret put JWT_SECRET
```

## 🔄 Workflow Summary

### Complete Process Flow

1. **Import** → Excel upload → Parcels grouped by Pallet ID → Database stored
2. **Warehouse Loading** → Scan all transfer numbers → Mark as loaded → Signature collected
3. **Transit** → Driver transports to outlets
4. **Outlet Unloading** → Select outlet → Scan transfers → Mark as delivered → Signature collected
5. **Reports** → Track all activities → Export for analysis

### Error Handling

- **Not Found**: Transfer number doesn't exist in system
- **Already Scanned**: Duplicate scan attempt
- **Wrong Outlet**: Transfer belongs to different outlet
- All errors logged with timestamp and user information

## 📊 Current Status

### ✅ Completed Features

- ✅ Full authentication system with JWT
- ✅ Excel import with Pallet ID grouping and outlet code mapping
- ✅ Pallet ID scanning for warehouse (scan once = load multiple transfers)
- ✅ Two-step outlet unloading (scan outlet code → scan pallet IDs)
- ✅ Outlet code auto-matching (numeric ↔ short code)
- ✅ Warehouse management (view details, delete transfers)
- ✅ Admin panel for user/outlet management
- ✅ Error tracking and logging
- ✅ Delivery reports with Excel export
- ✅ Mobile-responsive design
- ✅ Real-time progress tracking
- ✅ Audio/visual feedback system
- ✅ Live dashboard with auto-refresh showing delivery timestamps and receivers
- ✅ 205 outlets imported and configured

### 🔄 Recommended Next Steps

1. **Execute Database Schema** - Run `supabase-schema.sql` in Supabase SQL Editor
2. **Test Full Workflow** - Import sample data and test complete process
3. **Deploy to GitHub** - Push code to GitHub repository
4. **Deploy to Cloudflare Pages** - Production deployment with custom domain
5. **Mobile APK Packaging** - Use Capacitor to create Android APK
6. **Add Features** (Optional):
   - Real-time notifications
   - Barcode scanner integration
   - GPS tracking for drivers
   - Photo capture for deliveries
   - Dashboard analytics with charts

## 🆘 Support & Troubleshooting

### Common Issues

**Login fails:**
- Ensure database schema is executed
- Default admin: `admin` / `admin123`

**Scan doesn't work:**
- Check if data is imported first
- Verify transfer number format
- Check user role permissions

**Import fails:**
- Verify Excel column mapping (E, F, G, V)
- Check for empty rows
- Ensure Pallet ID and Transfer Number are filled

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation (this file) |
| `QUICK_START.md` | 5-minute testing guide |
| `DEPLOYMENT_GUIDE.md` | Production deployment steps |
| `SCANNING_CHANGES.md` | Pallet ID scanning system guide |
| `WAREHOUSE_DELETE_FEATURE.md` | Delete functionality documentation |
| `PERMISSIONS_AND_CLEANUP_SUMMARY.md` | Supervisor role and auto-cleanup guide |
| `DUPLICATE_SCAN_PREVENTION.md` | Multi-layer duplicate detection system |
| `DELETE_SCANNED_ITEMS.md` | Delete scanned items feature guide |
| `PASSWORD_MANAGEMENT_TESTING.md` | **NEW!** Password management testing guide |
| `ADD_DELIVERY_DATE_COLUMN.sql` | Multi-day dashboard migration (REQUIRED!) |
| `URGENT_DATABASE_MIGRATION_REQUIRED.md` | Migration instructions |
| `SAMPLE_IMPORT_TEMPLATE.md` | Excel import format guide |
| `PROJECT_SUMMARY.md` | Complete handover document |
| `OUTLET_IMPORT_GUIDE.md` | Import 205 outlets guide |
| `OUTLET_LOGIN_INFO.md` | Outlet login quick reference |
| `supabase-schema.sql` | Database schema (CRITICAL!) |
| `migration-add-short-codes.sql` | Outlet code mapping migration |
| `migration-supervisor-role-and-cleanup.sql` | Supervisor role + auto-cleanup migration |

## 📞 Contact

For support and feature requests, contact your system administrator.

---

**Last Updated**: November 15, 2025  
**Version**: 1.8.0 (with Password Management)  
**Status**: ✅ Development Ready | ⚠️ **MIGRATION REQUIRED** (ADD_DELIVERY_DATE_COLUMN.sql) | 🏪 205 Outlets Imported | 📦 Pallet Scanning Active | 🛡️ Duplicate Prevention Active | 🗑️ Session Delete Active | 📊 Multi-Day Dashboard Active | ✍️ Bulk Receipt Completion Active | 📅 Delivery Date Planning Active | 🔐 Password Management Active
