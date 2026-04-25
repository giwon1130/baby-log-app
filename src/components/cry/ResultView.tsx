import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { CryFeatureSummary } from '../../../modules/cry-detector'
import type { CrySample } from '../../types'
import { AcousticDetails } from './AcousticDetails'
import { ConfidenceBar } from './ConfidenceBar'

/**
 * Renders a complete cry-analysis result: top prediction, acoustic details,
 * runner-up labels, and the confirm/correct feedback row (or confirmation
 * banner once the user has labeled it).
 */
export function ResultView({
  sample,
  features,
  onCorrect,
  onConfirm,
}: {
  sample: CrySample
  features: CryFeatureSummary | null
  onCorrect: () => void
  onConfirm: () => void
}) {
  const top = sample.predictions[0]
  const rest = sample.predictions.slice(1, 4).filter((p) => p.confidence > 0.03)
  const confirmed = sample.confirmedLabel != null

  if (!top) return null

  return (
    <View>
      <View style={styles.resultCard}>
        <Text style={styles.resultSmall}>가장 가능성 높은 이유</Text>
        <Text style={styles.resultLabel}>{top.labelDisplay}</Text>
        <ConfidenceBar value={top.confidence} />
        {top.reasons.length > 0 && (
          <View style={styles.reasonList}>
            {top.reasons.map((r, i) => (
              <Text key={i} style={styles.reasonText}>• {r}</Text>
            ))}
          </View>
        )}
      </View>

      {features && <AcousticDetails features={features} />}

      {rest.length > 0 && (
        <View style={styles.altCard}>
          <Text style={styles.altTitle}>다른 가능성</Text>
          {rest.map((p) => (
            <View key={p.label} style={styles.altRow}>
              <Text style={styles.altLabel}>{p.labelDisplay}</Text>
              <View style={styles.altBar}>
                <View style={[styles.altBarFill, { width: `${Math.round(p.confidence * 100)}%` }]} />
              </View>
              <Text style={styles.altPct}>{Math.round(p.confidence * 100)}%</Text>
            </View>
          ))}
        </View>
      )}

      {confirmed ? (
        <View style={styles.confirmedCard}>
          <Ionicons name="checkmark-circle" size={20} color="#36C26A" />
          <Text style={styles.confirmedText}>
            '{sample.confirmedLabelDisplay}'(으)로 확인됨 — 다음부터 더 정확해져요
          </Text>
        </View>
      ) : (
        <View style={styles.feedbackRow}>
          <TouchableOpacity style={[styles.feedbackButton, styles.correctButton]} onPress={onConfirm}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.feedbackButtonText}>맞았어요</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.feedbackButton, styles.wrongButton]} onPress={onCorrect}>
            <Ionicons name="close" size={18} color="#fff" />
            <Text style={styles.feedbackButtonText}>다른 이유예요</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  resultCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 10 },
  resultSmall: { fontSize: 12, color: '#888', fontWeight: '600' },
  resultLabel: { fontSize: 28, fontWeight: '700', color: '#222' },
  reasonList: { marginTop: 8, gap: 4 },
  reasonText: { fontSize: 13, color: '#666', lineHeight: 18 },

  altCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 8, gap: 8 },
  altTitle: { fontSize: 12, color: '#888', fontWeight: '600' },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  altLabel: { width: 72, fontSize: 13, color: '#444' },
  altBar: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  altBarFill: { height: '100%', backgroundColor: '#FFB7CE' },
  altPct: { width: 40, textAlign: 'right', fontSize: 12, color: '#888' },

  feedbackRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: 12,
  },
  correctButton: { backgroundColor: '#36C26A' },
  wrongButton: { backgroundColor: '#888' },
  feedbackButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  confirmedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F8EE',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  confirmedText: { flex: 1, fontSize: 13, color: '#2A7F4A' },
})
