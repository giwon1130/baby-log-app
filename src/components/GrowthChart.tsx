import React from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { COLORS, NEUTRALS, FONT } from '../utils/constants'
import type { Baby, GrowthRecord } from '../types'
import { ageInMonths, getWhoBand, type GrowthMetric } from '../utils/whoGrowth'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 64
const CHART_HEIGHT = 180

// WHO 표 자체는 0~24개월. 차트 x축은 baby의 최근 측정 개월 + 여유 1개월까지로 동적 확장.
// 최소 12 (첫 돌까지는 항상 보임), 최대 24.
const MAX_REF_MONTH = 24
const MIN_REF_MONTH = 12

type Props = {
  baby: Baby
  weightRecs: GrowthRecord[]   // weightG != null only, 시간 오름차순
  heightRecs: GrowthRecord[]   // heightCm != null only, 시간 오름차순
}

/**
 * 체중·키 추이를 WHO P3/P50/P97 기준선과 함께 보여줌.
 * - x축: 개월. 최근 측정 개월 + 1까지 동적 확장 ([MIN_REF_MONTH, MAX_REF_MONTH] 클램프)
 * - 기록 1개만 있어도 점 + 기준선 보임
 * - 둘 다 데이터가 없으면 null
 */
export function GrowthChart({ baby, weightRecs, heightRecs }: Props) {
  const hasWeight = weightRecs.length >= 1
  const hasHeight = heightRecs.length >= 1
  if (!hasWeight && !hasHeight) return null

  return (
    <View style={styles.chartSection}>
      <Text style={styles.sectionTitle}>📈 성장 추이</Text>
      <Text style={styles.sectionHint}>
        가는 회색 선은 WHO 표준 P3 · P50(중앙값) · P97 기준이에요. 두 선 사이에 있으면 일반 범위.
      </Text>
      {hasWeight && (
        <MetricChart
          title="체중 (kg)"
          baby={baby}
          metric="weight"
          recs={weightRecs}
          valueOf={r => r.weightG! / 1000}
          decimals={1}
        />
      )}
      {hasHeight && (
        <MetricChart
          title="키 (cm)"
          baby={baby}
          metric="height"
          recs={heightRecs}
          valueOf={r => r.heightCm!}
          decimals={1}
        />
      )}
    </View>
  )
}

type MetricChartProps = {
  title: string
  baby: Baby
  metric: GrowthMetric
  recs: GrowthRecord[]
  valueOf: (r: GrowthRecord) => number
  decimals: number
}

function MetricChart({ title, baby, metric, recs, valueOf, decimals }: MetricChartProps) {
  // 백엔드 enum 외 값이 흘러와도 차트가 죽지 않도록 방어
  const gender: 'MALE' | 'FEMALE' = baby.gender === 'FEMALE' ? 'FEMALE' : 'MALE'

  // 아기 실측값을 개월별로 묶음 — 한 개월에 여러 기록이면 마지막값 사용
  // (재진료/병원·집 측정 등) 기록 자체는 리스트에 다 보이므로 차트는 latest only
  const byMonth = new Map<number, number>()
  for (const r of recs) {
    const m = ageInMonths(baby.birthDate, r.measuredAt)
    if (m >= 0 && m <= MAX_REF_MONTH) byMonth.set(m, valueOf(r))
  }

  // 차트 x축 범위 — 최근 측정 개월 + 1까지, 단 [MIN_REF_MONTH, MAX_REF_MONTH] 로 클램프
  const months = Array.from(byMonth.keys())
  const lastMeasured = months.length > 0 ? Math.max(...months) : 0
  const upper = Math.min(MAX_REF_MONTH, Math.max(MIN_REF_MONTH, lastMeasured + 1))
  const refMonths = Array.from({ length: upper + 1 }, (_, i) => i)

  const band = getWhoBand(gender, metric, refMonths)

  // chart-kit 은 null 점을 못 그리므로, 미측정 개월은 직전 값 유지 (계단형)
  // 첫 측정 전 구간은 P50으로 가려두고 점은 transparent
  const firstMeasured = months.length > 0 ? Math.min(...months) : Infinity
  let last: number | null = null
  const babyLine = refMonths.map(m => {
    if (m < firstMeasured) return band.p50[m]
    if (byMonth.has(m)) { last = byMonth.get(m)!; return last }
    return last ?? band.p50[m]
  })

  // 점 색상: 실측 개월만 primary, 나머지는 transparent
  const measuredSet = new Set(months)
  const dotColor = (_dataPoint: number, index: number) => {
    const m = refMonths[index]
    if (m == null || m < firstMeasured) return 'transparent'
    return measuredSet.has(m) ? COLORS.primary : 'transparent'
  }

  const chartConfig = {
    backgroundGradientFrom: NEUTRALS.white,
    backgroundGradientTo: NEUTRALS.white,
    color: (opacity = 1) => `rgba(255, 107, 157, ${opacity})`,   // 기본 — 실측 라인용
    labelColor: () => NEUTRALS.gray450,
    strokeWidth: 2.5,
    decimalPlaces: decimals,
    propsForBackgroundLines: { stroke: NEUTRALS.gray100, strokeDasharray: '4 6' },
  }

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartLabel}>{title}</Text>
        {/* 인라인 범례 — chart-kit 자동 legend는 폭/높이를 침범해서 직접 구성 */}
        <View style={styles.legendRow}>
          <LegendDot color="rgba(170,170,170,0.85)" label="P3" />
          <LegendDot color="rgba(80,80,80,0.85)" label="P50" />
          <LegendDot color="rgba(170,170,170,0.85)" label="P97" />
          <LegendDot color={COLORS.primary} label={baby.name} />
        </View>
      </View>
      <LineChart
        data={{
          // 라벨 밀도는 범위에 따라 조절 (13개월 이내는 3개월마다, 그 이상은 6개월마다)
          labels: refMonths.map(m => {
            const step = upper > 14 ? 6 : 3
            return m % step === 0 ? `${m}m` : ''
          }),
          datasets: [
            // P3 (하한)
            { data: band.p3,  color: () => 'rgba(170,170,170,0.55)', strokeWidth: 1, withDots: false },
            // P50 (중앙값)
            { data: band.p50, color: () => 'rgba(110,110,110,0.7)',  strokeWidth: 1, withDots: false },
            // P97 (상한)
            { data: band.p97, color: () => 'rgba(170,170,170,0.55)', strokeWidth: 1, withDots: false },
            // 우리 아기 실측
            { data: babyLine, color: (o = 1) => `rgba(255,107,157,${o})`, strokeWidth: 2.5 },
          ],
        }}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={chartConfig}
        style={styles.chart}
        fromZero={false}
        withInnerLines={false}
        getDotColor={dotColor}
        renderDotContent={() => null}
      />
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chartSection: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  sectionTitle: { fontSize: FONT.bodyMd, color: NEUTRALS.ink, fontWeight: '700' },
  sectionHint: { fontSize: FONT.caption, color: NEUTRALS.gray500, marginBottom: 4 },
  chartCard: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  chartHeader: { gap: 6 },
  chartLabel: { fontSize: FONT.label, color: NEUTRALS.gray500, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: FONT.caption, color: NEUTRALS.gray700, fontWeight: '600' },
  chart: { borderRadius: 8 },
})
