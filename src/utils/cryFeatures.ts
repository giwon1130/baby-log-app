import type { Ionicons } from '@expo/vector-icons'

import type { CryFeatureSummary } from '../../modules/cry-detector'
import type { CryLabel } from '../types'

// Shared between CorrectionModal (label picker) and any future label rendering.
export const LABEL_OPTIONS: {
  value: CryLabel
  display: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  { value: 'HUNGER', display: '배고픔', icon: 'restaurant' },
  { value: 'TIRED', display: '졸림', icon: 'moon' },
  { value: 'DISCOMFORT', display: '불편함', icon: 'alert-circle' },
  { value: 'BURP', display: '트림 필요', icon: 'water' },
  { value: 'PAIN', display: '통증', icon: 'bandage' },
  { value: 'UNKNOWN', display: '모르겠음', icon: 'help-circle' },
]

export type FeatureRow = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  hint: string
  /** Highlight rows whose value is informative (extreme / characteristic). */
  emphasis?: boolean
}

/**
 * Convert raw on-device feature numbers into user-readable rows.
 * Returns an empty array for fully silent recordings (everything null).
 *
 * Thresholds here mirror the backend classifier rules in CryAnalysisService.kt
 * — keep them in sync when adjusting one side.
 */
export function buildFeatureRows(f: CryFeatureSummary): FeatureRow[] {
  const rows: FeatureRow[] = []

  // Pitch — most expressive feature for baby cries
  if (f.pitchMeanHz != null && f.pitchMeanHz > 0) {
    const hz = Math.round(f.pitchMeanHz)
    let hint: string
    let emphasis = false
    if (hz >= 600) { hint = '높은 음 — 통증/짜증 신호'; emphasis = true }
    else if (hz >= 400) hint = '중간 음 — 보통 울음'
    else if (hz >= 250) hint = '낮은 음 — 칭얼/지친 소리'
    else { hint = '아주 낮은 음 — 졸림 가능성'; emphasis = true }
    rows.push({ icon: 'musical-note', label: '음 높이', value: `${hz} Hz`, hint, emphasis })
  }

  if (f.pitchStdHz != null && f.pitchMeanHz != null && f.pitchMeanHz > 0) {
    const std = Math.round(f.pitchStdHz)
    let hint: string
    let emphasis = false
    if (std >= 120) { hint = '음정 변화 큼'; emphasis = true }
    else if (std >= 60) hint = '약간 흔들림'
    else hint = '안정적'
    rows.push({ icon: 'pulse', label: '음 변동', value: `±${std} Hz`, hint, emphasis })
  }

  // Rhythmicity — periodic envelope hints at hunger (suck-rest pattern)
  if (f.rhythmicity != null) {
    const r = f.rhythmicity
    let hint: string
    let emphasis = false
    if (r >= 0.45) { hint = '규칙적 — 배고픔 패턴 가능성'; emphasis = true }
    else if (r >= 0.2) hint = '약간 주기적'
    else hint = '연속적/불규칙'
    rows.push({ icon: 'trending-up', label: '리듬성', value: r.toFixed(2), hint, emphasis })
  }

  if (f.avgVolumeDb != null) {
    const db = Math.round(f.avgVolumeDb)
    let hint: string
    if (db > -25) hint = '큰 울음'
    else if (db > -40) hint = '보통'
    else hint = '작은 칭얼'
    rows.push({ icon: 'volume-high', label: '평균 음량', value: `${db} dB`, hint })
  }

  // Apple SoundAnalysis "infant_cry" probability
  if (f.cryConfidenceAvg != null) {
    const pct = Math.round(f.cryConfidenceAvg * 100)
    let hint: string
    if (pct >= 70) hint = '확실한 울음으로 인식'
    else if (pct >= 40) hint = '울음 같음'
    else hint = '울음이 약하거나 짧음'
    rows.push({ icon: 'happy', label: '울음 강도', value: `${pct}%`, hint })
  }

  return rows
}
