import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elixstarlive.app',
  appName: 'Elix Star Live',
  webDir: 'dist',
  server: {
    iosScheme: "https",
  },
  bundledWebRuntime: false
};

export default config;
