import { Platform } from 'react-native'
import { ExtensionStorage } from '@bacons/apple-targets'

const APP_GROUP = 'group.com.giwon.babylog'

// iOS 위젯 전용. Android/web 에선 storage null → no-op.
const storage = Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null

/**
 * iOS 홈 위젯에 표시할 수유 현황 + 오늘 요약을 App Group 에 기록하고 위젯 갱신.
 * 시각은 epoch milliseconds(number)로 저장 — Swift 쪽에서 Date 로 복원.
 * 오늘 통계(수유횟수 등)는 medium 위젯에서 사용.
 */
export function updateFeedWidget(params: {
  babyName?: string
  lastFedAt?: string | null
  nextFeedAt?: string | null
  feedCount?: number
  totalFeedMl?: number
  diaperCount?: number
  sleepCount?: number
  totalSleepMinutes?: number
}): void {
  if (!storage) return
  try {
    storage.set('babyName', params.babyName ?? '아기')
    storage.set('lastFedAt', params.lastFedAt ? new Date(params.lastFedAt).getTime() : 0)
    storage.set('nextFeedAt', params.nextFeedAt ? new Date(params.nextFeedAt).getTime() : 0)
    storage.set('feedCount', params.feedCount ?? 0)
    storage.set('totalFeedMl', params.totalFeedMl ?? 0)
    storage.set('diaperCount', params.diaperCount ?? 0)
    storage.set('sleepCount', params.sleepCount ?? 0)
    storage.set('totalSleepMinutes', params.totalSleepMinutes ?? 0)
    ExtensionStorage.reloadWidget()
  } catch {
    // 위젯 미설치 / 구버전 등 — 조용히 무시
  }
}
