import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import TimeOffsetPicker from './TimeOffsetPicker'
import type { SleepRecord } from '../types'

type Props = {
  record: SleepRecord | null
  onClose: () => void
  onSave: (id: string, sleptAt: string, wokeAt: string | null, note: string) => Promise<void>
}

export default function EditSleepModal({ record, onClose, onSave }: Props) {
  const [sleptAt, setSleptAt] = useState(new Date())
  const [wokeAt, setWokeAt] = useState<Date | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (record) {
      setSleptAt(new Date(record.sleptAt))
      setWokeAt(record.wokeAt ? new Date(record.wokeAt) : null)
      setNote(record.note ?? '')
    }
  }, [record])

  const handleSave = async () => {
    if (!record) return
    setSaving(true)
    try {
      await onSave(record.id, sleptAt.toISOString(), wokeAt ? wokeAt.toISOString() : null, note)
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
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>수면 기록 수정</Text>

            <Text style={styles.label}>잠든 시각</Text>
            <TimeOffsetPicker value={sleptAt} onChange={setSleptAt} />

            {wokeAt && (
              <>
                <Text style={[styles.label, { marginTop: 6 }]}>깬 시각</Text>
                <TimeOffsetPicker value={wokeAt} onChange={setWokeAt} />
              </>
            )}

            <TextInput
              style={[styles.input, { marginTop: 8 }]}
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
          </ScrollView>
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
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelButton: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center',
  },
  cancelButtonText: { color: '#888', fontWeight: '600', fontSize: 15 },
  saveButton: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#5C6BC0', alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#9fa8da' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
