import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { COLORS, NEUTRALS, FONT, SPACING } from '../utils/constants'

type Props = {
  message: string | null
  onDismiss: () => void
  /** 있으면 "재시도" 버튼이 노출됨. 누르면 배너를 닫고 재시도 동작을 실행. */
  onRetry?: () => void
}

export default function ErrorBanner({ message, onDismiss, onRetry }: Props) {
  if (!message) return null
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={() => { onDismiss(); onRetry() }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="재시도"
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>재시도</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="에러 메시지 닫기"
      >
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorStrong,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    gap: SPACING.md,
  },
  text: { flex: 1, color: NEUTRALS.white, fontSize: FONT.bodySm, fontWeight: '600' },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryText: { color: NEUTRALS.white, fontSize: FONT.label, fontWeight: '700' },
  dismiss: { color: NEUTRALS.white, fontSize: FONT.h4, fontWeight: '700' },
})
