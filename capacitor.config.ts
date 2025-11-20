import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apotekalpro.apdoasis',
  appName: 'APD Oasis',
  webDir: 'dist',
  server: {
    // Load assets from APK, not from external server
    // API calls will go to production backend
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
