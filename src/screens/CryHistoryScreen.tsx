import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { confirmCrySample, getCryHistory } from '../api/babyLogApi'
import { useStoredBaby } from '../hooks/useStoredBaby'
import type { CryLabel, CrySample } from '../types'
import { CorrectionModal } from '../components/cry/CorrectionModal'
import { LearningStageBanner } from '../components/cry/LearningStageBanner'
import EmptyState from '../components/EmptyState'
import { extractErrorMessage } from '../utils/errors'

import { COLORS, NEUTRALS, FONT } from '../utils/constants'
/**
 * Browse past cry analyses for the current baby.
 *
 * Shows a summary at the top (total / confirmed / accuracy) and a list of
 * samples sorted newest-first. Each card can be tapped to label or relabel —
 * accumulated confirmations feed back into the per-baby classifier.
 */
export default function CryHistoryScreen() {
  const { babyId, initialized } = useStoredBaby()
  const [items, setItems] = useState<CrySample[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editing, setEditing] = useState<CrySample | null>(null)

  const load = useCallback(async (bId: string) => {
    try {
      const data = await getCryHistory(bId, 100)
      setItems(data)
    } catch (e: unknown) {
      Alert.alert('불러오기 실패', extractErrorMessage(e, '잠시 후 다시 시도해주세요'))
    }
  }, [])

  useEffect(() => {
    if (!initialized) return
    if (babyId) load(babyId).finally(() => setLoading(false))
    else setLoading(false)
  }, [initialized, babyId, load])

  const onRefresh = useCallback(async () => {
    if (!babyId) return
    setRefreshing(true)
    await load(babyId)
    setRefreshing(false)
  }, [babyId, load])

  const handleConfirm = useCallback(
    async (label: CryLabel) => {
      if (!editing) return
      try {
        const updated = await confirmCrySample(editing.id, label)
        setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        setEditing(null)
      } catch (e: unknown) {
        Alert.alert('저장 실패', extractErrorMessage(e, '다시 시도해주세요'))
      }
    },
    [editing],
  )

  const stats = computeStats(items)
  const latestStage = items.find((s) => s.learningStage)?.learningStage

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {latestStage && <LearningStageBanner stage={latestStage} />}

        <View style={styles.statsCard}>
          <StatBlock value={stats.total} label="총 분석" />
          <View style={styles.statDivider} />
          <StatBlock value={stats.confirmed} label="확인 완료" />
          <View style={styles.statDivider} />
          <StatBlock
            value={stats.accuracy != null ? `${Math.round(stats.accuracy * 100)}%` : '—'}
            label="예측 적중률"
          />
        </View>

        {items.length === 0 ? (
          <EmptyState variant="card" icon="time-outline" title="아직 분석한 울음이 없어요" />
        ) : (
          items.map((sample) => (
            <SampleCard key={sample.id} sample={sample} onEdit={() => setEditing(sample)} />
          ))
        )}
      </ScrollView>

      <CorrectionModal
        visible={editing != null}
        onClose={() => setEditing(null)}
        onPick={handleConfirm}
      />
    </SafeAreaView>
  )
}

// ── Per-sample card ─────────────────────────────────────────────────────────

function SampleCard({ sample, onEdit }: { sample: CrySample; onEdit: () => void }) {
  const top = sample.predictions[0]
  const wasCorrect = sample.confirmedLabel != null && top?.label === sample.confirmedLabel

  return (
    <TouchableOpacity style={styles.card} onPress={onEdit} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTime}>{formatRecordedAt(sample.recordedAt)}</Text>
        {sample.confirmedLabel ? (
          <View style={[styles.badge, wasCorrect ? styles.badgeCorrect : styles.badgeFixed]}>
            <Ionicons
              name={wasCorrect ? 'checkmark-circle' : 'create'}
              size={12}
              color={wasCorrect ? '#2A7F4A' : '#9C5800'}
            />
            <Text style={[styles.badgeText, { color: wasCorrect ? '#2A7F4A' : '#9C5800' }]}>
              {wasCorrect ? '예측 적중' : '정정됨'}
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.badgePending]}>
            <Text style={[styles.badgeText, { color: NEUTRALS.gray600 }]}>미확인</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>
          {sample.confirmedLabel
            ? sample.confirmedLabelDisplay
            : top?.labelDisplay ?? '—'}
        </Text>
        {top && (
          <Text style={styles.cardConfidence}>
            {Math.round(top.confidence * 100)}% {sample.confirmedLabel ? '· 예측' : ''}
          </Text>
        )}
      </View>

      {sample.confirmedLabel == null && top && top.reasons.length > 0 && (
        <Text style={styles.cardReason} numberOfLines={1}>
          • {top.reasons[0]}
        </Text>
      )}
    </TouchableOpacity>
  )
}

function StatBlock({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeStats(items: CrySample[]) {
  const total = items.length
  const confirmedItems = items.filter((s) => s.confirmedLabel != null)
  const confirmed = confirmedItems.length
  const correct = confirmedItems.filter((s) => s.predictions[0]?.label === s.confirmedLabel).length
  const accuracy = confirmed > 0 ? correct / confirmed : null
  return { total, confirmed, accuracy }
}

function formatRecordedAt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (sameDay) return `오늘 ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return `어제 ${time}`
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: NEUTRALS.white,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statBlock: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FONT.hero, fontWeight: '700', color: NEUTRALS.gray850 },
  statLabel: { fontSize: FONT.caption, color: NEUTRALS.gray600 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: NEUTRALS.gray150 },

  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTime: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '600' },
  cardBody: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardLabel: { fontSize: FONT.h2, fontWeight: '700', color: NEUTRALS.gray850 },
  cardConfidence: { fontSize: FONT.label, color: NEUTRALS.gray600 },
  cardReason: { fontSize: FONT.caption, color: NEUTRALS.gray600 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeCorrect: { backgroundColor: '#E8F8EE' },
  badgeFixed: { backgroundColor: '#FFF1DC' },
  badgePending: { backgroundColor: NEUTRALS.gray100 },
  badgeText: { fontSize: FONT.caption, fontWeight: '600' },
})
