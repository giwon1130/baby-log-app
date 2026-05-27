import { api, uploadMultipart } from './client'
import type { Baby, BabyDiagnosis, CryLabel, CrySample, DailyChecklist, DiaperRecord, FeedRecord, Family, GrowthRecord, GrowthStage, HealthAskResponse, HealthTip, MonthlyPhoto, SleepRecord, TodayStats, WeeklyStats } from '../types'

// Family
export const createFamily = () => api.post<Family>('/api/v1/families', {})
export const getFamily = (familyId: string) =>
  api.get<Family>(`/api/v1/families/${familyId}`)
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

export const updateBaby = (familyId: string, babyId: string, data: {
  name?: string
  birthWeightG?: number
  birthHeightCm?: number
}) => api.put<Baby>(`/api/v1/families/${familyId}/babies/${babyId}`, data)

export const deleteBaby = (familyId: string, babyId: string) =>
  api.delete<{ deleted: boolean; babyId: string }>(`/api/v1/families/${familyId}/babies/${babyId}`)

// Feed
export const recordFeed = (babyId: string, data: {
  fedAt?: string
  amountMl?: number
  feedType?: string
  note?: string
  leftMinutes?: number
  rightMinutes?: number
}) => api.post<FeedRecord>(`/api/v1/babies/${babyId}/feeds`, data)

export const getFeeds = (babyId: string, limit = 50, date?: string) =>
  api.get<FeedRecord[]>(`/api/v1/babies/${babyId}/feeds?limit=${limit}${date ? `&date=${date}` : ''}`)

export const getLatestFeed = (babyId: string) =>
  api.get<FeedRecord | null>(`/api/v1/babies/${babyId}/feeds/latest`)

export const updateFeed = (babyId: string, feedId: string, data: {
  fedAt?: string
  amountMl?: number
  feedType?: string
  note?: string
  leftMinutes?: number
  rightMinutes?: number
}) => api.put<FeedRecord>(`/api/v1/babies/${babyId}/feeds/${feedId}`, data)

export const deleteFeed = (babyId: string, feedId: string) =>
  api.delete<void>(`/api/v1/babies/${babyId}/feeds/${feedId}`)

// Diaper
export const recordDiaper = (babyId: string, data: {
  changedAt?: string
  diaperType?: string
  note?: string
}) => api.post<DiaperRecord>(`/api/v1/babies/${babyId}/diapers`, data)

export const getDiapers = (babyId: string, limit = 50, date?: string) =>
  api.get<DiaperRecord[]>(`/api/v1/babies/${babyId}/diapers?limit=${limit}${date ? `&date=${date}` : ''}`)

export const updateDiaper = (babyId: string, diaperId: string, data: {
  changedAt?: string
  diaperType?: string
  note?: string
}) => api.put<DiaperRecord>(`/api/v1/babies/${babyId}/diapers/${diaperId}`, data)

export const deleteDiaper = (babyId: string, diaperId: string) =>
  api.delete<void>(`/api/v1/babies/${babyId}/diapers/${diaperId}`)

// Growth Records
export const recordGrowth = (babyId: string, data: {
  measuredAt?: string
  weightG?: number
  heightCm?: number
  headCm?: number
  note?: string
}) => api.post<GrowthRecord>(`/api/v1/babies/${babyId}/growth-records`, data)

export const getGrowthRecords = (babyId: string, limit = 20) =>
  api.get<GrowthRecord[]>(`/api/v1/babies/${babyId}/growth-records?limit=${limit}`)

// Sleep
export const startSleep = (babyId: string, data: { sleptAt?: string; note?: string }) =>
  api.post<SleepRecord>(`/api/v1/babies/${babyId}/sleeps/start`, data)

export const endSleep = (babyId: string, sleepId: string, data: { wokeAt?: string }) =>
  api.post<SleepRecord>(`/api/v1/babies/${babyId}/sleeps/${sleepId}/end`, data)

export const getSleepRecords = (babyId: string, limit = 50, date?: string) =>
  api.get<SleepRecord[]>(`/api/v1/babies/${babyId}/sleeps?limit=${limit}${date ? `&date=${date}` : ''}`)

export const getActiveSleep = (babyId: string) =>
  api.get<SleepRecord | null>(`/api/v1/babies/${babyId}/sleeps/active`)

export const updateSleep = (babyId: string, sleepId: string, data: {
  sleptAt?: string
  wokeAt?: string
  note?: string
}) => api.put<SleepRecord>(`/api/v1/babies/${babyId}/sleeps/${sleepId}`, data)

export const deleteSleep = (babyId: string, sleepId: string) =>
  api.delete<void>(`/api/v1/babies/${babyId}/sleeps/${sleepId}`)

