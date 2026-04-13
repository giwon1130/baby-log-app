import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const BASE_URL: string = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:8092'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.message ?? 'API error')
  return json.data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
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
