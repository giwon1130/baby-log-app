import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { deleteGrowthRecord, getGrowthRecords, recordGrowth } from '../api/babyLogApi'
import { getStoredBabyId } from '../api/client'
import SwipeToDelete from '../components/SwipeToDelete'
import type { GrowthRecord } from '../types'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function GrowthRecordScreen() {
  const [babyId, setBabyId] = useState<string | null>(null)
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [weightG, setWeightG] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [headCm, setHeadCm] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const init = async () => {
      const bid = await getStoredBabyId()
      setBabyId(bid)
      if (bid) setRecords(await getGrowthRecords(bid))
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
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!babyId) return
    await deleteGrowthRecord(babyId, recordId)
    setRecords(prev => prev.filter(r => r.id !== recordId))
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B9D" /></View>

  return (
    <View style={styles.container}>
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

      <FlatList
        data={records}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 성장 기록을 삭제할까요?">
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
})
