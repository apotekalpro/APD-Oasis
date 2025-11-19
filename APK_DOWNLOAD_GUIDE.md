# 📱 APD OASIS APK Download Guide

## 🎯 Quick Summary

**Latest Version**: v1.1.5 (Dashboard Fixes Applied - Nov 19, 2024)
**Changes**: 
- ✅ Dashboard scrolling fixed - can now see all outlet information
- ✅ Date buttons made smaller and more compact for mobile
- ✅ Automatic APK building via GitHub Actions

---

## 📥 **Option 1: Download from GitHub Actions (Recommended - Latest Build)**

### ✅ This includes today's dashboard fixes!

**Steps:**

1. **Go to GitHub Actions page:**
   ```
   https://github.com/apotekalpro/APD-Oasis/actions
   ```

2. **Click on "Build Android APK" workflow** (left sidebar)

3. **Click on the latest successful run** (green checkmark ✓)

4. **Scroll to "Artifacts" section at the bottom**

5. **Download the APK artifact:**
   - File will be named: `APD-OASIS-v[version]-debug.zip`
   - Extract the ZIP file to get the APK

6. **Install on your Android device:**
   - Transfer APK to your phone
   - Enable "Install from unknown sources" in Settings
   - Tap the APK file to install

### 🔄 **Build Status:**
- The workflow was just triggered by the latest push
- Building typically takes 5-10 minutes
- Check: https://github.com/apotekalpro/APD-Oasis/actions for progress

---

## 📥 **Option 2: Manual Trigger Build**

If you want to trigger a fresh build immediately:

1. **Go to Actions tab:**
   ```
   https://github.com/apotekalpro/APD-Oasis/actions
   ```

2. **Click "Build Android APK" workflow**

3. **Click "Run workflow" button** (right side)

4. **Select branch:** `main`

5. **Click green "Run workflow" button**

6. **Wait 5-10 minutes** for build to complete

7. **Download from Artifacts** as described in Option 1

---

## 📥 **Option 3: Download Pre-built APK (Without Latest Fixes)**

**⚠️ Note:** These APKs do NOT include today's dashboard scrolling and date button fixes.

### Available Pre-built APKs:

1. **APD-OASIS-v1.1.5-LATEST.apk** (6.1 MB)
   - Last built: Nov 19, 2024 05:24
   - Features: Container pickup tracking
   - Download from project root directory

2. **APD-OASIS-v1.10.3-FIXED.apk** (47 MB)
   - Last built: Nov 19, 2024 02:00
   - Larger file size (may include debug symbols)

### How to download:
1. Go to GitHub repository: https://github.com/apotekalpro/APD-Oasis
2. Navigate to the APK file in root directory
3. Click on the file
4. Click "Download" button
5. Install on Android device

---

## 🏗️ **Option 4: Build Yourself (Advanced)**

If you have Android development environment set up:

### Prerequisites:
- Android Studio installed
- Android SDK (API 33+)
- Java 17
- Node.js 18+

### Build Steps:

```bash
# Clone repository
git clone https://github.com/apotekalpro/APD-Oasis.git
cd APD-Oasis

# Install dependencies
npm install

# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📋 **What's New in Latest Build?**

### v1.1.5+ (Nov 19, 2024) - Dashboard Fixes:
- ✅ **Fixed Dashboard Scrolling** - All content now scrollable, outlet status table fully visible
- ✅ **Smaller Date Buttons** - Reduced button size for better mobile display
- ✅ **Compact Date Labels** - Reduced text size from 10px/12px to 9px
- ✅ **Better Mobile UX** - Improved visual hierarchy and touch targets

### v1.1.5 (Nov 19, 2024):
- ✅ Container pickup tracking dashboard
- ✅ Per-outlet container availability
- ✅ Dynamic collection button visibility

### v1.1.4 (Nov 19, 2024):
- ✅ Fixed collection button logic

### v1.1.3 (Nov 19, 2024):
- ✅ Outlet scanning improvements

---

## ⚙️ **Installation Instructions**

### On Android Device:

1. **Enable Unknown Sources:**
   - Go to: Settings → Security → Unknown Sources
   - Or: Settings → Apps → Special Access → Install Unknown Apps
   - Enable for your file manager or browser

2. **Transfer APK:**
   - Via USB cable
   - Or download directly on phone
   - Or via cloud storage (Google Drive, etc.)

3. **Install:**
   - Open file manager
   - Navigate to APK file
   - Tap to install
   - Accept permissions

4. **Launch App:**
   - Find "APD OASIS" in app drawer
   - Tap to open
   - Login with your credentials

---

## 🔍 **Verify Installation**

After installing, verify the dashboard fixes:

1. **Login** with your credentials
2. **Navigate to Dashboard** page
3. **Test Scrolling:**
   - Scroll down on dashboard
   - Verify outlet status table is visible
   - Check all sections are accessible
4. **Check Date Buttons:**
   - Date selection buttons should be compact
   - Labels (Yesterday, Today, Tomorrow) should be smaller
   - Better visual spacing on mobile

---

## 🐛 **Troubleshooting**

### Issue: "App not installed"
**Solution:** 
- Ensure you have enough storage space
- Try uninstalling old version first
- Enable "Install from unknown sources"

### Issue: "Parse error"
**Solution:**
- Download APK again (may be corrupted)
- Check Android version (requires Android 7.0+)

### Issue: Can't find APK on GitHub
**Solution:**
- Check Actions tab: https://github.com/apotekalpro/APD-Oasis/actions
- Wait for build to complete (green checkmark)
- Artifacts are at bottom of workflow run page

### Issue: Build failed
**Solution:**
- Check workflow logs for errors
- Try manual trigger: Actions → Build Android APK → Run workflow
- Contact repository maintainer

---

## 📞 **Support**

**Repository:** https://github.com/apotekalpro/APD-Oasis
**Actions:** https://github.com/apotekalpro/APD-Oasis/actions
**Issues:** https://github.com/apotekalpro/APD-Oasis/issues

---

## 🔄 **Automatic Updates**

**GitHub Actions builds APK automatically on:**
- ✅ Every push to `main` branch
- ✅ Manual workflow trigger
- ✅ Tagged releases

**To get latest version:**
1. Check Actions page for latest successful build
2. Download artifact
3. Install new APK over old one (data will be preserved)

---

**Last Updated:** Nov 19, 2024  
**Version:** 1.1.5+ (with dashboard fixes)
