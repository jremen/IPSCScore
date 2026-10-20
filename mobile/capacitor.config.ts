import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the standalone mobile builds (Android + iOS).
 *
 * Both apps ship the same Vite bundle as the web/desktop clients, but the data
 * layer is backed by on-device SQLite instead of the HTTP/PostgreSQL API.
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
      // Keep the database out of Documents: it stays invisible to iTunes/Finder
      // file sharing and is included in iCloud/iTunes device backups.
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      // Encryption is opt-in: enable together with a passphrase flow before release.
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: 'Unlock IPSCScore',
        biometricSubTitle: 'Authenticate to open the local match database',
      },
      iosIsEncryption: false,
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: 'Unlock IPSCScore',
      },
    },
  },
};

export default config;
