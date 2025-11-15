# APD Oasis Mobile App Guide

## Overview
The APD Oasis app has been set up with **Capacitor** for Android mobile deployment. The Android project structure is ready, but the APK needs to be built on a system with Android SDK installed.

## Current Status ✅
- ✅ Capacitor configured with Android platform
- ✅ Mobile-optimized HTML with responsive design
- ✅ Android project structure created in `/android` folder
- ✅ Mobile-friendly UI with touch optimizations
- ✅ All code pushed to GitHub
- ⚠️ APK building requires Android SDK (not available in sandbox)

## What's Been Configured

### 1. Mobile-Optimized HTML (`index.html`)
```html
- Viewport settings for mobile devices
- Prevents zoom on input focus
- Touch-friendly button sizes (44px minimum)
- Smooth scrolling for better UX
- TailwindCSS for responsive design
- All CDN libraries included
```

### 2. Capacitor Configuration (`capacitor.config.ts`)
```typescript
{
  appId: 'com.apotekalpro.apdoasis',
  appName: 'APD Oasis',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  }
}
```

### 3. Android Project Structure
```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com/apotekalpro/apdoasis/
│   │   └── res/ (icons, splash screens)
│   └── build.gradle
├── gradle/
└── build.gradle
```

## How to Build the APK

### Option 1: Using Android Studio (Recommended)

1. **Install Android Studio**
   - Download from: https://developer.android.com/studio
   - Install Android SDK (API Level 33 or higher)

2. **Open the Project**
   ```bash
   git clone https://github.com/apotekalpro/APD-Oasis.git
   cd APD-Oasis
   ```
   - Open Android Studio
   - Select "Open an existing project"
   - Navigate to `APD-Oasis/android` folder
   - Wait for Gradle sync to complete

3. **Build APK**
   - Menu: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Or use terminal in Android Studio:
     ```bash
     ./gradlew assembleDebug
     ```
   - APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Install on Device**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Option 2: Using Command Line (Linux/Mac with Android SDK)

1. **Prerequisites**
   ```bash
   # Install Android SDK
   # Set environment variables
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

2. **Clone and Build**
   ```bash
   git clone https://github.com/apotekalpro/APD-Oasis.git
   cd APD-Oasis
   npm install
   npm run build  # Build web assets
   npx cap sync android  # Sync to Android
   cd android
   ./gradlew assembleDebug
   ```

3. **APK Location**
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Option 3: Using GitHub Actions (CI/CD)

Create `.github/workflows/build-apk.yml`:

```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Java 17
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Install dependencies
        run: npm install
      
      - name: Build web assets
        run: npm run build
      
      - name: Sync Capacitor
        run: npx cap sync android
      
      - name: Build APK
        run: |
          cd android
          ./gradlew assembleDebug
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 4: Using EAS Build (Expo Application Services)

For easier cloud building without local Android SDK:

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**
   ```bash
   eas build:configure
   ```

3. **Build in Cloud**
   ```bash
   eas build --platform android
   ```

## Important Configuration Notes

### API Endpoint Configuration

For the mobile app to work, you need to configure the backend API URL:

**Option A: Modify `capacitor.config.ts`** (before building):
```typescript
server: {
  url: 'https://your-backend-url.com',  // Your production API
  androidScheme: 'https',
  cleartext: true
}
```

**Option B: Modify `public/static/app.js`** (before building):
```javascript
// Line 35: Change from window.location.origin to your API URL
const API_BASE = 'https://your-backend-url.com'
axios.defaults.baseURL = API_BASE
```

### Current Backend API

The app currently connects to:
- **Local**: `http://localhost:3000` (for testing)
- **Production**: You need to deploy the backend to Cloudflare Pages or another hosting service

To deploy backend to Cloudflare Pages:
```bash
npm run deploy:prod
# This will give you a URL like: https://apd-oasis.pages.dev
```

Then update the API endpoint in the mobile app configuration.

## Testing the App

### 1. Test in Browser First
```bash
npm run dev
# Open http://localhost:5173 in mobile device browser
```

### 2. Test with Capacitor Live Reload
```bash
npx cap run android
# Requires device connected via USB with USB debugging enabled
```

### 3. Install APK on Device
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Troubleshooting

### Issue: "SDK location not found"
**Solution**: Set `ANDROID_HOME` environment variable or create `android/local.properties`:
```properties
sdk.dir=/path/to/android/sdk
```

### Issue: "Android Gradle plugin requires Java 17"
**Solution**: Install Java 17 and set in `android/gradle.properties`:
```properties
org.gradle.java.home=/path/to/jdk-17
```

### Issue: App can't connect to backend
**Solution**: 
1. Ensure backend is deployed and accessible
2. Update API URL in `capacitor.config.ts` or `app.js`
3. Rebuild and reinstall app

### Issue: White screen on app launch
**Solution**:
1. Check browser console in Chrome DevTools (chrome://inspect)
2. Verify all files copied correctly: `npx cap sync android`
3. Check `android/app/src/main/assets/public/` contains files

## Mobile App Features

### Mobile-Optimized UI
- ✅ Responsive layout for all screen sizes
- ✅ Touch-friendly buttons (44px minimum)
- ✅ Prevents zoom on input focus
- ✅ Smooth scrolling
- ✅ Native-like navigation
- ✅ Status bar color customization

### Scanner Integration
- The app uses browser-based barcode scanning
- On mobile, it will use device camera
- Works with all standard barcode formats

### Offline Capabilities
To add offline support, you can:
1. Implement Service Worker for caching
2. Use Capacitor Storage for local data
3. Add sync logic for when connection restored

## Next Steps

1. **Build the APK** using one of the methods above
2. **Deploy Backend** to get production API URL
3. **Update API Configuration** in mobile app
4. **Rebuild APK** with production settings
5. **Test on Real Devices**
6. **Distribute** via Google Play Store or internal distribution

## Production Deployment Checklist

- [ ] Backend deployed to production
- [ ] API URL configured in mobile app
- [ ] APK built with production settings
- [ ] Tested on multiple devices
- [ ] App signed with release keystore (for Play Store)
- [ ] Version number updated in `android/app/build.gradle`
- [ ] App icons and splash screens customized
- [ ] Permissions configured in AndroidManifest.xml

## Support

For issues or questions:
- GitHub Repository: https://github.com/apotekalpro/APD-Oasis
- Check Android project logs: `adb logcat`
- Check Capacitor docs: https://capacitorjs.com/docs

---

**Version**: 1.9.0  
**Last Updated**: 2025-11-15
