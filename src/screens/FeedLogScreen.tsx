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
import { getFeeds, recordFeed } from '../api/babyLogApi'
import { getStoredBabyId } from '../api/client'
import type { FeedRecord } from '../types'

const FEED_TYPES = ['FORMULA', 'BREAST', 'MIXED'] as const
const FEED_TYPE_LABEL: Record<string, string> = {
  FORMULA: '분유',
  BREAST: '모유',
  MIXED: '혼합',
}

const QUICK_AMOUNTS = [30, 60, 80, 90, 100, 120, 150]

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function FeedLogScreen() {
  const [babyId, setBabyId] = useState<string | null>(null)
  const [feeds, setFeeds] = useState<FeedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [amount, setAmount] = useState('')
  const [feedType, setFeedType] = useState<string>('FORMULA')
  const [note, setNote] = useState('')

  useEffect(() => {
    const init = async () => {
      const bid = await getStoredBabyId()
      setBabyId(bid)
      if (bid) {
        const data = await getFeeds(bid)
        setFeeds(data)
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSubmit = async () => {
    if (!babyId || !amount) return
    setSubmitting(true)
    try {
      const record = await recordFeed(babyId, {
        amountMl: parseInt(amount),
        feedType,
        note,
      })
      setFeeds(prev => [record, ...prev])
      setAmount('')
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
      {/* 입력 폼 */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>수유 기록</Text>

        {/* 수유량 빠른 선택 */}
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

        {/* 수유 타입 */}
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

        <TouchableOpacity
          style={[styles.submitButton, (!amount || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!amount || submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? '저장 중...' : '기록하기'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 기록 목록 */}
      <FlatList
        data={feeds}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.recordItem}>
            <View style={styles.recordLeft}>
              <Text style={styles.recordAmount}>{item.amountMl}ml</Text>
              <Text style={styles.recordType}>{FEED_TYPE_LABEL[item.feedType]}</Text>
            </View>
            <View style={styles.recordRight}>
              <Text style={styles.recordTime}>{formatTime(item.fedAt)}</Text>
              <Text style={styles.recordNext}>다음 {formatTime(item.nextFeedAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>수유 기록이 없어요</Text>
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
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginTop: 4 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  quickChipActive: { backgroundColor: '#FF6B9D' },
  quickChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  quickChipTextActive: { color: '#fff' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: '#FF6B9D' },
  typeChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
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
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
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
  recordLeft: { gap: 4 },
  recordRight: { alignItems: 'flex-end', gap: 4 },
  recordAmount: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  recordType: { fontSize: 12, color: '#999' },
  recordTime: { fontSize: 13, color: '#444' },
  recordNext: { fontSize: 12, color: '#FF6B9D' },
  empty: { textAlign: 'center', color: '#bbb', marginTop: 40 },
})
