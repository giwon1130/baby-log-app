import React, { useRef } from 'react'
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

type Props = {
  children: React.ReactNode
  onDelete: () => void
  confirmMessage?: string
}

export default function SwipeToDelete({ children, onDelete, confirmMessage = '이 기록을 삭제할까요?' }: Props) {
  const handleDelete = () => {
    Alert.alert('삭제', confirmMessage, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <View style={styles.container}>
      {children}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>삭제</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})
