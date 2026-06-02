import React from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { Baby } from '../../types'
import { COLORS, NEUTRALS, FONT } from '../../utils/constants'

type Props = {
  visible: boolean
  babies: Baby[]
  selectedId: string | null
  onSelect: (baby: Baby) => void
  onAddBaby: () => void
  onClose: () => void
}

/**
 * 홈에서 여러 아기를 빠르게 전환하는 바텀시트.
 * 아기 탭으로 들어가지 않고도 한 번에 전환 — 둘째 출산 가족 대응.
 */
export default function BabySwitcherSheet({
  visible, babies, selectedId, onSelect, onAddBaby, onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>아기 전환</Text>

        {babies.map(baby => {
          const active = baby.id === selectedId
          return (
            <TouchableOpacity
              key={baby.id}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => onSelect(baby)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.emoji}>{baby.gender === 'MALE' ? '👦' : '👧'}</Text>
              <View style={styles.info}>
                <Text style={[styles.name, active && styles.nameActive]}>{baby.name}</Text>
                <Text style={styles.meta}>D+{baby.daysOld}일</Text>
              </View>
              {active && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          )
        })}

        <TouchableOpacity style={styles.addRow} onPress={onAddBaby} accessibilityRole="button">
          <Text style={styles.addText}>+ 아기 추가</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: NEUTRALS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: NEUTRALS.gray200,
    marginBottom: 8,
  },
  title: { fontSize: FONT.h4, fontWeight: '800', color: NEUTRALS.ink, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: NEUTRALS.gray50,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowActive: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primary },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  name: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  nameActive: { color: COLORS.primary },
  meta: { fontSize: FONT.label, color: NEUTRALS.gray450, marginTop: 2 },
  check: { fontSize: FONT.h4, fontWeight: '800', color: COLORS.primary },
  addRow: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    marginTop: 4,
  },
  addText: { fontSize: FONT.bodyMd, color: COLORS.primary, fontWeight: '600' },
})
