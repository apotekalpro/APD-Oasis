# 🚀 APD OASIS - Deployment Guide

Complete step-by-step instructions for deploying the APD OASIS Warehouse Logistic System.

## 📋 Prerequisites Checklist

Before starting deployment, ensure you have:

- ✅ Supabase account and project URL
- ✅ Supabase API keys (Anon + Service Role)
- ✅ GitHub account (for code repository)
- ✅ Cloudflare account (for production hosting)
- ✅ This project files in `/home/user/webapp/`

## 🗄️ Step 1: Database Setup (CRITICAL - Do This First!)

### 1.1 Access Supabase SQL Editor

1. Go to your Supabase project: https://ptfnmivvowgiqzwyznmu.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**

### 1.2 Execute Database Schema

1. Open the file `supabase-schema.sql` from this project
2. Copy ALL content (entire file)
3. Paste into Supabase SQL Editor
4. Click **"Run"** button
5. Wait for execution to complete (should take 5-10 seconds)

### 1.3 Verify Database Tables

After execution, verify these tables exist:
- ✅ users
- ✅ outlets
- ✅ imports
- ✅ parcels
- ✅ transfer_details
- ✅ error_parcels
- ✅ audit_logs

**Check in Supabase:**
1. Go to **Table Editor**
2. You should see all 7 tables listed
3. Click on `users` table - you should see 1 default admin user

### 1.4 Default Admin Account

After schema execution, you can login with:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change the admin password after first login!

## 🐙 Step 2: GitHub Setup (Optional but Recommended)

### 2.1 Configure GitHub Authentication

1. In the code sandbox interface, navigate to the **#github** tab
2. Complete GitHub authorization (both App and OAuth if available)
3. Wait for successful authorization confirmation

### 2.2 Create or Select Repository

**Option A: Create New Repository**
```bash
# The code is ready in /home/user/webapp/
# You can create a new repo through GitHub UI or use gh CLI after authorization
```

**Option B: Use Existing Repository**
```bash
# After GitHub authorization, you can push to your existing repo
cd /home/user/webapp
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -f origin main
```

### 2.3 Push Code to GitHub

After GitHub authorization is complete:

```bash
cd /home/user/webapp
git remote add origin https://github.com/YOUR_USERNAME/apd-oasis.git
git push -u origin main
```

## ☁️ Step 3: Cloudflare Pages Deployment

### 3.1 Setup Cloudflare API Key

1. In the code sandbox interface, navigate to the **Deploy** tab
2. Add your Cloudflare API Key
3. Wait for successful setup confirmation

### 3.2 Build the Application

```bash
cd /home/user/webapp
npm run build
```

This creates the `dist/` directory with:
- `_worker.js` - Compiled Hono backend
- `_routes.json` - Routing configuration
- `static/` - Frontend assets

### 3.3 Create Cloudflare Pages Project

```bash
cd /home/user/webapp

# Create project (use main branch for production)
npx wrangler pages project create apd-oasis \
  --production-branch main \
  --compatibility-date 2025-11-15
```

### 3.4 Deploy to Cloudflare Pages

```bash
# Deploy the built application
npx wrangler pages deploy dist --project-name apd-oasis
```

You'll receive two URLs:
- **Production**: `https://apd-oasis.pages.dev`
- **Branch**: `https://main.apd-oasis.pages.dev`

### 3.5 Configure Environment Variables

⚠️ **CRITICAL**: Set these secrets in Cloudflare for the app to work!

```bash
cd /home/user/webapp

# Set Supabase URL
npx wrangler pages secret put SUPABASE_URL --project-name apd-oasis
# Enter: https://ptfnmivvowgiqzwyznmu.supabase.co

# Set Supabase Anon Key
npx wrangler pages secret put SUPABASE_ANON_KEY --project-name apd-oasis
# Paste your anon key

# Set Supabase Service Key
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name apd-oasis
# Paste your service role key

# Set JWT Secret (use a strong random string)
npx wrangler pages secret put JWT_SECRET --project-name apd-oasis
# Enter a strong secret: e.g., "your-super-secret-jwt-key-12345678"
```

**To verify secrets are set:**
```bash
npx wrangler pages secret list --project-name apd-oasis
```

### 3.6 Test Production Deployment

1. Visit your production URL: `https://apd-oasis.pages.dev`
2. You should see the login page
3. Login with: `admin` / `admin123`
4. Test basic functionality:
   - Admin panel (add user, add outlet)
   - Import page (upload sample Excel)
   - Warehouse scanning
   - Reports

## 📱 Step 4: Mobile APK Preparation (Optional)

To package as Android APK using Capacitor:

### 4.1 Install Capacitor

