import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import type { GrowthRecord } from '../types'

type Props = {
  record: GrowthRecord | null
  onClose: () => void
  onSave: (id: string, data: { weightG?: number; heightCm?: number; headCm?: number; note?: string }) => Promise<void>
}

export default function EditGrowthModal({ record, onClose, onSave }: Props) {
  const [weightG, setWeightG] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [headCm, setHeadCm] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (record) {
      setWeightG(record.weightG != null ? String(record.weightG) : '')
      setHeightCm(record.heightCm != null ? String(record.heightCm) : '')
      setHeadCm(record.headCm != null ? String(record.headCm) : '')
      setNote(record.note ?? '')
    }
  }, [record])

  const handleSave = async () => {
    if (!record) return
    setSaving(true)
    try {
      await onSave(record.id, {
        weightG: weightG ? parseInt(weightG) : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        headCm: headCm ? parseFloat(headCm) : undefined,
        note: note || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={!!record} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>성장 기록 수정</Text>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>체중 (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 3500"
                value={weightG}
                onChangeText={setWeightG}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>키 (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 52.5"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>머리 둘레 (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 34.0"
            value={headCm}
            onChangeText={setHeadCm}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="메모 (선택)"
            value={note}
            onChangeText={setNote}
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? '저장 중...' : '저장'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  label: { fontSize: 12, color: '#888', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, gap: 4 },
  input: {
    borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelButton: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center',
  },
  cancelButtonText: { color: '#888', fontWeight: '600', fontSize: 15 },
  saveButton: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#FF6B9D', alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#ffb3cc' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
