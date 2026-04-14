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
  nextFeedAt: string
  nextFeedIntervalHours: number
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
}
