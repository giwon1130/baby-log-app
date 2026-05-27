import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import ViewShot from 'react-native-view-shot'

import { getBabies, getMonthlyPhotos } from '../api/babyLogApi'
import { useStoredBaby } from '../hooks/useStoredBaby'
import ErrorBanner from '../components/ErrorBanner'
import SuccessToast from '../components/SuccessToast'
import EmptyState from '../components/EmptyState'
import PromoBadge from '../components/PromoBadge'
import { extractErrorMessage } from '../utils/errors'
import type { Baby, MonthlyPhoto } from '../types'
import { COLORS, FONT, NEUTRALS, SPACING } from '../utils/constants'

const TOTAL = 12

/**
 * 첫 돌 패키지 — 12개월 사진을 한 장의 deliverable 로 묶어 PDF/PNG 로 내보낸다.
 * - PDF: expo-print htmlToPdfAsync (인쇄·메일·파일 저장에 적합)
 * - PNG: react-native-view-shot 으로 RN 화면을 캡처 (SNS·메신저 공유에 적합)
 * 두 출력 모두 같은 layout (3x4 grid + 헤더 + 푸터) 을 공유.
 */
export default function FirstYearPackageScreen() {
  const { babyId, familyId, initialized } = useStoredBaby()
  const [baby, setBaby] = useState<Baby | null>(null)
  const [photos, setPhotos] = useState<MonthlyPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'image' | null>(null)
  const viewShotRef = useRef<ViewShot>(null)
  const { width } = useWindowDimensions()

  useEffect(() => {
    if (!initialized) return
    if (!babyId || !familyId) { setLoading(false); return }
    Promise.all([getBabies(familyId), getMonthlyPhotos(babyId)])
      .then(([babies, photoList]) => {
        setBaby(babies.find(b => b.id === babyId) ?? null)
        setPhotos(photoList)
      })
      .catch(err => setError(extractErrorMessage(err, '데이터를 불러오지 못했어요')))
      .finally(() => setLoading(false))
  }, [initialized, babyId, familyId])

  const slot = (m: number) => photos.find(p => p.monthIndex === m) ?? null
  const filled = photos.length
  const startDate = baby?.birthDate ?? ''
  const endDate = baby ? addMonths(baby.birthDate, 12) : ''

  const renderPdfHtml = useCallback(() => {
    if (!baby) return ''
    const slotHtml = (m: number) => {
      const p = slot(m)
      if (p) {
        return `
          <div class="slot">
            <img src="${escapeAttr(p.photoUrl)}" />
            <div class="month-badge">${m}개월</div>
          </div>`
      }
      return `<div class="slot empty"><div class="month-only">${m}개월</div></div>`
    }
    const slots = Array.from({ length: TOTAL }, (_, i) => slotHtml(i + 1)).join('')
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif; padding: 28pt; background: ${COLORS.primaryBg}; margin: 0; }
            .header { text-align: center; margin-bottom: 24pt; }
            .star { font-size: 32pt; }
            .name { font-size: 26pt; font-weight: 800; color: ${COLORS.primary}; margin-top: 4pt; }
            .meta { font-size: 12pt; color: #555; margin-top: 6pt; }
            .grid { display: flex; flex-wrap: wrap; gap: 8pt; }
            .slot {
              width: calc(33.33% - 6pt);
              aspect-ratio: 1;
              border-radius: 12pt;
              overflow: hidden;
              position: relative;
              background: ${COLORS.primarySurface};
              border: 1.5pt dashed ${COLORS.primaryDisabled};
              box-sizing: border-box;
            }
            .slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
            .month-badge {
              position: absolute; bottom: 6pt; left: 6pt;
              background: rgba(0,0,0,0.55);
              color: #fff;
              padding: 2pt 6pt;
              border-radius: 6pt;
              font-size: 9pt;
              font-weight: 700;
            }
            .slot.empty .month-only {
              text-align: center;
              padding-top: 38%;
              color: ${COLORS.primary};
              font-weight: 700;
              font-size: 14pt;
            }
            .footer { text-align: center; color: #888; font-size: 10pt; margin-top: 28pt; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="star">⭐</div>
            <div class="name">${escapeHtml(baby.name)}의 첫 해</div>
            <div class="meta">${startDate} ~ ${endDate}</div>
          </div>
          <div class="grid">${slots}</div>
          <div class="footer">BabyLog · 첫 돌 기념 (${filled}/${TOTAL} 채움)</div>
        </body>
      </html>
    `
  }, [baby, photos, filled, startDate, endDate])

  const exportPdf = useCallback(async () => {
    if (!baby) return
    try {
      setExporting('pdf')
      const html = renderPdfHtml()
      const { uri } = await Print.printToFileAsync({ html, base64: false })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${baby.name}의 첫 해`,
        })
        setSuccess('PDF 공유 시트를 열었어요')
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'PDF 생성에 실패했어요'))
    } finally {
      setExporting(null)
    }
  }, [baby, renderPdfHtml])

  const exportImage = useCallback(async () => {
    if (!baby || !viewShotRef.current) return
    try {
      setExporting('image')
      const captureFn = (viewShotRef.current as unknown as { capture?: () => Promise<string> }).capture
      if (!captureFn) throw new Error('캡처 기능을 초기화하지 못했어요')
      const uri = await captureFn()
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `${baby.name}의 첫 해`,
        })
        setSuccess('이미지 공유 시트를 열었어요')
      }
    } catch (err) {
      setError(extractErrorMessage(err, '이미지 생성에 실패했어요'))
    } finally {
      setExporting(null)
    }
  }, [baby])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  }
  if (!babyId || !baby) {
    return <View style={styles.center}><EmptyState icon="image-outline" title="아기 정보가 없어요" /></View>
  }

  const canvasWidth = Math.min(width - SPACING.lg * 2, 360)
  const slotSize = (canvasWidth - SPACING.lg * 2 - SPACING.sm * 2) / 3

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessToast message={success} onHide={() => setSuccess(null)} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ alignItems: 'center' }}>
          <PromoBadge size="medium" />
        </View>
        <Text style={styles.intro}>
          {baby.name}의 1~12개월을 한 장으로 묶어 공유하거나 인쇄할 수 있어요.
          현재 <Text style={{ fontWeight: '700', color: COLORS.primary }}>{filled}/12</Text> 채움.
        </Text>

        {/* 캡처 대상 — RN 뷰 트리. 이걸 그대로 view-shot 으로 PNG 캡처 */}
        <View style={styles.canvasWrapper}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
            style={[styles.canvas, { width: canvasWidth }]}
          >
            <Text style={styles.canvasStar}>⭐</Text>
            <Text style={styles.canvasName}>{baby.name}의 첫 해</Text>
            <Text style={styles.canvasMeta}>{startDate} ~ {endDate}</Text>
            <View style={[styles.grid, { width: canvasWidth - SPACING.lg * 2 }]}>
              {Array.from({ length: TOTAL }, (_, i) => i + 1).map((m) => {
                const p = slot(m)
                return p ? (
                  <View key={m} style={[styles.slot, { width: slotSize, height: slotSize }]}>
                    <Image source={{ uri: p.photoUrl }} style={styles.slotImage} resizeMode="cover" />
                    <View style={styles.slotBadge}><Text style={styles.slotBadgeText}>{m}개월</Text></View>
                  </View>
                ) : (
                  <View key={m} style={[styles.slot, styles.slotEmpty, { width: slotSize, height: slotSize }]}>
                    <Text style={styles.slotEmptyText}>{m}개월</Text>
                  </View>
                )
              })}
            </View>
            <Text style={styles.canvasFooter}>BabyLog · 첫 돌 기념 ({filled}/{TOTAL})</Text>
          </ViewShot>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, exporting != null && styles.btnDisabled]}
            onPress={exportPdf}
            disabled={exporting != null}
          >
            {exporting === 'pdf'
              ? <ActivityIndicator color={NEUTRALS.white} />
              : <Text style={styles.btnPrimaryText}>📄 PDF 저장/공유</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, exporting != null && styles.btnDisabled]}
            onPress={exportImage}
            disabled={exporting != null}
          >
            {exporting === 'image'
              ? <ActivityIndicator color={COLORS.primary} />
              : <Text style={styles.btnSecondaryText}>🖼 이미지 공유</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

function addMonths(birthDateIso: string, months: number): string {
  const [y, m, d] = birthDateIso.split('-').map(s => parseInt(s, 10))
  const date = new Date(y, (m - 1) + months, d)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
function escapeAttr(s: string): string { return escapeHtml(s) }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryBg },
  scrollContent: { padding: SPACING.lg, gap: SPACING.md, alignItems: 'center' },
  intro: { fontSize: FONT.bodySm, color: NEUTRALS.gray700, textAlign: 'center', lineHeight: 20 },
  canvasWrapper: { alignItems: 'center' },
  canvas: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 2,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  canvasStar: { fontSize: 28, marginBottom: 2 },
  canvasName: { fontSize: FONT.h1, fontWeight: '800', color: COLORS.primary },
  canvasMeta: { fontSize: FONT.bodySm, color: NEUTRALS.gray650, marginBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  slot: { borderRadius: 10, overflow: 'hidden', position: 'relative' },
  slotImage: { width: '100%', height: '100%' },
  slotBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 6,
  },
  slotBadgeText: { color: NEUTRALS.white, fontSize: 9, fontWeight: '700' },
  slotEmpty: {
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1, borderColor: COLORS.primaryDisabled, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  slotEmptyText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.bodySm },
  canvasFooter: { fontSize: FONT.caption, color: NEUTRALS.gray500, marginTop: SPACING.md },
  actions: { gap: SPACING.sm, width: '100%', maxWidth: 360 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryText: { color: NEUTRALS.white, fontWeight: '700', fontSize: FONT.body },
  btnSecondary: { backgroundColor: COLORS.primarySurface, borderWidth: 1, borderColor: COLORS.primary },
  btnSecondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.body },
  btnDisabled: { opacity: 0.6 },
})
