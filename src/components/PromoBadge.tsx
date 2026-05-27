import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { COLORS, FONT, SPACING } from '../utils/constants'

type Props = {
  /** 기본 "✨ 출시 기념 무료". 다른 카피 쓰고 싶을 때 override */
  label?: string
  /** small: chip 형태, medium: 카드 한 줄, large: 헤로 배너 */
  size?: 'small' | 'medium'
}

/**
 * 프리미엄 가치 기능에 다는 담백한 출시 기념 마크. 정가·카운트다운 없이 가벼운 chip.
 * 실제 결제 게이트는 추후 IAP 도입 시 별도.
 */
export default function PromoBadge({ label = '✨ 출시 기념 무료', size = 'small' }: Props) {
  const containerStyle = size === 'medium' ? styles.containerMd : styles.containerSm
  const textStyle = size === 'medium' ? styles.textMd : styles.textSm
  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  containerSm: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  containerMd: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: 999,
  },
  textSm: { color: COLORS.primary, fontSize: FONT.caption, fontWeight: '700' },
  textMd: { color: COLORS.primary, fontSize: FONT.label, fontWeight: '700' },
})
