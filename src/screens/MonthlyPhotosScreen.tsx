import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from '@react-navigation/native'

import {
  deleteMonthlyPhoto,
  getBabies,
  getMonthlyPhotos,
  uploadMonthlyPhoto,
} from '../api/babyLogApi'
import { useFamilyStream } from '../hooks/useFamilyStream'
import { useStoredBaby } from '../hooks/useStoredBaby'
import ErrorBanner from '../components/ErrorBanner'
import SuccessToast from '../components/SuccessToast'
import EmptyState from '../components/EmptyState'
import PromoBadge from '../components/PromoBadge'
import SlotCard from '../components/monthlyphoto/SlotCard'
import SlotModal from '../components/monthlyphoto/SlotModal'
import { extractErrorMessage } from '../utils/errors'
import type { Baby, MonthlyPhoto } from '../types'
import type { RootStackScreenProps } from '../navigation/types'
import { COLORS, FONT, NEUTRALS, SPACING } from '../utils/constants'

const COLS = 3
const TOTAL_MONTHS = 12

/**
 * 월 증명사진 — 1~12개월 슬롯 그리드.
 * 슬롯 1개당 사진 1장 (재촬영은 덮어쓰기). 같은 장소 가이드는 직전 슬롯 사진을
 * 모달에 같이 보여주는 방식. 카메라 ghost overlay 는 후속 Phase.
 */
