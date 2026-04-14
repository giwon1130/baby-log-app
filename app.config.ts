import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BabyLog',
  slug: 'baby-log-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FF6B9D',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.giwon.babylog',
    buildNumber: '1',
    infoPlist: {
      NSUserNotificationsUsageDescription: '다음 수유 시간을 알려드립니다.',
      UIBackgroundModes: ['fetch', 'remote-notification'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FF6B9D',
    },
    package: 'com.giwon.babylog',
    versionCode: 1,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.VIBRATE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#FF6B9D',
        sounds: [],
      },
    ],
  ],
  extra: {
    apiBaseUrl: process.env.BABY_LOG_API_URL ?? 'http://localhost:8092',
    eas: {
      projectId: '',
    },
  },
})
