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

export type GrowthStage = {
  daysOld: number
  stage: string
  title: string
  description: string
  tips: string[]
  feedingGuideMl: { start: number; end: number }
  feedingIntervalHours: { start: number; end: number }
}
