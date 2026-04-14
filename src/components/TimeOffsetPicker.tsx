import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

const PRESETS = [
  { label: '지금', minutes: 0 },
  { label: '10분 전', minutes: 10 },
  { label: '30분 전', minutes: 30 },
  { label: '1시간 전', minutes: 60 },
]

type Props = {
  value: Date  // 선택된 기록 시각
  onChange: (date: Date) => void
}

export function offsetDate(minutesAgo: number): Date {
  return new Date(Date.now() - minutesAgo * 60 * 1000)
}

export default function TimeOffsetPicker({ value, onChange }: Props) {
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const minutesAgo = Math.round((Date.now() - value.getTime()) / 60000)

  const selectedPreset = PRESETS.find(p => Math.abs(p.minutes - minutesAgo) <= 1)

  const handlePreset = (mins: number) => {
    setShowCustom(false)
    setCustomInput('')
    onChange(offsetDate(mins))
  }

  const handleCustomSubmit = () => {
    const mins = parseInt(customInput)
    if (!isNaN(mins) && mins >= 0) {
      onChange(offsetDate(mins))
      setShowCustom(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>기록 시각</Text>
      <View style={styles.row}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p.minutes}
            style={[styles.chip, !showCustom && selectedPreset?.minutes === p.minutes && styles.chipActive]}
            onPress={() => handlePreset(p.minutes)}
          >
            <Text style={[styles.chipText, !showCustom && selectedPreset?.minutes === p.minutes && styles.chipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, showCustom && styles.chipActive]}
          onPress={() => setShowCustom(v => !v)}
        >
          <Text style={[styles.chipText, showCustom && styles.chipTextActive]}>직접</Text>
        </TouchableOpacity>
      </View>
      {showCustom && (
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            placeholder="분 전"
            value={customInput}
            onChangeText={setCustomInput}
            keyboardType="number-pad"
            autoFocus
            onSubmitEditing={handleCustomSubmit}
          />
          <TouchableOpacity style={styles.customBtn} onPress={handleCustomSubmit}>
            <Text style={styles.customBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      )}
      {minutesAgo > 0 && (
        <Text style={styles.preview}>
          {minutesAgo < 60
            ? `${minutesAgo}분 전 기록`
            : `${Math.floor(minutesAgo / 60)}시간 ${minutesAgo % 60}분 전 기록`}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 12, color: '#888', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  chipActive: { backgroundColor: '#FF6B9D' },
  chipText: { fontSize: 12, color: '#555', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
  },
  customBtn: {
    backgroundColor: '#FF6B9D',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  customBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  preview: { fontSize: 11, color: '#FF6B9D', fontWeight: '600' },
})
