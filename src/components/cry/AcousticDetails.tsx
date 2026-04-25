import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { CryFeatureSummary } from '../../../modules/cry-detector'
import { buildFeatureRows } from '../../utils/cryFeatures'

/**
 * "분석 디테일" card — shows the raw audio features the classifier saw, with a
 * friendly interpretation. Helps the user understand why a label was chosen and
 * gives them confidence when they correct it.
 */
export function AcousticDetails({ features }: { features: CryFeatureSummary }) {
  const rows = buildFeatureRows(features)
  if (rows.length === 0) return null

  return (
    <View style={styles.card}>
      <Text style={styles.title}>분석 디테일</Text>
      {rows.map((row, i) => (
        <View key={i} style={[styles.row, row.emphasis && styles.rowEmphasis]}>
          <Ionicons name={row.icon} size={18} color={row.emphasis ? '#FF6B9D' : '#888'} />
          <View style={{ flex: 1 }}>
            <View style={styles.line}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={[styles.value, row.emphasis && styles.valueEmphasis]}>
                {row.value}
              </Text>
            </View>
            <Text style={styles.hint}>{row.hint}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 8, gap: 10 },
  title: { fontSize: 12, color: '#888', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  rowEmphasis: {
    backgroundColor: '#FFF4F8',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  line: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { fontSize: 13, color: '#444', fontWeight: '600' },
  value: { fontSize: 13, color: '#666', fontWeight: '600' },
  valueEmphasis: { color: '#FF6B9D', fontWeight: '700' },
  hint: { fontSize: 11, color: '#888', marginTop: 2 },
})
