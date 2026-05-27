import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { Baby } from '../../types'
import { COLORS, FONT, NEUTRALS } from '../../utils/constants'

type SaveInput = {
  name?: string
  birthWeightG?: number
  birthHeightCm?: number
}

type Props = {
  baby: Baby
  saving: boolean
  onSave: (input: SaveInput) => void
  onCancel: () => void
}

/**
 * 아기 프로필 인라인 편집 폼 — 이름 / 출생 체중 / 출생 신장.
 * 초기값은 baby prop 에서, 저장 시 부분 update payload 만 부모에 전달.
 */
export default function BabyEditForm({ baby, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(baby.name)
  const [weightG, setWeightG] = useState(baby.birthWeightG ? String(baby.birthWeightG) : '')
  const [heightCm, setHeightCm] = useState(baby.birthHeightCm ? String(baby.birthHeightCm) : '')

  const handleSave = () => {
    onSave({
      name: name || undefined,
      birthWeightG: weightG ? parseInt(weightG) : undefined,
      birthHeightCm: heightCm ? parseFloat(heightCm) : undefined,
    })
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>이름</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="아기 이름"
        accessibilityLabel="아기 이름"
      />
      <Text style={styles.label}>출생 체중 (g)</Text>
      <TextInput
        style={styles.input}
        value={weightG}
        onChangeText={setWeightG}
        keyboardType="number-pad"
        placeholder="예: 3500"
        accessibilityLabel="출생 체중 (g)"
      />
      <Text style={styles.label}>출생 신장 (cm)</Text>
      <TextInput
        style={styles.input}
        value={heightCm}
        onChangeText={setHeightCm}
        keyboardType="decimal-pad"
        placeholder="예: 50.5"
        accessibilityLabel="출생 신장 (cm)"
      />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  label: { fontSize: FONT.caption, color: NEUTRALS.gray600, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: NEUTRALS.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONT.bodyMd,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: NEUTRALS.gray50,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: FONT.bodyMd, color: NEUTRALS.gray700, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: COLORS.primaryDisabled },
  saveBtnText: { fontSize: FONT.bodyMd, color: NEUTRALS.white, fontWeight: '700' },
})
