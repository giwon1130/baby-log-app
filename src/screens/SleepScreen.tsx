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
import { deleteSleep, endSleep, getActiveSleep, getBabies, getSleepRecords, startSleep, updateSleep } from '../api/babyLogApi'
import { scheduleNapReminder } from '../hooks/useFeedNotification'
import SwipeToDelete from '../components/SwipeToDelete'
import ErrorBanner from '../components/ErrorBanner'
import TimeOffsetPicker from '../components/TimeOffsetPicker'
import SuccessToast from '../components/SuccessToast'
import EditSleepModal from '../components/EditSleepModal'
import { getStoredBabyId, getStoredFamilyId } from '../api/client'
import { formatTime, formatDuration } from '../utils/dateUtils'
import type { SleepRecord } from '../types'

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
  const [babyId, setBabyId] = useState<string | null>(null)
  const [babyName, setBabyName] = useState<string | undefined>(undefined)
  const [records, setRecords] = useState<SleepRecord[]>([])
  const [activeSleep, setActiveSleep] = useState<SleepRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    const init = async () => {
      const bid = await getStoredBabyId()
      const fid = await getStoredFamilyId()
      setBabyId(bid)
      if (bid) {
        await reload(bid)
        if (fid) {
          const babies = await getBabies(fid).catch(() => [])
          setBabyName(babies.find(b => b.id === bid)?.name)
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  useFocusEffect(useCallback(() => {
    if (babyId) reload(babyId)
  }, [babyId, reload]))

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
    try {
      await startSleep(babyId, { sleptAt: sleptAt.toISOString() })
      setSleptAt(new Date())
      setSuccess('수면 기록 시작')
      await reload(babyId)
    } catch (err) {
      setError((err as Error).message || '수면 시작 기록에 실패했어요')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnd = async () => {
    if (!babyId || !activeSleep) return
    setSubmitting(true)
    try {
      const ended = await endSleep(babyId, activeSleep.id, {})
      await reload(babyId)
      if (ended.wokeAt) await scheduleNapReminder(ended.wokeAt, babyName)
    } catch (err) {
      setError((err as Error).message || '수면 종료 기록에 실패했어요')
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
      setError((err as Error).message || '수정에 실패했어요')
    }
  }

  const handleDelete = async (sleepId: string) => {
    if (!babyId) return
    try {
      await deleteSleep(babyId, sleepId)
      setRecords(prev => prev.filter(r => r.id !== sleepId))
      if (activeSleep?.id === sleepId) setActiveSleep(null)
    } catch (err) {
      setError((err as Error).message || '삭제에 실패했어요')
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B9D" /></View>

  return (
    <View style={styles.container}>
      <EditSleepModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdate}
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessToast message={success} onHide={() => setSuccess(null)} />
      {/* 수면 상태 카드 */}
      <View style={styles.statusCard}>
        {activeSleep ? (
          <>
            <View style={styles.sleepingIndicator}>
              <Text style={styles.sleepingEmoji}>😴</Text>
              <View>
                <Text style={styles.sleepingTitle}>수면 중</Text>
                <Text style={styles.sleepingTime}>{calcElapsed(activeSleep.sleptAt, now)}</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />}
        renderItem={({ item }) => (
          <SwipeToDelete onDelete={() => handleDelete(item.id)} confirmMessage="이 수면 기록을 삭제할까요?">
            <TouchableOpacity onLongPress={() => setEditingRecord(item)} activeOpacity={0.85}>
              <View style={styles.recordItem}>
                <View>
                  <Text style={styles.recordSlept}>잠든 시각 {formatTime(item.sleptAt)}</Text>
                  {item.wokeAt && (
                    <Text style={styles.recordWoke}>깬 시각 {formatTime(item.wokeAt)}</Text>
                  )}
                </View>
                <View style={styles.recordRight}>
                  {item.durationMinutes != null ? (
                    <Text style={styles.duration}>{formatDuration(item.durationMinutes)}</Text>
                  ) : (
                    <Text style={styles.ongoing}>수면 중</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </SwipeToDelete>
        )}
        ListEmptyComponent={<Text style={styles.empty}>수면 기록이 없어요</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sleepingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sleepingEmoji: { fontSize: 40 },
  sleepingTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  sleepingTime: { fontSize: 14, color: '#888', marginTop: 2 },
  awakeTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  awakeDesc: { fontSize: 14, color: '#aaa' },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sleepButton: { backgroundColor: '#5C6BC0' },
  wakeButton: { backgroundColor: '#FF8F00' },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  listContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
  recordItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordSlept: { fontSize: 13, color: '#444' },
  recordWoke: { fontSize: 13, color: '#888', marginTop: 2 },
  recordRight: { alignItems: 'flex-end' },
  duration: { fontSize: 16, fontWeight: '700', color: '#5C6BC0' },
  ongoing: { fontSize: 13, color: '#FF8F00', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#bbb', marginTop: 40 },
})
