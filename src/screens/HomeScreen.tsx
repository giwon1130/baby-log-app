import React, { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { getActiveSleep, getBabies, getLatestFeed, getTodayStats } from '../api/babyLogApi'
import { getStoredBabyId, getStoredFamilyId } from '../api/client'
import { scheduleFeedNotification } from '../hooks/useFeedNotification'
import QuickActions from '../components/QuickActions'
import ErrorBanner from '../components/ErrorBanner'
import UndoToast, { type UndoAction } from '../components/UndoToast'
import { parseApiTimestamp, timeUntil, formatDuration as formatSleep, formatAge } from '../utils/dateUtils'
import type { SleepRecord, TodayStats } from '../types'

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [babyId, setBabyId] = useState<string | null>(null)
  const [babyName, setBabyName] = useState<string | undefined>(undefined)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [activeSleep, setActiveSleep] = useState<SleepRecord | null>(null)
  const [daysOld, setDaysOld] = useState<number | null>(null)
  const [nextFeedAt, setNextFeedAt] = useState<string | null>(null)
  const [quickError, setQuickError] = useState<string | null>(null)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)

  useEffect(() => {
    navigation.setOptions({ title: babyName ?? '홈' })
  }, [babyName])

  const loadData = useCallback(async (bid: string, fid: string) => {
    const [feed, babies, stats, active] = await Promise.allSettled([
      getLatestFeed(bid),
      getBabies(fid),
      getTodayStats(bid),
      getActiveSleep(bid),
    ])
    if (babies.status === 'fulfilled') {
      const baby = babies.value.find(b => b.id === bid)
      setBabyName(baby?.name)
      setDaysOld(baby?.daysOld ?? null)
      if (feed.status === 'fulfilled' && feed.value?.nextFeedAt) {
        await scheduleFeedNotification(feed.value.nextFeedAt, baby?.name, feed.value.fedAt)
      }
    }
    if (feed.status === 'fulfilled') setNextFeedAt(feed.value?.nextFeedAt ?? null)
    if (stats.status === 'fulfilled') setTodayStats(stats.value)
    if (active.status === 'fulfilled') setActiveSleep(active.value)
  }, [])

  useEffect(() => {
    const init = async () => {
      const bid = await getStoredBabyId()
      const fid = await getStoredFamilyId()
      setBabyId(bid)
      setFamilyId(fid)
      if (bid && fid) await loadData(bid, fid)
      setLoading(false)
    }
    init()
  }, [])

  useFocusEffect(useCallback(() => {
    const check = async () => {
      const bid = await getStoredBabyId()
      const fid = await getStoredFamilyId()
      if (bid && fid && (bid !== babyId || fid !== familyId)) {
        setBabyId(bid)
        setFamilyId(fid)
        await loadData(bid, fid)
      }
    }
    check()
  }, [babyId, familyId, loadData]))

  const onRefresh = useCallback(async () => {
    if (!babyId || !familyId) return
    setRefreshing(true)
    await loadData(babyId, familyId)
    setRefreshing(false)
  }, [babyId, familyId, loadData])

  const onRecorded = useCallback(() => {
    if (babyId && familyId) loadData(babyId, familyId)
  }, [babyId, familyId, loadData])

  const handleShareReport = useCallback(async () => {
    if (!todayStats) return
    const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    const name = babyName ?? '아기'
    const sleepH = Math.floor(todayStats.totalSleepMinutes / 60)
    const sleepM = todayStats.totalSleepMinutes % 60
    const sleepStr = sleepH > 0 ? `${sleepH}시간 ${sleepM}분` : `${sleepM}분`
    const text = [
      `🍼 ${today} ${name} 기록`,
      ``,
      `수유: ${todayStats.feedCount}회 · ${todayStats.totalFeedMl}ml`,
      `기저귀: ${todayStats.diaperCount}회 (소변 ${todayStats.wetCount}회 · 대변 ${todayStats.dirtyCount}회)`,
      `수면: ${todayStats.sleepCount}회 · ${sleepStr}`,
    ].join('\n')
    await Share.share({ message: text })
  }, [todayStats, babyName])

  const renderNextFeedHint = () => {
    if (!nextFeedAt) return null
    const at = parseApiTimestamp(nextFeedAt)
    if (at == null) return null
    const isReady = Date.now() >= at
    return (
      <Text style={[styles.nextFeedHint, isReady && styles.nextFeedReady]}>
        {isReady ? '🍼 지금 수유 가능' : `다음 수유: ${timeUntil(nextFeedAt)}`}
      </Text>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    )
  }

  if (!babyId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>아직 아기가 없어요</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('FamilySetup')}
        >
          <Text style={styles.primaryButtonText}>시작하기</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />
        }
      >
        {/* 아기 정보 */}
        <View style={styles.babyCard}>
          <View style={styles.babyCardTop}>
            <View>
              <Text style={styles.babyCardName}>{babyName ?? '아기'}</Text>
              {daysOld != null && (
                <Text style={styles.babyCardAge}>
                  D+{daysOld}일 · {formatAge(daysOld)}
                </Text>
              )}
            </View>
            <Text style={styles.babyCardEmoji}>👶</Text>
          </View>
        </View>

        {/* 빠른 기록 */}
        <ErrorBanner message={quickError} onDismiss={() => setQuickError(null)} />
        <QuickActions
          babyId={babyId}
          babyName={babyName}
          activeSleep={activeSleep}
          onRecorded={onRecorded}
          onError={setQuickError}
          onUndoAvailable={setUndoAction}
          onNavigateBreastTimer={() => navigation.navigate('Log')}
        />

        {/* 오늘 요약 */}
        {todayStats && (
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>오늘 요약</Text>
              <TouchableOpacity onPress={handleShareReport}>
                <Text style={styles.shareBtn}>공유 ↗</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🍼</Text>
                <Text style={styles.statValue}>{todayStats.feedCount}회</Text>
                <Text style={styles.statSub}>{todayStats.totalFeedMl}ml</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🧷</Text>
                <Text style={styles.statValue}>{todayStats.diaperCount}회</Text>
                <Text style={styles.statSub}>소{todayStats.wetCount} 대{todayStats.dirtyCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>😴</Text>
                <Text style={styles.statValue}>{todayStats.sleepCount}회</Text>
                <Text style={styles.statSub}>{formatSleep(todayStats.totalSleepMinutes)}</Text>
              </View>
            </View>
            {renderNextFeedHint()}
          </View>
        )}
      </ScrollView>
      <UndoToast action={undoAction} onDismiss={() => setUndoAction(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  babyCard: {
    backgroundColor: '#FF6B9D',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  babyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  babyCardName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  babyCardAge: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  babyCardEmoji: { fontSize: 36 },
  cardLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  shareBtn: { fontSize: 12, color: '#FF6B9D', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  statItem: { alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  statSub: { fontSize: 12, color: '#aaa' },
  nextFeedHint: { marginTop: 10, color: '#FF6B9D', fontWeight: '700', textAlign: 'center' },
  nextFeedReady: { color: '#4CAF50' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#444' },
  primaryButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