export const updateGrowthRecord = (babyId: string, recordId: string, data: {
  weightG?: number
  heightCm?: number
  headCm?: number
  note?: string
}) => api.put<GrowthRecord>(`/api/v1/babies/${babyId}/growth-records/${recordId}`, data)

export const deleteGrowthRecord = (babyId: string, recordId: string) =>
  api.delete<void>(`/api/v1/babies/${babyId}/growth-records/${recordId}`)

// Growth Stage
export const getGrowthStage = (babyId: string, familyId: string) =>
  api.get<GrowthStage>(`/api/v1/babies/${babyId}/growth-stage?familyId=${familyId}`)

// Stats
export const getTodayStats = (babyId: string) =>
  api.get<TodayStats>(`/api/v1/babies/${babyId}/stats/today`)

export const getWeeklyStats = (babyId: string) =>
  api.get<WeeklyStats>(`/api/v1/babies/${babyId}/stats/weekly`)

export const getMonthlyStats = (babyId: string) =>
  api.get<WeeklyStats>(`/api/v1/babies/${babyId}/stats/monthly`)

// Cry analysis
export const submitCrySample = (babyId: string, data: {
  durationSec: number
  cryConfidenceAvg?: number | null
  cryConfidenceMax?: number | null
  avgVolumeDb?: number | null
  peakVolumeDb?: number | null
  pitchMeanHz?: number | null
  pitchStdHz?: number | null
  pitchMaxHz?: number | null
  voicedRatio?: number | null
  zcrMean?: number | null
  rhythmicity?: number | null
  note?: string
}) => api.post<CrySample>(`/api/v1/babies/${babyId}/cry-samples`, data)

export const confirmCrySample = (sampleId: string, confirmedLabel: CryLabel, note = '') =>
  api.patch<CrySample>(`/api/v1/cry-samples/${sampleId}/confirm`, { confirmedLabel, note })

export const getCryHistory = (babyId: string, limit = 50) =>
  api.get<CrySample[]>(`/api/v1/babies/${babyId}/cry-samples?limit=${limit}`)

// Monthly photos — 1~12개월 증명사진 슬롯
export const getMonthlyPhotos = (babyId: string) =>
  api.get<MonthlyPhoto[]>(`/api/v1/babies/${babyId}/monthly-photos`)

export const uploadMonthlyPhoto = (
  babyId: string,
  monthIndex: number,
  file: { uri: string; name: string; type: string },
  meta: { caption?: string; locationHint?: string; takenAt?: string } = {},
) => uploadMultipart<MonthlyPhoto>(
  `/api/v1/babies/${babyId}/monthly-photos`,
  file,
  {
    monthIndex: String(monthIndex),
    ...(meta.takenAt ? { takenAt: meta.takenAt } : {}),
    ...(meta.caption ? { caption: meta.caption } : {}),
    ...(meta.locationHint ? { locationHint: meta.locationHint } : {}),
  },
)

export const deleteMonthlyPhoto = (babyId: string, monthIndex: number) =>
  api.delete<void>(`/api/v1/babies/${babyId}/monthly-photos/${monthIndex}`)

// Health Tips — 신생아 0~12개월 건강 가이드 + Gemini 자유 질문
export const getHealthTips = () =>
  api.get<HealthTip[]>('/api/v1/health-tips')

export const askHealthQuestion = (question: string, babyAgeMonths?: number) =>
  api.post<HealthAskResponse>('/api/v1/health-tips/ask', { question, babyAgeMonths })

// Baby diagnoses — 우리 아기에 진단된 이슈 + 일일 체크리스트
export const listDiagnoses = (babyId: string, includeResolved = false) =>
  api.get<BabyDiagnosis[]>(`/api/v1/babies/${babyId}/diagnoses?includeResolved=${includeResolved}`)

export const createDiagnosis = (babyId: string, data: {
  tipId: string
  side?: string
  startedAt?: string
  notes?: string
}) => api.post<BabyDiagnosis>(`/api/v1/babies/${babyId}/diagnoses`, data)

export const resolveDiagnosis = (babyId: string, diagnosisId: string) =>
  api.post<{ status: string }>(`/api/v1/babies/${babyId}/diagnoses/${diagnosisId}/resolve`, {})

export const deleteDiagnosis = (babyId: string, diagnosisId: string) =>
  api.delete<void>(`/api/v1/babies/${babyId}/diagnoses/${diagnosisId}`)

export const getDiagnosisChecklist = (babyId: string, diagnosisId: string) =>
  api.get<DailyChecklist>(`/api/v1/babies/${babyId}/diagnoses/${diagnosisId}/checklist`)

export const setDiagnosisTaskDone = (
  babyId: string,
  diagnosisId: string,
  taskKey: string,
  done: boolean,
) => api.post<{ done: boolean; taskKey: string }>(
  `/api/v1/babies/${babyId}/diagnoses/${diagnosisId}/tasks/${taskKey}`,
  { done },
)
