import React from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { MonthlyPhoto } from '../../types'
import { COLORS, FONT, NEUTRALS } from '../../utils/constants'

type Props = {
  size: number
  monthIndex: number
  photo: MonthlyPhoto | null
  dueText: string
  isUploading: boolean
  onPress: () => void
}

/** 월 증명사진 그리드의 슬롯 한 칸 — 사진 있으면 thumbnail, 없으면 도래일 + 추가 hint */
export default function SlotCard({ size, monthIndex, photo, dueText, isUploading, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.slot, { width: size, height: size }]}
      accessibilityRole="button"
      accessibilityLabel={photo ? `${monthIndex}개월 사진` : `${monthIndex}개월 사진 추가`}
    >
      {photo ? (
        <>
          <Image source={{ uri: photo.photoUrl }} style={styles.slotImage} resizeMode="cover" />
          <View style={styles.slotMonthBadge}>
            <Text style={styles.slotMonthBadgeText}>{monthIndex}개월</Text>
          </View>
        </>
      ) : (
        <View style={styles.slotEmpty}>
          <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
          <Text style={styles.slotEmptyMonth}>{monthIndex}개월</Text>
          <Text style={styles.slotEmptyDue}>{dueText}</Text>
        </View>
      )}
      {isUploading && (
        <View style={styles.slotOverlay}>
          <ActivityIndicator color={NEUTRALS.white} />
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  slot: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: NEUTRALS.white,
    position: 'relative',
  },
  slotImage: { width: '100%', height: '100%' },
  slotMonthBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  slotMonthBadgeText: { color: NEUTRALS.white, fontSize: FONT.label, fontWeight: '700' },
  slotEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1.5,
    borderColor: COLORS.primaryDisabled,
    borderStyle: 'dashed',
    borderRadius: 14,
  },
  slotEmptyMonth: { fontSize: FONT.bodySm, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  slotEmptyDue: { fontSize: FONT.caption, color: NEUTRALS.gray500 },
  slotOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
