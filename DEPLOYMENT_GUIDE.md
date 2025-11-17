# APD OASIS - Deployment Guide

## 🌐 Current Deployment Status

Your application is currently deployed using **Direct Upload** method to Cloudflare Pages.

**Production URL**: https://apd-oasis.pages.dev

---

## 🔄 Setting Up Automatic GitHub Deployments

Your current Cloudflare Pages project is NOT connected to GitHub, which is why you don't see "Build & deployments" in settings.

### **Option A: Create New GitHub-Connected Project** ⭐ (Recommended)

This will enable automatic deployments whenever you push to GitHub.

#### **Step 1: Go to Cloudflare Pages**
- Visit: https://dash.cloudflare.com/
- Click **"Workers & Pages"** in the left sidebar
- Click **"Create application"** button (top right)
- Select **"Pages"** tab

#### **Step 2: Connect to Git**
- Click **"Connect to Git"** button
- If prompted, click **"Connect GitHub"** and authorize Cloudflare
- Select your GitHub account: **apotekalpro**
- Select repository: **APD-Oasis**
- Click **"Begin setup"**

#### **Step 3: Configure Build Settings**

```
Project name: apd-oasis-github (or apd-oasis if you delete old project first)
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: / (leave empty or default)
```

#### **Step 4: Add Environment Variables**

Click **"Environment variables (advanced)"** and add:

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
JWT_SECRET=<your-jwt-secret>
```

#### **Step 5: Deploy**
- Click **"Save and Deploy"**
- Wait for the build to complete (2-3 minutes)
- Your app will be live at the new URL

#### **Step 6: (Optional) Switch to Primary Domain**

If you want to use `apd-oasis.pages.dev` instead of the new URL:

1. Go to old **apd-oasis** project settings
2. Click **"Delete project"** (backup first!)
3. Go to new project settings
4. Change project name to `apd-oasis`

---

### **Option B: Continue with Manual Deployments**

If you prefer to keep manual control, use the deployment script provided.

#### **Quick Deploy:**

```bash
cd /home/user/flutter_app
export CLOUDFLARE_API_TOKEN="V8-ANEdbKY_5pqnKY6nM25v-xrrUdEbjrMjqcTo_"
./deploy.sh
```

#### **What the script does:**
1. Builds the application (`npm run build`)
2. Deploys to Cloudflare Pages
3. Shows deployment URL

---

## 📱 Mobile APK Build

To build the Android APK:

```bash
cd /home/user/flutter_app

# Build web assets
bash build-mobile.sh

# Sync Capacitor
npx cap sync android

# Fix Java version (required after each sync)
sed -i 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle
sed -i 's/VERSION_21/VERSION_17/g' android/capacitor-cordova-android-plugins/build.gradle

# Build APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 🗄️ Database Migration

**IMPORTANT**: Execute this SQL in Supabase before using the container count feature!

```sql
-- Add container_count columns to parcels table
ALTER TABLE parcels 
ADD COLUMN IF NOT EXISTS container_count_loaded INTEGER,
ADD COLUMN IF NOT EXISTS container_count_delivered INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN parcels.container_count_loaded IS 'Number of containers when loaded at warehouse';
COMMENT ON COLUMN parcels.container_count_delivered IS 'Number of containers when delivered to outlet';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_parcels_container_counts ON parcels(container_count_loaded, container_count_delivered);

-- Add audit log for this migration
INSERT INTO audit_logs (user_name, action, entity_type, details)
VALUES (
    'SYSTEM',
    'DATABASE_MIGRATION',
    'parcels',
    '{"migration": "ADD_CONTAINER_COUNT", "description": "Added container count tracking for loaded and delivered parcels"}'::jsonb
);
```

**How to execute:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New query"**
5. Paste the SQL above
6. Click **"Run"** (or Ctrl/Cmd + Enter)

---

## 🔐 Cloudflare API Token

Your current token is stored for manual deployments.

**Token**: `V8-ANEdbKY_5pqnKY6nM25v-xrrUdEbjrMjqcTo_`

To use it in deployments:
```bash
export CLOUDFLARE_API_TOKEN="V8-ANEdbKY_5pqnKY6nM25v-xrrUdEbjrMjqcTo_"
```

---

## 📋 Deployment Checklist

Before deploying:
- [ ] All code changes committed to Git
- [ ] Database migration executed in Supabase
- [ ] Environment variables configured (for GitHub deployments)
- [ ] Build tested locally (`npm run build`)
- [ ] APK built and tested (if deploying mobile)

After deploying:
- [ ] Verify web app loads correctly
- [ ] Test login functionality
- [ ] Test warehouse scanning with container count popup
- [ ] Test outlet delivery with container count input
- [ ] Check dashboard shows new terminology (Total TN, Loaded Containers, etc.)

---

## 🆘 Troubleshooting

### **"No Build & Deployments in Settings"**
- Your project is a Direct Upload project (not GitHub-connected)
- Follow **Option A** above to create a GitHub-connected project

### **"Build Failed"**
- Check that `npm run build` works locally
- Verify all dependencies are in `package.json`
- Check Cloudflare build logs for specific errors

### **"Container Count Not Saving"**
- Ensure database migration was executed
- Check browser console (F12) for API errors
- Verify Supabase credentials are correct

### **"APK Build Failed"**
- Ensure Java version is fixed to VERSION_17
- Run `./gradlew clean` before building again
- Check Android SDK is properly installed

---

## 🎯 Quick Reference

**Web Deployment (Manual)**:
```bash
export CLOUDFLARE_API_TOKEN="V8-ANEdbKY_5pqnKY6nM25v-xrrUdEbjrMjqcTo_"
./deploy.sh
```

**Web Deployment (Auto via GitHub)**:
```bash
git add .
git commit -m "Your changes"
git push origin main
# Cloudflare will auto-deploy!
```

**Production URL**: https://apd-oasis.pages.dev

**GitHub Repository**: https://github.com/apotekalpro/APD-Oasis

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review Cloudflare build logs
3. Check browser console for frontend errors
4. Verify database migration was executed

---

**Last Updated**: November 17, 2024
**Version**: 2.0 (Container Count Feature)
