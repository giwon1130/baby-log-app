import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { getBabies, deleteGrowthRecord, getGrowthRecords, recordGrowth, updateGrowthRecord } from '../api/babyLogApi'
import { useStoredBaby } from '../hooks/useStoredBaby'
import SwipeToDelete from '../components/SwipeToDelete'
import ErrorBanner from '../components/ErrorBanner'
import EditGrowthModal from '../components/EditGrowthModal'
import EmptyState from '../components/EmptyState'
import EditButton from '../components/EditButton'
import { GrowthChart } from '../components/GrowthChart'
import { formatTime } from '../utils/dateUtils'
import { ageInMonths, calcPercentile, formatPercentile, percentileColor } from '../utils/whoGrowth'
import { extractErrorMessage } from '../utils/errors'
import type { Baby, GrowthRecord } from '../types'

import { COLORS, NEUTRALS, FONT } from '../utils/constants'

export default function GrowthRecordScreen() {
  const { babyId, familyId, initialized } = useStoredBaby()
  const [baby, setBaby] = useState<Baby | null>(null)
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorRetry, setErrorRetry] = useState<(() => void) | null>(null)
  const [editingRecord, setEditingRecord] = useState<GrowthRecord | null>(null)

  const [weightG, setWeightG] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [headCm, setHeadCm] = useState('')
  const [note, setNote] = useState('')

  const showError = useCallback((msg: string, retry?: () => void) => {
    setError(msg)
    setErrorRetry(() => retry ?? null)
  }, [])
  const dismissError = useCallback(() => { setError(null); setErrorRetry(null) }, [])

  const loadRecords = useCallback(async (bid: string) => {
    setRecords(await getGrowthRecords(bid))
  }, [])

  const onRefresh = useCallback(async () => {
    if (!babyId) return
    setRefreshing(true)
    await loadRecords(babyId)
    setRefreshing(false)
  }, [babyId, loadRecords])

  useEffect(() => {
    if (!initialized) return
    const init = async () => {
      if (babyId) {
        await loadRecords(babyId)
        if (familyId) {
          const babies = await getBabies(familyId).catch(() => [] as Baby[])
          const found = babies.find(b => b.id === babyId)
          if (found) setBaby(found)
        }
      }
      setLoading(false)
    }
    init()
  }, [initialized, babyId, familyId, loadRecords])

  const handleSubmit = async () => {
    if (!babyId || (!weightG && !heightCm && !headCm)) return
    setSubmitting(true)
    dismissError()
    try {
      const record = await recordGrowth(babyId, {
        weightG: weightG ? parseInt(weightG) : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        headCm: headCm ? parseFloat(headCm) : undefined,
        note,
      })
      setRecords(prev => [record, ...prev])
      setWeightG('')
      setHeightCm('')
      setHeadCm('')
      setNote('')
    } catch (err) {
      showError(extractErrorMessage(err, '성장 기록 저장에 실패했어요'), handleSubmit)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: string, data: { weightG?: number; heightCm?: number; headCm?: number; note?: string }) => {
    if (!babyId) return
    try {
      const updated = await updateGrowthRecord(babyId, id, data)
      setRecords(prev => prev.map(r => r.id === id ? updated : r))
    } catch (err) {
      showError(extractErrorMessage(err, '수정에 실패했어요'))
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!babyId) return
    try {
      await deleteGrowthRecord(babyId, recordId)
      setRecords(prev => prev.filter(r => r.id !== recordId))
    } catch (err) {
      showError(extractErrorMessage(err, '삭제에 실패했어요'))
    }
  }

  const { weightRecs, heightRecs } = useMemo(() => {
    const sorted = [...records].reverse()
    return {
      weightRecs: sorted.filter(r => r.weightG != null),
      heightRecs: sorted.filter(r => r.heightCm != null),
    }
  }, [records])

  const latestPercentiles = useMemo(() => {
    if (!baby) return null
    const latest = records[0]
    if (!latest) return null
    const months = ageInMonths(baby.birthDate, latest.measuredAt)
    const weight = latest.weightG != null
      ? calcPercentile(latest.weightG / 1000, months, baby.gender, 'weight')
      : null
    const height = latest.heightCm != null
      ? calcPercentile(latest.heightCm, months, baby.gender, 'height')
      : null
    return (weight != null || height != null) ? { weight, height, months } : null
  }, [records, baby])

  const dateLabel = useCallback((iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <View style={styles.container}>
      <EditGrowthModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdate}
      />
      <ErrorBanner message={error} onDismiss={dismissError} onRetry={errorRetry ?? undefined} />
      <View style={styles.form}>
        <Text style={styles.formTitle}>성장 기록</Text>

        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>체중 (g)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 3500"
              value={weightG}
              onChangeText={setWeightG}
              keyboardType="number-pad"
              accessibilityLabel="체중 (g)"
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>키 (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 52.5"
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="decimal-pad"
              accessibilityLabel="키 (cm)"
            />
          </View>
        </View>

        <Text style={styles.label}>머리 둘레 (cm, 선택)</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 34.0"
          value={headCm}
          onChangeText={setHeadCm}
          keyboardType="decimal-pad"
          accessibilityLabel="머리 둘레 (cm)"
        />

        <TextInput
          style={styles.input}
          placeholder="메모 (선택)"
          value={note}
          onChangeText={setNote}
          accessibilityLabel="메모"
        />

        <TouchableOpacity
          style={[styles.submitButton, ((!weightG && !heightCm && !headCm) || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={(!weightG && !heightCm && !headCm) || submitting}
        >
          <Text style={styles.submitButtonText}>{submitting ? '저장 중...' : '기록하기'}</Text>
        </TouchableOpacity>
      </View>

      {/* WHO 백분위 요약 */}
      {latestPercentiles && (
        <View style={styles.percentileCard}>
          <Text style={styles.percentileTitle}>WHO 성장 백분위 (최근 측정)</Text>
          <View style={styles.percentileRow}>
            {latestPercentiles.weight != null && (
              <View style={styles.percentileItem}>
                <Text style={styles.percentileLabel}>체중</Text>
                <Text style={[styles.percentileValue, { color: percentileColor(latestPercentiles.weight) }]}>
                  {formatPercentile(latestPercentiles.weight)}
                </Text>
                <Text style={styles.percentileSub}>{latestPercentiles.months}개월 기준</Text>
              </View>
            )}
            {latestPercentiles.height != null && (
              <View style={styles.percentileItem}>
                <Text style={styles.percentileLabel}>키</Text>
                <Text style={[styles.percentileValue, { color: percentileColor(latestPercentiles.height) }]}>
                  {formatPercentile(latestPercentiles.height)}
                </Text>
                <Text style={styles.percentileSub}>{latestPercentiles.months}개월 기준</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <GrowthChart weightRecs={weightRecs} heightRecs={heightRecs} dateLabel={dateLabel} />

      <FlatList
        data={records}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => {
          const months = baby ? ageInMonths(baby.birthDate, item.measuredAt) : null
          const weightP = (baby && item.weightG != null && months != null)
            ? calcPercentile(item.weightG / 1000, months, baby.gender, 'weight')
            : null
          const heightP = (baby && item.heightCm != null && months != null)
            ? calcPercentile(item.heightCm, months, baby.gender, 'height')
            : null
          return (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 성장 기록을 삭제할까요?">
            <TouchableOpacity onLongPress={() => setEditingRecord(item)} activeOpacity={0.85}>
            <View style={styles.recordItem}>
              <View style={styles.metrics}>
                {item.weightG != null && (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>체중</Text>
                    <Text style={styles.metricValue}>{(item.weightG / 1000).toFixed(2)}kg</Text>
                    {weightP != null && (
                      <Text style={[styles.metricPercentile, { color: percentileColor(weightP) }]}>
                        {formatPercentile(weightP)}
                      </Text>
                    )}
                  </View>
                )}
                {item.heightCm != null && (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>키</Text>
                    <Text style={styles.metricValue}>{item.heightCm}cm</Text>
                    {heightP != null && (
                      <Text style={[styles.metricPercentile, { color: percentileColor(heightP) }]}>
                        {formatPercentile(heightP)}
                      </Text>
                    )}
                  </View>
                )}
                {item.headCm != null && (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>머리</Text>
                    <Text style={styles.metricValue}>{item.headCm}cm</Text>
                  </View>
                )}
              </View>
              <View style={styles.rowEnd}>
                <Text style={styles.recordTime}>{formatTime(item.measuredAt)}</Text>
                <EditButton onPress={() => setEditingRecord(item)} />
              </View>
            </View>
            </TouchableOpacity>
          </SwipeToDelete>
          )
        }}
        ListEmptyComponent={<EmptyState icon="trending-up-outline" title="성장 기록이 없어요" hint="체중·키를 처음 기록해보세요" />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: {
    backgroundColor: NEUTRALS.white,
    padding: 20,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: NEUTRALS.gray100,
  },
  formTitle: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  row: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1, gap: 4 },
  label: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: NEUTRALS.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FONT.bodyMd,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: { backgroundColor: COLORS.primaryDisabled },
  submitButtonText: { color: NEUTRALS.white, fontWeight: '700', fontSize: FONT.body },
  listContent: { padding: 16, gap: 10 },
  recordItem: {
    flex: 1,
    backgroundColor: NEUTRALS.white,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metrics: { flexDirection: 'row', gap: 16 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metric: { alignItems: 'center' },
  metricLabel: { fontSize: FONT.caption, color: NEUTRALS.gray450, fontWeight: '600' },
  metricValue: { fontSize: FONT.body, fontWeight: '700', color: NEUTRALS.ink, marginTop: 2 },
  recordTime: { fontSize: FONT.label, color: NEUTRALS.gray450 },
  percentileCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  percentileTitle: { fontSize: FONT.label, color: NEUTRALS.gray500, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  percentileRow: { flexDirection: 'row', gap: 20 },
  percentileItem: { alignItems: 'center', gap: 2 },
  percentileLabel: { fontSize: FONT.caption, color: NEUTRALS.gray450, fontWeight: '600' },
  percentileValue: { fontSize: FONT.h1, fontWeight: '800' },
  percentileSub: { fontSize: FONT.micro, color: NEUTRALS.gray300 },
  metricPercentile: { fontSize: FONT.micro, fontWeight: '700', marginTop: 1 },
})
