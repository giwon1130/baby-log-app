import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const BASE_URL: string = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:8092'

const DEVICE_ID_KEY = 'baby_log_device_id'
let cachedDeviceId: string | null = null

function newUuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } }
  if (g.crypto?.randomUUID) return g.crypto.randomUUID()
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (existing) {
    cachedDeviceId = existing
    return existing
  }
  const fresh = newUuid()
  await AsyncStorage.setItem(DEVICE_ID_KEY, fresh)
  cachedDeviceId = fresh
  return fresh
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const deviceId = await getOrCreateDeviceId()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
        ...options?.headers,
      },
      ...options,
    })
  } catch {
    throw new Error('서버에 연결할 수 없어요. 인터넷 연결을 확인해주세요.')
  }
  const json = await response.json()
  if (!response.ok) throw new Error(json.error ?? json.message ?? '알 수 없는 오류가 발생했어요.')
  return json.data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/**
 * multipart/form-data 업로드. Content-Type 은 RN 이 boundary 와 함께 자동 설정.
 * file 외 form param 은 string 으로만 받는다(서버 측 @RequestParam).
 */
export async function uploadMultipart<T>(
  path: string,
  file: { uri: string; name: string; type: string },
  params: Record<string, string> = {},
): Promise<T> {
  const deviceId = await getOrCreateDeviceId()
  const form = new FormData()
  // RN 의 FormData 는 file 부분에 { uri, name, type } 객체를 받는다.
  form.append('file', file as unknown as Blob)
  Object.entries(params).forEach(([k, v]) => form.append(k, v))

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'X-Device-Id': deviceId,
        // Content-Type 명시 X — RN 이 multipart boundary 와 함께 자동 설정
      },
      body: form,
    })
  } catch {
    throw new Error('서버에 연결할 수 없어요. 인터넷 연결을 확인해주세요.')
  }
  const json = await response.json()
  if (!response.ok) throw new Error(json.error ?? json.message ?? '업로드에 실패했어요.')
  return json.data as T
}

// 로컬 저장소 키
export const STORAGE_KEYS = {
  FAMILY_ID: 'baby_log_family_id',
  BABY_ID: 'baby_log_baby_id',
}

export async function getStoredFamilyId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.FAMILY_ID)
}

export async function getStoredBabyId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.BABY_ID)
}

export async function storeFamilyAndBaby(familyId: string, babyId: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_ID, familyId)
  await AsyncStorage.setItem(STORAGE_KEYS.BABY_ID, babyId)
}

export async function clearStoredBaby() {
  await AsyncStorage.removeItem(STORAGE_KEYS.BABY_ID)
}

export async function setStoredBaby(babyId: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.BABY_ID, babyId)
}
