import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  deleteDiaper,
  deleteFeed,
  deleteSleep,
  endSleep,
  recordDiaper,
  recordFeed,
  startSleep,
} from '../api/babyLogApi'
import { scheduleDiaperReminder, scheduleFeedNotification } from '../hooks/useFeedNotification'
import type { SleepRecord } from '../types'
import type { UndoAction } from './UndoToast'

type FeedType = 'FORMULA' | 'BREAST' | 'MIXED' // MIXED 는 유축(Expressed)으로 재사용

const FEED_TYPE_TABS: { type: FeedType; label: string }[] = [
  { type: 'FORMULA', label: '분유' },
  { type: 'BREAST', label: '모유' },
  { type: 'MIXED', label: '유축' },
]
const FORMULA_AMOUNTS = [60, 80, 100, 120, 150]
const BREAST_MINUTES = [5, 10, 15]
const QUICK_DIAPERS: { type: string; label: string }[] = [
  { type: 'WET', label: '💧' },
  { type: 'DIRTY', label: '💩' },
  { type: 'MIXED', label: '🔄' },
]
const LAST_FEED_ML_KEY = 'quickActions.lastFeedMl'

type Props = {
  babyId: string
  babyName?: string
  activeSleep: SleepRecord | null
  onRecorded: () => void
  onError?: (msg: string) => void
  onUndoAvailable: (action: UndoAction) => void
  onNavigateBreastTimer?: () => void
}

