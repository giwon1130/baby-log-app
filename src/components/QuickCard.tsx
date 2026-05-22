import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { NEUTRALS, FONT, SPACING } from '../utils/constants'

type Props = {
  icon: string
  title: string
  children: React.ReactNode
}

/**
 * 빠른 기록의 유형별 카드(수유·기저귀·수면) 공용 셸.
 * 아이콘 + 제목 헤더를 통일해 세 카드가 같은 리듬으로 보이게 한다.
 */
export default function QuickCard({ icon, title, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.md,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  icon: { fontSize: 18 },
  title: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
})
