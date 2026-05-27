import React, { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { HealthTip } from '../../types'
import { COLORS, FONT, NEUTRALS, SPACING } from '../../utils/constants'

type Props = {
  visible: boolean
  tip: HealthTip | null
  submitting: boolean
  onClose: () => void
  onSubmit: (data: { tipId: string; side?: string; notes?: string }) => void
}

const SIDES: { key: string; label: string }[] = [
  { key: '', label: '해당 없음' },
  { key: 'left', label: '왼쪽' },
  { key: 'right', label: '오른쪽' },
  { key: 'both', label: '양쪽' },
]

/**
 * 카탈로그 카드 상세에서 "내 아기에 등록" 진입 모달.
 * 부위(좌/우/양쪽/없음) + 메모만. 시작일은 기본 오늘.
 */
export default function DiagnosisAddModal({ visible, tip, submitting, onClose, onSubmit }: Props) {
  const [side, setSide] = useState<string>('')
  const [notes, setNotes] = useState('')

  if (!tip) return null

  const handleSubmit = () => {
    onSubmit({
      tipId: tip.id,
      side: side || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { /* swallow */ }}>
          <View style={styles.header}>
            <Text style={styles.emoji}>{tip.emoji}</Text>
            <Text style={styles.title}>{tip.title} 진단 등록</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color={NEUTRALS.gray600} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>오늘부터 일일 체크리스트가 활성화돼요.</Text>

          <Text style={styles.label}>부위</Text>
          <View style={styles.sideRow}>
            {SIDES.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sideChip, side === s.key && styles.sideChipActive]}
                onPress={() => setSide(s.key)}
                accessibilityRole="button"
              >
                <Text style={[styles.sideChipText, side === s.key && styles.sideChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="예: 오른쪽 흉쇄유돌근 멍울. 소아과 추적 관찰 중"
            placeholderTextColor={NEUTRALS.gray400}
            multiline
            accessibilityLabel="진단 메모"
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={NEUTRALS.white} />
              : <Text style={styles.submitText}>등록하기</Text>}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            ⓘ 진단 자체는 소아과 진료 결과에 기반해 등록해주세요. 앱은 일일 체크 보조용.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: NEUTRALS.white,
    borderRadius: 18,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  emoji: { fontSize: 22 },
  title: { fontSize: FONT.h3, fontWeight: '800', color: NEUTRALS.ink, flex: 1 },
  sub: { fontSize: FONT.bodySm, color: NEUTRALS.gray650, marginBottom: 4 },
  label: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '600', marginTop: 4 },
  sideRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sideChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, backgroundColor: NEUTRALS.gray50,
  },
  sideChipActive: { backgroundColor: COLORS.primary },
  sideChipText: { fontSize: FONT.label, color: NEUTRALS.gray700, fontWeight: '600' },
  sideChipTextActive: { color: NEUTRALS.white },
  input: {
    borderWidth: 1, borderColor: NEUTRALS.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: FONT.bodyMd, color: NEUTRALS.ink,
    minHeight: 60, textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: NEUTRALS.white, fontSize: FONT.body, fontWeight: '700' },
  disclaimer: { fontSize: FONT.caption, color: NEUTRALS.gray500, textAlign: 'center' },
})
