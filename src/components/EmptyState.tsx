import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, FONT, NEUTRALS } from '../utils/constants'

type Props = {
  /** lucide 대신 Ionicons 사용 (앱 전반과 톤 통일). 없으면 텍스트만. */
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  hint?: string
  /** 'inline' = FlatList ListEmpty 같은 인라인. 'card' = 카드 박스 안. 기본 inline. */
  variant?: 'inline' | 'card'
}

/**
 * 빈 상태 공용 컴포넌트.
 * 화면마다 다르게 색·크기·텍스트 구조가 흩어져 있던 빈 상태 표현을 한 톤으로 통일.
 */
export default function EmptyState({ icon, title, hint, variant = 'inline' }: Props) {
  const Container = variant === 'card' ? CardContainer : InlineContainer
  return (
    <Container>
      {icon && <Ionicons name={icon} size={40} color={COLORS.primaryDisabled} />}
      <Text style={styles.title}>{title}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </Container>
  )
}

function InlineContainer({ children }: { children: React.ReactNode }) {
  return <View style={styles.inline}>{children}</View>
}

function CardContainer({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

const styles = StyleSheet.create({
  inline: { alignItems: 'center', gap: 6, paddingVertical: 40 },
  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: FONT.bodyMd, color: NEUTRALS.gray600, fontWeight: '600' },
  hint: { fontSize: FONT.bodySm, color: NEUTRALS.gray400, textAlign: 'center', paddingHorizontal: 24 },
})
