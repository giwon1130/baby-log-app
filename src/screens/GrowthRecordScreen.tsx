import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { deleteGrowthRecord, getGrowthRecords, recordGrowth, updateGrowthRecord } from '../api/babyLogApi'
import { getStoredBabyId } from '../api/client'
import SwipeToDelete from '../components/SwipeToDelete'
import ErrorBanner from '../components/ErrorBanner'
import EditGrowthModal from '../components/EditGrowthModal'
import { formatTime } from '../utils/dateUtils'
import type { GrowthRecord } from '../types'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 64

const WEIGHT_CHART_CONFIG = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(255, 107, 157, ${opacity})`,
  labelColor: () => '#aaa',
  strokeWidth: 2,
  decimalPlaces: 1,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#FF6B9D' },
}

const HEIGHT_CHART_CONFIG = {
  ...WEIGHT_CHART_CONFIG,
  color: (opacity = 1) => `rgba(92, 107, 192, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#5C6BC0' },
}

export default function GrowthRecordScreen() {
  const [babyId, setBabyId] = useState<string | null>(null)
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<GrowthRecord | null>(null)

  const [weightG, setWeightG] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [headCm, setHeadCm] = useState('')
  const [note, setNote] = useState('')

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
    const init = async () => {
      const bid = await getStoredBabyId()
      setBabyId(bid)
      if (bid) await loadRecords(bid)
      setLoading(false)
    }
    init()
  }, [])

  const handleSubmit = async () => {
    if (!babyId || (!weightG && !heightCm && !headCm)) return
    setSubmitting(true)
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
      setError((err as Error).message || '성장 기록 저장에 실패했어요')
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
      setError((err as Error).message || '수정에 실패했어요')
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!babyId) return
    try {
      await deleteGrowthRecord(babyId, recordId)
      setRecords(prev => prev.filter(r => r.id !== recordId))
    } catch (err) {
      setError((err as Error).message || '삭제에 실패했어요')
    }
  }

  const { weightRecs, heightRecs } = useMemo(() => {
    const sorted = [...records].reverse()
    return {
      weightRecs: sorted.filter(r => r.weightG != null),
      heightRecs: sorted.filter(r => r.heightCm != null),
    }
  }, [records])

  const dateLabel = useCallback((iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B9D" /></View>

  return (
    <View style={styles.container}>
      <EditGrowthModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdate}
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
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
        />

        <TextInput
          style={styles.input}
          placeholder="메모 (선택)"
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity
          style={[styles.submitButton, ((!weightG && !heightCm && !headCm) || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={(!weightG && !heightCm && !headCm) || submitting}
        >
          <Text style={styles.submitButtonText}>{submitting ? '저장 중...' : '기록하기'}</Text>
        </TouchableOpacity>
      </View>

      {/* 성장 차트 — 2개 이상 기록 있을 때만 표시 */}
      {(weightRecs.length >= 2 || heightRecs.length >= 2) && (
        <View style={styles.chartSection}>
          {weightRecs.length >= 2 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartLabel}>체중 추이 (kg)</Text>
              <LineChart
                data={{
                  labels: weightRecs.map(r => dateLabel(r.measuredAt)),
                  datasets: [{ data: weightRecs.map(r => Math.round(r.weightG! / 100) / 10) }],
                }}
                width={CHART_WIDTH}
                height={140}
                chartConfig={WEIGHT_CHART_CONFIG}
                style={styles.chart}
                bezier
                fromZero={false}
              />
            </View>
          )}
          {heightRecs.length >= 2 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartLabel}>키 추이 (cm)</Text>
              <LineChart
                data={{
                  labels: heightRecs.map(r => dateLabel(r.measuredAt)),
                  datasets: [{ data: heightRecs.map(r => r.heightCm!) }],
                }}
                width={CHART_WIDTH}
                height={140}
                chartConfig={HEIGHT_CHART_CONFIG}
                style={styles.chart}
                bezier
                fromZero={false}
              />
            </View>
          )}
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />}
        renderItem={({ item }) => (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 성장 기록을 삭제할까요?">
            <TouchableOpacity onLongPress={() => setEditingRecord(item)} activeOpacity={0.85}>
            <View style={styles.recordItem}>
              <View style={styles.metrics}>
                {item.weightG != null && (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>체중</Text>
                    <Text style={styles.metricValue}>{(item.weightG / 1000).toFixed(2)}kg</Text>
                  </View>
                )}
                {item.heightCm != null && (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>키</Text>
                    <Text style={styles.metricValue}>{item.heightCm}cm</Text>
                  </View>
                )}
                {item.headCm != null && (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>머리</Text>
                    <Text style={styles.metricValue}>{item.headCm}cm</Text>
                  </View>
                )}
              </View>
              <Text style={styles.recordTime}>{formatTime(item.measuredAt)}</Text>
            </View>
            </TouchableOpacity>
          </SwipeToDelete>
        )}
        ListEmptyComponent={<Text style={styles.empty}>성장 기록이 없어요</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  row: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1, gap: 4 },
  label: { fontSize: 12, color: '#888', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: { backgroundColor: '#ffb3cc' },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listContent: { padding: 16, gap: 10 },
  recordItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metrics: { flexDirection: 'row', gap: 16 },
  metric: { alignItems: 'center' },
  metricLabel: { fontSize: 11, color: '#aaa', fontWeight: '600' },
  metricValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  recordTime: { fontSize: 12, color: '#aaa' },
  empty: { textAlign: 'center', color: '#bbb', marginTop: 40 },
  chartSection: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  chartLabel: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chart: { borderRadius: 8 },
})
