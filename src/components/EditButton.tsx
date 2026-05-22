import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NEUTRALS, SPACING } from '../utils/constants'

type Props = {
  onPress: () => void
}

/**
 * 기록 행에 붙는 명시적 수정 버튼.
 * 기존엔 long-press 로만 수정 진입이 가능해 발견성이 낮았음 — 연필 아이콘으로 노출.
 */
export default function EditButton({ onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="기록 수정"
      style={styles.btn}
    >
      <Ionicons name="pencil" size={15} color={NEUTRALS.gray450} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: { padding: SPACING.xs },
})
