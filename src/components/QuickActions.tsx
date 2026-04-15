import React, { useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { recordDiaper, recordFeed } from '../api/babyLogApi'
import { scheduleFeedNotification } from '../hooks/useFeedNotification'

const QUICK_AMOUNTS = [60, 80, 100, 120, 150]
const QUICK_DIAPERS = [
  { type: 'WET', label: '💧' },
  { type: 'DIRTY', label: '💩' },
  { type: 'MIXED', label: '🔄' },
]

type Props = {
  babyId: string
  babyName?: string
  onRecorded: () => void
  onError?: (msg: string) => void
}

export default function QuickActions({ babyId, babyName, onRecorded, onError }: Props) {
  const [loadingFeed, setLoadingFeed] = useState<number | null>(null)
  const [loadingDiaper, setLoadingDiaper] = useState<string | null>(null)

  const handleFeed = async (ml: number) => {
    setLoadingFeed(ml)
    try {
      const record = await recordFeed(babyId, { amountMl: ml, feedType: 'FORMULA' })
      if (record.nextFeedAt) await scheduleFeedNotification(record.nextFeedAt, babyName)
      onRecorded()
    } catch (err) {
      onError?.((err as Error).message || '수유 기록에 실패했어요')
    } finally {
      setLoadingFeed(null)
    }
  }

  const handleDiaper = async (type: string) => {
    setLoadingDiaper(type)
    try {
      await recordDiaper(babyId, { diaperType: type })
      onRecorded()
    } catch (err) {
      onError?.((err as Error).message || '기저귀 기록에 실패했어요')
    } finally {
      setLoadingDiaper(null)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>빠른 기록</Text>

      <Text style={styles.subLabel}>수유 (분유)</Text>
      <View style={styles.row}>
        {QUICK_AMOUNTS.map(ml => (
          <TouchableOpacity
            key={ml}
            style={[styles.feedBtn, loadingFeed === ml && styles.btnLoading]}
            onPress={() => handleFeed(ml)}
            disabled={loadingFeed !== null || loadingDiaper !== null}
          >
            {loadingFeed === ml
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.feedBtnText}>{ml}ml</Text>
            }
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.subLabel}>기저귀</Text>
      <View style={styles.row}>
        {QUICK_DIAPERS.map(({ type, label }) => (
          <TouchableOpacity
            key={type}
            style={[styles.diaperBtn, loadingDiaper === type && styles.btnLoading]}
            onPress={() => handleDiaper(type)}
            disabled={loadingFeed !== null || loadingDiaper !== null}
          >
            {loadingDiaper === type
              ? <ActivityIndicator size="small" color="#FF6B9D" />
              : <Text style={styles.diaperBtnText}>{label}</Text>
            }
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subLabel: { fontSize: 11, color: '#bbb', fontWeight: '600', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  feedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF6B9D',
    minWidth: 52,
    alignItems: 'center',
  },
  feedBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  diaperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaperBtnText: { fontSize: 22 },
  btnLoading: { opacity: 0.6 },
})
