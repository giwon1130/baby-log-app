import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export type DateFilterValue = 'today' | 'yesterday' | 'all'

const OPTIONS: { label: string; value: DateFilterValue }[] = [
  { label: '오늘', value: 'today' },
  { label: '어제', value: 'yesterday' },
  { label: '전체', value: 'all' },
]

export function toDateParam(filter: DateFilterValue): string | undefined {
  const today = new Date()
  if (filter === 'today') {
    return today.toISOString().slice(0, 10)
  }
  if (filter === 'yesterday') {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  return undefined
}

type Props = {
  value: DateFilterValue
  onChange: (v: DateFilterValue) => void
}

export default function DateFilter({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, value === opt.value && styles.chipActive]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  chipActive: { backgroundColor: '#FF6B9D' },
  chipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
})
