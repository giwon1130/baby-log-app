import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

/** Horizontal bar showing a 0–1 confidence value with overlaid percentage. */
export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <View style={styles.bar}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
      <Text style={styles.text}>{pct}%</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    height: 28,
    backgroundColor: '#F0F0F0',
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FF6B9D' },
  text: { position: 'absolute', right: 12, color: '#fff', fontWeight: '700', fontSize: 13 },
})
