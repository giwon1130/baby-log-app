import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { CrySample } from '../../types'

import { COLORS, NEUTRALS } from '../../utils/constants'
/** Top banner showing current learning stage and progress to next stage. */
export function LearningStageBanner({ stage }: { stage: CrySample['learningStage'] }) {
  const remaining = stage.nextStageAt != null ? stage.nextStageAt - stage.confirmedCount : null
  return (
    <View style={styles.banner}>
      <Ionicons name="sparkles" size={16} color={COLORS.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{stage.stageDisplay} · 확인 {stage.confirmedCount}회</Text>
        {remaining != null && stage.nextStageDisplay && (
          <Text style={styles.sub}>
            {remaining}회 더 확인하면 '{stage.nextStageDisplay}' 단계로 올라가요
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NEUTRALS.white,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  title: { fontSize: 13, fontWeight: '600', color: NEUTRALS.gray850 },
  sub: { fontSize: 11, color: NEUTRALS.gray600, marginTop: 2 },
})
