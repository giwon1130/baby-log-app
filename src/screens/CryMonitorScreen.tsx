import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  Modal,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { CryDetector, type CryFeatureSummary } from '../../modules/cry-detector'
import { confirmCrySample, submitCrySample } from '../api/babyLogApi'
import { getStoredBabyId } from '../api/client'
import type { CryLabel, CrySample } from '../types'

const RECORD_SECONDS = 5
const LABEL_OPTIONS: { value: CryLabel; display: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'HUNGER', display: '배고픔', icon: 'restaurant' },
  { value: 'TIRED', display: '졸림', icon: 'moon' },
  { value: 'DISCOMFORT', display: '불편함', icon: 'alert-circle' },
  { value: 'BURP', display: '트림 필요', icon: 'water' },
  { value: 'PAIN', display: '통증', icon: 'bandage' },
  { value: 'UNKNOWN', display: '모르겠음', icon: 'help-circle' },
]

type Phase = 'idle' | 'recording' | 'analyzing' | 'result'

export default function CryMonitorScreen() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(RECORD_SECONDS)
  const [babyId, setBabyId] = useState<string | null>(null)
  const [sample, setSample] = useState<CrySample | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const [correctionModal, setCorrectionModal] = useState(false)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getStoredBabyId().then(setBabyId)
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current)
      CryDetector.stop().catch(() => {})
    }
  }, [])

  const beginRecording = useCallback(async () => {
    setError(null)
    setSample(null)

    if (Platform.OS !== 'ios') {
      setError('울음 분석은 iOS에서만 지원돼요')
      return
    }
    if (!babyId) {
      setError('아기 정보를 찾을 수 없어요. 먼저 프로필을 설정해주세요')
      return
    }

    const permStatus = await CryDetector.getPermissionStatus()
    if (permStatus !== 'granted') {
      const granted = await CryDetector.requestPermission()
      if (!granted) {
        setError('마이크 권한이 필요해요')
        return
      }
    }

    setPhase('recording')
    setCountdown(RECORD_SECONDS)

    // Visual countdown while native side is recording
    countdownTimer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownTimer.current) clearInterval(countdownTimer.current)
          return 0
        }
        return c - 1
      })
    }, 1000)

    let features: CryFeatureSummary
    try {
      features = await CryDetector.recordAndAnalyze(RECORD_SECONDS)
    } catch (e: any) {
      setError(e?.message ?? '녹음에 실패했어요')
      setPhase('idle')
      return
    }

    setPhase('analyzing')
    try {
      const result = await submitCrySample(babyId, {
        durationSec: features.durationSec,
        cryConfidenceAvg: features.cryConfidenceAvg,
        cryConfidenceMax: features.cryConfidenceMax,
        avgVolumeDb: features.avgVolumeDb,
        peakVolumeDb: features.peakVolumeDb,
        pitchMeanHz: features.pitchMeanHz,
        pitchStdHz: features.pitchStdHz,
        pitchMaxHz: features.pitchMaxHz,
        voicedRatio: features.voicedRatio,
        zcrMean: features.zcrMean,
        rhythmicity: features.rhythmicity,
      })
      setSample(result)
      setPhase('result')
    } catch (e: any) {
      setError(e?.message ?? '분석에 실패했어요')
      setPhase('idle')
    }
  }, [babyId])

  const handleConfirmCorrect = useCallback(async () => {
    if (!sample) return
    const topLabel = sample.predictions[0]?.label
    if (!topLabel) return
    try {
      const updated = await confirmCrySample(sample.id, topLabel)
      setSample(updated)
      setConfirmModal(false)
      Alert.alert('저장됐어요', '다음부터 더 정확해질 거예요 👶')
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? '다시 시도해주세요')
    }
  }, [sample])

  const handleCorrectLabel = useCallback(
    async (label: CryLabel) => {
      if (!sample) return
      try {
        const updated = await confirmCrySample(sample.id, label)
        setSample(updated)
        setCorrectionModal(false)
        setConfirmModal(false)
      } catch (e: any) {
        Alert.alert('저장 실패', e?.message ?? '다시 시도해주세요')
      }
    },
    [sample],
  )

  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="information-circle" size={48} color="#FF6B9D" />
          <Text style={styles.unsupported}>울음 분석은 iOS에서만 지원돼요</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {sample && (
          <LearningStageBanner stage={sample.learningStage} />
        )}

        {phase === 'idle' && !sample && (
          <View style={styles.heroCard}>
            <Ionicons name="mic-circle" size={72} color="#FF6B9D" />
            <Text style={styles.heroTitle}>울음 분석</Text>
            <Text style={styles.heroSub}>
              애기가 울 때 버튼을 누르면 {RECORD_SECONDS}초 녹음해서{'\n'}
              어떤 이유로 우는지 분석해 드려요.
            </Text>
            <Text style={styles.heroHint}>
              분석이 틀렸을 때 정답을 알려주면{'\n'}
              점점 우리 애기에 맞게 똑똑해집니다.
            </Text>
          </View>
        )}

        {phase === 'recording' && (
          <View style={styles.heroCard}>
            <View style={styles.pulseRing} />
            <Text style={styles.countdown}>{countdown}</Text>
            <Text style={styles.heroSub}>듣는 중...</Text>
          </View>
        )}

        {phase === 'analyzing' && (
          <View style={styles.heroCard}>
            <Ionicons name="analytics" size={64} color="#FF6B9D" />
            <Text style={styles.heroTitle}>분석 중...</Text>
          </View>
        )}

        {sample && phase === 'result' && (
          <ResultView sample={sample} onCorrect={() => setCorrectionModal(true)} onConfirm={handleConfirmCorrect} />
        )}

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={18} color="#D64545" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {phase !== 'recording' && phase !== 'analyzing' && (
          <TouchableOpacity
            style={[styles.button, sample ? styles.secondaryButton : styles.primaryButton]}
            onPress={beginRecording}
          >
            <Ionicons name="mic" size={22} color="#fff" />
            <Text style={styles.buttonText}>{sample ? '다시 분석' : '분석 시작'}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footnote}>
          녹음은 기기에서만 처리되고 저장되지 않아요. 숫자 특성값만 서버에 전송됩니다.
        </Text>
      </ScrollView>

      <CorrectionModal
        visible={correctionModal}
        onClose={() => setCorrectionModal(false)}
        onPick={handleCorrectLabel}
      />
    </SafeAreaView>
  )
}

