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
    appleTeamId: '776H9NV6HT',
    entitlements: {
      'com.apple.security.application-groups': ['group.com.giwon.babylog'],
    },
    infoPlist: {
      NSUserNotificationsUsageDescription: '다음 수유 시간을 알려드립니다.',
      NSMicrophoneUsageDescription: '아기 울음을 감지해서 수면·수유 기록에 도움을 드리기 위해 사용합니다. 녹음이나 업로드는 하지 않아요.',
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
    '@react-native-community/datetimepicker',
    '@bacons/apple-targets',
  ],
  extra: {
    apiBaseUrl: process.env.BABY_LOG_API_URL ?? 'https://baby-log-api-production.up.railway.app',
    eas: {
      projectId: '8c7b0f38-259b-4760-b10d-e9a9833e63bf',
    },
  },
})
