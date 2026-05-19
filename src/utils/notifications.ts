import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// ── Storage keys ──────────────────────────────────────────────────────────────

const NOTIFICATION_ENABLED_KEY = 'feedNotificationEnabled'
const DIAPER_NOTIFICATION_ENABLED_KEY = 'diaperNotificationEnabled'
const SLEEP_NOTIFICATION_ENABLED_KEY = 'sleepNotificationEnabled'
const FEED_INTERVAL_OVERRIDE_KEY = 'feedIntervalOverrideHours'
const DIAPER_REMINDER_HOURS_KEY = 'diaperReminderHours'
const NAP_REMINDER_HOURS_KEY = 'napReminderHours'

const FEED_NOTIFICATION_ID = 'feed_notification'
const DIAPER_NOTIFICATION_ID = 'diaper_reminder'
const NAP_NOTIFICATION_ID = 'nap_reminder'

// ── Enabled toggles ───────────────────────────────────────────────────────────

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

// ── Interval overrides ────────────────────────────────────────────────────────

/** null = 자동(서버 계산값 사용), number = 고정 간격(시간) */
export async function getFeedIntervalOverride(): Promise<number | null> {
  const val = await AsyncStorage.getItem(FEED_INTERVAL_OVERRIDE_KEY)
  return val != null ? parseFloat(val) : null
}
export async function setFeedIntervalOverride(hours: number | null): Promise<void> {
  if (hours == null) await AsyncStorage.removeItem(FEED_INTERVAL_OVERRIDE_KEY)
  else await AsyncStorage.setItem(FEED_INTERVAL_OVERRIDE_KEY, String(hours))
}

export async function getDiaperReminderHours(): Promise<number> {
  const val = await AsyncStorage.getItem(DIAPER_REMINDER_HOURS_KEY)
  return val ? parseFloat(val) : 3
}
export async function setDiaperReminderHours(hours: number): Promise<void> {
  await AsyncStorage.setItem(DIAPER_REMINDER_HOURS_KEY, String(hours))
}

export async function getNapReminderHours(): Promise<number> {
  const val = await AsyncStorage.getItem(NAP_REMINDER_HOURS_KEY)
  return val ? parseFloat(val) : 2
}
export async function setNapReminderHours(hours: number): Promise<void> {
  await AsyncStorage.setItem(NAP_REMINDER_HOURS_KEY, String(hours))
}

// ── Permissions + handler ─────────────────────────────────────────────────────

/**
 * App startup 에서 한 번 호출 — 포그라운드에서도 배너/리스트로 뜨도록 설정.
 * 이전에는 module top-level side-effect 였는데 import 만 해도 실행되는 게 부담스러워서 함수화.
 */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

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

// ── Scheduling primitives ─────────────────────────────────────────────────────

/** scheduleNotificationAsync DATE trigger 보일러플레이트 헬퍼. */
async function scheduleAt(
  identifier: string,
  title: string,
  body: string,
  date: Date,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  })
}

// ── Feed reminder ─────────────────────────────────────────────────────────────

/**
 * 수유 알림 스케줄.
 * - fedAt이 있고 커스텀 간격이 설정된 경우: fedAt + 커스텀 간격으로 계산
 * - 그 외: 서버가 계산한 nextFeedAt 사용
 */
export async function scheduleFeedNotification(nextFeedAt: string, babyName?: string, fedAt?: string): Promise<void> {
  if (!(await getNotificationEnabled())) return

  const override = await getFeedIntervalOverride()
  const triggerDate = override != null && fedAt
    ? new Date(new Date(fedAt).getTime() + override * 60 * 60 * 1000)
    : new Date(nextFeedAt)
  if (triggerDate.getTime() <= Date.now()) return

  await cancelFeedNotification()
  await scheduleAt(
    FEED_NOTIFICATION_ID,
    '🍼 수유 시간이에요',
    babyName ? `${babyName} 수유 시간이 됐어요!` : '수유 시간이 됐어요!',
    triggerDate,
  )
}

export async function cancelFeedNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(FEED_NOTIFICATION_ID).catch(() => {})
}

// ── Diaper reminder ───────────────────────────────────────────────────────────

export async function scheduleDiaperReminder(changedAt: string, babyName?: string): Promise<void> {
  if (!(await getDiaperNotificationEnabled())) return

  const hours = await getDiaperReminderHours()
  const triggerDate = new Date(new Date(changedAt).getTime() + hours * 60 * 60 * 1000)
  if (triggerDate.getTime() <= Date.now()) return

  await cancelDiaperReminder()
  await scheduleAt(
    DIAPER_NOTIFICATION_ID,
    '🧷 기저귀 확인할 시간이에요',
    babyName ? `${babyName} 기저귀를 확인해주세요!` : '기저귀를 확인해주세요!',
    triggerDate,
  )
}

export async function cancelDiaperReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DIAPER_NOTIFICATION_ID).catch(() => {})
}

// ── Nap reminder ──────────────────────────────────────────────────────────────

export async function scheduleNapReminder(wokeAt: string, babyName?: string): Promise<void> {
  if (!(await getSleepNotificationEnabled())) return

  const hours = await getNapReminderHours()
  const triggerDate = new Date(new Date(wokeAt).getTime() + hours * 60 * 60 * 1000)
  if (triggerDate.getTime() <= Date.now()) return

  await cancelNapReminder()
  await scheduleAt(
    NAP_NOTIFICATION_ID,
    '😴 낮잠 시간이에요',
    babyName ? `${babyName} 슬슬 재울 시간이에요!` : '슬슬 재울 시간이에요!',
    triggerDate,
  )
}

export async function cancelNapReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NAP_NOTIFICATION_ID).catch(() => {})
}
