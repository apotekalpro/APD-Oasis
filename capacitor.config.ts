import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apotekalpro.apdoasis',
  appName: 'APD Oasis',
  webDir: 'dist',
  server: {
    // Load assets from APK
    hostname: 'app',
    androidScheme: 'http'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
