import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BabyDiagnosis } from '../../types'
import { COLORS, FONT, NEUTRALS } from '../../utils/constants'

type Props = {
  diagnosis: BabyDiagnosis
  todayDone?: number
  todayTotal?: number
  onPress: () => void
}

const SIDE_LABEL: Record<string, string> = {
  left: '왼쪽',
  right: '오른쪽',
  both: '양쪽',
}

export default function DiagnosisCard({ diagnosis, todayDone, todayTotal, onPress }: Props) {
  const showProgress = todayTotal != null && todayTotal > 0
  const done = todayDone ?? 0
  const total = todayTotal ?? 0
  const progress = showProgress ? Math.min(1, done / total) : 0

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${diagnosis.tipTitle} 진단 체크리스트`}
    >
      <Text style={styles.emoji}>{diagnosis.tipEmoji}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{diagnosis.tipTitle}</Text>
          {diagnosis.side && <Text style={styles.side}>{SIDE_LABEL[diagnosis.side] ?? diagnosis.side}</Text>}
        </View>
        <Text style={styles.startedAt}>시작 {diagnosis.startedAt}</Text>
        {showProgress && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{done}/{total}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={NEUTRALS.gray400} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: NEUTRALS.white,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  emoji: { fontSize: 26 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: FONT.bodyMd, fontWeight: '700', color: NEUTRALS.ink },
  side: {
    fontSize: FONT.caption,
    color: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
    fontWeight: '700',
    overflow: 'hidden',
  },
  startedAt: { fontSize: FONT.caption, color: NEUTRALS.gray500 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  progressTrack: {
    flex: 1, height: 6, backgroundColor: NEUTRALS.gray100, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  progressText: { fontSize: FONT.caption, color: NEUTRALS.gray600, fontWeight: '600' },
})
