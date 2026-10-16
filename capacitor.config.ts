import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL

const config: CapacitorConfig = {
  appId: 'com.viviclenaer.app',
  appName: 'ViviClenaer',
  webDir: 'public',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: true,
      }
    : undefined,
  android: {
    allowMixedContent: true,
  },
}

export default config
