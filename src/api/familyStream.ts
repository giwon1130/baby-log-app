import Constants from 'expo-constants'
import EventSource from 'react-native-sse'

const BASE_URL: string = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:8092'

export type FamilyStreamEventName =
  | 'ready'
  | 'FEED_CREATED' | 'FEED_UPDATED' | 'FEED_DELETED'
  | 'DIAPER_CREATED' | 'DIAPER_UPDATED' | 'DIAPER_DELETED'
  | 'SLEEP_STARTED' | 'SLEEP_ENDED' | 'SLEEP_UPDATED' | 'SLEEP_DELETED'
  | 'GROWTH_CREATED' | 'GROWTH_UPDATED' | 'GROWTH_DELETED'
  | 'HEALTH_CREATED' | 'HEALTH_DELETED'
  | 'MONTHLY_PHOTO_UPSERTED' | 'MONTHLY_PHOTO_DELETED'
  | 'FIRST_YEAR_COMPLETE'

export type FamilyStreamPayload = {
  type: FamilyStreamEventName
  familyId: string
  babyId: string | null
  actorDeviceId: string | null
  payload: unknown
}

export type FamilyStreamHandler = (event: FamilyStreamPayload) => void

const EVENTS: FamilyStreamEventName[] = [
  'FEED_CREATED', 'FEED_UPDATED', 'FEED_DELETED',
  'DIAPER_CREATED', 'DIAPER_UPDATED', 'DIAPER_DELETED',
  'SLEEP_STARTED', 'SLEEP_ENDED', 'SLEEP_UPDATED', 'SLEEP_DELETED',
  'GROWTH_CREATED', 'GROWTH_UPDATED', 'GROWTH_DELETED',
  'HEALTH_CREATED', 'HEALTH_DELETED',
  'MONTHLY_PHOTO_UPSERTED', 'MONTHLY_PHOTO_DELETED',
  'FIRST_YEAR_COMPLETE',
]

export function openFamilyStream(familyId: string, onEvent: FamilyStreamHandler): () => void {
  const url = `${BASE_URL}/api/v1/families/${familyId}/stream`
  const es = new EventSource(url, { pollingInterval: 5000 })

  for (const name of EVENTS) {
    es.addEventListener(name as any, (e: any) => {
      if (e.type === 'error' || e.type === 'open') return
      const data = typeof e.data === 'string' ? safeJson(e.data) : e.data
      onEvent({
        type: name,
        familyId,
        babyId: data?.babyId ?? null,
        actorDeviceId: data?.actorDeviceId ?? null,
        payload: data?.payload ?? null,
      })
    })
  }

  return () => es.close()
}

function safeJson(s: string): any {
  try { return JSON.parse(s) } catch { return null }
}
