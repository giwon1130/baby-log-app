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
import { deleteFeed, getFeeds, recordFeed, updateFeed } from '../api/babyLogApi'
import { scheduleFeedNotification } from '../utils/notifications'
import { useStoredBaby } from '../hooks/useStoredBaby'
import DateFilter, { DateFilterValue, toDateParam } from '../components/DateFilter'
import SwipeToDelete from '../components/SwipeToDelete'
import EditFeedModal from '../components/EditFeedModal'
import ErrorBanner from '../components/ErrorBanner'
import TimeOffsetPicker from '../components/TimeOffsetPicker'
import SuccessToast from '../components/SuccessToast'
import BreastfeedingTimer from '../components/BreastfeedingTimer'
import { formatTime } from '../utils/dateUtils'
import { extractErrorMessage } from '../utils/errors'
import { FEED_TYPE_LABEL, COLORS, NEUTRALS } from '../utils/constants'
import type { FeedRecord } from '../types'

const FEED_TYPES = ['FORMULA', 'BREAST', 'MIXED'] as const
const QUICK_AMOUNTS = [30, 60, 80, 90, 100, 120, 150]

export default function FeedLogScreen() {
  const { babyId, babyName, initialized, loadBaby } = useStoredBaby()
  const [feeds, setFeeds] = useState<FeedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('today')
  const [editingRecord, setEditingRecord] = useState<FeedRecord | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [feedType, setFeedType] = useState<string>('FORMULA')
  const [note, setNote] = useState('')
  const [fedAt, setFedAt] = useState(new Date())
  const [success, setSuccess] = useState<string | null>(null)
  const [timerVisible, setTimerVisible] = useState(false)
  const [leftMinutes, setLeftMinutes] = useState<number | null>(null)
  const [rightMinutes, setRightMinutes] = useState<number | null>(null)

  const isBreast = feedType === 'BREAST' || feedType === 'MIXED'

  const loadFeeds = useCallback(async (bid: string, filter: DateFilterValue) => {
    const data = await getFeeds(bid, 50, toDateParam(filter))
    setFeeds(data)
  }, [])

  useEffect(() => {
    if (!initialized || !babyId) {
      if (initialized) setLoading(false)
      return
    }
    loadFeeds(babyId, dateFilter).then(() => setLoading(false))
  }, [initialized, babyId, loadFeeds])

  const onRefresh = useCallback(async () => {
    if (!babyId) return
    setRefreshing(true)
    await loadFeeds(babyId, dateFilter)
    setRefreshing(false)
  }, [babyId, dateFilter, loadFeeds])

  useFocusEffect(useCallback(() => { loadBaby() }, [loadBaby]))

  const handleFilterChange = async (filter: DateFilterValue) => {
    setDateFilter(filter)
    if (babyId) await loadFeeds(babyId, filter)
  }

  const handleTimerComplete = (left: number, right: number) => {
    setLeftMinutes(left)
    setRightMinutes(right)
    setTimerVisible(false)
  }

  const handleSubmit = async () => {
    if (!babyId) return
    if (!isBreast && !amount) return
    if (isBreast && !amount && leftMinutes == null) return
    setSubmitting(true)
    try {
      const record = await recordFeed(babyId, {
        amountMl: amount ? parseInt(amount) : 0,
        feedType,
        note,
        fedAt: fedAt.toISOString(),
        leftMinutes: leftMinutes ?? undefined,
        rightMinutes: rightMinutes ?? undefined,
      })
      await loadFeeds(babyId, dateFilter)
      setAmount('')
      setNote('')
      setFedAt(new Date())
      setLeftMinutes(null)
      setRightMinutes(null)
      const label = isBreast && leftMinutes != null
        ? `수유 완료 (왼쪽 ${Math.round(leftMinutes)}분 오른쪽 ${Math.round(rightMinutes ?? 0)}분)`
        : `${parseInt(amount)}ml 수유 기록 완료`
      setSuccess(label)
      if (record.nextFeedAt) await scheduleFeedNotification(record.nextFeedAt, babyName, record.fedAt)
    } catch (err) {
      setError(extractErrorMessage(err, '수유 기록 저장에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (feedId: string) => {
    if (!babyId) return
    try {
      await deleteFeed(babyId, feedId)
      setFeeds(prev => prev.filter(f => f.id !== feedId))
    } catch (err) {
      setError(extractErrorMessage(err, '삭제에 실패했어요'))
    }
  }

  const handleUpdate = async (feedId: string, amountMl: number, feedType: string, note: string, fedAt: string) => {
    if (!babyId) return
    try {
      const updated = await updateFeed(babyId, feedId, { amountMl, feedType, note, fedAt })
      setFeeds(prev => prev.map(f => f.id === feedId ? updated : f))
    } catch (err) {
      setError(extractErrorMessage(err, '수정에 실패했어요'))
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <View style={styles.container}>
      <BreastfeedingTimer
        visible={timerVisible}
        onComplete={handleTimerComplete}
        onCancel={() => setTimerVisible(false)}
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessToast message={success} onHide={() => setSuccess(null)} />
      <EditFeedModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdate}
      />
      <View style={styles.form}>
        <Text style={styles.formTitle}>수유 기록</Text>
        <Text style={styles.label}>수유량 (ml)</Text>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map(ml => (
            <TouchableOpacity
              key={ml}
              style={[styles.quickChip, amount === String(ml) && styles.quickChipActive]}
              onPress={() => setAmount(String(ml))}
            >
              <Text style={[styles.quickChipText, amount === String(ml) && styles.quickChipTextActive]}>
                {ml}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="직접 입력 (ml)"
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={styles.label}>수유 방법</Text>
        <View style={styles.typeRow}>
          {FEED_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, feedType === t && styles.typeChipActive]}
              onPress={() => setFeedType(t)}
            >
              <Text style={[styles.typeChipText, feedType === t && styles.typeChipTextActive]}>
                {FEED_TYPE_LABEL[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* 모유/혼합 수유 타이머 */}
        {isBreast && (
          <TouchableOpacity style={styles.timerButton} onPress={() => setTimerVisible(true)}>
            <Text style={styles.timerButtonText}>
              {leftMinutes != null
                ? `⏱ 왼쪽 ${Math.round(leftMinutes)}분 · 오른쪽 ${Math.round(rightMinutes ?? 0)}분`
                : '⏱ 타이머로 수유 시간 기록'}
            </Text>
          </TouchableOpacity>
        )}
        <TextInput style={styles.input} placeholder="메모 (선택)" value={note} onChangeText={setNote} />
        <TimeOffsetPicker value={fedAt} onChange={setFedAt} />
        <TouchableOpacity
          style={[styles.submitButton, ((!amount && (!isBreast || leftMinutes == null)) || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={(!amount && (!isBreast || leftMinutes == null)) || submitting}
        >
          <Text style={styles.submitButtonText}>{submitting ? '저장 중...' : '기록하기'}</Text>
        </TouchableOpacity>
      </View>

      <DateFilter value={dateFilter} onChange={handleFilterChange} />

      <FlatList
        data={feeds}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 수유 기록을 삭제할까요?">
            <TouchableOpacity
              style={styles.recordItem}
              onLongPress={() => setEditingRecord(item)}
              delayLongPress={400}
            >
              <View style={styles.recordLeft}>
                {item.amountMl > 0
                  ? <Text style={styles.recordAmount}>{item.amountMl}ml</Text>
                  : null}
                <Text style={styles.recordType}>{FEED_TYPE_LABEL[item.feedType]}</Text>
                {(item.leftMinutes != null || item.rightMinutes != null) && (
                  <Text style={styles.recordBreast}>
                    왼 {Math.round(item.leftMinutes ?? 0)}분 · 오 {Math.round(item.rightMinutes ?? 0)}분
                  </Text>
                )}
                {!!item.note && <Text style={styles.recordNote}>{item.note}</Text>}
              </View>
              <View style={styles.recordRight}>
                <Text style={styles.recordTime}>{formatTime(item.fedAt)}</Text>
                {item.nextFeedAt && <Text style={styles.recordNext}>다음 {formatTime(item.nextFeedAt)}</Text>}
                <Text style={styles.editHint}>꾹 눌러서 수정</Text>
              </View>
            </TouchableOpacity>
          </SwipeToDelete>
        )}
        ListEmptyComponent={<Text style={styles.empty}>수유 기록이 없어요</Text>}
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
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: NEUTRALS.gray100,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: NEUTRALS.ink, marginBottom: 4 },
  label: { fontSize: 12, color: NEUTRALS.gray600, fontWeight: '600', marginTop: 4 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: NEUTRALS.gray50 },
  quickChipActive: { backgroundColor: COLORS.primary },
  quickChipText: { fontSize: 13, color: NEUTRALS.gray700, fontWeight: '600' },
  quickChipTextActive: { color: NEUTRALS.white },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: NEUTRALS.gray50, alignItems: 'center' },
  typeChipActive: { backgroundColor: COLORS.primary },
  typeChipText: { fontSize: 13, color: NEUTRALS.gray700, fontWeight: '600' },
  typeChipTextActive: { color: NEUTRALS.white },
  input: { borderWidth: 1, borderColor: NEUTRALS.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  submitButtonDisabled: { backgroundColor: COLORS.primaryDisabled },
  submitButtonText: { color: NEUTRALS.white, fontWeight: '700', fontSize: 15 },
  listContent: { padding: 16, gap: 10 },
  recordItem: {
    flex: 1,
    backgroundColor: NEUTRALS.white,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLeft: { gap: 4 },
  recordRight: { alignItems: 'flex-end', gap: 4 },
  recordAmount: { fontSize: 18, fontWeight: '700', color: NEUTRALS.ink },
  recordType: { fontSize: 12, color: NEUTRALS.gray500 },
  recordNote: { fontSize: 11, color: NEUTRALS.gray400, marginTop: 2, maxWidth: 140 },
  recordBreast: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  timerButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timerButtonText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  recordTime: { fontSize: 13, color: NEUTRALS.gray750 },
  recordNext: { fontSize: 12, color: COLORS.primary },
  editHint: { fontSize: 10, color: NEUTRALS.gray300, marginTop: 2 },
  empty: { textAlign: 'center', color: NEUTRALS.gray400, marginTop: 40 },
})
