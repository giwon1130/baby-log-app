import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  message: string | null
  onDismiss: () => void
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  if (!message) return null
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  text: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  dismiss: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
