import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { api, getOrCreateDeviceId, getStoredFamilyId } from './client'
import { getDailySummaryEnabled } from '../utils/notifications'

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
  const dailySummaryEnabled = await getDailySummaryEnabled()
  await api.post(`/api/v1/families/${familyId}/push-tokens`, {
    deviceId,
    expoToken: token,
    label: Device.modelName ?? '',
    platform: Platform.OS,
    dailySummaryEnabled,
  }).catch(() => {})
}

/**
 * 일일 요약 수신 토글을 백엔드에 반영 (디바이스 단위).
 * 토큰 미등록 등으로 실패해도 조용히 무시 — 로컬 AsyncStorage 가 우선.
 */
export async function syncDailySummaryEnabled(enabled: boolean): Promise<void> {
  const familyId = await getStoredFamilyId()
  if (!familyId) return
  const deviceId = await getOrCreateDeviceId()
  await api.patch(
    `/api/v1/families/${familyId}/push-tokens/${deviceId}/daily-summary`,
    { enabled },
  ).catch(() => {})
}
