import React, { useState } from 'react'
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'

type Props = {
  value: Date
  onChange: (date: Date) => void
}

function formatDisplay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일`
}

export default function BirthDatePicker({ value, onChange }: Props) {
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIos, setShowIos] = useState(false)
  const [tempDate, setTempDate] = useState(value)

  const maxDate = new Date()

  if (Platform.OS === 'android') {
    return (
      <>
        <TouchableOpacity style={styles.trigger} onPress={() => setShowAndroid(true)}>
          <Text style={styles.triggerText}>{formatDisplay(value)}</Text>
          <Text style={styles.triggerIcon}>📅</Text>
        </TouchableOpacity>
        {showAndroid && (
          <DateTimePicker
            value={value}
            mode="date"
            display="calendar"
            maximumDate={maxDate}
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              setShowAndroid(false)
              if (event.type === 'set' && date) onChange(date)
            }}
          />
        )}
      </>
    )
  }

  // iOS: 바텀시트 모달 안에 인라인 spinner
  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => { setTempDate(value); setShowIos(true) }}>
        <Text style={styles.triggerText}>{formatDisplay(value)}</Text>
        <Text style={styles.triggerIcon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={showIos} transparent animationType="slide" onRequestClose={() => setShowIos(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={() => setShowIos(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setShowIos(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>생년월일</Text>
              <TouchableOpacity onPress={() => { onChange(tempDate); setShowIos(false) }}>
                <Text style={styles.doneText}>완료</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              maximumDate={maxDate}
              locale="ko-KR"
              onChange={(_: DateTimePickerEvent, date?: Date) => {
                if (date) setTempDate(date)
              }}
              style={styles.picker}
            />
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FF6B9D',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff8fb',
  },
  triggerText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  triggerIcon: { fontSize: 18 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cancelText: { fontSize: 15, color: '#aaa' },
  doneText: { fontSize: 15, fontWeight: '700', color: '#FF6B9D' },
  picker: { height: 200 },
})
