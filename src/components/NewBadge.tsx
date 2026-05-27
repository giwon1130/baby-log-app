import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { COLORS, FONT, NEUTRALS } from '../utils/constants'

type Props = {
  /** 기본 "NEW". 다른 카피를 쓰고 싶을 때 override */
  label?: string
}

/**
 * 새로 추가된 기능 진입점에 다는 작은 마커.
 * PromoBadge('출시 기념 무료')와 톤이 다르도록 액센트 컬러로 분리.
 */
export default function NewBadge({ label = 'NEW' }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    color: NEUTRALS.white,
    fontSize: FONT.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
