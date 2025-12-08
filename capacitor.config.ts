import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apotekalpro.apdoasis',
  appName: 'APD Oasis',
  webDir: 'dist',
  server: {
    // Load assets from APK - use https scheme for proper loading
    hostname: 'localhost',
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
