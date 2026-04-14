import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { BarChart, LineChart } from 'react-native-chart-kit'
import { getWeeklyStats } from '../api/babyLogApi'
import { getStoredBabyId } from '../api/client'
import type { WeeklyStats } from '../types'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 32

const CHART_CONFIG = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(255, 107, 157, ${opacity})`,
  labelColor: () => '#aaa',
  strokeWidth: 2,
  barPercentage: 0.6,
  decimalPlaces: 0,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#FF6B9D' },
}

const SLEEP_CHART_CONFIG = {
  ...CHART_CONFIG,
  color: (opacity = 1) => `rgba(92, 107, 192, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#5C6BC0' },
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return `${h}h${m > 0 ? ` ${m}m` : ''}`
}

export default function StatsScreen() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<WeeklyStats | null>(null)

  useEffect(() => {
    const load = async () => {
      const bid = await getStoredBabyId()
      if (bid) {
        const data = await getWeeklyStats(bid).catch(() => null)
        setStats(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B9D" /></View>
  if (!stats) return <View style={styles.center}><Text style={styles.emptyText}>데이터가 없어요</Text></View>

  const feedLabels = stats.feedStats.map(s => shortDate(s.date))
  const feedMlData = stats.feedStats.map(s => s.totalMl)
  const feedCountData = stats.feedStats.map(s => s.feedCount)
  const sleepLabels = stats.sleepStats.map(s => shortDate(s.date))
  const sleepData = stats.sleepStats.map(s => Math.round(s.totalMinutes / 60 * 10) / 10) // 시간 단위

  const totalFeedThisWeek = feedMlData.reduce((a, b) => a + b, 0)
  const avgFeedPerDay = Math.round(totalFeedThisWeek / 7)
  const totalSleepHours = Math.round(sleepData.reduce((a, b) => a + b, 0) * 10) / 10

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 주간 요약 */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardLabel}>이번 주 요약</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalFeedThisWeek.toLocaleString()}ml</Text>
            <Text style={styles.summaryLabel}>총 수유량</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{avgFeedPerDay}ml</Text>
            <Text style={styles.summaryLabel}>일평균 수유량</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalSleepHours}h</Text>
            <Text style={styles.summaryLabel}>총 수면</Text>
          </View>
        </View>
      </View>

      {/* 일별 수유량 바 차트 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>일별 수유량 (ml)</Text>
        <BarChart
          data={{ labels: feedLabels, datasets: [{ data: feedMlData }] }}
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
          data={{ labels: feedLabels, datasets: [{ data: feedCountData.length > 0 ? feedCountData : [0] }] }}
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
          data={{ labels: sleepLabels, datasets: [{ data: sleepData.length > 0 ? sleepData : [0] }] }}
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
                {s.sleepCount}회 · {formatSleep(s.totalMinutes)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#bbb', fontSize: 15 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  cardLabel: { fontSize: 13, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  summaryLabel: { fontSize: 11, color: '#aaa' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#f0f0f0' },
  chart: { borderRadius: 8, marginTop: 4 },
  sleepDetail: { gap: 6, marginTop: 4 },
  sleepDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  sleepDetailDate: { fontSize: 13, color: '#888' },
  sleepDetailValue: { fontSize: 13, color: '#5C6BC0', fontWeight: '600' },
})
