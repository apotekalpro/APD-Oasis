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
- ✅ **Advanced Permissions** - Warehouse_supervisor role with enhanced delete/amend rights (NEW!)
- ✅ **Duplicate Scan Prevention** - Multi-layer detection to prevent duplicate pallet scans (NEW!)
- ✅ **Delete Scanned Items** - Admin/supervisor can remove items from scanning session (NEW!)
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

### 1️⃣ Import Pick & Pack Report (Admin/Warehouse)

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
5. Preview data and confirm import

### 2️⃣ Warehouse Loading Process (Warehouse/Driver) - NEW PALLET SCANNING!

1. Navigate to **Warehouse** page
2. View all outlets with pending pallets (displayed with short codes like "JKJSTT1", "MKC")
3. **Scan Pallet ID** using barcode scanner or manual input
4. System marks ALL transfers in that pallet as loaded at once
5. View outlet details to see all transfers and delete if needed
6. Complete loading process with signature

**NEW Features:**
- **Pallet ID scanning** - One scan = multiple transfers loaded automatically
- **Outlet short codes** - See familiar codes (MKC, JBB) instead of numbers
- **Outlet details view** - Click "Details" to see all transfers for each outlet
- **Delete management** - Delete individual transfers or entire outlet's transfers
- Real-time progress tracking with pallet counts
- Audio feedback for successful/failed scans

### 3️⃣ Outlet Unloading Process (Outlet/Driver) - NEW TWO-STEP PROCESS!

**Step 1: Identify Your Outlet**
1. Navigate to **Outlet** page
2. Scan or enter your **Outlet Short Code** (e.g., "MKC", "JKJSTT1")
3. System finds and displays all available pallets for your outlet

**Step 2: Scan Pallets**
4. View list of pending pallet IDs with transfer counts
5. **Scan each Pallet ID** to confirm receipt
6. System marks ALL transfers in that pallet as delivered at once
7. Repeat for all pallets

**NEW Features:**
- **Two-step scanning** - Find outlet first, then scan pallets
- **Pallet-level unloading** - One scan = multiple transfers received
- **Visual pallet list** - See all your deliveries before scanning
- **Short code lookup** - Use familiar codes (MKC, JBB) not numbers
- Real-time remaining pallet count
- Auto-matching prevents wrong outlet errors

### 4️⃣ Reports & Analytics (All Roles)

1. Navigate to **Reports** page
2. View delivery reports with timestamps
3. Check error parcels for investigation
4. Export comprehensive Excel reports
5. Track driver performance and delivery times

### 5️⃣ Admin Configuration (Admin Only)

1. Navigate to **Admin** page
2. Manage users:
   - Add new users (warehouse, driver, outlet, admin)
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
5. Verify tables are created successfully
6. Default admin user will be created automatically
7. Import outlets using `import-outlets.py` to populate outlet codes

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
| `PERMISSIONS_AND_CLEANUP_SUMMARY.md` | **NEW!** Supervisor role and auto-cleanup guide |
| `DUPLICATE_SCAN_PREVENTION.md` | **NEW!** Multi-layer duplicate detection system |
| `DELETE_SCANNED_ITEMS.md` | **NEW!** Delete scanned items feature guide |
| `SAMPLE_IMPORT_TEMPLATE.md` | Excel import format guide |
| `PROJECT_SUMMARY.md` | Complete handover document |
| `OUTLET_IMPORT_GUIDE.md` | Import 205 outlets guide |
| `OUTLET_LOGIN_INFO.md` | Outlet login quick reference |
| `supabase-schema.sql` | Database schema (CRITICAL!) |
| `migration-add-short-codes.sql` | Outlet code mapping migration |
| `migration-supervisor-role-and-cleanup.sql` | **NEW!** Supervisor role + auto-cleanup migration |

## 📞 Contact

For support and feature requests, contact your system administrator.

---

**Last Updated**: November 15, 2025  
**Version**: 1.3.0 (with Advanced Permissions, Duplicate Prevention & Delete Scanned Items)  
**Status**: ✅ Development Ready | ⏳ Database Migrations Required | 🏪 205 Outlets Imported | 📦 Pallet Scanning Active | 🛡️ Duplicate Prevention Active | 🗑️ Session Delete Active
