import type { SleepRecord } from '../types'

/**
 * 우리 아기의 실제 기록에서 개인화된 알림 간격을 학습하는 헬퍼.
 *
 * 고정 간격(예: "수유 3시간 후") 대신 최근 기록들의 간격 **중앙값**을 쓰면
 * 아기마다 다른 리듬에 맞춰 알림이 울린다. 표본이 부족하거나(기본 간격 3개 미만)
 * 값이 비현실적이면 null 을 돌려주고, 호출부가 기존 폴백(서버값/고정값)을 쓰게 한다.
 *
 * 평균이 아닌 중앙값을 쓰는 이유: 외출·낮잠 거름 등으로 가끔 6~10시간씩 벌어지는
 * 이상치가 평균을 크게 끌어올려 알림이 너무 늦게 울리는 걸 막기 위해서.
 */

const MS_PER_HOUR = 3_600_000

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** 0.25시간(15분) 단위로 반올림 — 알림 시각이 깔끔하게 떨어지도록. */
function roundQuarter(hours: number): number {
  return Math.round(hours * 4) / 4
}

export type PatternOpts = {
  /** 최소 간격 표본 수 (이만큼 못 모으면 null) */
  minGaps?: number
  /** 이 범위 밖 간격은 이상치로 보고 제외 */
  minHours?: number
  maxHours?: number
}

const DEFAULT_OPTS: Required<PatternOpts> = { minGaps: 3, minHours: 0.5, maxHours: 12 }

/**
 * 이벤트 타임스탬프(ISO 문자열) 목록 → 연속 이벤트 사이 간격의 중앙값(시간).
 * 순서는 상관없음(내부에서 정렬). 수유·기저귀처럼 "이벤트 간 간격"이 곧 알림 주기인 경우에 사용.
 */
export function medianIntervalHours(
  timestamps: Array<string | null | undefined>,
  opts: PatternOpts = {},
): number | null {
  const { minGaps, minHours, maxHours } = { ...DEFAULT_OPTS, ...opts }
  const ms = timestamps
    .map(t => (t ? new Date(t).getTime() : NaN))
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b)
  if (ms.length < minGaps + 1) return null

  const gaps: number[] = []
  for (let i = 1; i < ms.length; i++) {
    const h = (ms[i] - ms[i - 1]) / MS_PER_HOUR
    if (h >= minHours && h <= maxHours) gaps.push(h)
  }
  if (gaps.length < minGaps) return null

  const m = median(gaps)
  return m == null ? null : roundQuarter(m)
}

/**
 * 낮잠 알림용 — "깨어 있는 시간(awake window)"의 중앙값.
 * 수유/기저귀와 달리 기상→다음 잠듦 사이 간격이 알림 주기이므로,
 * 연속한 수면 기록쌍에서 (다음 sleptAt − 이전 wokeAt) 을 모아 중앙값을 낸다.
 */
export function napAwakeWindowHours(
  sleeps: SleepRecord[],
  opts: PatternOpts = {},
): number | null {
  const { minGaps, minHours, maxHours } = { ...DEFAULT_OPTS, minHours: 0.25, maxHours: 8, ...opts }
  const pairs = sleeps
    .filter(s => s.sleptAt && s.wokeAt)
    .map(s => ({ slept: new Date(s.sleptAt).getTime(), woke: new Date(s.wokeAt as string).getTime() }))
    .filter(s => Number.isFinite(s.slept) && Number.isFinite(s.woke))
    .sort((a, b) => a.slept - b.slept)

  const windows: number[] = []
  for (let i = 1; i < pairs.length; i++) {
    const h = (pairs[i].slept - pairs[i - 1].woke) / MS_PER_HOUR
    if (h >= minHours && h <= maxHours) windows.push(h)
  }
  if (windows.length < minGaps) return null

  const m = median(windows)
  return m == null ? null : roundQuarter(m)
}
