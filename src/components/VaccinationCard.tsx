import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Vaccine = {
  name: string
  doses: { label: string; minDays: number; maxDays: number }[]
}

const VACCINES: Vaccine[] = [
  {
    name: 'B형간염',
    doses: [
      { label: '1차', minDays: 0, maxDays: 28 },
      { label: '2차', minDays: 30, maxDays: 60 },
      { label: '3차', minDays: 150, maxDays: 210 },
    ],
  },
  {
    name: 'BCG (결핵)',
    doses: [{ label: '1차', minDays: 0, maxDays: 28 }],
  },
  {
    name: 'DTaP (디프테리아/파상풍/백일해)',
    doses: [
      { label: '1차', minDays: 60, maxDays: 90 },
      { label: '2차', minDays: 120, maxDays: 150 },
      { label: '3차', minDays: 180, maxDays: 210 },
      { label: '추가', minDays: 450, maxDays: 540 },
    ],
  },
  {
    name: '폴리오',
    doses: [
      { label: '1차', minDays: 60, maxDays: 90 },
      { label: '2차', minDays: 120, maxDays: 150 },
      { label: '3차', minDays: 180, maxDays: 540 },
    ],
  },
  {
    name: 'Hib (뇌수막염)',
    doses: [
      { label: '1차', minDays: 60, maxDays: 90 },
      { label: '2차', minDays: 120, maxDays: 150 },
      { label: '3차', minDays: 180, maxDays: 210 },
      { label: '추가', minDays: 360, maxDays: 450 },
    ],
  },
  {
    name: '폐구균',
    doses: [
      { label: '1차', minDays: 60, maxDays: 90 },
      { label: '2차', minDays: 120, maxDays: 150 },
      { label: '3차', minDays: 180, maxDays: 210 },
      { label: '추가', minDays: 360, maxDays: 450 },
    ],
  },
  {
    name: 'MMR (홍역/볼거리/풍진)',
    doses: [
      { label: '1차', minDays: 360, maxDays: 450 },
      { label: '2차', minDays: 1620, maxDays: 1800 },
    ],
  },
  {
    name: '수두',
    doses: [{ label: '1차', minDays: 360, maxDays: 450 }],
  },
  {
    name: 'A형간염',
    doses: [
      { label: '1차', minDays: 360, maxDays: 690 },
      { label: '2차', minDays: 540, maxDays: 900 },
    ],
  },
]

type DoseStatus = 'done' | 'upcoming' | 'soon' | 'future'

function doseStatus(daysOld: number, minDays: number, maxDays: number): DoseStatus {
  if (daysOld > maxDays) return 'done'
  if (daysOld >= minDays) return 'soon'
  if (minDays - daysOld <= 30) return 'upcoming'
  return 'future'
}

const STATUS_COLOR: Record<DoseStatus, string> = {
  done: '#E0E0E0',
  upcoming: '#FFB74D',
  soon: '#FF6B9D',
  future: '#f5f5f5',
}
const STATUS_TEXT_COLOR: Record<DoseStatus, string> = {
  done: '#aaa',
  upcoming: '#FF8F00',
  soon: '#fff',
  future: '#ccc',
}
const STATUS_LABEL: Record<DoseStatus, string> = {
  done: '완료',
  upcoming: '곧',
  soon: '지금',
  future: '-',
}

type Props = { daysOld: number; birthDate: string }

export default function VaccinationCard({ daysOld, birthDate }: Props) {
  const [expanded, setExpanded] = useState(false)

  const birth = new Date(birthDate)
  const toDate = (days: number) => {
    const d = new Date(birth)
    d.setDate(d.getDate() + days)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  // 다음 접종 (soon or upcoming) 찾기
  const nextItems: { vaccine: string; dose: string; date: string; status: DoseStatus }[] = []
  for (const v of VACCINES) {
    for (const d of v.doses) {
      const st = doseStatus(daysOld, d.minDays, d.maxDays)
      if (st === 'soon' || st === 'upcoming') {
        nextItems.push({ vaccine: v.name, dose: d.label, date: toDate(d.minDays), status: st })
      }
    }
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <View>
          <Text style={styles.title}>💉 예방접종 일정</Text>
          {nextItems.length > 0 && (
            <Text style={styles.nextHint}>
              다음: {nextItems[0].vaccine} {nextItems[0].dose} ({nextItems[0].date})
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.list}>
          {VACCINES.map(v => (
            <View key={v.name} style={styles.vaccineRow}>
              <Text style={styles.vaccineName}>{v.name}</Text>
              <View style={styles.doseRow}>
                {v.doses.map(d => {
                  const st = doseStatus(daysOld, d.minDays, d.maxDays)
                  return (
                    <View key={d.label} style={[styles.doseBadge, { backgroundColor: STATUS_COLOR[st] }]}>
                      <Text style={[styles.doseBadgeLabel, { color: STATUS_TEXT_COLOR[st] }]}>
                        {d.label}
                      </Text>
                      <Text style={[styles.doseBadgeStatus, { color: STATUS_TEXT_COLOR[st] }]}>
                        {st === 'done' ? '✓' : st === 'future' ? toDate(d.minDays) : STATUS_LABEL[st]}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
          <Text style={styles.disclaimer}>* 정확한 접종 일정은 소아과에서 확인하세요</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  nextHint: { fontSize: 12, color: '#FF6B9D', marginTop: 2 },
  chevron: { fontSize: 12, color: '#bbb' },
  list: { gap: 12 },
  vaccineRow: { gap: 6 },
  vaccineName: { fontSize: 12, fontWeight: '600', color: '#555' },
  doseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  doseBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', minWidth: 44 },
  doseBadgeLabel: { fontSize: 10, fontWeight: '700' },
  doseBadgeStatus: { fontSize: 10 },
  disclaimer: { fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 4 },
})
