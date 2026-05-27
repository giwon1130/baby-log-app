import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  deleteDiagnosis,
  getDiagnosisChecklist,
  resolveDiagnosis,
  setDiagnosisTaskDone,
} from '../../api/babyLogApi'
import { extractErrorMessage } from '../../utils/errors'
import type { BabyDiagnosis, DailyChecklist } from '../../types'
import { COLORS, FONT, NEUTRALS, SPACING } from '../../utils/constants'

type Props = {
  visible: boolean
  babyId: string | null
  diagnosis: BabyDiagnosis | null
  onClose: () => void
  /** 완료/삭제 후 부모가 진단 리스트 새로고침 */
  onChanged?: () => void
  /** task 토글 시 부모가 진행도 즉시 반영 (선택) */
  onTaskToggled?: () => void
}

export default function DiagnosisChecklistModal({
  visible, babyId, diagnosis, onClose, onChanged, onTaskToggled,
}: Props) {
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!babyId || !diagnosis) return
    setLoading(true)
    setError(null)
    try {
      const list = await getDiagnosisChecklist(babyId, diagnosis.id)
      setChecklist(list)
    } catch (err) {
      setError(extractErrorMessage(err, '체크리스트를 불러오지 못했어요'))
    } finally {
      setLoading(false)
    }
  }, [babyId, diagnosis])

  useEffect(() => { if (visible) void load() }, [visible, load])

  const toggle = async (taskKey: string, currentlyDone: boolean) => {
    if (!babyId || !diagnosis) return
    const next = !currentlyDone
    setUpdating(taskKey)
    // 낙관적 반영
    setChecklist(prev => prev ? {
      ...prev,
      tasks: prev.tasks.map(t => t.key === taskKey ? { ...t, doneToday: next } : t),
    } : prev)
    try {
      await setDiagnosisTaskDone(babyId, diagnosis.id, taskKey, next)
      onTaskToggled?.()
    } catch (err) {
      // 롤백
      setChecklist(prev => prev ? {
        ...prev,
        tasks: prev.tasks.map(t => t.key === taskKey ? { ...t, doneToday: currentlyDone } : t),
      } : prev)
      setError(extractErrorMessage(err, '체크 저장에 실패했어요'))
    } finally {
      setUpdating(null)
    }
  }

  const handleResolve = () => {
    if (!babyId || !diagnosis) return
    Alert.alert(
      '진단 완료 처리',
      `${diagnosis.tipTitle} 진단을 완료(resolved)로 표시할까요? 일일 체크는 더 이상 활성 진단에 표시되지 않아요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '완료',
          onPress: async () => {
            try {
              await resolveDiagnosis(babyId, diagnosis.id)
              onChanged?.()
              onClose()
            } catch (err) {
              setError(extractErrorMessage(err, '완료 처리에 실패했어요'))
            }
          },
        },
      ],
    )
  }

  const handleDelete = () => {
    if (!babyId || !diagnosis) return
    Alert.alert(
      '진단 삭제',
      `이 진단과 모든 일일 체크 기록을 삭제할까요? 되돌릴 수 없어요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive',
          onPress: async () => {
            try {
              await deleteDiagnosis(babyId, diagnosis.id)
              onChanged?.()
              onClose()
            } catch (err) {
              setError(extractErrorMessage(err, '삭제에 실패했어요'))
            }
          },
        },
      ],
    )
  }

  if (!diagnosis) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { /* swallow */ }}>
          <View style={styles.header}>
            <Text style={styles.emoji}>{diagnosis.tipEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{diagnosis.tipTitle}</Text>
              <Text style={styles.sub}>
                {diagnosis.side && (sideLabel(diagnosis.side) + ' · ')}시작 {diagnosis.startedAt}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color={NEUTRALS.gray600} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
          ) : checklist ? (
            <ScrollView contentContainerStyle={{ gap: SPACING.md, paddingBottom: SPACING.lg }}>
              {error && <Text style={styles.errorText}>{error}</Text>}

              <Text style={styles.sectionLabel}>오늘 체크 ({checklist.date})</Text>
              {checklist.tasks.length === 0 ? (
                <Text style={styles.empty}>이 진단에는 일일 체크 task 가 정의돼 있지 않아요.</Text>
              ) : (
                checklist.tasks.map(task => (
                  <View key={task.key} style={styles.taskRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <Text style={styles.taskHint}>{task.hint}</Text>
                    </View>
                    <Switch
                      value={task.doneToday}
                      onValueChange={() => toggle(task.key, task.doneToday)}
                      disabled={updating === task.key}
                      trackColor={{ false: NEUTRALS.gray200, true: COLORS.primary }}
                    />
                  </View>
                ))
              )}

              <Text style={styles.sectionLabel}>최근 7일 진행도</Text>
              <View style={styles.weekRow}>
                {checklist.recentDays.slice().reverse().map(d => {
                  const ratio = d.total > 0 ? d.done / d.total : 0
                  const cellColor = d.total === 0
                    ? NEUTRALS.gray100
                    : ratio >= 1 ? COLORS.success
                      : ratio > 0 ? COLORS.primary
                      : NEUTRALS.gray150
                  return (
                    <View key={d.date} style={styles.dayCol}>
                      <View style={[styles.dayCell, { backgroundColor: cellColor }]} />
                      <Text style={styles.dayLabel}>{shortDate(d.date)}</Text>
                    </View>
                  )
                })}
              </View>

              {!!diagnosis.notes && (
                <View style={styles.notes}>
                  <Text style={styles.notesLabel}>메모</Text>
                  <Text style={styles.notesText}>{diagnosis.notes}</Text>
                </View>
              )}

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleResolve}>
                  <Ionicons name="checkmark-done" size={16} color={COLORS.success} />
                  <Text style={[styles.actionText, { color: COLORS.success }]}>완료 처리</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                  <Ionicons name="trash" size={16} color={COLORS.danger} />
                  <Text style={[styles.actionText, { color: COLORS.danger }]}>삭제</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.disclaimer}>
                ⓘ 참고용. 진단·치료는 소아과 상담이 필수예요.
              </Text>
            </ScrollView>
          ) : (
            error && <Text style={styles.errorText}>{error}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function sideLabel(side: string): string {
  switch (side) {
    case 'left': return '왼쪽'
    case 'right': return '오른쪽'
    case 'both': return '양쪽'
    default: return side
  }
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: NEUTRALS.white,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg,
    maxHeight: '88%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingBottom: SPACING.sm },
  emoji: { fontSize: 26 },
  title: { fontSize: FONT.h2, fontWeight: '800', color: NEUTRALS.ink },
  sub: { fontSize: FONT.caption, color: NEUTRALS.gray600 },

  errorText: { color: COLORS.danger, fontSize: FONT.bodySm },
  empty: { color: NEUTRALS.gray500, fontSize: FONT.bodySm },

  sectionLabel: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '700', marginTop: SPACING.sm },

  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NEUTRALS.gray50, borderRadius: 10, padding: SPACING.md, gap: 8,
  },
  taskTitle: { fontSize: FONT.bodyMd, fontWeight: '600', color: NEUTRALS.ink },
  taskHint: { fontSize: FONT.caption, color: NEUTRALS.gray600, marginTop: 2 },

  weekRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayCell: { width: '100%', height: 28, borderRadius: 6 },
  dayLabel: { fontSize: FONT.caption, color: NEUTRALS.gray600 },

  notes: {
    backgroundColor: NEUTRALS.gray50, borderRadius: 10, padding: SPACING.md, gap: 4,
  },
  notesLabel: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '700' },
  notesText: { fontSize: FONT.bodySm, color: NEUTRALS.gray800, lineHeight: 19 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: NEUTRALS.gray50,
  },
  actionText: { fontSize: FONT.bodySm, fontWeight: '700' },

  disclaimer: { fontSize: FONT.caption, color: NEUTRALS.gray500, textAlign: 'center', marginTop: 4 },
})
