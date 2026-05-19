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
import { deleteFeed, recordFeed } from '../api/babyLogApi'
import { scheduleFeedNotification } from '../utils/notifications'
import { COLORS, NEUTRALS } from '../utils/constants'
import { extractErrorMessage } from '../utils/errors'
import type { UndoAction } from './UndoToast'

type FeedType = 'FORMULA' | 'BREAST' | 'MIXED' // MIXED 는 유축(Expressed)으로 재사용

const FEED_TYPE_TABS: { type: FeedType; label: string }[] = [
  { type: 'FORMULA', label: '분유' },
  { type: 'BREAST', label: '모유' },
  { type: 'MIXED', label: '유축' },
]
const FORMULA_AMOUNTS = [60, 80, 100, 120, 150]
const BREAST_MINUTES = [5, 10, 15]
const LAST_FEED_ML_KEY = 'quickActions.lastFeedMl'

type Props = {
  babyId: string
  babyName?: string
  onRecorded: () => void
  onError?: (msg: string) => void
  onUndoAvailable: (action: UndoAction) => void
  onNavigateBreastTimer?: () => void
}

export default function QuickFeed({
  babyId,
  babyName,
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

  const submitFeed = useCallback(async (
    payload: { amountMl?: number; leftMinutes?: number; rightMinutes?: number },
    key: string,
    successMsg: string,
  ) => {
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
            onError?.(extractErrorMessage(err, '되돌리기 실패'))
          }
        },
      })
    } catch (err) {
      onError?.(extractErrorMessage(err, '수유 기록에 실패했어요'))
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
    await submitFeed({ amountMl: ml }, 'feed-custom', `${labelForType(feedType)} ${ml}ml 기록`)
  }, [customInput, feedType, submitFeed, onError])

  const formulaChips = (() => {
    if (lastFeedMl != null && !FORMULA_AMOUNTS.includes(lastFeedMl)) {
      return [lastFeedMl, ...FORMULA_AMOUNTS]
    }
    return FORMULA_AMOUNTS
  })()

  return (
    <View style={{ gap: 8 }}>
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
                ? <ActivityIndicator size="small" color={NEUTRALS.white} />
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
                ? <ActivityIndicator size="small" color={NEUTRALS.white} />
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
              placeholderTextColor={NEUTRALS.gray400}
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

const styles = StyleSheet.create({
  subLabel: { fontSize: 11, color: NEUTRALS.gray400, fontWeight: '600', marginTop: 4 },
  typeTabs: { flexDirection: 'row', gap: 6 },
  typeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primarySurface,
  },
  typeTabActive: { backgroundColor: COLORS.primary },
  typeTabText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  typeTabTextActive: { color: NEUTRALS.white },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  feedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    minWidth: 52,
    alignItems: 'center',
  },
  feedBtnText: { color: NEUTRALS.white, fontSize: 13, fontWeight: '700' },
  feedBtnRecent: { borderWidth: 2, borderColor: '#FFC107' },
  customBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  customBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
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
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: NEUTRALS.ink },
  modalInput: {
    borderWidth: 1,
    borderColor: NEUTRALS.gray150,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: NEUTRALS.ink,
  },
  modalBtnRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  modalBtnGhost: { backgroundColor: NEUTRALS.gray50 },
  modalBtnGhostText: { color: NEUTRALS.gray650, fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: COLORS.primary },
  modalBtnPrimaryText: { color: NEUTRALS.white, fontWeight: '700' },
})
