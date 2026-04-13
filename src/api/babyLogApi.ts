import { api } from './client'
import type { Baby, DiaperRecord, FeedRecord, Family, GrowthStage } from '../types'

// Family
export const createFamily = () => api.post<Family>('/api/v1/families', {})
export const joinFamily = (inviteCode: string) =>
  api.get<Family>(`/api/v1/families/join/${inviteCode}`)

// Baby
export const createBaby = (familyId: string, data: {
  name: string
  birthDate: string
  gender: string
  birthWeightG?: number
  birthHeightCm?: number
}) => api.post<Baby>(`/api/v1/families/${familyId}/babies`, data)

export const getBabies = (familyId: string) =>
  api.get<Baby[]>(`/api/v1/families/${familyId}/babies`)

// Feed
export const recordFeed = (babyId: string, data: {
  fedAt?: string
  amountMl: number
  feedType?: string
  note?: string
}) => api.post<FeedRecord>(`/api/v1/babies/${babyId}/feeds`, data)

export const getFeeds = (babyId: string, limit = 20) =>
  api.get<FeedRecord[]>(`/api/v1/babies/${babyId}/feeds?limit=${limit}`)

export const getLatestFeed = (babyId: string) =>
  api.get<FeedRecord | null>(`/api/v1/babies/${babyId}/feeds/latest`)

// Diaper
export const recordDiaper = (babyId: string, data: {
  changedAt?: string
  diaperType?: string
  note?: string
}) => api.post<DiaperRecord>(`/api/v1/babies/${babyId}/diapers`, data)

export const getDiapers = (babyId: string, limit = 20) =>
  api.get<DiaperRecord[]>(`/api/v1/babies/${babyId}/diapers?limit=${limit}`)

// Growth Stage
export const getGrowthStage = (babyId: string, familyId: string) =>
  api.get<GrowthStage>(`/api/v1/babies/${babyId}/growth-stage?familyId=${familyId}`)
