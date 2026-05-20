import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getDiapers, getFeeds, getSleepRecords } from '../api/babyLogApi'
import { WeeklyHeatmap } from './WeeklyHeatmap'
import { COLORS, FONT, NEUTRALS } from '../utils/constants'
import type { DiaperRecord, FeedRecord, SleepRecord } from '../types'

type Kind = 'feed' | 'sleep' | 'diaper'
const KINDS: { key: Kind; label: string; color: string }[] = [
  { key: 'feed', label: '수유', color: COLORS.primary },
  { key: 'sleep', label: '수면', color: COLORS.sleep },
  { key: 'diaper', label: '기저귀', color: COLORS.amber },
]
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function emptyGrid(): number[][] {
  return Array.from({ length: 7 }, () => new Array(24).fill(0))
}

/** Date → 그날 0시 epoch. */
function midnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** grid 인덱스(0=6일전, 6=오늘). 범위 밖이면 -1. */
function dayIndex(t: number, today0: number): number {
  const daysAgo = Math.round((today0 - midnight(new Date(t))) / 86_400_000)
  return daysAgo < 0 || daysAgo > 6 ? -1 : 6 - daysAgo
}

/** 시점 이벤트(수유·기저귀) → 격자. */
function pointGrid(times: string[]): number[][] {
  const grid = emptyGrid()
  const today0 = midnight(new Date())
  times.forEach(iso => {
    const t = new Date(iso)
    const di = dayIndex(t.getTime(), today0)
    if (di >= 0) grid[di][t.getHours()] += 1
  })
  return grid
}

/** 구간 이벤트(수면) → 격자. 자던 시간 슬롯을 모두 채운다. */
function spanGrid(spans: { sleptAt: string; wokeAt: string | null }[]): number[][] {
  const grid = emptyGrid()
  const today0 = midnight(new Date())
  const now = Date.now()
  spans.forEach(s => {
    const start = new Date(s.sleptAt).getTime()
    const end = s.wokeAt ? new Date(s.wokeAt).getTime() : now
    for (let t = start; t < end; t += 3_600_000) {
      const d = new Date(t)
      const di = dayIndex(t, today0)
      if (di >= 0) grid[di][d.getHours()] += 1
    }
  })
  return grid
}

/**
 * 통계 탭 — 최근 7일 활동 패턴 히트맵.
 * 종류(수유/수면/기저귀)를 라디오로 전환. babyId 만 받는다.
 */
export function WeeklyHeatmapSection({ babyId }: { babyId: string | null }) {
  const [kind, setKind] = useState<Kind>('feed')
  const [feeds, setFeeds] = useState<FeedRecord[]>([])
  const [diapers, setDiapers] = useState<DiaperRecord[]>([])
  const [sleeps, setSleeps] = useState<SleepRecord[]>([])

  useEffect(() => {
    if (!babyId) return
    let alive = true
    Promise.allSettled([
      getFeeds(babyId, 300),
      getDiapers(babyId, 300),
      getSleepRecords(babyId, 300),
    ]).then(([f, d, s]) => {
      if (!alive) return
      if (f.status === 'fulfilled') setFeeds(f.value)
      if (d.status === 'fulfilled') setDiapers(d.value)
      if (s.status === 'fulfilled') setSleeps(s.value)
    })
    return () => { alive = false }
  }, [babyId])

  const grid = useMemo(() => {
    if (kind === 'feed') return pointGrid(feeds.map(f => f.fedAt))
    if (kind === 'diaper') return pointGrid(diapers.map(d => d.changedAt))
    return spanGrid(sleeps.map(s => ({ sleptAt: s.sleptAt, wokeAt: s.wokeAt })))
  }, [kind, feeds, diapers, sleeps])

  const dayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return WEEKDAYS[d.getDay()]
    }),
    [],
  )

  const activeColor = KINDS.find(k => k.key === kind)!.color

  return (
    <View style={styles.card}>
      <Text style={styles.title}>주간 패턴</Text>

      {/* 종류 라디오 */}
      <View style={styles.toggleRow}>
        {KINDS.map(({ key, label, color }) => {
          const on = kind === key
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, { borderColor: color }, on && { backgroundColor: color }]}
              onPress={() => setKind(key)}
              hitSlop={6}
            >
              <Text style={[styles.chipText, { color: on ? NEUTRALS.white : color }]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <WeeklyHeatmap grid={grid} dayLabels={dayLabels} color={activeColor} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  title: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  toggleRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  chipText: { fontSize: FONT.label, fontWeight: '700' },
})
