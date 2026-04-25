import React from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { CryLabel } from '../../types'
import { LABEL_OPTIONS } from '../../utils/cryFeatures'

/** Bottom-sheet modal where the parent picks the actual cry reason. */
export function CorrectionModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean
  onClose: () => void
  onPick: (label: CryLabel) => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>실제 이유는 뭐였나요?</Text>
          <Text style={styles.sub}>알려주시면 다음 분석에 반영됩니다</Text>
          {LABEL_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.option}
              onPress={() => onPick(opt.value)}
            >
              <Ionicons name={opt.icon} size={20} color="#FF6B9D" />
              <Text style={styles.optionText}>{opt.display}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 4,
    paddingBottom: 36,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#222' },
  sub: { fontSize: 13, color: '#888', marginBottom: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  optionText: { flex: 1, fontSize: 16, color: '#222' },
})
