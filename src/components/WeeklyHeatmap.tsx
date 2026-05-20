import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { FONT, NEUTRALS } from '../utils/constants'

/**
 * 주간 패턴 히트맵 — 7일(행) × 24시간(열) 격자.
 * 각 셀의 색 농도가 그 요일·시간대 활동 빈도를 나타낸다.
 */
type Props = {
  grid: number[][]      // [7][24] — grid[0] = 6일 전, grid[6] = 오늘
  dayLabels: string[]   // 7개 (요일 또는 날짜)
  color: string         // 선택된 종류 색
}

const HOUR_TICKS = [0, 6, 12, 18]

export function WeeklyHeatmap({ grid, dayLabels, color }: Props) {
  const max = Math.max(1, ...grid.flat())

  return (
    <View style={styles.wrap}>
      {grid.map((row, d) => (
        <View key={d} style={styles.row}>
          <Text style={styles.dayLabel}>{dayLabels[d]}</Text>
          <View style={styles.cells}>
            {row.map((count, h) => (
              <View
                key={h}
                style={[
                  styles.cell,
                  count === 0
                    ? { backgroundColor: NEUTRALS.gray100 }
                    : { backgroundColor: color, opacity: 0.3 + 0.7 * (count / max) },
                ]}
              />
            ))}
          </View>
        </View>
      ))}

      {/* 시간 라벨 */}
      <View style={styles.hourRow}>
        <View style={styles.dayLabelSpacer} />
        <View style={styles.cells}>
          {Array.from({ length: 24 }).map((_, h) => (
            <View key={h} style={styles.hourCell}>
              {HOUR_TICKS.includes(h) ? <Text style={styles.hourText}>{h}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 3, alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayLabel: {
    width: 22,
    fontSize: FONT.micro,
    fontWeight: '700',
    color: NEUTRALS.gray500,
    textAlign: 'center',
  },
  dayLabelSpacer: { width: 22 },
  cells: { flex: 1, flexDirection: 'row', gap: 1 },
  cell: { flex: 1, height: 16, borderRadius: 2 },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  hourCell: { flex: 1, alignItems: 'center' },
  hourText: { fontSize: 8, color: NEUTRALS.gray400, fontWeight: '600' },
})
