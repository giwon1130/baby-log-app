import React, { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
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
import { deleteHealthRecord, getHealthRecords, recordHealth } from '../api/babyLogApi'
import { useStoredBaby } from '../hooks/useStoredBaby'
import SwipeToDelete from '../components/SwipeToDelete'
import ErrorBanner from '../components/ErrorBanner'
import SuccessToast from '../components/SuccessToast'
import TimeOffsetPicker from '../components/TimeOffsetPicker'
import { formatTime } from '../utils/dateUtils'
import type { HealthRecord } from '../types'

type RecordType = 'TEMPERATURE' | 'MEDICINE'

const TYPE_LABEL: Record<RecordType, string> = {
  TEMPERATURE: '🌡 체온',
  MEDICINE: '💊 약',
}

export default function HealthScreen() {
  const { babyId, initialized, loadBaby } = useStoredBaby()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [type, setType] = useState<RecordType>('TEMPERATURE')
  const [value, setValue] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [recordedAt, setRecordedAt] = useState(new Date())

  const loadRecords = useCallback(async (bid: string) => {
    const data = await getHealthRecords(bid)
    setRecords(data)
  }, [])

  useEffect(() => {
    if (!initialized || !babyId) {
      if (initialized) setLoading(false)
      return
    }
    loadRecords(babyId).then(() => setLoading(false))
  }, [initialized, babyId, loadRecords])

  useFocusEffect(useCallback(() => { loadBaby() }, [loadBaby]))

  const onRefresh = useCallback(async () => {
    if (!babyId) return
    setRefreshing(true)
    await loadRecords(babyId)
    setRefreshing(false)
  }, [babyId, loadRecords])

  const handleSubmit = async () => {
    if (!babyId) return
    if (type === 'TEMPERATURE' && !value) return
    if (type === 'MEDICINE' && !name) return
    setSubmitting(true)
    try {
      const record = await recordHealth(babyId, {
        type,
        value: value ? parseFloat(value) : undefined,
        name: name || undefined,
        note,
        recordedAt: recordedAt.toISOString(),
      })
      setRecords(prev => [record, ...prev])
      setValue('')
      setName('')
      setNote('')
      setRecordedAt(new Date())
      const label = type === 'TEMPERATURE'
        ? `체온 ${value}°C 기록 완료`
        : `${name} 투여 기록 완료`
      setSuccess(label)
    } catch (err) {
      setError((err as Error).message || '기록 저장에 실패했어요')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!babyId) return
    try {
      await deleteHealthRecord(babyId, recordId)
      setRecords(prev => prev.filter(r => r.id !== recordId))
    } catch (err) {
      setError((err as Error).message || '삭제에 실패했어요')
    }
  }

  const isSubmitDisabled = submitting
    || (type === 'TEMPERATURE' && !value)
    || (type === 'MEDICINE' && !name)

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B9D" /></View>

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessToast message={success} onHide={() => setSuccess(null)} />

      <View style={styles.form}>
        <Text style={styles.formTitle}>건강 기록</Text>

        {/* 타입 선택 */}
        <View style={styles.typeRow}>
          {(['TEMPERATURE', 'MEDICINE'] as RecordType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, type === t && styles.typeChipActive]}
              onPress={() => { setType(t); setValue(''); setName('') }}
            >
              <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                {TYPE_LABEL[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'TEMPERATURE' ? (
          <View style={styles.tempRow}>
            <TextInput
              style={[styles.input, styles.tempInput]}
              placeholder="체온 (예: 37.5)"
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
            />
            <Text style={styles.tempUnit}>°C</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="약 이름 (예: 타이레놀)"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="투여량 (예: 2.5)"
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
            />
          </>
        )}

        <TextInput style={styles.input} placeholder="메모 (선택)" value={note} onChangeText={setNote} />
        <TimeOffsetPicker value={recordedAt} onChange={setRecordedAt} />

        <TouchableOpacity
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
        >
          <Text style={styles.submitButtonText}>{submitting ? '저장 중...' : '기록하기'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={records}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />}
        renderItem={({ item }) => (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 기록을 삭제할까요?">
            <View style={styles.recordItem}>
              <View>
                <Text style={styles.recordType}>{TYPE_LABEL[item.type as RecordType]}</Text>
                {item.type === 'TEMPERATURE' && item.value != null && (
                  <Text style={[styles.recordValue, item.value >= 38 && styles.recordValueFever]}>
                    {item.value}°C{item.value >= 38.5 ? ' 🔴 발열' : item.value >= 38 ? ' 🟡 미열' : ''}
                  </Text>
                )}
                {item.type === 'MEDICINE' && (
                  <Text style={styles.recordValue}>
                    {item.name}{item.value != null ? ` · ${item.value}` : ''}
                  </Text>
                )}
                {!!item.note && <Text style={styles.recordNote}>{item.note}</Text>}
              </View>
              <Text style={styles.recordTime}>{formatTime(item.recordedAt)}</Text>
            </View>
          </SwipeToDelete>
        )}
        ListEmptyComponent={<Text style={styles.empty}>건강 기록이 없어요</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { backgroundColor: '#fff', padding: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f5f5f5', alignItems: 'center' },
  typeChipActive: { backgroundColor: '#FF6B9D' },
  typeChipText: { fontSize: 14, color: '#555', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  tempRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tempInput: { flex: 1 },
  tempUnit: { fontSize: 16, color: '#888', fontWeight: '600' },
  submitButton: { backgroundColor: '#FF6B9D', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#ffb3cc' },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listContent: { padding: 16, gap: 10 },
  recordItem: {
    flex: 1, backgroundColor: '#fff', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  recordType: { fontSize: 13, color: '#999', fontWeight: '600', marginBottom: 2 },
  recordValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  recordValueFever: { color: '#F44336' },
  recordNote: { fontSize: 11, color: '#bbb', marginTop: 2 },
  recordTime: { fontSize: 12, color: '#aaa' },
  empty: { textAlign: 'center', color: '#bbb', marginTop: 40 },
})
