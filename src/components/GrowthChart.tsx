import React from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { COLORS, NEUTRALS } from '../utils/constants'
import type { GrowthRecord } from '../types'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 64

const WEIGHT_CHART_CONFIG = {
  backgroundGradientFrom: NEUTRALS.white,
  backgroundGradientTo: NEUTRALS.white,
  color: (opacity = 1) => `rgba(255, 107, 157, ${opacity})`,
  labelColor: () => NEUTRALS.gray450,
  strokeWidth: 2,
  decimalPlaces: 1,
  propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary },
}

const HEIGHT_CHART_CONFIG = {
  ...WEIGHT_CHART_CONFIG,
  color: (opacity = 1) => `rgba(92, 107, 192, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.sleep },
}

type Props = {
  weightRecs: GrowthRecord[]   // weightG != null only, 시간 오름차순
  heightRecs: GrowthRecord[]   // heightCm != null only, 시간 오름차순
  dateLabel: (iso: string) => string
}

/**
 * 체중·키 추이 LineChart 묶음.
 * 각 시리즈가 2개 미만이면 해당 차트는 렌더링하지 않음 (chart-kit이 1점만으론 그릴 게 없음).
 * 둘 다 없으면 null 반환.
 */
export function GrowthChart({ weightRecs, heightRecs, dateLabel }: Props) {
  const showWeight = weightRecs.length >= 2
  const showHeight = heightRecs.length >= 2
  if (!showWeight && !showHeight) return null

  return (
    <View style={styles.chartSection}>
      {showWeight && (
        <View style={styles.chartCard}>
          <Text style={styles.chartLabel}>체중 추이 (kg)</Text>
          <LineChart
            data={{
              labels: weightRecs.map(r => dateLabel(r.measuredAt)),
              datasets: [{ data: weightRecs.map(r => Math.round(r.weightG! / 100) / 10) }],
            }}
            width={CHART_WIDTH}
            height={140}
            chartConfig={WEIGHT_CHART_CONFIG}
            style={styles.chart}
            bezier
            fromZero={false}
          />
        </View>
      )}
      {showHeight && (
        <View style={styles.chartCard}>
          <Text style={styles.chartLabel}>키 추이 (cm)</Text>
          <LineChart
            data={{
              labels: heightRecs.map(r => dateLabel(r.measuredAt)),
              datasets: [{ data: heightRecs.map(r => r.heightCm!) }],
            }}
            width={CHART_WIDTH}
            height={140}
            chartConfig={HEIGHT_CHART_CONFIG}
            style={styles.chart}
            bezier
            fromZero={false}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chartSection: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
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
  chartLabel: { fontSize: 12, color: NEUTRALS.gray500, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chart: { borderRadius: 8 },
})
