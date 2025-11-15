import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apotekalpro.apdoasis',
  appName: 'APD Oasis',
  webDir: 'dist',
  server: {
    // For production, the app will load from the APK
    // But we need to configure API calls to go to your backend
    androidScheme: 'https',
    cleartext: true,
    // Uncomment and set your production API URL when deploying
    // url: 'https://your-backend-url.com',
    // allowNavigation: ['https://your-backend-url.com']
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
