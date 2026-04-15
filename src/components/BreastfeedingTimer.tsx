import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

type Side = 'left' | 'right'

type Props = {
  visible: boolean
  onComplete: (leftMinutes: number, rightMinutes: number) => void
  onCancel: () => void
}

function formatSecs(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function BreastfeedingTimer({ visible, onComplete, onCancel }: Props) {
  const [activeSide, setActiveSide] = useState<Side | null>(null)
  const [leftSeconds, setLeftSeconds] = useState(0)
  const [rightSeconds, setRightSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeSideRef = useRef<Side | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setActiveSide(null)
    activeSideRef.current = null
  }, [])

  const startSide = useCallback((side: Side) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setActiveSide(side)
    activeSideRef.current = side
    timerRef.current = setInterval(() => {
      if (activeSideRef.current === 'left') setLeftSeconds(s => s + 1)
      else if (activeSideRef.current === 'right') setRightSeconds(s => s + 1)
    }, 1000)
  }, [])

  const toggleSide = useCallback((side: Side) => {
    if (activeSide === side) stopTimer()
    else startSide(side)
  }, [activeSide, startSide, stopTimer])

  // Reset on open
  useEffect(() => {
    if (visible) {
      stopTimer()
      setLeftSeconds(0)
      setRightSeconds(0)
    }
    return stopTimer
  }, [visible])

  const handleComplete = () => {
    stopTimer()
    onComplete(leftSeconds / 60, rightSeconds / 60)
  }

  const total = leftSeconds + rightSeconds

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>모유 수유 타이머</Text>
          <Text style={styles.subtitle}>탭해서 시작 · 다시 탭해서 일시정지</Text>

          <View style={styles.sides}>
            {/* 왼쪽 */}
            <TouchableOpacity
              style={[styles.sideBtn, activeSide === 'left' && styles.sideBtnActive]}
              onPress={() => toggleSide('left')}
              activeOpacity={0.8}
            >
              <Text style={[styles.sideLabel, activeSide === 'left' && styles.sideLabelActive]}>왼쪽</Text>
              <Text style={[styles.sideTime, activeSide === 'left' && styles.sideTimeActive]}>
                {formatSecs(leftSeconds)}
              </Text>
              {activeSide === 'left' && <View style={styles.pulsingDot} />}
            </TouchableOpacity>

            {/* 오른쪽 */}
            <TouchableOpacity
              style={[styles.sideBtn, activeSide === 'right' && styles.sideBtnActive]}
              onPress={() => toggleSide('right')}
              activeOpacity={0.8}
            >
              <Text style={[styles.sideLabel, activeSide === 'right' && styles.sideLabelActive]}>오른쪽</Text>
              <Text style={[styles.sideTime, activeSide === 'right' && styles.sideTimeActive]}>
                {formatSecs(rightSeconds)}
              </Text>
              {activeSide === 'right' && <View style={styles.pulsingDot} />}
            </TouchableOpacity>
          </View>

          <Text style={styles.totalTime}>총 {formatSecs(total)}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeBtn, total === 0 && styles.completeBtnDisabled]}
              onPress={handleComplete}
              disabled={total === 0}
            >
              <Text style={styles.completeBtnText}>완료</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    gap: 16,
    paddingBottom: 40,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: -8 },
  sides: { flexDirection: 'row', gap: 16 },
  sideBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  sideBtnActive: { backgroundColor: '#FF6B9D' },
  sideLabel: { fontSize: 14, fontWeight: '600', color: '#888' },
  sideLabelActive: { color: 'rgba(255,255,255,0.85)' },
  sideTime: { fontSize: 32, fontWeight: '800', color: '#1a1a1a', fontVariant: ['tabular-nums'] },
  sideTimeActive: { color: '#fff' },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  totalTime: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, color: '#555', fontWeight: '600' },
  completeBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
  },
  completeBtnDisabled: { backgroundColor: '#ffb3cc' },
  completeBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
})
