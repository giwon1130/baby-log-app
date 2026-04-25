import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { confirmCrySample, getCryHistory } from '../api/babyLogApi'
import { getStoredBabyId } from '../api/client'
import type { CryLabel, CrySample } from '../types'
import { CorrectionModal } from '../components/cry/CorrectionModal'
import { LearningStageBanner } from '../components/cry/LearningStageBanner'

/**
 * Browse past cry analyses for the current baby.
 *
 * Shows a summary at the top (total / confirmed / accuracy) and a list of
 * samples sorted newest-first. Each card can be tapped to label or relabel —
 * accumulated confirmations feed back into the per-baby classifier.
 */
export default function CryHistoryScreen() {
  const [babyId, setBabyId] = useState<string | null>(null)
  const [items, setItems] = useState<CrySample[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editing, setEditing] = useState<CrySample | null>(null)

  const load = useCallback(async (bId: string) => {
    try {
      const data = await getCryHistory(bId, 100)
      setItems(data)
    } catch (e: any) {
      Alert.alert('불러오기 실패', e?.message ?? '잠시 후 다시 시도해주세요')
    }
  }, [])

  useEffect(() => {
    getStoredBabyId().then(async (id) => {
      setBabyId(id)
      if (id) await load(id)
      setLoading(false)
    })
  }, [load])

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
      } catch (e: any) {
        Alert.alert('저장 실패', e?.message ?? '다시 시도해주세요')
      }
    },
    [editing],
  )

  const stats = computeStats(items)
  const latestStage = items.find((s) => s.learningStage)?.learningStage

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B9D" style={{ marginTop: 32 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />}
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
          <View style={styles.emptyCard}>
            <Ionicons name="time-outline" size={40} color="#FFB7CE" />
            <Text style={styles.emptyText}>아직 분석한 울음이 없어요</Text>
          </View>
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
            <Text style={[styles.badgeText, { color: '#888' }]}>미확인</Text>
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
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statBlock: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#222' },
  statLabel: { fontSize: 11, color: '#888' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: '#eee' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 14, color: '#888' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTime: { fontSize: 12, color: '#888', fontWeight: '600' },
  cardBody: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardLabel: { fontSize: 18, fontWeight: '700', color: '#222' },
  cardConfidence: { fontSize: 12, color: '#888' },
  cardReason: { fontSize: 11, color: '#888' },

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
  badgePending: { backgroundColor: '#F0F0F0' },
  badgeText: { fontSize: 11, fontWeight: '600' },
})
