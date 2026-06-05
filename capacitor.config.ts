import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'jp.garagelog.app',
  appName: 'GarageLog',
  webDir: 'capacitor-web',
  ios: {
    appendUserAgent: 'GarageLogCapacitor',
  },
  server: {
    url: 'https://<あなたのVercelのURL>', // previewでもprodでもOK
    cleartext: false,
  },
};

export default config;
