import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { api, getOrCreateDeviceId } from './client'

export async function registerPushTokenForFamily(familyId: string): Promise<void> {
  if (!Device.isDevice) return
  if (Platform.OS === 'ios') {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let status = existing
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync()
      status = req.status
    }
    if (status !== 'granted') return
  }
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
  if (!projectId) return
  let token: string
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId })
    token = result.data
  } catch {
    return
  }
  const deviceId = await getOrCreateDeviceId()
  await api.post(`/api/v1/families/${familyId}/push-tokens`, {
    deviceId,
    expoToken: token,
    label: Device.modelName ?? '',
    platform: Platform.OS,
  }).catch(() => {})
}
