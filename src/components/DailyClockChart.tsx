import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg'
import { COLORS, NEUTRALS } from '../utils/constants'

/**
 * 24시간 원형 클락 차트.
 * 자정(0시)이 12시 방향, 시계방향으로 하루가 흐른다.
 * - 수유 / 기저귀: 시각에 점
 * - 수면: 잠든~깬 구간을 호(arc)로
 * 깬 시각이 다음 날이면 24:00 로 클램프해 그날 분량만 표시.
 */

const SIZE = 240
const CENTER = SIZE / 2
const R_SLEEP = 92    // 수면 호 반지름
const R_FEED = 92     // 수유 점 (호와 같은 링, 점이라 겹쳐도 무방)
const R_DIAPER = 72   // 기저귀 점 (안쪽 링)
const R_LABEL = 78    // 0/6/12/18 라벨 — 눈금 바깥, 트랙 안쪽
const SLEEP_WIDTH = 13

type FeedPoint = { fedAt: string }
type DiaperPoint = { changedAt: string }
type SleepSpan = { sleptAt: string; wokeAt: string | null }

type Props = {
  date: string                    // 'YYYY-MM-DD' — 차트가 그리는 하루
  feeds: FeedPoint[]
  diapers: DiaperPoint[]
  sleeps: SleepSpan[]
  show: { feed: boolean; sleep: boolean; diaper: boolean }
}

/** 그날 0시 기준 경과 시간(0~24) → SVG 각도(deg). 자정을 12시 방향(-90°)에. */
function hoursToAngle(h: number): number {
  return (h / 24) * 360 - 90
}

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

/** ISO 시각을 해당 날짜 0시 기준 경과 시간(h)으로. 다른 날이면 null. */
function hoursWithinDay(iso: string, dayStart: number, dayEnd: number): number | null {
  const t = new Date(iso).getTime()
  if (t < dayStart || t >= dayEnd) return null
  return (t - dayStart) / 3_600_000
}

function arcPath(startH: number, endH: number, r: number): string {
  const s = polar(hoursToAngle(startH), r)
  const e = polar(hoursToAngle(endH), r)
  const largeArc = endH - startH > 12 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

export function DailyClockChart({ date, feeds, diapers, sleeps, show }: Props) {
  const { dayStart, dayEnd } = useMemo(() => {
    const start = new Date(`${date}T00:00:00`).getTime()
    return { dayStart: start, dayEnd: start + 86_400_000 }
  }, [date])

  const feedHours = useMemo(
    () => feeds.map(f => hoursWithinDay(f.fedAt, dayStart, dayEnd)).filter((h): h is number => h != null),
    [feeds, dayStart, dayEnd],
  )
  const diaperHours = useMemo(
    () => diapers.map(d => hoursWithinDay(d.changedAt, dayStart, dayEnd)).filter((h): h is number => h != null),
    [diapers, dayStart, dayEnd],
  )
  const sleepSpans = useMemo(
    () => sleeps
      .map(s => {
        const start = hoursWithinDay(s.sleptAt, dayStart, dayEnd)
        if (start == null) return null
        // 깬 시각: 없거나 다음 날이면 24:00 으로 클램프
        let end = s.wokeAt ? hoursWithinDay(s.wokeAt, dayStart, dayEnd) : null
        if (end == null) end = 24
        if (end <= start) end = Math.min(start + 0.25, 24)  // 최소 호 폭
        return { start, end }
      })
      .filter((s): s is { start: number; end: number } => s != null),
    [sleeps, dayStart, dayEnd],
  )

  const ticks = [0, 6, 12, 18]

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* 배경 트랙 */}
        <Circle cx={CENTER} cy={CENTER} r={R_SLEEP} fill="none" stroke={NEUTRALS.gray100} strokeWidth={SLEEP_WIDTH} />

        {/* 1시간 눈금 */}
        <G>
          {Array.from({ length: 24 }).map((_, h) => {
            const major = h % 6 === 0
            const outer = polar(hoursToAngle(h), R_DIAPER - 8)
            const inner = polar(hoursToAngle(h), R_DIAPER - (major ? 16 : 12))
            return (
              <Line
                key={h}
                x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke={major ? NEUTRALS.gray400 : NEUTRALS.gray200}
                strokeWidth={major ? 2 : 1}
              />
            )
          })}
        </G>

        {/* 0/6/12/18 라벨 — 눈금과 트랙 사이 */}
        <G>
          {ticks.map(h => {
            const p = polar(hoursToAngle(h), R_LABEL)
            return (
              <SvgText
                key={h}
                x={p.x} y={p.y + 4}
                fontSize={11} fontWeight="700"
                fill={NEUTRALS.gray500}
                textAnchor="middle"
              >
                {h}
              </SvgText>
            )
          })}
        </G>

        {/* 수면 호 */}
        {show.sleep && sleepSpans.map((s, i) => (
          <Path
            key={`sleep-${i}`}
            d={arcPath(s.start, s.end, R_SLEEP)}
            stroke={COLORS.sleep}
            strokeWidth={SLEEP_WIDTH}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
        ))}

        {/* 수유 점 */}
        {show.feed && feedHours.map((h, i) => {
          const p = polar(hoursToAngle(h), R_FEED)
          return <Circle key={`feed-${i}`} cx={p.x} cy={p.y} r={5} fill={COLORS.primary} stroke={NEUTRALS.white} strokeWidth={1.5} />
        })}

        {/* 기저귀 점 */}
        {show.diaper && diaperHours.map((h, i) => {
          const p = polar(hoursToAngle(h), R_DIAPER)
          return <Circle key={`diaper-${i}`} cx={p.x} cy={p.y} r={4.5} fill={COLORS.amber} stroke={NEUTRALS.white} strokeWidth={1.5} />
        })}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
})
