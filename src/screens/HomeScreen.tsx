import React, { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { getActiveSleep, getBabies, getDiapers, getFeeds, getGrowthStage, getLatestFeed, getSleepRecords, getTodayStats } from '../api/babyLogApi'
import { getStoredBabyId, getStoredFamilyId } from '../api/client'
import { scheduleFeedNotification } from '../hooks/useFeedNotification'
import QuickActions from '../components/QuickActions'
import type { DiaperRecord, FeedRecord, GrowthStage, SleepRecord, TodayStats } from '../types'

const DIAPER_TYPE_LABEL: Record<string, string> = {
  WET: '💧 소변', DIRTY: '💩 대변', MIXED: '🔄 혼합', DRY: '✅ 깨끗',
}

function timeSince(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 ${mins % 60}분 전`
  return `${Math.floor(hours / 24)}일 전`
}

function timeUntil(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now()
  if (diff <= 0) return '지금 수유 가능'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 후`
  const hours = Math.floor(mins / 60)
  return `${hours}시간 ${mins % 60}분 후`
}

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return `${h}시간 ${m}분`
}

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [latestFeed, setLatestFeed] = useState<FeedRecord | null>(null)
  const [latestDiaper, setLatestDiaper] = useState<DiaperRecord | null>(null)
  const [growthStage, setGrowthStage] = useState<GrowthStage | null>(null)
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [babyId, setBabyId] = useState<string | null>(null)
  const [babyName, setBabyName] = useState<string | undefined>(undefined)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [activeSleep, setActiveSleep] = useState<SleepRecord | null>(null)
  const [lastSleep, setLastSleep] = useState<SleepRecord | null>(null)
  const [yesterdayFeedMl, setYesterdayFeedMl] = useState<number | null>(null)

  useEffect(() => {
    navigation.setOptions({ title: babyName ?? '홈' })
  }, [babyName])

  const loadData = useCallback(async (bid: string, fid: string) => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yyyymmdd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    const [feed, diaper, stage, babies, stats, active, sleeps, yFeeds] = await Promise.allSettled([
      getLatestFeed(bid),
      getDiapers(bid, 1),
      getGrowthStage(bid, fid),
      getBabies(fid),
      getTodayStats(bid),
      getActiveSleep(bid),
      getSleepRecords(bid, 3),
      getFeeds(bid, 100, yyyymmdd),
    ])

    if (feed.status === 'fulfilled' && feed.value) {
      setLatestFeed(feed.value)
      const name = babies.status === 'fulfilled'
        ? babies.value.find(b => b.id === bid)?.name
        : undefined
      setBabyName(name)
      await scheduleFeedNotification(feed.value.nextFeedAt, name)
    }
    if (diaper.status === 'fulfilled' && diaper.value.length > 0)
      setLatestDiaper(diaper.value[0])
    if (stage.status === 'fulfilled') setGrowthStage(stage.value)
    if (stats.status === 'fulfilled') setTodayStats(stats.value)
    if (active.status === 'fulfilled') setActiveSleep(active.value)
    if (sleeps.status === 'fulfilled') {
      const completed = sleeps.value.find(s => s.wokeAt !== null)
      setLastSleep(completed ?? null)
    }
    if (yFeeds.status === 'fulfilled') {
      setYesterdayFeedMl(yFeeds.value.reduce((sum, f) => sum + f.amountMl, 0))
    }
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

  // 탭 포커스 시 babyId 변경 감지 → 다른 아기로 전환됐으면 리로드
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />
      }
    >
      {/* 성장 단계 */}
      {growthStage && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>성장 단계</Text>
          <Text style={styles.cardTitle}>{growthStage.title}</Text>
          <Text style={styles.cardDesc}>{growthStage.description}</Text>
        </View>
      )}

      {/* 빠른 기록 */}
      <QuickActions
        babyId={babyId}
        babyName={babyName}
        onRecorded={() => babyId && familyId && loadData(babyId, familyId)}
      />

      {/* 오늘 요약 */}
      {todayStats && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>오늘 요약</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🍼</Text>
              <Text style={styles.statValue}>{todayStats.feedCount}회</Text>
              <Text style={styles.statSub}>{todayStats.totalFeedMl}ml</Text>
              {yesterdayFeedMl != null && yesterdayFeedMl > 0 && (() => {
                const diff = todayStats.totalFeedMl - yesterdayFeedMl
                const pct = Math.round(Math.abs(diff) / yesterdayFeedMl * 100)
                return (
                  <Text style={[styles.statCompare, diff >= 0 ? styles.compareUp : styles.compareDown]}>
                    {diff >= 0 ? '▲' : '▼'}{pct}%
                  </Text>
                )
              })()}
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
        </View>
      )}

      {/* 마지막 수유 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>마지막 수유</Text>
        {latestFeed ? (
          <>
            <Text style={styles.cardTitle}>{latestFeed.amountMl}ml</Text>
            <Text style={styles.cardDesc}>{timeSince(latestFeed.fedAt)}</Text>
            <Text style={[styles.cardDesc, styles.nextFeed]}>
              다음 수유: {timeUntil(latestFeed.nextFeedAt)}
            </Text>
          </>
        ) : (
          <Text style={styles.cardDesc}>기록 없음</Text>
        )}
      </View>

      {/* 마지막 기저귀 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>마지막 기저귀</Text>
        {latestDiaper ? (
          <>
            <Text style={styles.cardTitle}>{DIAPER_TYPE_LABEL[latestDiaper.diaperType] ?? latestDiaper.diaperType}</Text>
            <Text style={styles.cardDesc}>{timeSince(latestDiaper.changedAt)}</Text>
          </>
        ) : (
          <Text style={styles.cardDesc}>기록 없음</Text>
        )}
      </View>

      {/* 수면 상태 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>수면</Text>
        {activeSleep ? (
          <>
            <Text style={[styles.cardTitle, styles.sleeping]}>😴 수면 중</Text>
            <Text style={styles.cardDesc}>{timeSince(activeSleep.sleptAt)}부터</Text>
          </>
        ) : lastSleep ? (
          <>
            <Text style={styles.cardTitle}>
              {lastSleep.durationMinutes != null ? formatSleep(lastSleep.durationMinutes) : '-'}
            </Text>
            <Text style={styles.cardDesc}>마지막 수면 · {timeSince(lastSleep.wokeAt ?? lastSleep.sleptAt)} 완료</Text>
          </>
        ) : (
          <Text style={styles.cardDesc}>기록 없음</Text>
        )}
      </View>

      {/* 성장 팁 */}
      {growthStage && growthStage.tips.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>이 시기 팁</Text>
          {growthStage.tips.map((tip, i) => (
            <Text key={i} style={styles.tipItem}>• {tip}</Text>
          ))}
        </View>
      )}
    </ScrollView>
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
  cardLabel: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  cardDesc: { fontSize: 14, color: '#666' },
  nextFeed: { color: '#FF6B9D', fontWeight: '600' },
  sleeping: { color: '#5C6BC0' },
  tipItem: { fontSize: 13, color: '#555', lineHeight: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  statItem: { alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  statSub: { fontSize: 12, color: '#aaa' },
  statCompare: { fontSize: 11, fontWeight: '700' },
  compareUp: { color: '#4CAF50' },
  compareDown: { color: '#F44336' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#444' },
  primaryButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
