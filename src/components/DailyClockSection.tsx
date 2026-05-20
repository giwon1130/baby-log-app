import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getDiapers, getFeeds, getSleepRecords } from '../api/babyLogApi'
import { DailyClockChart } from './DailyClockChart'
import { COLORS, FONT, NEUTRALS } from '../utils/constants'
import type { DiaperRecord, FeedRecord, SleepRecord } from '../types'

/** Date → 'YYYY-MM-DD' (로컬 기준). */
function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateLabel(dateStr: string): string {
  const today = toDateStr(new Date())
  if (dateStr === today) return '오늘'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (dateStr === toDateStr(y)) return '어제'
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

type Kind = 'feed' | 'sleep' | 'diaper'
const KINDS: { key: Kind; label: string; color: string }[] = [
  { key: 'feed', label: '수유', color: COLORS.primary },
  { key: 'sleep', label: '수면', color: COLORS.sleep },
  { key: 'diaper', label: '기저귀', color: COLORS.amber },
]

/**
 * 통계 탭 상단 — 하루 24시간 원형 리듬 차트.
 * 날짜 이동(◀▶) + 종류별 표시 토글을 자체 관리. babyId 만 받는다.
 */
export function DailyClockSection({ babyId }: { babyId: string | null }) {
  const [date, setDate] = useState(() => toDateStr(new Date()))
  const [feeds, setFeeds] = useState<FeedRecord[]>([])
  const [diapers, setDiapers] = useState<DiaperRecord[]>([])
  const [sleeps, setSleeps] = useState<SleepRecord[]>([])
  const [show, setShow] = useState<Record<Kind, boolean>>({ feed: true, sleep: true, diaper: true })

  useEffect(() => {
    if (!babyId) return
    let alive = true
    Promise.allSettled([
      getFeeds(babyId, 100, date),
      getDiapers(babyId, 100, date),
      getSleepRecords(babyId, 100, date),
    ]).then(([f, d, s]) => {
      if (!alive) return
      if (f.status === 'fulfilled') setFeeds(f.value)
      if (d.status === 'fulfilled') setDiapers(d.value)
      if (s.status === 'fulfilled') setSleeps(s.value)
    })
    return () => { alive = false }
  }, [babyId, date])

  const isToday = useMemo(() => date === toDateStr(new Date()), [date])

  const shiftDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    const next = toDateStr(d)
    if (next > toDateStr(new Date())) return // 미래 막기
    setDate(next)
  }

  return (
    <View style={styles.card}>
      {/* 날짜 네비게이션 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => shiftDate(-1)} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={NEUTRALS.gray600} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{dateLabel(date)}의 리듬</Text>
        <TouchableOpacity
          onPress={() => shiftDate(1)}
          hitSlop={10}
          style={styles.navBtn}
          disabled={isToday}
        >
          <Ionicons name="chevron-forward" size={18} color={isToday ? NEUTRALS.gray200 : NEUTRALS.gray600} />
        </TouchableOpacity>
      </View>

      <DailyClockChart date={date} feeds={feeds} diapers={diapers} sleeps={sleeps} show={show} />

      {/* 종류 토글 (범례 겸용) */}
      <View style={styles.toggleRow}>
        {KINDS.map(({ key, label, color }) => {
          const on = show[key]
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, { borderColor: color }, on && { backgroundColor: color }]}
              onPress={() => setShow(prev => ({ ...prev, [key]: !prev[key] }))}
              hitSlop={6}
            >
              <View style={[styles.dot, { backgroundColor: on ? NEUTRALS.white : color }]} />
              <Text style={[styles.chipText, { color: on ? NEUTRALS.white : color }]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  navBtn: { padding: 4 },
  dateText: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  toggleRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: FONT.label, fontWeight: '700' },
})