```bash
cd /home/user/webapp
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 4.2 Initialize Capacitor

```bash
npx cap init "APD OASIS" "com.apd.oasis" --web-dir=dist
```

### 4.3 Add Android Platform

```bash
npx cap add android
```

### 4.4 Update Capacitor Config

Edit `capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apd.oasis',
  appName: 'APD OASIS',
  webDir: 'dist',
  server: {
    url: 'https://apd-oasis.pages.dev',
    cleartext: true
  }
};

export default config;
```

### 4.5 Build and Open in Android Studio

```bash
npm run build
npx cap sync
npx cap open android
```

Then in Android Studio:
1. Build → Generate Signed Bundle / APK
2. Follow wizard to create release APK

## 🧪 Step 5: Testing Checklist

### 5.1 Database Testing

- [ ] Tables created successfully
- [ ] Default admin user exists
- [ ] Can login with admin credentials

### 5.2 Admin Functions

- [ ] Can add new users
- [ ] Can add new outlets
- [ ] Can activate/deactivate users
- [ ] User roles work correctly

### 5.3 Import Process

- [ ] Can upload Excel file
- [ ] Preview shows correct data
- [ ] Import creates parcels in database
- [ ] Pallet IDs are grouped correctly

### 5.4 Warehouse Loading

- [ ] Can scan transfer numbers
- [ ] Valid scans show success
- [ ] Invalid scans show error
- [ ] Outlet summary updates in real-time
- [ ] Can complete loading with signature

### 5.5 Outlet Unloading

- [ ] Can select outlet
- [ ] Can scan transfer numbers
- [ ] Wrong outlet detection works
- [ ] Can complete unloading with signature

### 5.6 Reports

- [ ] Delivery report shows data
- [ ] Error report shows failed scans
- [ ] Excel export works
- [ ] Data is accurate

## 🔧 Troubleshooting

### Issue: Login fails with "Invalid credentials"

**Solution:**
1. Verify database schema was executed
2. Check if `users` table has data
3. Try login with: `admin` / `admin123`
4. Check browser console for errors

### Issue: "Cannot read property 'SUPABASE_URL'"

**Solution:**
1. Environment variables not set in Cloudflare
2. Run all `wrangler pages secret put` commands
3. Verify with `wrangler pages secret list`
4. Redeploy after setting secrets

### Issue: Import fails or no data shows

**Solution:**
1. Check Excel file format (columns E, F, G, V)
2. Verify database connection
3. Check browser console for errors
4. Ensure Supabase API keys are correct

### Issue: Scanning doesn't work

**Solution:**
1. Ensure data is imported first
2. Check if transfer numbers match imported data
3. Verify user has correct role permissions
4. Check network connection to Supabase

### Issue: Mobile APK shows blank screen

**Solution:**
1. Update `server.url` in capacitor.config.ts to production URL
2. Rebuild: `npm run build && npx cap sync`
3. Check Android WebView compatibility
4. Enable CORS in Cloudflare if needed

## 📊 Production Checklist

Before going live:

- [ ] Database schema executed successfully
- [ ] All environment variables set in Cloudflare
- [ ] Default admin password changed
- [ ] Test users created for each role
- [ ] Sample outlets added
- [ ] Full workflow tested (import → warehouse → outlet → reports)
- [ ] Error handling verified
- [ ] Mobile responsiveness tested
- [ ] GitHub repository pushed (if using)
- [ ] Documentation reviewed
- [ ] Backup plan established
- [ ] Training materials prepared for staff

## 🔄 Update Process

To deploy updates:

```bash
cd /home/user/webapp

# Make your changes to code
# ...

# Build and deploy
npm run build
npx wrangler pages deploy dist --project-name apd-oasis

# For mobile app
npm run build
npx cap sync
# Then rebuild APK in Android Studio
```

## 📞 Support

### Database Issues
- Check Supabase dashboard for errors
- Review SQL logs in Supabase
- Verify table permissions

### Deployment Issues
- Check Cloudflare Pages dashboard
- Review deployment logs
- Verify environment variables

### Application Issues
- Check browser console (F12)
- Review PM2 logs (development): `pm2 logs apd-oasis`
- Test API endpoints directly

## 🎉 Success Indicators

Your deployment is successful when:

1. ✅ You can access the application at the production URL
2. ✅ Login works with admin credentials
3. ✅ Can add users and outlets
4. ✅ Can import Excel files
5. ✅ Scanning workflow works end-to-end
6. ✅ Reports generate correctly
7. ✅ Mobile interface is responsive
8. ✅ No console errors in browser

## 📝 Notes

- **Development URL**: https://3000-i8ezurtfnv7jlbrg994fh-02b9cc79.sandbox.novita.ai
- **Supabase Project**: https://ptfnmivvowgiqzwyznmu.supabase.co
- **Default Admin**: admin / admin123

---

**Last Updated**: November 15, 2025  
**Version**: 1.0.0
