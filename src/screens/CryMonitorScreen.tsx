import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

import { CryDetector, type CryFeatureSummary } from '../../modules/cry-detector'
import { confirmCrySample, submitCrySample } from '../api/babyLogApi'
import { getStoredBabyId } from '../api/client'
import type { CryLabel, CrySample } from '../types'
import { CorrectionModal } from '../components/cry/CorrectionModal'
import { LearningStageBanner } from '../components/cry/LearningStageBanner'
import { ResultView } from '../components/cry/ResultView'

const RECORD_SECONDS = 5

type Phase = 'idle' | 'recording' | 'analyzing' | 'result'

/**
 * Cry analysis screen — record a short clip, send extracted features to the
 * backend classifier, and let the parent confirm or correct the predicted
 * label so the per-baby model improves over time.
 *
 * Sub-components live in `src/components/cry/` to keep this file focused on
 * orchestration (state machine, recording flow, error handling).
 */
export default function CryMonitorScreen() {
  const navigation = useNavigation<any>()
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(RECORD_SECONDS)
  const [babyId, setBabyId] = useState<string | null>(null)
  const [sample, setSample] = useState<CrySample | null>(null)
  const [lastFeatures, setLastFeatures] = useState<CryFeatureSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
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

    // Visual countdown while native side records
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
      setLastFeatures(features)
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
        {sample && <LearningStageBanner stage={sample.learningStage} />}

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
          <ResultView
            sample={sample}
            features={lastFeatures}
            onCorrect={() => setCorrectionModal(true)}
            onConfirm={handleConfirmCorrect}
          />
        )}

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={18} color="#D64545" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {phase !== 'recording' && phase !== 'analyzing' && (
          <>
            <TouchableOpacity
              style={[styles.button, sample ? styles.secondaryButton : styles.primaryButton]}
              onPress={beginRecording}
            >
              <Ionicons name="mic" size={22} color="#fff" />
              <Text style={styles.buttonText}>{sample ? '다시 분석' : '분석 시작'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('CryHistory')}
            >
              <Ionicons name="time-outline" size={18} color="#FF6B9D" />
              <Text style={styles.linkButtonText}>분석 기록 보기</Text>
              <Ionicons name="chevron-forward" size={16} color="#FF6B9D" />
            </TouchableOpacity>
          </>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B9D22',
    borderWidth: 3,
    borderColor: '#FF6B9D',
  },
  countdown: { fontSize: 40, fontWeight: '700', color: '#FF6B9D' },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: '#D64545', flex: 1, fontSize: 13 },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryButton: { backgroundColor: '#FF6B9D' },
  secondaryButton: { backgroundColor: '#555' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  linkButtonText: { color: '#FF6B9D', fontWeight: '600', fontSize: 14 },

  footnote: { color: '#888', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 },
})
