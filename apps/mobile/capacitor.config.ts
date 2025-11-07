import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blastoise.app',
  appName: 'Blastoise',
  // Mobile serves the web PWA build output
  webDir: '../../dist/apps/web/browser',

  // Handle custom URL schemes for auth callbacks
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
