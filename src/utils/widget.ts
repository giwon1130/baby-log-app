import { Platform } from 'react-native'
import { ExtensionStorage } from '@bacons/apple-targets'

const APP_GROUP = 'group.com.giwon.babylog'

// iOS 위젯 전용. Android/web 에선 storage null → no-op.
const storage = Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null

/**
 * iOS 홈 위젯에 표시할 수유 현황을 App Group 에 기록하고 위젯을 갱신.
 * 시각은 epoch milliseconds(number)로 저장 — Swift 쪽에서 Date 로 복원.
 */
export function updateFeedWidget(params: {
  babyName?: string
  lastFedAt?: string | null
  nextFeedAt?: string | null
}): void {
  if (!storage) return
  try {
    storage.set('babyName', params.babyName ?? '아기')
    storage.set('lastFedAt', params.lastFedAt ? new Date(params.lastFedAt).getTime() : 0)
    storage.set('nextFeedAt', params.nextFeedAt ? new Date(params.nextFeedAt).getTime() : 0)
    ExtensionStorage.reloadWidget()
  } catch {
    // 위젯 미설치 / 구버전 등 — 조용히 무시
  }
}
