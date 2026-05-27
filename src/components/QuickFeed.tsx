import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { COLORS, NEUTRALS, FONT } from '../utils/constants'
import { extractErrorMessage } from '../utils/errors'
import type { UndoAction } from './UndoToast'
import QuickCard from './QuickCard'

type FeedType = 'FORMULA' | 'BREAST' | 'MIXED' // MIXED 는 유축(Expressed)으로 재사용

const FEED_TYPE_TABS: { type: FeedType; label: string }[] = [
  { type: 'FORMULA', label: '분유' },
  { type: 'BREAST', label: '모유' },
  { type: 'MIXED', label: '유축' },
]
const FORMULA_AMOUNTS = [60, 80, 100, 120, 150]
const BREAST_MINUTES = [5, 10, 15]
const LAST_FEED_KEY = 'quickActions.lastFeed'

/** 마지막 수유 — "직전값 다시" 1탭 버튼에 사용 */
type LastFeed = { feedType: FeedType; amountMl?: number; leftMinutes?: number; rightMinutes?: number }

type Props = {
  babyId: string
  babyName?: string
  onRecorded: () => void
  onError?: (msg: string) => void
  onUndoAvailable: (action: UndoAction) => void
  onNavigateBreastTimer?: () => void
}

function labelForType(t: FeedType): string {
  switch (t) {
    case 'FORMULA': return '분유'
    case 'BREAST':  return '모유'
    case 'MIXED':   return '유축'
  }
}