export default function QuickActions({
  babyId,
  babyName,
  activeSleep,
  onRecorded,
  onError,
  onUndoAvailable,
  onNavigateBreastTimer,
}: Props) {
  const [feedType, setFeedType] = useState<FeedType>('FORMULA')
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [lastFeedMl, setLastFeedMl] = useState<number | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(LAST_FEED_ML_KEY)
      if (stored) {
        const n = Number(stored)
        if (Number.isFinite(n) && n > 0) setLastFeedMl(n)
      }
    })()
  }, [])

  const rememberLastMl = useCallback(async (ml: number) => {
    setLastFeedMl(ml)
    await AsyncStorage.setItem(LAST_FEED_ML_KEY, String(ml))
  }, [])

  const busy = loadingKey !== null

  const submitFeed = useCallback(async (payload: {
    amountMl?: number
    leftMinutes?: number
    rightMinutes?: number
  }, key: string, successMsg: string) => {
    setLoadingKey(key)
    try {
      const record = await recordFeed(babyId, { ...payload, feedType })
      if (record.nextFeedAt) await scheduleFeedNotification(record.nextFeedAt, babyName)
      if (payload.amountMl) await rememberLastMl(payload.amountMl)
      onRecorded()
      onUndoAvailable({
        message: successMsg,
        onUndo: async () => {
          try {
            await deleteFeed(babyId, record.id)
            onRecorded()
          } catch (err) {
            onError?.((err as Error).message || '되돌리기 실패')
          }
        },
      })
    } catch (err) {
      onError?.((err as Error).message || '수유 기록에 실패했어요')
    } finally {
      setLoadingKey(null)
    }
  }, [babyId, babyName, feedType, onRecorded, onError, onUndoAvailable, rememberLastMl])

  const handleFormulaOrExpressed = useCallback((ml: number) => {
    void submitFeed({ amountMl: ml }, `feed-${ml}`, `${labelForType(feedType)} ${ml}ml 기록`)
  }, [feedType, submitFeed])

  const handleBreastQuick = useCallback((minutes: number) => {
    void submitFeed({ leftMinutes: minutes }, `breast-${minutes}`, `모유 ${minutes}분 기록`)
  }, [submitFeed])

  const submitCustom = useCallback(async () => {
    const ml = Number(customInput)
    if (!Number.isFinite(ml) || ml <= 0 || ml > 500) {
      onError?.('0~500ml 사이 값을 입력해주세요')
      return
    }
    Keyboard.dismiss()
    setCustomOpen(false)
    setCustomInput('')
    await submitFeed({ amountMl: ml }, `feed-custom`, `${labelForType(feedType)} ${ml}ml 기록`)
  }, [customInput, feedType, submitFeed, onError])

  const handleDiaper = useCallback(async (type: string) => {
    setLoadingKey(`diaper-${type}`)
    try {
      const record = await recordDiaper(babyId, { diaperType: type })
      await scheduleDiaperReminder(record.changedAt, babyName)
      onRecorded()
      onUndoAvailable({
        message: `기저귀 ${diaperLabelFor(type)} 기록`,
        onUndo: async () => {
          try {
            await deleteDiaper(babyId, record.id)
            onRecorded()
          } catch (err) {
            onError?.((err as Error).message || '되돌리기 실패')
          }
        },
      })
    } catch (err) {
      onError?.((err as Error).message || '기저귀 기록에 실패했어요')
    } finally {
      setLoadingKey(null)
    }
  }, [babyId, babyName, onRecorded, onError, onUndoAvailable])

  const handleSleepToggle = useCallback(async () => {
    if (activeSleep) {
      setLoadingKey('sleep-end')
      try {
        await endSleep(babyId, activeSleep.id, {})
        onRecorded()
      } catch (err) {
        onError?.((err as Error).message || '깨우기 실패')
      } finally {
        setLoadingKey(null)
      }
    } else {
      setLoadingKey('sleep-start')
      try {
        const record = await startSleep(babyId, {})
        onRecorded()
        onUndoAvailable({
          message: '수면 시작 기록',
          onUndo: async () => {
            try {
              await deleteSleep(babyId, record.id)
              onRecorded()
            } catch (err) {
              onError?.((err as Error).message || '되돌리기 실패')
            }
          },
        })
      } catch (err) {
        onError?.((err as Error).message || '재우기 실패')
      } finally {
        setLoadingKey(null)
      }
    }
  }, [activeSleep, babyId, onRecorded, onError, onUndoAvailable])

  const formulaChips = (() => {
    const base = FORMULA_AMOUNTS
    if (lastFeedMl != null && !base.includes(lastFeedMl)) {
      return [lastFeedMl, ...base]
    }
    return base
  })()

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>빠른 기록</Text>

      {/* 수유 타입 탭 */}
      <Text style={styles.subLabel}>수유</Text>
      <View style={styles.typeTabs}>
        {FEED_TYPE_TABS.map(({ type, label }) => (
          <TouchableOpacity
            key={type}
            onPress={() => setFeedType(type)}
            style={[styles.typeTab, feedType === type && styles.typeTabActive]}
            disabled={busy}
          >
            <Text style={[styles.typeTabText, feedType === type && styles.typeTabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 분유/유축: ml 버튼 + 직접 입력 */}
      {feedType !== 'BREAST' && (
        <View style={styles.row}>
          {formulaChips.map(ml => (
            <TouchableOpacity
              key={ml}
              style={[
                styles.feedBtn,
                loadingKey === `feed-${ml}` && styles.btnLoading,
                lastFeedMl === ml && styles.feedBtnRecent,
              ]}
              onPress={() => handleFormulaOrExpressed(ml)}
              disabled={busy}
            >
              {loadingKey === `feed-${ml}`
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.feedBtnText}>{ml}ml</Text>
              }
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.customBtn}
            onPress={() => setCustomOpen(true)}
            disabled={busy}
          >
            <Text style={styles.customBtnText}>직접 입력</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 모유: 분 버튼 + 타이머 화면 링크 */}
      {feedType === 'BREAST' && (
        <View style={styles.row}>
          {BREAST_MINUTES.map(min => (
            <TouchableOpacity
              key={min}
              style={[styles.feedBtn, loadingKey === `breast-${min}` && styles.btnLoading]}
              onPress={() => handleBreastQuick(min)}
              disabled={busy}
            >
              {loadingKey === `breast-${min}`
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.feedBtnText}>{min}분</Text>
              }
            </TouchableOpacity>
          ))}
          {onNavigateBreastTimer && (
            <TouchableOpacity
              style={styles.customBtn}
              onPress={onNavigateBreastTimer}
              disabled={busy}
            >
              <Text style={styles.customBtnText}>타이머</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 기저귀 */}
      <Text style={styles.subLabel}>기저귀</Text>
      <View style={styles.row}>
        {QUICK_DIAPERS.map(({ type, label }) => (
          <TouchableOpacity
            key={type}
            style={[styles.diaperBtn, loadingKey === `diaper-${type}` && styles.btnLoading]}
            onPress={() => handleDiaper(type)}
            disabled={busy}
          >
            {loadingKey === `diaper-${type}`
              ? <ActivityIndicator size="small" color="#FF6B9D" />
              : <Text style={styles.diaperBtnText}>{label}</Text>
            }
          </TouchableOpacity>
        ))}
      </View>

      {/* 수면 토글 */}
      <Text style={styles.subLabel}>수면</Text>
      <TouchableOpacity
        style={[
          styles.sleepBtn,
          activeSleep ? styles.sleepBtnActive : styles.sleepBtnIdle,
          (loadingKey === 'sleep-start' || loadingKey === 'sleep-end') && styles.btnLoading,
        ]}
        onPress={() => void handleSleepToggle()}
        disabled={busy}
      >
        {(loadingKey === 'sleep-start' || loadingKey === 'sleep-end')
          ? <ActivityIndicator size="small" color="#fff" />
          : (
            <Text style={styles.sleepBtnText}>
              {activeSleep ? '☀️ 깨우기' : '😴 재우기'}
            </Text>
          )}
      </TouchableOpacity>

      {/* 직접 입력 모달 */}
      <Modal
        visible={customOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCustomOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => { /* stop propagation */ }}>
            <Text style={styles.modalTitle}>{labelForType(feedType)} 수유량 입력</Text>
            <TextInput
              autoFocus
              keyboardType="number-pad"
              placeholder="ml"
              placeholderTextColor="#bbb"
              value={customInput}
              onChangeText={setCustomInput}
              style={styles.modalInput}
              returnKeyType="done"
              onSubmitEditing={() => void submitCustom()}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => { setCustomOpen(false); setCustomInput('') }}
              >
                <Text style={styles.modalBtnGhostText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => void submitCustom()}
              >
                <Text style={styles.modalBtnPrimaryText}>기록</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function labelForType(t: FeedType): string {
  switch (t) {
    case 'FORMULA': return '분유'
    case 'BREAST':  return '모유'
    case 'MIXED':   return '유축'
  }
}
function diaperLabelFor(t: string): string {
  switch (t) {
    case 'WET':   return '소변'
    case 'DIRTY': return '대변'
    case 'MIXED': return '혼합'
    default:      return t
  }
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
  typeTabs: { flexDirection: 'row', gap: 6 },
  typeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF0F5',
  },
  typeTabActive: { backgroundColor: '#FF6B9D' },
  typeTabText: { fontSize: 12, fontWeight: '700', color: '#FF6B9D' },
  typeTabTextActive: { color: '#fff' },
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
  feedBtnRecent: { borderWidth: 2, borderColor: '#FFC107' },
  customBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: '#FF6B9D',
    alignItems: 'center',
  },
  customBtnText: { color: '#FF6B9D', fontSize: 12, fontWeight: '700' },
  diaperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaperBtnText: { fontSize: 22 },
  sleepBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  sleepBtnIdle: { backgroundColor: '#5C6BC0' },
  sleepBtnActive: { backgroundColor: '#FF9800' },
  sleepBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnLoading: { opacity: 0.6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: '#1a1a1a',
  },
  modalBtnRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  modalBtnGhost: { backgroundColor: '#f5f5f5' },
  modalBtnGhostText: { color: '#666', fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: '#FF6B9D' },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700' },
})
