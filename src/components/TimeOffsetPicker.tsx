import React, { useState } from 'react'
import { COLORS, NEUTRALS, FONT } from '../utils/constants'
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
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`기록 시각 ${p.label}`}
          >
            <Text style={[styles.chipText, !showCustom && selectedPreset?.minutes === p.minutes && styles.chipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, showCustom && styles.chipActive]}
          onPress={() => setShowCustom(v => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="기록 시각 직접 입력"
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
            accessibilityLabel="몇 분 전 기록인지 입력"
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
  label: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: NEUTRALS.gray50,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: FONT.label, color: NEUTRALS.gray700, fontWeight: '600' },
  chipTextActive: { color: NEUTRALS.white },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: NEUTRALS.gray200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: FONT.bodyMd,
  },
  customBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  customBtnText: { color: NEUTRALS.white, fontWeight: '600', fontSize: FONT.bodySm },
  preview: { fontSize: FONT.caption, color: COLORS.primary, fontWeight: '600' },
})