// ── Result view ─────────────────────────────────────────────────────────────

function ResultView({
  sample,
  onCorrect,
  onConfirm,
}: {
  sample: CrySample
  onCorrect: () => void
  onConfirm: () => void
}) {
  const top = sample.predictions[0]
  const rest = sample.predictions.slice(1, 4).filter((p) => p.confidence > 0.03)
  const confirmed = sample.confirmedLabel != null

  if (!top) return null

  return (
    <View>
      <View style={styles.resultCard}>
        <Text style={styles.resultSmall}>가장 가능성 높은 이유</Text>
        <Text style={styles.resultLabel}>{top.labelDisplay}</Text>
        <ConfidenceBar value={top.confidence} />
        {top.reasons.length > 0 && (
          <View style={styles.reasonList}>
            {top.reasons.map((r, i) => (
              <Text key={i} style={styles.reasonText}>• {r}</Text>
            ))}
          </View>
        )}
      </View>

      {rest.length > 0 && (
        <View style={styles.altCard}>
          <Text style={styles.altTitle}>다른 가능성</Text>
          {rest.map((p) => (
            <View key={p.label} style={styles.altRow}>
              <Text style={styles.altLabel}>{p.labelDisplay}</Text>
              <View style={styles.altBar}>
                <View style={[styles.altBarFill, { width: `${Math.round(p.confidence * 100)}%` }]} />
              </View>
              <Text style={styles.altPct}>{Math.round(p.confidence * 100)}%</Text>
            </View>
          ))}
        </View>
      )}

      {confirmed ? (
        <View style={styles.confirmedCard}>
          <Ionicons name="checkmark-circle" size={20} color="#36C26A" />
          <Text style={styles.confirmedText}>
            '{sample.confirmedLabelDisplay}'(으)로 확인됨 — 다음부터 더 정확해져요
          </Text>
        </View>
      ) : (
        <View style={styles.feedbackRow}>
          <TouchableOpacity style={[styles.feedbackButton, styles.correctButton]} onPress={onConfirm}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.feedbackButtonText}>맞았어요</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.feedbackButton, styles.wrongButton]} onPress={onCorrect}>
            <Ionicons name="close" size={18} color="#fff" />
            <Text style={styles.feedbackButtonText}>다른 이유예요</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <View style={styles.confBar}>
      <View style={[styles.confBarFill, { width: `${Math.round(value * 100)}%` }]} />
      <Text style={styles.confBarText}>{Math.round(value * 100)}%</Text>
    </View>
  )
}

