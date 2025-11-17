import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apotekalpro.apdoasis',
  appName: 'APD Oasis',
  webDir: 'dist',
  server: {
    // For production, the app will load from the APK
    // API calls will go to production backend
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['https://apd-oasis.pages.dev', 'https://*.pages.dev']
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
