import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { CrySample } from '../../types'

/** Top banner showing current learning stage and progress to next stage. */
export function LearningStageBanner({ stage }: { stage: CrySample['learningStage'] }) {
  const remaining = stage.nextStageAt != null ? stage.nextStageAt - stage.confirmedCount : null
  return (
    <View style={styles.banner}>
      <Ionicons name="sparkles" size={16} color="#FF6B9D" />
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
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B9D',
  },
  title: { fontSize: 13, fontWeight: '600', color: '#222' },
  sub: { fontSize: 11, color: '#888', marginTop: 2 },
})
