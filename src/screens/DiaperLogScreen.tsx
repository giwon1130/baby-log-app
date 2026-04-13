import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { getDiapers, recordDiaper } from '../api/babyLogApi'
import { getStoredBabyId } from '../api/client'
import type { DiaperRecord } from '../types'

const DIAPER_TYPES = ['WET', 'DIRTY', 'MIXED', 'DRY'] as const
const DIAPER_TYPE_LABEL: Record<string, string> = {
  WET: '💧 소변',
  DIRTY: '💩 대변',
  MIXED: '🔄 혼합',
  DRY: '✅ 깨끗',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  return `${hours}시간 ${mins % 60}분 전`
}

export default function DiaperLogScreen() {
  const [babyId, setBabyId] = useState<string | null>(null)
  const [diapers, setDiapers] = useState<DiaperRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [diaperType, setDiaperType] = useState<string>('WET')
  const [note, setNote] = useState('')

  useEffect(() => {
    const init = async () => {
      const bid = await getStoredBabyId()
      setBabyId(bid)
      if (bid) {
        const data = await getDiapers(bid)
        setDiapers(data)
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSubmit = async () => {
    if (!babyId) return
    setSubmitting(true)
    try {
      const record = await recordDiaper(babyId, { diaperType, note })
      setDiapers(prev => [record, ...prev])
      setNote('')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>기저귀 교환 기록</Text>

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

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? '저장 중...' : '지금 기록하기'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={diapers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.recordItem}>
            <Text style={styles.recordType}>{DIAPER_TYPE_LABEL[item.diaperType]}</Text>
            <View style={styles.recordRight}>
              <Text style={styles.recordTime}>{formatTime(item.changedAt)}</Text>
              <Text style={styles.recordAgo}>{timeSince(item.changedAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>기저귀 기록이 없어요</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  label: { fontSize: 12, color: '#888', fontWeight: '600' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: '#FF6B9D' },
  typeChipText: { fontSize: 14, color: '#555', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#ffb3cc' },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listContent: { padding: 16, gap: 10 },
  recordItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  recordType: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  recordRight: { alignItems: 'flex-end', gap: 2 },
  recordTime: { fontSize: 13, color: '#444' },
  recordAgo: { fontSize: 12, color: '#aaa' },
  empty: { textAlign: 'center', color: '#bbb', marginTop: 40 },
})
