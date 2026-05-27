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
import { deleteDiaper, getDiapers, recordDiaper, updateDiaper } from '../api/babyLogApi'
import { scheduleDiaperReminder } from '../utils/notifications'
import { useStoredBaby } from '../hooks/useStoredBaby'
import DateFilter, { DateFilterValue, toDateParam } from '../components/DateFilter'
import SwipeToDelete from '../components/SwipeToDelete'
import ErrorBanner from '../components/ErrorBanner'
import TimeOffsetPicker from '../components/TimeOffsetPicker'
import SuccessToast from '../components/SuccessToast'
import EditDiaperModal from '../components/EditDiaperModal'
import EmptyState from '../components/EmptyState'
import EditButton from '../components/EditButton'
import { useErrorRetry } from '../hooks/useErrorRetry'
import { formatTime, timeSince } from '../utils/dateUtils'
import { extractErrorMessage } from '../utils/errors'
import { DIAPER_TYPE_LABEL, COLORS, NEUTRALS, FONT } from '../utils/constants'
import type { DiaperRecord } from '../types'

const DIAPER_TYPES = ['WET', 'DIRTY', 'MIXED', 'DRY'] as const

export default function DiaperLogScreen() {
  const { babyId, babyName, initialized, loadBaby } = useStoredBaby()
  const [diapers, setDiapers] = useState<DiaperRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('today')
  const [refreshing, setRefreshing] = useState(false)
  const { error, retry, showError, dismissError } = useErrorRetry()

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
    if (!initialized || !babyId) {
      if (initialized) setLoading(false)
      return
    }
    loadDiapers(babyId, dateFilter).then(() => setLoading(false))
  }, [initialized, babyId, loadDiapers])

  const onRefresh = useCallback(async () => {
    if (!babyId) return
    setRefreshing(true)
    await loadDiapers(babyId, dateFilter)
    setRefreshing(false)
  }, [babyId, dateFilter, loadDiapers])

  useFocusEffect(useCallback(() => { loadBaby() }, [loadBaby]))

  const handleFilterChange = async (filter: DateFilterValue) => {
    setDateFilter(filter)
    if (babyId) await loadDiapers(babyId, filter)
  }

  const handleSubmit = async () => {
    if (!babyId) return
    setSubmitting(true)
    dismissError()
    try {
      const changedAtIso = changedAt.toISOString()
      await recordDiaper(babyId, { diaperType, note, changedAt: changedAtIso })
      await loadDiapers(babyId, dateFilter)
      setNote('')
      setDiaperType('WET')
      setChangedAt(new Date())
      const typeLabel: Record<string, string> = { WET: '소변', DIRTY: '대변', MIXED: '혼합', DRY: '깨끗' }
      setSuccess(`기저귀 교환 기록 완료 (${typeLabel[diaperType] ?? diaperType})`)
      await scheduleDiaperReminder(changedAtIso, babyName)
    } catch (err) {
      showError(extractErrorMessage(err, '기저귀 기록 저장에 실패했어요'), handleSubmit)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: string, newDiaperType: string, newNote: string, newChangedAt: string) => {
    if (!babyId) return
    try {
      const updated = await updateDiaper(babyId, id, { diaperType: newDiaperType, note: newNote, changedAt: newChangedAt })
      setDiapers(prev => prev.map(d => d.id === id ? updated : d))
      setSuccess('기저귀 기록이 수정됐어요')
    } catch (err) {
      showError(extractErrorMessage(err, '수정에 실패했어요'))
    }
  }

  const handleDelete = async (diaperId: string) => {
    if (!babyId) return
    try {
      await deleteDiaper(babyId, diaperId)
      setDiapers(prev => prev.filter(d => d.id !== diaperId))
    } catch (err) {
      showError(extractErrorMessage(err, '삭제에 실패했어요'))
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <View style={styles.container}>
      <EditDiaperModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdate}
      />
      <ErrorBanner message={error} onDismiss={dismissError} onRetry={retry ?? undefined} />
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
        <TextInput
          style={styles.input}
          placeholder="메모 (선택)"
          value={note}
          onChangeText={setNote}
          accessibilityLabel="메모"
        />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 기저귀 기록을 삭제할까요?">
            <TouchableOpacity onLongPress={() => setEditingRecord(item)} activeOpacity={0.85}>
              <View style={styles.recordItem}>
                <View style={styles.recordLeft}>
                  <Text style={styles.recordType}>{DIAPER_TYPE_LABEL[item.diaperType]}</Text>
                  {!!item.note && <Text style={styles.recordNote}>{item.note}</Text>}
                </View>
                <View style={styles.rowEnd}>
                  <View style={styles.recordRight}>
                    <Text style={styles.recordTime}>{formatTime(item.changedAt)}</Text>
                    <Text style={styles.recordAgo}>{timeSince(item.changedAt)}</Text>
                  </View>
                  <EditButton onPress={() => setEditingRecord(item)} />
                </View>
              </View>
            </TouchableOpacity>
          </SwipeToDelete>
        )}
        ListEmptyComponent={<EmptyState icon="water-outline" title="기저귀 기록이 없어요" hint="첫 기저귀 교환을 기록해보세요" />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { backgroundColor: NEUTRALS.white, padding: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: NEUTRALS.gray100 },
  formTitle: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  label: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '600' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flex: 1, minWidth: '45%', paddingVertical: 12, borderRadius: 12, backgroundColor: NEUTRALS.gray50, alignItems: 'center' },
  typeChipActive: { backgroundColor: COLORS.primary },
  typeChipText: { fontSize: FONT.bodyMd, color: NEUTRALS.gray700, fontWeight: '600' },
  typeChipTextActive: { color: NEUTRALS.white },
  input: { borderWidth: 1, borderColor: NEUTRALS.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: FONT.bodyMd },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
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
  recordType: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  recordLeft: { flex: 1 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordRight: { alignItems: 'flex-end', gap: 2 },
  recordTime: { fontSize: FONT.bodySm, color: NEUTRALS.gray750 },
  recordAgo: { fontSize: FONT.label, color: NEUTRALS.gray450 },
  recordNote: { fontSize: FONT.caption, color: NEUTRALS.gray400, marginTop: 2 },
})
