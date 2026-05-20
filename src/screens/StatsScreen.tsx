import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { BarChart, LineChart } from 'react-native-chart-kit'
import { getMonthlyStats, getWeeklyStats } from '../api/babyLogApi'
import { useStoredBaby } from '../hooks/useStoredBaby'
import { formatDuration } from '../utils/dateUtils'
import EmptyState from '../components/EmptyState'
import { DailyClockSection } from '../components/DailyClockSection'
import { WeeklyHeatmapSection } from '../components/WeeklyHeatmapSection'
import type { WeeklyStats } from '../types'

import { COLORS, NEUTRALS, FONT } from '../utils/constants'
const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 32

const CHART_CONFIG = {
  backgroundGradientFrom: NEUTRALS.white,
  backgroundGradientTo: NEUTRALS.white,
  color: (opacity = 1) => `rgba(255, 107, 157, ${opacity})`,
  labelColor: () => NEUTRALS.gray450,
  strokeWidth: 2,
  barPercentage: 0.6,
  decimalPlaces: 0,
  propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary },
}

const SLEEP_CHART_CONFIG = {
  ...CHART_CONFIG,
  color: (opacity = 1) => `rgba(92, 107, 192, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.sleep },
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

type Period = 'week' | 'month'

export default function StatsScreen() {
  const { babyId, initialized, loadBaby } = useStoredBaby()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<WeeklyStats | null>(null)
  const [period, setPeriod] = useState<Period>('week')

  const loadStats = useCallback(async (bid: string, p: Period) => {
    const data = await (p === 'week' ? getWeeklyStats(bid) : getMonthlyStats(bid)).catch(() => null)
    setStats(data)
  }, [])

  useEffect(() => {
    if (!initialized) return
    if (babyId) loadStats(babyId, period).finally(() => setLoading(false))
    else setLoading(false)
  }, [initialized, babyId, period, loadStats])

  useFocusEffect(useCallback(() => {
    loadBaby()
    if (babyId) loadStats(babyId, period)
  }, [babyId, period, loadStats, loadBaby]))

  const onRefresh = useCallback(async () => {
    if (!babyId) return
    setRefreshing(true)
    await loadStats(babyId, period)
    setRefreshing(false)
  }, [babyId, period, loadStats])

  const chartData = useMemo(() => {
    if (!stats) return null
    // 월간(30일)은 라벨이 빽빽 — 5일 간격만 표시
    const every = period === 'month' ? 5 : 1
    const feedLabels = stats.feedStats.map((s, i) => (i % every === 0 ? shortDate(s.date) : ''))
    const feedMlData = stats.feedStats.map(s => s.totalMl)
    const feedCountData = stats.feedStats.map(s => s.feedCount)
    const sleepLabels = stats.sleepStats.map((s, i) => (i % every === 0 ? shortDate(s.date) : ''))
    const sleepData = stats.sleepStats.map(s => Math.round(s.totalMinutes / 60 * 10) / 10)
    const totalFeedThisWeek = feedMlData.reduce((a, b) => a + b, 0)
    const avgFeedPerDay = stats.feedStats.length > 0
      ? Math.round(totalFeedThisWeek / stats.feedStats.length)
      : 0
    const totalSleepHours = Math.round(sleepData.reduce((a, b) => a + b, 0) * 10) / 10
    const avgSleepPerDay = Math.round(totalSleepHours / (stats.sleepStats.length || 1) * 10) / 10

    // 전반부(앞 3일) vs 후반부(뒤 3일) 트렌드
    const feedTrend = (() => {
      const recent = feedMlData.slice(-3).reduce((a, b) => a + b, 0)
      const prev = feedMlData.slice(0, 3).reduce((a, b) => a + b, 0)
      if (prev === 0) return null
      return Math.round((recent - prev) / prev * 100)
    })()
    const sleepTrend = (() => {
      const recent = sleepData.slice(-3).reduce((a, b) => a + b, 0)
      const prev = sleepData.slice(0, 3).reduce((a, b) => a + b, 0)
      if (prev === 0) return null
      return Math.round((recent - prev) / prev * 100)
    })()

    return { feedLabels, feedMlData, feedCountData, sleepLabels, sleepData, totalFeedThisWeek, avgFeedPerDay, totalSleepHours, avgSleepPerDay, feedTrend, sleepTrend }
  }, [stats, period])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* 24시간 리듬 차트 — 주간 통계 유무와 무관하게 항상 표시 */}
      <DailyClockSection babyId={babyId} />

      {/* 주간 패턴 히트맵 */}
      <WeeklyHeatmapSection babyId={babyId} />

      {/* 주간/월간 토글 */}
      <View style={styles.periodTabs}>
        {(['week', 'month'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodTab, period === p && styles.periodTabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
              {p === 'week' ? '주간' : '월간'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {stats && chartData ? (
        <>
          {/* 기간 요약 */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>{period === 'week' ? '이번 주 요약' : '최근 30일 요약'}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{chartData.totalFeedThisWeek.toLocaleString()}ml</Text>
                <Text style={styles.summaryLabel}>총 수유량</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{chartData.avgFeedPerDay}ml</Text>
                <Text style={styles.summaryLabel}>일평균 수유</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{chartData.avgSleepPerDay}h</Text>
                <Text style={styles.summaryLabel}>일평균 수면</Text>
              </View>
            </View>

            {/* 트렌드 인사이트 */}
            {(chartData.feedTrend != null || chartData.sleepTrend != null) && (
              <View style={styles.trendRow}>
                {chartData.feedTrend != null && Math.abs(chartData.feedTrend) >= 5 && (
                  <View style={[styles.trendChip, chartData.feedTrend > 0 ? styles.trendUp : styles.trendDown]}>
                    <Text style={styles.trendChipText}>
                      {chartData.feedTrend > 0 ? '📈' : '📉'} 수유량 {chartData.feedTrend > 0 ? '+' : ''}{chartData.feedTrend}%
                    </Text>
                  </View>
                )}
                {chartData.sleepTrend != null && Math.abs(chartData.sleepTrend) >= 5 && (
                  <View style={[styles.trendChip, chartData.sleepTrend > 0 ? styles.trendUp : styles.trendDown]}>
                    <Text style={styles.trendChipText}>
                      {chartData.sleepTrend > 0 ? '😴' : '⚠️'} 수면 {chartData.sleepTrend > 0 ? '+' : ''}{chartData.sleepTrend}%
                    </Text>
                  </View>
                )}
                {(chartData.feedTrend == null || Math.abs(chartData.feedTrend) < 5) && (chartData.sleepTrend == null || Math.abs(chartData.sleepTrend) < 5) && (
                  <Text style={styles.trendStable}>이번 주 패턴이 안정적이에요 ✅</Text>
                )}
              </View>
            )}
          </View>

          {/* 일별 수유량 바 차트 */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>일별 수유량 (ml)</Text>
            <BarChart
              data={{ labels: chartData.feedLabels, datasets: [{ data: chartData.feedMlData }] }}
              width={CHART_WIDTH - 32}
              height={180}
              chartConfig={CHART_CONFIG}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>

          {/* 일별 수유 횟수 라인 차트 */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>일별 수유 횟수</Text>
            <LineChart
              data={{ labels: chartData.feedLabels, datasets: [{ data: chartData.feedCountData.length > 0 ? chartData.feedCountData : [0] }] }}
              width={CHART_WIDTH - 32}
              height={160}
              chartConfig={CHART_CONFIG}
              style={styles.chart}
              bezier
              fromZero
            />
          </View>

          {/* 일별 수면 시간 라인 차트 */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>일별 수면 시간 (시간)</Text>
            <LineChart
              data={{ labels: chartData.sleepLabels, datasets: [{ data: chartData.sleepData.length > 0 ? chartData.sleepData : [0] }] }}
              width={CHART_WIDTH - 32}
              height={160}
              chartConfig={SLEEP_CHART_CONFIG}
              style={styles.chart}
              bezier
              fromZero
            />
            {/* 일별 수면 상세 */}
            <View style={styles.sleepDetail}>
              {stats.sleepStats.map(s => (
                <View key={s.date} style={styles.sleepDetailRow}>
                  <Text style={styles.sleepDetailDate}>{shortDate(s.date)}</Text>
                  <Text style={styles.sleepDetailValue}>
                    {s.sleepCount}회 · {formatDuration(s.totalMinutes)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        <EmptyState
          icon="bar-chart-outline"
          title="주간 통계가 아직 없어요"
          hint="기록이 며칠 쌓이면 추세가 보여요"
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  periodTabs: { flexDirection: 'row', gap: 8 },
  periodTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: NEUTRALS.white,
    borderWidth: 1,
    borderColor: NEUTRALS.gray200,
    alignItems: 'center',
  },
  periodTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodTabText: { fontSize: FONT.bodySm, fontWeight: '700', color: NEUTRALS.gray500 },
  periodTabTextActive: { color: NEUTRALS.white },
  summaryCard: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  cardLabel: { fontSize: FONT.bodySm, color: NEUTRALS.gray500, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: FONT.h2, fontWeight: '700', color: NEUTRALS.ink },
  summaryLabel: { fontSize: FONT.caption, color: NEUTRALS.gray450 },
  summaryDivider: { width: 1, height: 36, backgroundColor: NEUTRALS.gray100 },
  chart: { borderRadius: 8, marginTop: 4 },
  sleepDetail: { gap: 6, marginTop: 4 },
  sleepDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  sleepDetailDate: { fontSize: FONT.bodySm, color: NEUTRALS.gray600 },
  sleepDetailValue: { fontSize: FONT.bodySm, color: COLORS.sleep, fontWeight: '600' },
  trendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trendChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  trendUp: { backgroundColor: '#E8F5E9' },
  trendDown: { backgroundColor: '#FFF3E0' },
  trendChipText: { fontSize: FONT.bodySm, fontWeight: '600', color: NEUTRALS.gray800 },
  trendStable: { fontSize: FONT.bodySm, color: COLORS.success, fontWeight: '600' },
})
