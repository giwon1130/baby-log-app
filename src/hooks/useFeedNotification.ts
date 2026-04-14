import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const NOTIFICATION_ENABLED_KEY = 'feedNotificationEnabled'
const DIAPER_NOTIFICATION_ENABLED_KEY = 'diaperNotificationEnabled'
const SLEEP_NOTIFICATION_ENABLED_KEY = 'sleepNotificationEnabled'

export async function getNotificationEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY)
  return val !== 'false'
}
export async function setNotificationEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, String(enabled))
  if (!enabled) await cancelFeedNotification()
}

export async function getDiaperNotificationEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(DIAPER_NOTIFICATION_ENABLED_KEY)
  return val !== 'false'
}
export async function setDiaperNotificationEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(DIAPER_NOTIFICATION_ENABLED_KEY, String(enabled))
  if (!enabled) await cancelDiaperReminder()
}

export async function getSleepNotificationEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(SLEEP_NOTIFICATION_ENABLED_KEY)
  return val !== 'false'
}
export async function setSleepNotificationEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(SLEEP_NOTIFICATION_ENABLED_KEY, String(enabled))
  if (!enabled) await cancelNapReminder()
}

// 알림이 포그라운드에서도 뜨도록 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const FEED_NOTIFICATION_ID_KEY = 'feed_notification'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false

  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync('feed-reminder', {
        name: '수유 알림',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      }),
      Notifications.setNotificationChannelAsync('diaper-reminder', {
        name: '기저귀 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      }),
      Notifications.setNotificationChannelAsync('sleep-reminder', {
        name: '수면 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      }),
    ])
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

/**
 * nextFeedAt (ISO string) 기준으로 로컬 알림을 스케줄.
 * 기존 예약된 수유 알림은 먼저 취소한 뒤 새로 등록.
 */
export async function scheduleFeedNotification(nextFeedAt: string, babyName?: string): Promise<void> {
  const enabled = await getNotificationEnabled()
  if (!enabled) return

  const triggerDate = new Date(nextFeedAt)
  if (triggerDate.getTime() <= Date.now()) return

  // 기존 알림 취소
  await cancelFeedNotification()

  await Notifications.scheduleNotificationAsync({
    identifier: FEED_NOTIFICATION_ID_KEY,
    content: {
      title: '🍼 수유 시간이에요',
      body: babyName ? `${babyName} 수유 시간이 됐어요!` : '수유 시간이 됐어요!',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })
}

export async function cancelFeedNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(FEED_NOTIFICATION_ID_KEY).catch(() => {})
}

// ── 기저귀 알림 (마지막 교환 3시간 후) ──────────────────────────────
const DIAPER_NOTIFICATION_ID = 'diaper_reminder'
const DIAPER_REMINDER_HOURS = 3

export async function scheduleDiaperReminder(changedAt: string, babyName?: string): Promise<void> {
  const enabled = await getDiaperNotificationEnabled()
  if (!enabled) return

  const triggerDate = new Date(new Date(changedAt).getTime() + DIAPER_REMINDER_HOURS * 60 * 60 * 1000)
  if (triggerDate.getTime() <= Date.now()) return

  await cancelDiaperReminder()
  await Notifications.scheduleNotificationAsync({
    identifier: DIAPER_NOTIFICATION_ID,
    content: {
      title: '🧷 기저귀 확인할 시간이에요',
      body: babyName ? `${babyName} 기저귀를 확인해주세요!` : '기저귀를 확인해주세요!',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })
}

export async function cancelDiaperReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DIAPER_NOTIFICATION_ID).catch(() => {})
}

// ── 낮잠 알림 (기상 2시간 후) ────────────────────────────────────────
const NAP_NOTIFICATION_ID = 'nap_reminder'
const AWAKE_LIMIT_HOURS = 2

export async function scheduleNapReminder(wokeAt: string, babyName?: string): Promise<void> {
  const enabled = await getSleepNotificationEnabled()
  if (!enabled) return

  const triggerDate = new Date(new Date(wokeAt).getTime() + AWAKE_LIMIT_HOURS * 60 * 60 * 1000)
  if (triggerDate.getTime() <= Date.now()) return

  await cancelNapReminder()
  await Notifications.scheduleNotificationAsync({
    identifier: NAP_NOTIFICATION_ID,
    content: {
      title: '😴 낮잠 시간이에요',
      body: babyName ? `${babyName} 슬슬 재울 시간이에요!` : '슬슬 재울 시간이에요!',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })
}

export async function cancelNapReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NAP_NOTIFICATION_ID).catch(() => {})
}

/**
 * 알림 수신 리스너 훅.
 * 컴포넌트에서 사용하면 포그라운드 알림 수신 시 콜백 실행.
 */
export function useNotificationListener(onReceive?: (notification: Notifications.Notification) => void) {
  const listenerRef = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    if (!onReceive) return
    listenerRef.current = Notifications.addNotificationReceivedListener(onReceive)
    return () => listenerRef.current?.remove()
  }, [onReceive])
}
