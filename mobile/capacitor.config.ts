import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the standalone Android build.
 *
 * The Android app ships the same Vite bundle as the web/desktop clients, but the
 * data layer is backed by on-device SQLite instead of the HTTP/PostgreSQL API.
 */
const config: CapacitorConfig = {
  appId: 'com.ipscscore.app',
  appName: 'IPSCScore',
  webDir: '../frontend/dist',
  android: {
    // The app is fully local; no cleartext traffic to a LAN backend is required.
    allowMixedContent: false,
  },
  plugins: {
    CapacitorSQLite: {
      // Encryption is opt-in: enable together with a passphrase flow before release.
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricAuthTitle: 'Unlock IPSCScore',
        biometricAuthSubtitle: 'Authenticate to open the local match database',
        biometricAuthDescription: 'Use your fingerprint or face to unlock the local database',
      },
      iosIsEncryption: false,
    },
  },
};

export default config;
