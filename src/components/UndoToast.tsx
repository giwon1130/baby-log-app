import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text } from 'react-native'

export type UndoAction = {
  message: string
  onUndo: () => void | Promise<void>
}

type Props = {
  action: UndoAction | null
  onDismiss: () => void
  durationMs?: number
}

export default function UndoToast({ action, onDismiss, durationMs = 5000 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!action) return
    opacity.setValue(1)
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => onDismiss())
    }, durationMs)
    return () => clearTimeout(timer)
  }, [action, durationMs])

  if (!action) return null

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>✓ {action.message}</Text>
      <Pressable
        onPress={async () => {
          await action.onUndo()
          onDismiss()
        }}
        hitSlop={8}
      >
        <Text style={styles.undoText}>되돌리기</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: { color: '#fff', fontWeight: '600', fontSize: 14, flex: 1 },
  undoText: { color: '#FFB3C9', fontWeight: '700', fontSize: 14 },
})
