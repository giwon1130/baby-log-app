import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { getDiapers, getFeeds, getSleepRecords } from '../api/babyLogApi'
import { medianIntervalHours, napAwakeWindowHours } from './feedingPattern'

// 패턴 학습 폴백 — 표본이 부족할 때 쓰는 고정 간격(시간)
const DEFAULT_DIAPER_HOURS = 3
const DEFAULT_NAP_HOURS = 2
// 패턴 계산에 쓸 최근 기록 조회 개수
const PATTERN_FETCH_LIMIT = 16

// ── Storage keys ──────────────────────────────────────────────────────────────

const NOTIFICATION_ENABLED_KEY = 'feedNotificationEnabled'
const DIAPER_NOTIFICATION_ENABLED_KEY = 'diaperNotificationEnabled'
const SLEEP_NOTIFICATION_ENABLED_KEY = 'sleepNotificationEnabled'
const DAILY_SUMMARY_ENABLED_KEY = 'dailySummaryEnabled'
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

/**
 * 일일 요약 푸시 수신 토글. 서버 cron 이 발송하므로 로컬값은 캐시이고
 * 실제 발송 여부는 백엔드 bl_push_tokens.daily_summary_enabled 가 결정 —
 * 토글 시 syncDailySummaryEnabled() 로 백엔드에도 반영해야 함.
 */
export async function getDailySummaryEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(DAILY_SUMMARY_ENABLED_KEY)
  return val !== 'false'
}
export async function setDailySummaryEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(DAILY_SUMMARY_ENABLED_KEY, String(enabled))
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

/** null = 패턴 학습(우리 아기 기록 기반 자동), number = 고정 간격(시간) */
export async function getDiaperReminderHours(): Promise<number | null> {
  const val = await AsyncStorage.getItem(DIAPER_REMINDER_HOURS_KEY)
  return val != null ? parseFloat(val) : null
}
export async function setDiaperReminderHours(hours: number | null): Promise<void> {
  if (hours == null) await AsyncStorage.removeItem(DIAPER_REMINDER_HOURS_KEY)
  else await AsyncStorage.setItem(DIAPER_REMINDER_HOURS_KEY, String(hours))
}

/** null = 패턴 학습(깨어 있는 시간 기반 자동), number = 고정 간격(시간) */
export async function getNapReminderHours(): Promise<number | null> {
  const val = await AsyncStorage.getItem(NAP_REMINDER_HOURS_KEY)
  return val != null ? parseFloat(val) : null
}
export async function setNapReminderHours(hours: number | null): Promise<void> {
  if (hours == null) await AsyncStorage.removeItem(NAP_REMINDER_HOURS_KEY)
  else await AsyncStorage.setItem(NAP_REMINDER_HOURS_KEY, String(hours))
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
 * 수유 알림 스케줄. 우선순위:
 * 1. 수동 고정 간격(override) 이 있으면 fedAt + override
 * 2. 자동 모드 + babyId 가 있으면 최근 수유 간격의 중앙값(패턴 학습)으로 fedAt + 패턴
 * 3. 그 외(표본 부족 등): 서버가 계산한 nextFeedAt
 */
export async function scheduleFeedNotification(
  nextFeedAt: string,
  babyName?: string,
  fedAt?: string,
  babyId?: string,
): Promise<void> {
  if (!(await getNotificationEnabled())) return

  const override = await getFeedIntervalOverride()
  let triggerDate: Date | null = null

  if (override != null && fedAt) {
    triggerDate = new Date(new Date(fedAt).getTime() + override * 60 * 60 * 1000)
  } else if (babyId && fedAt) {
    const feeds = await getFeeds(babyId, PATTERN_FETCH_LIMIT).catch(() => [])
    const pattern = medianIntervalHours(feeds.map(f => f.fedAt))
    if (pattern != null) triggerDate = new Date(new Date(fedAt).getTime() + pattern * 60 * 60 * 1000)
  }
  if (!triggerDate) triggerDate = new Date(nextFeedAt)
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

export async function scheduleDiaperReminder(changedAt: string, babyName?: string, babyId?: string): Promise<void> {
  if (!(await getDiaperNotificationEnabled())) return

  const fixed = await getDiaperReminderHours()
  let hours = fixed
  if (hours == null && babyId) {
    const diapers = await getDiapers(babyId, PATTERN_FETCH_LIMIT).catch(() => [])
    hours = medianIntervalHours(diapers.map(d => d.changedAt))
  }
  if (hours == null) hours = DEFAULT_DIAPER_HOURS

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

export async function scheduleNapReminder(wokeAt: string, babyName?: string, babyId?: string): Promise<void> {
  if (!(await getSleepNotificationEnabled())) return

  const fixed = await getNapReminderHours()
  let hours = fixed
  if (hours == null && babyId) {
    const sleeps = await getSleepRecords(babyId, PATTERN_FETCH_LIMIT).catch(() => [])
    hours = napAwakeWindowHours(sleeps)
  }
  if (hours == null) hours = DEFAULT_NAP_HOURS

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
