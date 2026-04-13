import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

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
    await Notifications.setNotificationChannelAsync('feed-reminder', {
      name: '수유 알림',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    })
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