function describeLastFeed(lf: LastFeed): string {
  const t = labelForType(lf.feedType)
  if (lf.amountMl != null) return `${t} ${lf.amountMl}ml`
  if (lf.leftMinutes != null) return `${t} 왼쪽 ${lf.leftMinutes}분`
  if (lf.rightMinutes != null) return `${t} 오른쪽 ${lf.rightMinutes}분`
  return t
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
  const [lastFeed, setLastFeed] = useState<LastFeed | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')
  // 사용자가 탭을 한 번이라도 만지면 lastFeed 가 늦게 로드돼도 덮어쓰지 않음
  const userPickedRef = useRef(false)

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(LAST_FEED_KEY)
      if (!stored) return
      try {
        const parsed = JSON.parse(stored) as LastFeed
        if (parsed?.feedType) {
          setLastFeed(parsed)
          // 직전 사용 타입을 디폴트로 — 사용자가 아직 안 만졌을 때만
          if (!userPickedRef.current) setFeedType(parsed.feedType)
        }
      } catch {
        // 구버전(숫자 ml 문자열) 저장값은 무시
      }
    })()
  }, [])

  // 자주 쓰는 타입(직전 사용)이 탭 첫 번째로 오도록 정렬 — 발견성·접근성
  const orderedTabs = useMemo(() => {
    if (!lastFeed?.feedType) return FEED_TYPE_TABS
    const first = FEED_TYPE_TABS.find(t => t.type === lastFeed.feedType)
    if (!first) return FEED_TYPE_TABS
    const rest = FEED_TYPE_TABS.filter(t => t.type !== lastFeed.feedType)
    return [first, ...rest]
  }, [lastFeed])

  const pickFeedType = useCallback((type: FeedType) => {
    userPickedRef.current = true
    setFeedType(type)
  }, [])

  const rememberLastFeed = useCallback(async (lf: LastFeed) => {
    setLastFeed(lf)
    await AsyncStorage.setItem(LAST_FEED_KEY, JSON.stringify(lf))
  }, [])

  const busy = loadingKey !== null

  const submitFeed = useCallback(async (
    payload: { amountMl?: number; leftMinutes?: number; rightMinutes?: number },
    type: FeedType,
    key: string,
    successMsg: string,
  ) => {
    setLoadingKey(key)
    try {
      const record = await recordFeed(babyId, { ...payload, feedType: type })
      if (record.nextFeedAt) await scheduleFeedNotification(record.nextFeedAt, babyName)
      await rememberLastFeed({
        feedType: type,
        amountMl: payload.amountMl,
        leftMinutes: payload.leftMinutes,
        rightMinutes: payload.rightMinutes,
      })
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
  }, [babyId, babyName, onRecorded, onError, onUndoAvailable, rememberLastFeed])

  const handleFormulaOrExpressed = useCallback((ml: number) => {
    void submitFeed({ amountMl: ml }, feedType, `feed-${ml}`, `${labelForType(feedType)} ${ml}ml 기록`)
  }, [feedType, submitFeed])

  const handleBreastQuick = useCallback((side: 'left' | 'right', minutes: number) => {
    const payload = side === 'left' ? { leftMinutes: minutes } : { rightMinutes: minutes }
    const sideLabel = side === 'left' ? '왼쪽' : '오른쪽'
    void submitFeed(payload, 'BREAST', `breast-${side}-${minutes}`, `모유 ${sideLabel} ${minutes}분 기록`)
  }, [submitFeed])

  const handleRepeat = useCallback(() => {
    if (!lastFeed) return
    const payload = lastFeed.amountMl != null
      ? { amountMl: lastFeed.amountMl }
      : lastFeed.leftMinutes != null
        ? { leftMinutes: lastFeed.leftMinutes }
        : { rightMinutes: lastFeed.rightMinutes }
    void submitFeed(payload, lastFeed.feedType, 'feed-repeat', `${describeLastFeed(lastFeed)} 기록`)
  }, [lastFeed, submitFeed])

  const submitCustom = useCallback(async () => {
    const ml = Number(customInput)
    if (!Number.isFinite(ml) || ml <= 0 || ml > 500) {
      onError?.('0~500ml 사이 값을 입력해주세요')
      return
    }
    Keyboard.dismiss()
    setCustomOpen(false)
    setCustomInput('')
    await submitFeed({ amountMl: ml }, feedType, 'feed-custom', `${labelForType(feedType)} ${ml}ml 기록`)
  }, [customInput, feedType, submitFeed, onError])

  return (
    <QuickCard icon="🍼" title="수유">
      {/* 직전값 1탭 반복 — 가장 흔한 케이스 */}
      {lastFeed && (
        <TouchableOpacity
          style={[styles.repeatBtn, loadingKey === 'feed-repeat' && styles.btnLoading]}
          onPress={handleRepeat}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`직전 수유 다시 기록: ${describeLastFeed(lastFeed)}`}
        >
          {loadingKey === 'feed-repeat'
            ? <ActivityIndicator size="small" color={NEUTRALS.white} />
            : <Text style={styles.repeatText}>↻  {describeLastFeed(lastFeed)} 다시</Text>}
        </TouchableOpacity>
      )}

      {/* 수유 방법 */}
      <View style={styles.typeTabs}>
        {orderedTabs.map(({ type, label }) => (
          <TouchableOpacity
            key={type}
            hitSlop={8}
            onPress={() => pickFeedType(type)}
            style={[styles.typeTab, feedType === type && styles.typeTabActive]}
            disabled={busy}
            accessibilityRole="tab"
            accessibilityState={{ selected: feedType === type }}
            accessibilityLabel={`${label} 수유`}
          >
            <Text style={[styles.typeTabText, feedType === type && styles.typeTabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 분유·유축: 용량 칩 */}
      {feedType !== 'BREAST' && (
        <View style={styles.row}>
          {FORMULA_AMOUNTS.map(ml => (
            <TouchableOpacity
              key={ml}
              style={[styles.feedBtn, loadingKey === `feed-${ml}` && styles.btnLoading]}
              onPress={() => handleFormulaOrExpressed(ml)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`${labelForType(feedType)} ${ml}ml 기록`}
            >
              {loadingKey === `feed-${ml}`
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.feedBtnText}>{ml}ml</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.customBtn}
            onPress={() => setCustomOpen(true)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="수유량 직접 입력"
          >
            <Text style={styles.customBtnText}>직접</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 모유: 좌/우 분리 — 한쪽씩 빠른 기록, 양쪽 동시는 타이머로 */}
      {feedType === 'BREAST' && (
        <View style={styles.breastBlock}>
          {(['left', 'right'] as const).map(side => {
            const sideLabel = side === 'left' ? '왼' : '오'
            return (
              <View key={side} style={styles.row}>
                <View style={styles.breastSideLabel}>
                  <Text style={styles.breastSideLabelText}>{sideLabel}</Text>
                </View>
                {BREAST_MINUTES.map(min => {
                  const key = `breast-${side}-${min}`
                  return (
                    <TouchableOpacity
                      key={min}
                      style={[styles.feedBtn, loadingKey === key && styles.btnLoading]}
                      onPress={() => handleBreastQuick(side, min)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`모유 ${sideLabel}쪽 ${min}분 기록`}
                    >
                      {loadingKey === key
                        ? <ActivityIndicator size="small" color={COLORS.primary} />
                        : <Text style={styles.feedBtnText}>{min}분</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )
          })}
          {onNavigateBreastTimer && (
            <TouchableOpacity
              style={styles.customBtn}
              onPress={onNavigateBreastTimer}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="모유 수유 타이머 열기 (양쪽 동시)"
            >
              <Text style={styles.customBtnText}>양쪽 동시 · 타이머</Text>
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
              accessibilityLabel="수유량 (ml)"
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
    </QuickCard>
  )
}

const styles = StyleSheet.create({
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  repeatText: { color: NEUTRALS.white, fontSize: FONT.body, fontWeight: '700' },
  typeTabs: { flexDirection: 'row', gap: 6 },
  typeTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.primarySurface,
  },
  typeTabActive: { backgroundColor: COLORS.primary },
  typeTabText: { fontSize: FONT.label, fontWeight: '700', color: COLORS.primary },
  typeTabTextActive: { color: NEUTRALS.white },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  breastBlock: { gap: 8 },
  breastSideLabel: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breastSideLabelText: { color: NEUTRALS.gray700, fontWeight: '700', fontSize: FONT.bodySm },
  feedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.primarySurface,
    minWidth: 56,
    alignItems: 'center',
  },
  feedBtnText: { color: COLORS.primary, fontSize: FONT.bodySm, fontWeight: '700' },
  customBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  customBtnText: { color: COLORS.primary, fontSize: FONT.label, fontWeight: '700' },
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
  modalTitle: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  modalInput: {
    borderWidth: 1,
    borderColor: NEUTRALS.gray150,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONT.h2,
    color: NEUTRALS.ink,
  },
  modalBtnRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  modalBtnGhost: { backgroundColor: NEUTRALS.gray50 },
  modalBtnGhostText: { color: NEUTRALS.gray650, fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: COLORS.primary },
  modalBtnPrimaryText: { color: NEUTRALS.white, fontWeight: '700' },
})
