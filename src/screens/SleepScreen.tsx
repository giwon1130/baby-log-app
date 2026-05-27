import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { deleteSleep, endSleep, getActiveSleep, getSleepRecords, startSleep, updateSleep } from '../api/babyLogApi'
import { scheduleNapReminder } from '../utils/notifications'
import { useStoredBaby } from '../hooks/useStoredBaby'
import SwipeToDelete from '../components/SwipeToDelete'
import ErrorBanner from '../components/ErrorBanner'
import TimeOffsetPicker from '../components/TimeOffsetPicker'
import SuccessToast from '../components/SuccessToast'
import EditSleepModal from '../components/EditSleepModal'
import EmptyState from '../components/EmptyState'
import EditButton from '../components/EditButton'
import { useErrorRetry } from '../hooks/useErrorRetry'
import { formatTime, formatDuration } from '../utils/dateUtils'
import { extractErrorMessage } from '../utils/errors'
import type { SleepRecord } from '../types'

import { COLORS, NEUTRALS, FONT } from '../utils/constants'
function calcElapsed(iso: string, now: number): string {
  const totalSecs = Math.floor((now - new Date(iso).getTime()) / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}시간 ${m}분 ${s}초 째`
  if (m > 0) return `${m}분 ${s}초 째`
  return `${s}초 째`
}

export default function SleepScreen() {
  const { babyId, babyName, initialized, loadBaby } = useStoredBaby()
  const [records, setRecords] = useState<SleepRecord[]>([])
  const [activeSleep, setActiveSleep] = useState<SleepRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { error, retry, showError, dismissError } = useErrorRetry()
  const [sleptAt, setSleptAt] = useState(new Date())
  const [success, setSuccess] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [editingRecord, setEditingRecord] = useState<SleepRecord | null>(null)

  const reload = useCallback(async (bid: string) => {
    const [recs, active] = await Promise.all([
      getSleepRecords(bid),
      getActiveSleep(bid),
    ])
    setRecords(recs)
    setActiveSleep(active)
  }, [])

  const onRefresh = useCallback(async () => {
    if (!babyId) return
    setRefreshing(true)
    await reload(babyId)
    setRefreshing(false)
  }, [babyId, reload])

  useEffect(() => {
    if (!initialized || !babyId) {
      if (initialized) setLoading(false)
      return
    }
    reload(babyId).then(() => setLoading(false))
  }, [initialized, babyId, reload])

  useFocusEffect(useCallback(() => {
    loadBaby()
    if (babyId) reload(babyId)
  }, [babyId, reload, loadBaby]))

  const [isFocused, setIsFocused] = useState(true)

  useFocusEffect(useCallback(() => {
    setIsFocused(true)
    return () => setIsFocused(false)
  }, []))

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (isFocused && activeSleep && !activeSleep.wokeAt) {
      timerRef.current = setInterval(() => setNow(Date.now()), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeSleep, isFocused])

  const handleStart = async () => {
    if (!babyId) return
    setSubmitting(true)
    dismissError()
    try {
      await startSleep(babyId, { sleptAt: sleptAt.toISOString() })
      setSleptAt(new Date())
      setSuccess('수면 기록 시작')
      await reload(babyId)
    } catch (err) {
      showError(extractErrorMessage(err, '수면 시작 기록에 실패했어요'), handleStart)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnd = async () => {
    if (!babyId || !activeSleep) return
    setSubmitting(true)
    dismissError()
    try {
      const ended = await endSleep(babyId, activeSleep.id, {})
      await reload(babyId)
      if (ended.wokeAt) await scheduleNapReminder(ended.wokeAt, babyName)
    } catch (err) {
      showError(extractErrorMessage(err, '수면 종료 기록에 실패했어요'), handleEnd)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: string, newSleptAt: string, newWokeAt: string | null, newNote: string) => {
    if (!babyId) return
    try {
      const updated = await updateSleep(babyId, id, { sleptAt: newSleptAt, wokeAt: newWokeAt ?? undefined, note: newNote })
      setRecords(prev => prev.map(r => r.id === id ? updated : r))
      if (activeSleep?.id === id) setActiveSleep(updated)
      setSuccess('수면 기록이 수정됐어요')
    } catch (err) {
      showError(extractErrorMessage(err, '수정에 실패했어요'))
    }
  }

  const handleDelete = async (sleepId: string) => {
    if (!babyId) return
    try {
      await deleteSleep(babyId, sleepId)
      setRecords(prev => prev.filter(r => r.id !== sleepId))
      if (activeSleep?.id === sleepId) setActiveSleep(null)
    } catch (err) {
      showError(extractErrorMessage(err, '삭제에 실패했어요'))
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <View style={styles.container}>
      <EditSleepModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdate}
      />
      <ErrorBanner message={error} onDismiss={dismissError} onRetry={retry ?? undefined} />
      <SuccessToast message={success} onHide={() => setSuccess(null)} />
      {/* 수면 상태 카드 */}
      <View style={styles.statusCard}>
        {activeSleep ? (
          <>
            <View style={styles.sleepingIndicator}>
              <Text style={styles.sleepingEmoji}>😴</Text>
              <View style={styles.sleepingInfo}>
                <Text style={styles.sleepingTitle}>수면 중</Text>
                <Text style={styles.sleepingTime}>{calcElapsed(activeSleep.sleptAt, now)}</Text>
                <TouchableOpacity
                  onPress={() => setEditingRecord(activeSleep)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="잠든 시각 수정"
                >
                  <Text style={styles.editTimeLink}>
                    잠든 시각 {formatTime(activeSleep.sleptAt)} · 수정 ✎
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.wakeButton]}
              onPress={handleEnd}
              disabled={submitting}
            >
              <Text style={styles.actionButtonText}>{submitting ? '...' : '깨어났어요 ☀️'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.awakeTitle}>깨어있음</Text>
            <TimeOffsetPicker value={sleptAt} onChange={setSleptAt} />
            <TouchableOpacity
              style={[styles.actionButton, styles.sleepButton]}
              onPress={handleStart}
              disabled={submitting}
            >
              <Text style={styles.actionButtonText}>{submitting ? '...' : '잠들었어요 🌙'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 수면 기록 목록 */}
      <FlatList
        data={records}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 수면 기록을 삭제할까요?">
            <TouchableOpacity onLongPress={() => setEditingRecord(item)} activeOpacity={0.85}>
              <View style={styles.recordItem}>
                <View style={styles.recordLeft}>
                  <Text style={styles.recordSlept}>잠든 시각 {formatTime(item.sleptAt)}</Text>
                  {item.wokeAt && (
                    <Text style={styles.recordWoke}>깬 시각 {formatTime(item.wokeAt)}</Text>
                  )}
                </View>
                <View style={styles.rowEnd}>
                  <View style={styles.recordRight}>
                    {item.durationMinutes != null ? (
                      <Text style={styles.duration}>{formatDuration(item.durationMinutes)}</Text>
                    ) : (
                      <Text style={styles.ongoing}>수면 중</Text>
                    )}
                  </View>
                  <EditButton onPress={() => setEditingRecord(item)} />
                </View>
              </View>
            </TouchableOpacity>
          </SwipeToDelete>
        )}
        ListEmptyComponent={<EmptyState icon="moon-outline" title="수면 기록이 없어요" hint="재우기 버튼으로 시작해보세요" />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusCard: {
    backgroundColor: NEUTRALS.white,
    margin: 16,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sleepingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sleepingInfo: { flex: 1 },
  sleepingEmoji: { fontSize: 40 },
  sleepingTitle: { fontSize: FONT.h1, fontWeight: '700', color: NEUTRALS.ink },
  sleepingTime: { fontSize: FONT.bodyMd, color: NEUTRALS.gray600, marginTop: 2 },
  editTimeLink: { fontSize: FONT.label, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  awakeTitle: { fontSize: FONT.h1, fontWeight: '700', color: NEUTRALS.ink },
  awakeDesc: { fontSize: FONT.bodyMd, color: NEUTRALS.gray450 },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sleepButton: { backgroundColor: COLORS.sleep },
  wakeButton: { backgroundColor: COLORS.amber },
  actionButtonText: { color: NEUTRALS.white, fontWeight: '700', fontSize: FONT.h4 },
  listContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
  recordItem: {
    flex: 1,
    backgroundColor: NEUTRALS.white,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLeft: { flex: 1 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordSlept: { fontSize: FONT.bodySm, color: NEUTRALS.gray750 },
  recordWoke: { fontSize: FONT.bodySm, color: NEUTRALS.gray600, marginTop: 2 },
  recordRight: { alignItems: 'flex-end' },
  duration: { fontSize: FONT.h4, fontWeight: '700', color: COLORS.sleep },
  ongoing: { fontSize: FONT.bodySm, color: COLORS.amber, fontWeight: '600' },
})
