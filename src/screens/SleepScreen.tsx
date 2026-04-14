import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { deleteSleep, endSleep, getActiveSleep, getSleepRecords, startSleep } from '../api/babyLogApi'
import SwipeToDelete from '../components/SwipeToDelete'
import ErrorBanner from '../components/ErrorBanner'
import { getStoredBabyId } from '../api/client'
import type { SleepRecord } from '../types'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return `${h}시간 ${m}분`
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 째`
  const h = Math.floor(mins / 60)
  return `${h}시간 ${mins % 60}분 째`
}

export default function SleepScreen() {
  const [babyId, setBabyId] = useState<string | null>(null)
  const [records, setRecords] = useState<SleepRecord[]>([])
  const [activeSleep, setActiveSleep] = useState<SleepRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setBabyId(bid)
      if (bid) await reload(bid)
      setLoading(false)
    }
    init()
  }, [])

  const handleStart = async () => {
    if (!babyId) return
    setSubmitting(true)
    try {
      await startSleep(babyId, {})
      await reload(babyId)
    } catch {
      setError('수면 시작 기록에 실패했어요')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnd = async () => {
    if (!babyId || !activeSleep) return
    setSubmitting(true)
    try {
      await endSleep(babyId, activeSleep.id, {})
      await reload(babyId)
    } catch {
      setError('수면 종료 기록에 실패했어요')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (sleepId: string) => {
    if (!babyId) return
    try {
      await deleteSleep(babyId, sleepId)
      setRecords(prev => prev.filter(r => r.id !== sleepId))
      if (activeSleep?.id === sleepId) setActiveSleep(null)
    } catch {
      setError('삭제에 실패했어요')
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B9D" /></View>

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {/* 수면 상태 카드 */}
      <View style={styles.statusCard}>
        {activeSleep ? (
          <>
            <View style={styles.sleepingIndicator}>
              <Text style={styles.sleepingEmoji}>😴</Text>
              <View>
                <Text style={styles.sleepingTitle}>수면 중</Text>
                <Text style={styles.sleepingTime}>{timeSince(activeSleep.sleptAt)}</Text>
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
            <Text style={styles.awakeDesc}>잠들면 기록해주세요</Text>
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
