# Build APK on Your Computer - Complete Guide

## ✅ What You'll Get
- **APK File**: `app-debug.apk` (ready to install on Android)
- **Size**: ~5-10 MB
- **Location**: `android/app/build/outputs/apk/debug/`

---

## 🔧 Step-by-Step Instructions

### Step 1: Install Android Studio (One-Time Setup)

1. **Download Android Studio**:
   - Go to: https://developer.android.com/studio
   - Click "Download Android Studio"
   - Choose your OS (Windows/Mac/Linux)

2. **Install Android Studio**:
   - Run the installer
   - Follow the setup wizard
   - Install recommended components (Android SDK, Android SDK Platform, etc.)
   - This will take ~15-20 minutes

3. **Verify Installation**:
   - Open Android Studio
   - It should show a welcome screen

---

### Step 2: Clone Your Repository

```bash
# Open Terminal (Mac/Linux) or Command Prompt (Windows)

# Clone your repository
git clone https://github.com/apotekalpro/APD-Oasis.git

# Go into the project folder
cd APD-Oasis
```

---

### Step 3: Install Node.js Dependencies

```bash
# Make sure you're in the APD-Oasis folder
npm install

# This will take 2-3 minutes
```

---

### Step 4: Update API URL for Production

**IMPORTANT**: Your mobile app needs to connect to your live backend!

**Edit file**: `capacitor.config.ts`

**Change this**:
```typescript
const config: CapacitorConfig = {
  appId: 'com.apotekalpro.apdoasis',
  appName: 'APD Oasis',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  }
}
```

**To this**:
```typescript
const config: CapacitorConfig = {
  appId: 'com.apotekalpro.apdoasis',
  appName: 'APD Oasis',
  webDir: 'dist',
  server: {
    url: 'https://apd-oasis.pages.dev',  // ← ADD THIS LINE!
    androidScheme: 'https',
    cleartext: true
  }
}
```

**Save the file!**

---

### Step 5: Build Web Assets

```bash
# Build the web application
npm run build

# This creates the 'dist' folder with your app
```

---

### Step 6: Sync to Android

```bash
# Copy web assets to Android project
npx cap sync android

# This updates the Android project with your latest code
```

---

### Step 7: Open in Android Studio

**Option A: Command Line**
```bash
npx cap open android
```
This will automatically open Android Studio with your project.

**Option B: Manually**
1. Open Android Studio
2. Click "Open"
3. Navigate to: `APD-Oasis/android` folder
4. Click "OK"

---

### Step 8: Wait for Gradle Sync

When Android Studio opens:
1. It will say "Gradle Sync" at the bottom
2. **WAIT** for it to finish (2-5 minutes first time)
3. You'll see "Sync successful" when done

---

### Step 9: Build APK

**Option A: Using Menu (Easier)**
1. In Android Studio, click: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait 2-3 minutes
3. You'll see: "APK(s) generated successfully"
4. Click "locate" to find the APK

**Option B: Using Terminal (Faster for next time)**
```bash
# In the android folder
cd android
./gradlew assembleDebug

# Windows users use:
# gradlew.bat assembleDebug
```

---

### Step 10: Find Your APK

**Location**:
```
APD-Oasis/
└── android/
    └── app/
        └── build/
            └── outputs/
                └── apk/
                    └── debug/
                        └── app-debug.apk  ← HERE!
```

**File**: `app-debug.apk` (this is your Android app!)

---

## 📲 Install APK on Your Phone

### Method 1: USB Cable (Easiest)

1. **Enable Developer Mode on Phone**:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Developer options now enabled!

2. **Enable USB Debugging**:
   - Settings → Developer Options
   - Turn on "USB Debugging"

3. **Connect Phone to Computer**:
   - Use USB cable
   - Phone will ask "Allow USB Debugging?" → Tap "OK"

4. **Install via Android Studio**:
   - In Android Studio, click: Run → Run 'app'
   - Select your device
   - App installs automatically!

### Method 2: Direct Install (No Cable)

1. **Transfer APK to Phone**:
   - Email the `app-debug.apk` to yourself
   - Or upload to Google Drive/Dropbox
   - Or use USB to copy file

2. **Install on Phone**:
   - Open APK file on phone
   - Android will say "Install blocked"
   - Go to Settings → Allow from this source
   - Tap "Install"
   - Done!

---

## 🎯 Summary

**Time needed**: 
- First time: ~45 minutes (with Android Studio installation)
- Next time: ~5 minutes (just build and install)

**What you did**:
1. ✅ Installed Android Studio
2. ✅ Cloned your repository
3. ✅ Configured production API URL
4. ✅ Built web assets
5. ✅ Synced to Android
6. ✅ Built APK in Android Studio
7. ✅ Installed on phone

**Result**: APD Oasis mobile app working on your phone! 🎉

---

## 🆘 Common Problems

### Problem: "Android SDK not found"
**Solution**: In Android Studio, go to Settings → Android SDK → Install recommended versions

### Problem: "Gradle sync failed"
**Solution**: Make sure you have internet connection, try again

### Problem: "Build failed - Java version"
**Solution**: We already configured Java 17 in gradle.properties, should work

### Problem: "App crashes on open"
**Solution**: Check you updated `capacitor.config.ts` with the production URL

---

## 📱 Next Time (Much Faster!)

Once Android Studio is installed, building is quick:

```bash
# 1. Pull latest code
git pull

# 2. Update API URL if changed (capacitor.config.ts)

# 3. Build and sync
npm run build
npx cap sync android

# 4. Build APK
cd android
./gradlew assembleDebug

# Done! APK is ready in 5 minutes!
```

---

**Last Updated**: November 15, 2025
**Your APK will be**: `app-debug.apk` (~5-10 MB)