export default function MonthlyPhotosScreen({ route, navigation }: RootStackScreenProps<'MonthlyPhotos'>) {
  const initialMonth = route.params?.initialMonthIndex ?? null
  const { babyId, familyId, babyName, initialized, loadBaby } = useStoredBaby()
  const [baby, setBaby] = useState<Baby | null>(null)
  const [photos, setPhotos] = useState<MonthlyPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [openSlot, setOpenSlot] = useState<number | null>(initialMonth)
  const [uploading, setUploading] = useState<number | null>(null)
  const { width } = useWindowDimensions()
  const slotSize = Math.floor((width - SPACING.lg * 2 - SPACING.sm * (COLS - 1)) / COLS)

  const load = useCallback(async (bid: string, fid: string) => {
    try {
      const [babyList, list] = await Promise.all([
        getBabies(fid),
        getMonthlyPhotos(bid),
      ])
      setBaby(babyList.find(b => b.id === bid) ?? null)
      setPhotos(list)
    } catch (err) {
      setError(extractErrorMessage(err, '월 증명사진을 불러오지 못했어요'))
    }
  }, [])

  useEffect(() => {
    if (!initialized) return
    if (babyId && familyId) {
      load(babyId, familyId).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [initialized, babyId, familyId, load])

  useFocusEffect(useCallback(() => { void loadBaby() }, [loadBaby]))

  // 가족 SSE — 다른 디바이스에서 사진을 올리거나 지우면 즉시 그리드 반영
  useFamilyStream(familyId, useCallback((event) => {
    if (event.type !== 'MONTHLY_PHOTO_UPSERTED' && event.type !== 'MONTHLY_PHOTO_DELETED') return
    if (!babyId || event.babyId !== babyId) return
    if (familyId) void load(babyId, familyId)
  }, [babyId, familyId, load]))

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  }
  if (!babyId || !baby) {
    return (
      <View style={styles.center}>
        <EmptyState icon="image-outline" title="아기를 먼저 등록해주세요" />
      </View>
    )
  }

  const slotPhoto = (m: number) => photos.find(p => p.monthIndex === m) ?? null
  const dueAt = (m: number) => addMonths(baby.birthDate, m)

  const pickAndUpload = async (m: number, source: 'gallery' | 'camera') => {
    try {
      if (source === 'gallery') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (perm.status !== 'granted') {
          setError('사진 라이브러리 권한이 필요해요')
          return
        }
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (perm.status !== 'granted') {
          setError('카메라 권한이 필요해요')
          return
        }
      }

      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.85,
        exif: false,
      }
      const result = source === 'gallery'
        ? await ImagePicker.launchImageLibraryAsync(opts)
        : await ImagePicker.launchCameraAsync(opts)
      if (result.canceled || !result.assets[0]) return

      const asset = result.assets[0]
      const file = {
        uri: asset.uri,
        name: asset.fileName ?? `monthly-${m}-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      }

      setUploading(m)
      const saved = await uploadMonthlyPhoto(babyId, m, file)
      setPhotos(prev => {
        const filtered = prev.filter(p => p.monthIndex !== m)
        return [...filtered, saved].sort((a, b) => a.monthIndex - b.monthIndex)
      })
      setSuccess(`${m}개월 사진 저장됨`)
      setOpenSlot(null)
    } catch (err) {
      setError(extractErrorMessage(err, '사진 업로드에 실패했어요'))
    } finally {
      setUploading(null)
    }
  }

  const removePhoto = (m: number) => {
    Alert.alert(
      `${m}개월 사진 삭제`,
      '이 사진을 삭제할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMonthlyPhoto(babyId, m)
              setPhotos(prev => prev.filter(p => p.monthIndex !== m))
              setOpenSlot(null)
              setSuccess(`${m}개월 사진 삭제됨`)
            } catch (err) {
              setError(extractErrorMessage(err, '삭제에 실패했어요'))
            }
          },
        },
      ],
    )
  }

  const monthIndices = Array.from({ length: TOTAL_MONTHS }, (_, i) => i + 1)

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessToast message={success} onHide={() => setSuccess(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.heroTitle}>월 증명사진</Text>
            <PromoBadge />
          </View>
          <Text style={styles.heroSub}>
            {babyName ?? '아기'}의 1~12개월. 한 달 한 컷, 같은 장소에서 찍어두면 첫 돌에 성장 과정이 한눈에 보여요.
          </Text>
          <TouchableOpacity
            style={styles.packageBtn}
            onPress={() => navigation.navigate('FirstYearPackage')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="첫 돌 패키지 만들기"
          >
            <Text style={styles.packageBtnText}>
              🎁  첫 돌 패키지 만들기 · {photos.length}/12
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {monthIndices.map((m) => {
            const photo = slotPhoto(m)
            return (
              <SlotCard
                key={m}
                size={slotSize}
                monthIndex={m}
                photo={photo}
                dueText={dueLabel(dueAt(m))}
                isUploading={uploading === m}
                onPress={() => setOpenSlot(m)}
              />
            )
          })}
        </View>
      </ScrollView>

      <SlotModal
        visible={openSlot !== null}
        slot={openSlot}
        photo={openSlot != null ? slotPhoto(openSlot) : null}
        prevPhoto={openSlot != null && openSlot > 1 ? slotPhoto(openSlot - 1) : null}
        dueText={openSlot != null ? dueLabel(dueAt(openSlot)) : ''}
        uploading={uploading !== null}
        onClose={() => setOpenSlot(null)}
        onPickGallery={(m) => void pickAndUpload(m, 'gallery')}
        onPickCamera={(m) => void pickAndUpload(m, 'camera')}
        onDelete={removePhoto}
      />
    </View>
  )
}

function addMonths(birthDateIso: string, months: number): Date {
  const [y, m, d] = birthDateIso.split('-').map(s => parseInt(s, 10))
  const date = new Date(y, (m - 1) + months, d)
  return date
}

function dueLabel(due: Date): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '오늘 도래'
  if (diff > 0) return `D-${diff}`
  if (diff > -30) return `${-diff}일 지남`
  return '지난 슬롯'
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryBg },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },

  heroCard: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  heroTitle: { fontSize: FONT.h2, fontWeight: '800', color: NEUTRALS.ink },
  heroSub: { fontSize: FONT.bodySm, color: NEUTRALS.gray600, lineHeight: 19 },
  packageBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  packageBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.bodySm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
})
