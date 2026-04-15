import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import TimeOffsetPicker from './TimeOffsetPicker'
import type { FeedRecord } from '../types'

const FEED_TYPES = ['FORMULA', 'BREAST', 'MIXED'] as const
const FEED_TYPE_LABEL: Record<string, string> = {
  FORMULA: '분유',
  BREAST: '모유',
  MIXED: '혼합',
}
const QUICK_AMOUNTS = [30, 60, 80, 90, 100, 120, 150]

type Props = {
  record: FeedRecord | null
  onClose: () => void
  onSave: (feedId: string, amountMl: number, feedType: string, note: string, fedAt: string) => Promise<void>
}

export default function EditFeedModal({ record, onClose, onSave }: Props) {
  const [amount, setAmount] = useState('')
  const [feedType, setFeedType] = useState('FORMULA')
  const [note, setNote] = useState('')
  const [fedAt, setFedAt] = useState(new Date())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (record) {
      setAmount(String(record.amountMl))
      setFeedType(record.feedType)
      setNote(record.note)
      setFedAt(new Date(record.fedAt))
    }
  }, [record])

  const handleSave = async () => {
    if (!record || !amount) return
    setSaving(true)
    try {
      await onSave(record.id, parseInt(amount), feedType, note, fedAt.toISOString())
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
          <Text style={styles.title}>수유 기록 수정</Text>

          <Text style={styles.label}>수유량 (ml)</Text>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map(ml => (
              <TouchableOpacity
                key={ml}
                style={[styles.quickChip, amount === String(ml) && styles.quickChipActive]}
                onPress={() => setAmount(String(ml))}
              >
                <Text style={[styles.quickChipText, amount === String(ml) && styles.quickChipTextActive]}>
                  {ml}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="직접 입력 (ml)"
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>수유 방법</Text>
          <View style={styles.typeRow}>
            {FEED_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, feedType === t && styles.typeChipActive]}
                onPress={() => setFeedType(t)}
              >
                <Text style={[styles.typeChipText, feedType === t && styles.typeChipTextActive]}>
                  {FEED_TYPE_LABEL[t]}
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

          <Text style={styles.label}>수유 시각</Text>
          <TimeOffsetPicker value={fedAt} onChange={setFedAt} />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (!amount || saving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!amount || saving}
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
    gap: 10,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  label: { fontSize: 12, color: '#888', fontWeight: '600' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f5f5f5' },
  quickChipActive: { backgroundColor: '#FF6B9D' },
  quickChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  quickChipTextActive: { color: '#fff' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center' },
  typeChipActive: { backgroundColor: '#FF6B9D' },
  typeChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: { color: '#888', fontWeight: '600', fontSize: 15 },
  saveButton: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#FF6B9D', alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#ffb3cc' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
