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
import { deleteDiaper, getBabies, getDiapers, recordDiaper, updateDiaper } from '../api/babyLogApi'
import { getStoredBabyId, getStoredFamilyId } from '../api/client'
import { scheduleDiaperReminder } from '../hooks/useFeedNotification'
import DateFilter, { DateFilterValue, toDateParam } from '../components/DateFilter'
import SwipeToDelete from '../components/SwipeToDelete'
import ErrorBanner from '../components/ErrorBanner'
import TimeOffsetPicker from '../components/TimeOffsetPicker'
import SuccessToast from '../components/SuccessToast'
import EditDiaperModal from '../components/EditDiaperModal'
import type { DiaperRecord } from '../types'

const DIAPER_TYPES = ['WET', 'DIRTY', 'MIXED', 'DRY'] as const
const DIAPER_TYPE_LABEL: Record<string, string> = {
  WET: '💧 소변',
  DIRTY: '💩 대변',
  MIXED: '🔄 혼합',
  DRY: '✅ 깨끗',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  return `${hours}시간 ${mins % 60}분 전`
}

export default function DiaperLogScreen() {
  const [babyId, setBabyId] = useState<string | null>(null)
  const [babyName, setBabyName] = useState<string | undefined>(undefined)
  const [diapers, setDiapers] = useState<DiaperRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('today')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [diaperType, setDiaperType] = useState<string>('WET')
  const [note, setNote] = useState('')
  const [changedAt, setChangedAt] = useState(new Date())
  const [success, setSuccess] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<DiaperRecord | null>(null)

  const loadDiapers = useCallback(async (bid: string, filter: DateFilterValue) => {
    const data = await getDiapers(bid, 50, toDateParam(filter))
    setDiapers(data)
  }, [])

  useEffect(() => {
    const init = async () => {
      const bid = await getStoredBabyId()
      const fid = await getStoredFamilyId()
      setBabyId(bid)
      if (bid && fid) {
        const [, babies] = await Promise.all([
          loadDiapers(bid, dateFilter),
          getBabies(fid),
        ])
        setBabyName(babies.find(b => b.id === bid)?.name)
      } else if (bid) {
        await loadDiapers(bid, dateFilter)
      }
      setLoading(false)
    }
    init()
  }, [])

  const onRefresh = useCallback(async () => {
    if (!babyId) return
    setRefreshing(true)
    await loadDiapers(babyId, dateFilter)
    setRefreshing(false)
  }, [babyId, dateFilter, loadDiapers])

  useFocusEffect(useCallback(() => {
    const check = async () => {
      const bid = await getStoredBabyId()
      if (bid && bid !== babyId) {
        setBabyId(bid)
        await loadDiapers(bid, dateFilter)
      }
    }
    check()
  }, [babyId, dateFilter, loadDiapers]))

  const handleFilterChange = async (filter: DateFilterValue) => {
    setDateFilter(filter)
    if (babyId) await loadDiapers(babyId, filter)
  }

  const handleSubmit = async () => {
    if (!babyId) return
    setSubmitting(true)
    try {
      const changedAtIso = changedAt.toISOString()
      await recordDiaper(babyId, { diaperType, note, changedAt: changedAtIso })
      await loadDiapers(babyId, dateFilter)
      setNote('')
      setChangedAt(new Date())
      const typeLabel: Record<string, string> = { WET: '소변', DIRTY: '대변', MIXED: '혼합', DRY: '깨끗' }
      setSuccess(`기저귀 교환 기록 완료 (${typeLabel[diaperType] ?? diaperType})`)
      await scheduleDiaperReminder(changedAtIso, babyName)
    } catch {
      setError('기저귀 기록 저장에 실패했어요')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: string, newDiaperType: string, newNote: string) => {
    if (!babyId) return
    await updateDiaper(babyId, id, { diaperType: newDiaperType, note: newNote })
    await loadDiapers(babyId, dateFilter)
    setSuccess('기저귀 기록이 수정됐어요')
  }

  const handleDelete = async (diaperId: string) => {
    if (!babyId) return
    try {
      await deleteDiaper(babyId, diaperId)
      setDiapers(prev => prev.filter(d => d.id !== diaperId))
    } catch {
      setError('삭제에 실패했어요')
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B9D" /></View>

  return (
    <View style={styles.container}>
      <EditDiaperModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdate}
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessToast message={success} onHide={() => setSuccess(null)} />
      <View style={styles.form}>
        <Text style={styles.formTitle}>기저귀 교환 기록</Text>
        <Text style={styles.label}>종류</Text>
        <View style={styles.typeGrid}>
          {DIAPER_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, diaperType === t && styles.typeChipActive]}
              onPress={() => setDiaperType(t)}
            >
              <Text style={[styles.typeChipText, diaperType === t && styles.typeChipTextActive]}>
                {DIAPER_TYPE_LABEL[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="메모 (선택)" value={note} onChangeText={setNote} />
        <TimeOffsetPicker value={changedAt} onChange={setChangedAt} />
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>{submitting ? '저장 중...' : '지금 기록하기'}</Text>
        </TouchableOpacity>
      </View>

      <DateFilter value={dateFilter} onChange={handleFilterChange} />

      <FlatList
        data={diapers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />}
        renderItem={({ item }) => (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 기저귀 기록을 삭제할까요?">
            <TouchableOpacity onLongPress={() => setEditingRecord(item)} activeOpacity={0.85}>
              <View style={styles.recordItem}>
                <View>
                  <Text style={styles.recordType}>{DIAPER_TYPE_LABEL[item.diaperType]}</Text>
                  {!!item.note && <Text style={styles.recordNote}>{item.note}</Text>}
                </View>
                <View style={styles.recordRight}>
                  <Text style={styles.recordTime}>{formatTime(item.changedAt)}</Text>
                  <Text style={styles.recordAgo}>{timeSince(item.changedAt)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </SwipeToDelete>
        )}
        ListEmptyComponent={<Text style={styles.empty}>기저귀 기록이 없어요</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { backgroundColor: '#fff', padding: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  label: { fontSize: 12, color: '#888', fontWeight: '600' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flex: 1, minWidth: '45%', paddingVertical: 12, borderRadius: 12, backgroundColor: '#f5f5f5', alignItems: 'center' },
  typeChipActive: { backgroundColor: '#FF6B9D' },
  typeChipText: { fontSize: 14, color: '#555', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  submitButton: { backgroundColor: '#FF6B9D', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
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
  recordType: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  recordRight: { alignItems: 'flex-end', gap: 2 },
  recordTime: { fontSize: 13, color: '#444' },
  recordAgo: { fontSize: 12, color: '#aaa' },
  recordNote: { fontSize: 11, color: '#bbb', marginTop: 2 },
  empty: { textAlign: 'center', color: '#bbb', marginTop: 40 },
})
