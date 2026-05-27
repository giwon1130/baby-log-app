export type Family = {
  id: string
  inviteCode: string
}

export type Baby = {
  id: string
  familyId: string
  name: string
  birthDate: string
  gender: 'MALE' | 'FEMALE'
  birthWeightG: number | null
  birthHeightCm: number | null
  daysOld: number
}

export type FeedRecord = {
  id: string
  babyId: string
  fedAt: string
  amountMl: number
  feedType: 'FORMULA' | 'BREAST' | 'MIXED'
  note: string
  nextFeedAt: string | null
  nextFeedIntervalHours: number
  leftMinutes: number | null
  rightMinutes: number | null
}

export type DiaperRecord = {
  id: string
  babyId: string
  changedAt: string
  diaperType: 'WET' | 'DIRTY' | 'MIXED' | 'DRY'
  note: string
}

export type GrowthRecord = {
  id: string
  babyId: string
  measuredAt: string
  weightG: number | null
  heightCm: number | null
  headCm: number | null
  note: string
}

export type SleepRecord = {
  id: string
  babyId: string
  sleptAt: string
  wokeAt: string | null
  durationMinutes: number | null
  note: string
}

export type GrowthStage = {
  daysOld: number
  stage: string
  title: string
  description: string
  tips: string[]
  feedingGuideMl: { start: number; end: number }
  feedingIntervalHours: { start: number; end: number }
}

export type TodayStats = {
  date: string
  feedCount: number
  totalFeedMl: number
  diaperCount: number
  wetCount: number
  dirtyCount: number
  sleepCount: number
  totalSleepMinutes: number
  longestSleepMinutes: number
  avgFeedIntervalMinutes: number | null
}

export type DailyFeedStat = { date: string; feedCount: number; totalMl: number }
export type DailySleepStat = { date: string; sleepCount: number; totalMinutes: number }
export type WeeklyStats = {
  feedStats: DailyFeedStat[]
  sleepStats: DailySleepStat[]
}

// Cry analysis — per-baby personalized classifier that improves with confirmed samples.
export type CryLabel = 'HUNGER' | 'TIRED' | 'DISCOMFORT' | 'BURP' | 'PAIN' | 'UNKNOWN'

export type CryPrediction = {
  label: CryLabel
  labelDisplay: string
  confidence: number    // [0, 1]
  reasons: string[]
}

export type CryLearningStage = {
  confirmedCount: number
  stage: 'HEURISTIC' | 'SIMILARITY' | 'PERSONAL'
  stageDisplay: string
  nextStageAt: number | null
  nextStageDisplay: string | null
}

export type CrySample = {
  id: string
  babyId: string
  recordedAt: string
  durationSec: number
  predictions: CryPrediction[]
  confirmedLabel: CryLabel | null
  confirmedLabelDisplay: string | null
  learningStage: CryLearningStage
  note: string
}

// 건강 가이드 — 신생아 0~12개월 흔한 이슈 카드
export type HealthTip = {
  id: string
  title: string
  emoji: string
  category: string
  ageRange: string
  oneLineSummary: string
  whatItIs: string
  selfChecks: string[]
  careTips: string[]
  redFlags: string[]
}

export type HealthAskResponse = {
  answer: string
  source: 'gemini' | 'fallback'
}

// 월 증명사진 — 1~12개월 슬롯. 슬롯당 1장 (재촬영은 덮어쓰기).
export type MonthlyPhoto = {
  id: string
  babyId: string
  monthIndex: number          // 1..12
  photoUrl: string            // 백엔드 서빙 URL — <Image> 에 그대로
  thumbnailUrl: string | null
  storageKey: string | null
  takenAt: string             // ISO-8601
  caption: string | null
  locationHint: string | null
  updatedAt: string
}
