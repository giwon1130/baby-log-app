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
import { COLORS, NEUTRALS } from '../utils/constants'
import QuickFeed from './QuickFeed'

const QUICK_DIAPERS: { type: string; label: string }[] = [
  { type: 'WET', label: '💧' },
  { type: 'DIRTY', label: '💩' },
  { type: 'MIXED', label: '🔄' },
]

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
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>빠른 기록</Text>

      <QuickFeed
        babyId={babyId}
        babyName={babyName}
        onRecorded={onRecorded}
        onError={onError}
        onUndoAvailable={onUndoAvailable}
        onNavigateBreastTimer={onNavigateBreastTimer}
      />

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
              ? <ActivityIndicator size="small" color={COLORS.primary} />
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
          ? <ActivityIndicator size="small" color={NEUTRALS.white} />
          : (
            <Text style={styles.sleepBtnText}>
              {activeSleep ? '☀️ 깨우기' : '😴 재우기'}
            </Text>
          )}
      </TouchableOpacity>
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
  container: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    color: NEUTRALS.gray500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subLabel: { fontSize: 11, color: NEUTRALS.gray400, fontWeight: '600', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  diaperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaperBtnText: { fontSize: 22 },
  sleepBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  sleepBtnIdle: { backgroundColor: COLORS.sleep },
  sleepBtnActive: { backgroundColor: '#FF9800' },
  sleepBtnText: { color: NEUTRALS.white, fontSize: 15, fontWeight: '700' },
  btnLoading: { opacity: 0.6 },
})
