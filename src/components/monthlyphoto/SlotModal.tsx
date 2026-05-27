import React from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { MonthlyPhoto } from '../../types'
import { COLORS, FONT, NEUTRALS, SPACING } from '../../utils/constants'

type Props = {
  visible: boolean
  slot: number | null
  photo: MonthlyPhoto | null
  prevPhoto: MonthlyPhoto | null
  dueText: string
  uploading: boolean
  onClose: () => void
  onPickGallery: (m: number) => void
  onPickCamera: (m: number) => void
  onDelete: (m: number) => void
}

/**
 * 슬롯 탭 시 띄우는 모달.
 * - 사진 있는 슬롯: 큰 미리보기 + 갤러리/카메라로 교체 + 삭제
 * - 빈 슬롯: 직전 슬롯 사진을 '참고'로 보여주고 갤러리/카메라 선택 유도
 */
export default function SlotModal({
  visible, slot, photo, prevPhoto, dueText, uploading,
  onClose, onPickGallery, onPickCamera, onDelete,
}: Props) {
  if (slot == null) return null
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { /* swallow */ }}>
          <View style={styles.header}>
            <Text style={styles.title}>{slot}개월 사진</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color={NEUTRALS.gray600} />
            </TouchableOpacity>
          </View>

          {photo ? (
            <View style={styles.body}>
              <Image source={{ uri: photo.photoUrl }} style={styles.image} resizeMode="cover" />
              <Text style={styles.caption}>{photo.caption ?? `${slot}개월차 한 컷`}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary, uploading && styles.btnDisabled]}
                  onPress={() => onPickGallery(slot)}
                  disabled={uploading}
                >
                  <Text style={styles.btnSecondaryText}>📷 갤러리로 교체</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary, uploading && styles.btnDisabled]}
                  onPress={() => onPickCamera(slot)}
                  disabled={uploading}
                >
                  <Text style={styles.btnSecondaryText}>📸 카메라로 다시</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => onDelete(slot)}
                disabled={uploading}
              >
                <Text style={styles.dangerText}>삭제</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.sub}>{dueText} · 평소 같은 장소에서 한 컷.</Text>
              {prevPhoto && (
                <View style={styles.prevPanel}>
                  <Text style={styles.prevLabel}>{prevPhoto.monthIndex}개월 (참고)</Text>
                  <Image source={{ uri: prevPhoto.photoUrl }} style={styles.prevImage} resizeMode="cover" />
                  <Text style={styles.prevHint}>같은 장소/포즈로 찍어두면 비교가 깔끔해져요</Text>
                </View>
              )}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, uploading && styles.btnDisabled]}
                  onPress={() => onPickGallery(slot)}
                  disabled={uploading}
                >
                  <Text style={styles.btnPrimaryText}>📷 갤러리에서</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, uploading && styles.btnDisabled]}
                  onPress={() => onPickCamera(slot)}
                  disabled={uploading}
                >
                  <Text style={styles.btnPrimaryText}>📸 카메라로</Text>
                </TouchableOpacity>
              </View>
              {uploading && (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.uploadingText}>업로드 중...</Text>
                </View>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: NEUTRALS.white,
    borderRadius: 18,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: FONT.h3, fontWeight: '700', color: NEUTRALS.ink },
  body: { gap: SPACING.md },
  sub: { fontSize: FONT.bodySm, color: NEUTRALS.gray650 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: NEUTRALS.gray100 },
  caption: { fontSize: FONT.bodySm, color: NEUTRALS.gray700, textAlign: 'center' },

  prevPanel: { gap: 6, alignItems: 'center' },
  prevLabel: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '600' },
  prevImage: { width: 140, height: 140, borderRadius: 10, backgroundColor: NEUTRALS.gray100 },
  prevHint: { fontSize: FONT.caption, color: NEUTRALS.gray500, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: SPACING.sm },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryText: { color: NEUTRALS.white, fontWeight: '700', fontSize: FONT.bodySm },
  btnSecondary: { backgroundColor: COLORS.primarySurface, borderWidth: 1, borderColor: COLORS.primary },
  btnSecondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.bodySm },
  btnDisabled: { opacity: 0.5 },

  dangerBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.dangerSurface,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  dangerText: { color: COLORS.danger, fontWeight: '700' },

  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  uploadingText: { color: NEUTRALS.gray700 },
})