function LearningStageBanner({ stage }: { stage: CrySample['learningStage'] }) {
  const remaining = stage.nextStageAt != null ? stage.nextStageAt - stage.confirmedCount : null
  return (
    <View style={styles.stageBanner}>
      <Ionicons name="sparkles" size={16} color="#FF6B9D" />
      <View style={{ flex: 1 }}>
        <Text style={styles.stageTitle}>{stage.stageDisplay} · 확인 {stage.confirmedCount}회</Text>
        {remaining != null && stage.nextStageDisplay && (
          <Text style={styles.stageSub}>
            {remaining}회 더 확인하면 '{stage.nextStageDisplay}' 단계로 올라가요
          </Text>
        )}
      </View>
    </View>
  )
}

// ── Correction modal ────────────────────────────────────────────────────────

function CorrectionModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean
  onClose: () => void
  onPick: (label: CryLabel) => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <Text style={styles.modalTitle}>실제 이유는 뭐였나요?</Text>
          <Text style={styles.modalSub}>알려주시면 다음 분석에 반영됩니다</Text>
          {LABEL_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={styles.modalOption} onPress={() => onPick(opt.value)}>
              <Ionicons name={opt.icon} size={20} color="#FF6B9D" />
              <Text style={styles.modalOptionText}>{opt.display}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  unsupported: { fontSize: 16, color: '#666' },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    minHeight: 220,
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#222' },
  heroSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  heroHint: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18, marginTop: 4 },

  pulseRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FF6B9D22', borderWidth: 3, borderColor: '#FF6B9D',
  },
  countdown: { fontSize: 40, fontWeight: '700', color: '#FF6B9D' },

  stageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B9D',
  },
  stageTitle: { fontSize: 13, fontWeight: '600', color: '#222' },
  stageSub: { fontSize: 11, color: '#888', marginTop: 2 },

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  resultSmall: { fontSize: 12, color: '#888', fontWeight: '600' },
  resultLabel: { fontSize: 28, fontWeight: '700', color: '#222' },
  reasonList: { marginTop: 8, gap: 4 },
  reasonText: { fontSize: 13, color: '#666', lineHeight: 18 },

  confBar: {
    height: 28, backgroundColor: '#F0F0F0', borderRadius: 14,
    overflow: 'hidden', justifyContent: 'center',
  },
  confBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FF6B9D' },
  confBarText: {
    position: 'absolute', right: 12, color: '#fff', fontWeight: '700', fontSize: 13,
  },

  altCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 8, gap: 8,
  },
  altTitle: { fontSize: 12, color: '#888', fontWeight: '600' },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  altLabel: { width: 72, fontSize: 13, color: '#444' },
  altBar: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  altBarFill: { height: '100%', backgroundColor: '#FFB7CE' },
  altPct: { width: 40, textAlign: 'right', fontSize: 12, color: '#888' },

  feedbackRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  feedbackButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 50, borderRadius: 12,
  },
  correctButton: { backgroundColor: '#36C26A' },
  wrongButton: { backgroundColor: '#888' },
  feedbackButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  confirmedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F8EE', borderRadius: 12, padding: 12, marginTop: 12,
  },
  confirmedText: { flex: 1, fontSize: 13, color: '#2A7F4A' },

  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE', borderRadius: 12, padding: 12,
  },
  errorText: { color: '#D64545', flex: 1, fontSize: 13 },

  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: 14, marginTop: 4,
  },
  primaryButton: { backgroundColor: '#FF6B9D' },
  secondaryButton: { backgroundColor: '#555' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  footnote: { color: '#888', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 4, paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  modalSub: { fontSize: 13, color: '#888', marginBottom: 12 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  modalOptionText: { flex: 1, fontSize: 16, color: '#222' },
})
