import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blastoise.app',
  appName: 'Blastoise',
  // Mobile serves the web PWA build output
  webDir: '../../dist/apps/web/browser',

  // Server configuration for CORS
  server: {
    // Use https for Android (required for ES modules to work properly)
    androidScheme: 'https',
    // Allow navigation to API
    allowNavigation: ['blastoise-api.up.railway.app'],
  },

  // Handle custom URL schemes for auth callbacks
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    // Status bar - do NOT overlay WebView (content stays below status bar)
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#1d232a',
    },
  },

  // Android-specific configuration
  android: {
    // Allow mixed content for development
    allowMixedContent: true,
    // Background color matching the app theme
    backgroundColor: '#1d232a',
  },
};

export default config;
