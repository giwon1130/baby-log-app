import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import TimeOffsetPicker from './TimeOffsetPicker'
import { DIAPER_TYPE_LABEL } from '../utils/constants'
import type { DiaperRecord } from '../types'

const DIAPER_TYPES = ['WET', 'DIRTY', 'MIXED', 'DRY'] as const

type Props = {
  record: DiaperRecord | null
  onClose: () => void
  onSave: (id: string, diaperType: string, note: string, changedAt: string) => Promise<void>
}

export default function EditDiaperModal({ record, onClose, onSave }: Props) {
  const [diaperType, setDiaperType] = useState('WET')
  const [note, setNote] = useState('')
  const [changedAt, setChangedAt] = useState(new Date())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (record) {
      setDiaperType(record.diaperType)
      setNote(record.note)
      setChangedAt(new Date(record.changedAt))
    }
  }, [record])

  const handleSave = async () => {
    if (!record) return
    setSaving(true)
    try {
      await onSave(record.id, diaperType, note, changedAt.toISOString())
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
          <Text style={styles.title}>기저귀 기록 수정</Text>

          <Text style={styles.label}>종류</Text>
          <View style={styles.typeGrid}>
            {DIAPER_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, diaperType === t && styles.typeChipActive]}
                onPress={() => setDiaperType(t)}
              >
                <Text style={[styles.typeChipText, diaperType === t && styles.typeChipTextActive]}>
                  {DIAPER_TYPE_LABEL[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="메모 (선택)"
            value={note}
            onChangeText={setNote}
          />

          <Text style={styles.label}>교환 시각</Text>
          <TimeOffsetPicker value={changedAt} onChange={setChangedAt} />

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
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flex: 1, minWidth: '45%', paddingVertical: 12,
    borderRadius: 12, backgroundColor: '#f5f5f5', alignItems: 'center',
  },
  typeChipActive: { backgroundColor: '#FF6B9D' },
  typeChipText: { fontSize: 14, color: '#555', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
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
