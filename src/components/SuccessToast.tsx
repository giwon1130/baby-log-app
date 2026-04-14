import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'

type Props = {
  message: string | null
  onHide: () => void
}

export default function SuccessToast({ message, onHide }: Props) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!message) return
    opacity.setValue(1)
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onHide())
    }, 1500)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>✓ {message}</Text>
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
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
