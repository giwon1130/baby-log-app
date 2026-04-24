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
