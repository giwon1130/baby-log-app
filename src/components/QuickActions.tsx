import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  deleteDiaper,
  deleteSleep,
  endSleep,
  recordDiaper,
  startSleep,
} from '../api/babyLogApi'
import { scheduleDiaperReminder } from '../utils/notifications'
import type { SleepRecord } from '../types'
import type { UndoAction } from './UndoToast'
import { extractErrorMessage } from '../utils/errors'
import { COLORS, NEUTRALS, FONT } from '../utils/constants'
import QuickFeed from './QuickFeed'
import QuickCard from './QuickCard'

const QUICK_DIAPERS = [
  { type: 'WET', emoji: '💧', label: '소변' },
  { type: 'DIRTY', emoji: '💩', label: '대변' },
  { type: 'MIXED', emoji: '🔄', label: '혼합' },
] as const

type Props = {
  babyId: string
  babyName?: string
  activeSleep: SleepRecord | null
  onRecorded: () => void
  onError?: (msg: string) => void
  onUndoAvailable: (action: UndoAction) => void
  onNavigateBreastTimer?: () => void
}

/**
 * 홈 화면 빠른 기록 — 수유·기저귀·수면을 각각 독립 카드로 노출.
 * 카드 헤더(아이콘+제목)를 통일해 시각 리듬을 맞추고, 각 유형의
 * 가장 흔한 동작을 1탭으로 끝낸다.
 */
export default function QuickActions({
  babyId,
  babyName,
  activeSleep,
  onRecorded,
  onError,
  onUndoAvailable,
  onNavigateBreastTimer,
}: Props) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const busy = loadingKey !== null

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
            onError?.(extractErrorMessage(err, '되돌리기 실패'))
          }
        },
      })
    } catch (err) {
      onError?.(extractErrorMessage(err, '기저귀 기록에 실패했어요'))
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
        onError?.(extractErrorMessage(err, '깨우기 실패'))
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
              onError?.(extractErrorMessage(err, '되돌리기 실패'))
            }
          },
        })
      } catch (err) {
        onError?.(extractErrorMessage(err, '재우기 실패'))
      } finally {
        setLoadingKey(null)
      }
    }
  }, [activeSleep, babyId, onRecorded, onError, onUndoAvailable])

  return (
    <View style={styles.group}>
      <QuickFeed
        babyId={babyId}
        babyName={babyName}
        onRecorded={onRecorded}
        onError={onError}
        onUndoAvailable={onUndoAvailable}
        onNavigateBreastTimer={onNavigateBreastTimer}
      />

      {/* 기저귀 — 이모지 + 글자 라벨 */}
      <QuickCard icon="🧷" title="기저귀">
        <View style={styles.diaperRow}>
          {QUICK_DIAPERS.map(({ type, emoji, label }) => (
            <TouchableOpacity
              key={type}
              style={[styles.diaperBtn, loadingKey === `diaper-${type}` && styles.btnLoading]}
              onPress={() => handleDiaper(type)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`기저귀 ${label} 기록`}
            >
              {loadingKey === `diaper-${type}`
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : (
                  <>
                    <Text style={styles.diaperEmoji}>{emoji}</Text>
                    <Text style={styles.diaperLabel}>{label}</Text>
                  </>
                )}
            </TouchableOpacity>
          ))}
        </View>
      </QuickCard>

      {/* 수면 — 재우기/깨우기 토글 */}
      <QuickCard icon="😴" title="수면">
        <TouchableOpacity
          style={[
            styles.sleepBtn,
            activeSleep ? styles.sleepBtnActive : styles.sleepBtnIdle,
            busy && styles.btnLoading,
          ]}
          onPress={() => void handleSleepToggle()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={activeSleep ? '수면 종료 (깨우기)' : '수면 시작 (재우기)'}
        >
          {(loadingKey === 'sleep-start' || loadingKey === 'sleep-end')
            ? <ActivityIndicator size="small" color={NEUTRALS.white} />
            : (
              <Text style={styles.sleepBtnText}>
                {activeSleep ? '☀️  깨우기' : '🌙  재우기 시작'}
              </Text>
            )}
        </TouchableOpacity>
        {activeSleep && <Text style={styles.sleepHint}>지금 수면 중이에요</Text>}
      </QuickCard>
    </View>
  )
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
  group: { gap: 12 },
  diaperRow: { flexDirection: 'row', gap: 8 },
  diaperBtn: {
    flex: 1,
    minHeight: 64,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  diaperEmoji: { fontSize: 22 },
  diaperLabel: { fontSize: FONT.bodySm, color: COLORS.primary, fontWeight: '700' },
  sleepBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sleepBtnIdle: { backgroundColor: COLORS.sleep },
  sleepBtnActive: { backgroundColor: COLORS.amber },
  sleepBtnText: { color: NEUTRALS.white, fontSize: FONT.body, fontWeight: '700' },
  sleepHint: { fontSize: FONT.label, color: NEUTRALS.gray500, textAlign: 'center' },
  btnLoading: { opacity: 0.6 },
})
