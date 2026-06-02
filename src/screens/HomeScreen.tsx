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
import { getActiveSleep, getBabies, getDiapers, getGrowthStage, getLatestFeed, getMonthlyPhotos, getSleepRecords, getTodayStats } from '../api/babyLogApi'
import { setStoredBaby } from '../api/client'
import { scheduleFeedNotification } from '../utils/notifications'
import { updateFeedWidget } from '../utils/widget'
import { useFamilyStream } from '../hooks/useFamilyStream'
import { useStoredBaby } from '../hooks/useStoredBaby'
import { registerPushTokenForFamily } from '../api/pushRegistration'
import QuickActions from '../components/QuickActions'
import BabySwitcherSheet from '../components/baby/BabySwitcherSheet'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import PromoBadge from '../components/PromoBadge'
import UndoToast, { type UndoAction } from '../components/UndoToast'
import { parseApiTimestamp, timeUntil, formatDuration as formatSleep, formatAge } from '../utils/dateUtils'
import type { Baby, GrowthStage, SleepRecord, TodayStats } from '../types'
import type { MainTabScreenProps } from '../navigation/types'

import { COLORS, NEUTRALS, FONT } from '../utils/constants'
export default function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const { babyId, familyId, babyName, daysOld, initialized, loadBaby } = useStoredBaby()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [babies, setBabies] = useState<Baby[]>([])
  const [switcherVisible, setSwitcherVisible] = useState(false)
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [activeSleep, setActiveSleep] = useState<SleepRecord | null>(null)
  const [nextFeedAt, setNextFeedAt] = useState<string | null>(null)
  const [growthStage, setGrowthStage] = useState<GrowthStage | null>(null)
  const [monthlyPhotoCount, setMonthlyPhotoCount] = useState(0)
  const [quickError, setQuickError] = useState<string | null>(null)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)

  useEffect(() => {
    navigation.setOptions({ title: babyName ?? '홈' })
  }, [babyName])

  // baby.name 은 scheduleFeedNotification 에 넘기려고 babies 한 번 더 조회.
  // babyName/daysOld 자체는 useStoredBaby 가 관리하므로 set 호출 없음.
  const loadData = useCallback(async (bid: string, fid: string) => {
    const [feed, babies, stats, active, diapers, sleeps] = await Promise.allSettled([
      getLatestFeed(bid),
      getBabies(fid),
      getTodayStats(bid),
      getActiveSleep(bid),
      getDiapers(bid, 1),
      getSleepRecords(bid, 5),
    ])
    if (babies.status === 'fulfilled') {
      setBabies(babies.value)
      const baby = babies.value.find(b => b.id === bid)
      if (feed.status === 'fulfilled' && feed.value?.nextFeedAt) {
        await scheduleFeedNotification(feed.value.nextFeedAt, baby?.name, feed.value.fedAt, bid)
      }
      // iOS 홈 위젯 갱신 — 수유/기저귀/수면 마지막 시각 + 오늘 요약(medium·large 위젯용)
      const s = stats.status === 'fulfilled' ? stats.value : null
      const lastDiaperAt = diapers.status === 'fulfilled' ? diapers.value[0]?.changedAt : null
      // 가장 최근 '완료된' 수면의 기상 시각 — wokeAt 있는 첫 기록
      const lastSleepEndAt = sleeps.status === 'fulfilled'
        ? sleeps.value.find(sl => sl.wokeAt)?.wokeAt ?? null
        : null
      updateFeedWidget({
        babyName: baby?.name,
        lastFedAt: feed.status === 'fulfilled' ? feed.value?.fedAt : null,
        nextFeedAt: feed.status === 'fulfilled' ? feed.value?.nextFeedAt : null,
        lastDiaperAt,
        lastSleepEndAt,
        feedCount: s?.feedCount,
        totalFeedMl: s?.totalFeedMl,
        diaperCount: s?.diaperCount,
        sleepCount: s?.sleepCount,
        totalSleepMinutes: s?.totalSleepMinutes,
      })
    }
    if (feed.status === 'fulfilled') setNextFeedAt(feed.value?.nextFeedAt ?? null)
    if (stats.status === 'fulfilled') setTodayStats(stats.value)
    if (active.status === 'fulfilled') setActiveSleep(active.value)
    // 성장 단계 기반 수유 가이드 — 실패해도 화면 다른 부분에 영향 X
    getGrowthStage(bid, fid).then(setGrowthStage).catch(() => setGrowthStage(null))
    // 월 증명사진 채움 카운트 (홈 카드 표시용)
    getMonthlyPhotos(bid).then(list => setMonthlyPhotoCount(list.length)).catch(() => setMonthlyPhotoCount(0))
  }, [])

  useEffect(() => {
    if (!initialized) return
    if (babyId && familyId) {
      loadData(babyId, familyId).finally(() => setLoading(false))
      registerPushTokenForFamily(familyId).catch(() => {})
    } else {
      setLoading(false)
    }
  }, [initialized, babyId, familyId, loadData])

  useFocusEffect(useCallback(() => {
    loadBaby().then(({ babyId: bid, familyId: fid }) => {
      if (bid && fid && (bid !== babyId || fid !== familyId)) {
        loadData(bid, fid)
      }
    })
  }, [babyId, familyId, loadData, loadBaby]))

  const onRefresh = useCallback(async () => {
    if (!babyId || !familyId) return
    setRefreshing(true)
    await loadData(babyId, familyId)
    setRefreshing(false)
  }, [babyId, familyId, loadData])

  const onRecorded = useCallback(() => {
    if (babyId && familyId) loadData(babyId, familyId)
  }, [babyId, familyId, loadData])

  // 홈 빠른 전환 — 아기 탭 진입 없이 즉시 전환. setStoredBaby 후 loadBaby() 가
  // babyId state 를 갱신하면 위의 useEffect 가 새 아기로 loadData 를 다시 돈다.
  const handleSwitchBaby = useCallback(async (baby: Baby) => {
    setSwitcherVisible(false)
    if (baby.id === babyId) return
    await setStoredBaby(baby.id)
    await loadBaby()
  }, [babyId, loadBaby])

  useFamilyStream(familyId, useCallback(() => {
    if (babyId && familyId) loadData(babyId, familyId)
  }, [babyId, familyId, loadData]))

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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!babyId) {
    return (
      <View style={styles.center}>
        <EmptyState icon="happy-outline" title="아직 아기가 없어요" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* 아기 정보 — 탭 시 아기 프로필로 (이름·생일 등 메타 빠른 진입) */}
        <TouchableOpacity
          style={styles.babyCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Main', { screen: 'BabyProfile' })}
          accessibilityRole="button"
          accessibilityLabel="아기 프로필 보기"
        >
          <View style={styles.babyCardTop}>
            <View>
              <Text style={styles.babyCardName}>{babyName ?? '아기'}</Text>
              {daysOld != null && (
                <Text style={styles.babyCardAge}>
                  D+{daysOld}일 · {formatAge(daysOld)}
                </Text>
              )}
            </View>
            <View style={styles.babyCardRight}>
              {babies.length > 1 && (
                <TouchableOpacity
                  style={styles.switchChip}
                  onPress={() => setSwitcherVisible(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="아기 전환"
                >
                  <Text style={styles.switchChipText}>전환 ▾</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.babyCardEmoji}>👶</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 수유 가이드 — 성장 단계 기반 권장량/간격 */}
        {growthStage && (
          <View style={styles.guideCard}>
            <Text style={styles.guideLabel}>오늘 수유 가이드</Text>
            <Text style={styles.guideValue}>
              권장량 {growthStage.feedingGuideMl.start}~{growthStage.feedingGuideMl.end}ml ·
              {' '}간격 {growthStage.feedingIntervalHours.start}~{growthStage.feedingIntervalHours.end}시간
            </Text>
          </View>
        )}

        {/* 월 증명사진 진입 — 발견성 강화 */}
        <TouchableOpacity
          style={styles.monthlyCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('MonthlyPhotos')}
          accessibilityRole="button"
          accessibilityLabel="월 증명사진 보기"
        >
          <View style={styles.monthlyCardRow}>
            <Text style={styles.monthlyCardTitle}>🎁 월 증명사진 · {monthlyPhotoCount}/12</Text>
            <PromoBadge />
          </View>
          <Text style={styles.monthlyCardSub}>한 달 한 컷, 첫 돌까지 ›</Text>
        </TouchableOpacity>

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
      <BabySwitcherSheet
        visible={switcherVisible}
        babies={babies}
        selectedId={babyId}
        onSelect={handleSwitchBaby}
        onAddBaby={() => {
          setSwitcherVisible(false)
          if (familyId) navigation.navigate('FamilySetup', { mode: 'addBaby', familyId })
        }}
        onClose={() => setSwitcherVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  babyCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  babyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  babyCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  babyCardName: { fontSize: FONT.hero, fontWeight: '800', color: NEUTRALS.white },
  babyCardAge: { fontSize: FONT.bodyMd, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  babyCardEmoji: { fontSize: 36 },
  switchChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchChipText: { color: NEUTRALS.white, fontWeight: '700', fontSize: FONT.label },
  guideCard: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  guideLabel: { fontSize: FONT.label, color: NEUTRALS.gray500, fontWeight: '600' },
  guideValue: { fontSize: FONT.bodySm, color: NEUTRALS.gray800, fontWeight: '600' },
  monthlyCard: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  monthlyCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthlyCardTitle: { fontSize: FONT.bodyMd, fontWeight: '700', color: NEUTRALS.ink },
  monthlyCardSub: { fontSize: FONT.bodySm, color: NEUTRALS.gray650 },
  cardLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: FONT.label, color: NEUTRALS.gray500, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  shareBtn: { fontSize: FONT.label, color: COLORS.primary, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  statItem: { alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  statSub: { fontSize: FONT.label, color: NEUTRALS.gray450 },
  nextFeedHint: { marginTop: 10, color: COLORS.primary, fontWeight: '700', textAlign: 'center' },
  nextFeedReady: { color: COLORS.success },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  primaryButtonText: { color: NEUTRALS.white, fontWeight: '700', fontSize: FONT.h4 },
})
