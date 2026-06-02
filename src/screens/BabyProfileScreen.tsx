import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { deleteBaby, getBabies, getFamily, updateBaby } from '../api/babyLogApi'
import { clearStoredBaby, setStoredBaby, storeFamilyAndBaby } from '../api/client'
import { useStoredBaby } from '../hooks/useStoredBaby'
import { exportBabyDataCsv, exportBabyDataJson } from '../utils/exportData'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import { NotificationSettingsCard } from '../components/NotificationSettingsCard'
import BabyEditForm from '../components/baby/BabyEditForm'
import NewBadge from '../components/NewBadge'
import type { Baby, Family } from '../types'
import type { MainTabScreenProps } from '../navigation/types'
import { extractErrorMessage } from '../utils/errors'

import { COLORS, NEUTRALS, FONT } from '../utils/constants'
const GENDER_LABEL: Record<string, string> = { MALE: '남아', FEMALE: '여아' }

export default function BabyProfileScreen({ navigation }: MainTabScreenProps<'BabyProfile'>) {
  const { babyId: storedBabyId, familyId, initialized, loadBaby } = useStoredBaby()
  const [loading, setLoading] = useState(true)
  const [babies, setBabies] = useState<Baby[]>([])
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  // 편집 상태 — 자식 컴포넌트가 입력 state 들고 있고, 부모는 토글·저장 흐름만
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null)

  const loadAll = async (fid: string, bid: string | null) => {
    const [babyList, fam] = await Promise.all([
      getBabies(fid).catch(() => [] as Baby[]),
      getFamily(fid).catch(() => null),
    ])
    setBabies(babyList)
    setFamily(fam)

    const current = babyList.find(b => b.id === bid) ?? babyList[0]
    if (current) setSelectedBaby(current)
  }

  useEffect(() => {
    if (!initialized) return
    const init = async () => {
      if (familyId) await loadAll(familyId, storedBabyId)
      setLoading(false)
    }
    init()
  }, [initialized, familyId, storedBabyId])

  useFocusEffect(useCallback(() => {
    loadBaby().then(({ babyId: bid, familyId: fid }) => {
      if (fid) loadAll(fid, bid)
    })
  }, [loadBaby]))

  const handleSelectBaby = async (baby: Baby) => {
    setSelectedBaby(baby)
    setEditing(false)
    if (familyId) {
      await storeFamilyAndBaby(familyId, baby.id)
    }
  }

  const handleSave = async (input: { name?: string; birthWeightG?: number; birthHeightCm?: number }) => {
    if (!familyId || !selectedBaby) return
    setSaving(true)
    try {
      const updated = await updateBaby(familyId, selectedBaby.id, input)
      setSelectedBaby(updated)
      setBabies(prev => prev.map(b => b.id === updated.id ? updated : b))
      setEditing(false)
    } catch (err) {
      setError(extractErrorMessage(err, '저장에 실패했어요'))
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async (kind: 'csv' | 'json') => {
    if (!selectedBaby || exporting) return
    setExporting(kind)
    try {
      const count = kind === 'csv'
        ? await exportBabyDataCsv(selectedBaby)
        : await exportBabyDataJson(selectedBaby)
      if (count === 0) Alert.alert('내보낼 기록 없음', '아직 기록된 데이터가 없어요.')
    } catch (err) {
      setError(extractErrorMessage(err, '내보내기에 실패했어요'))
    } finally {
      setExporting(null)
    }
  }

  const copyInviteCode = async () => {
    if (!family) return
    await Clipboard.setStringAsync(family.inviteCode)
    Alert.alert('복사됨', `초대 코드 ${family.inviteCode}가 클립보드에 복사됐어요.`)
  }

  const handleDeleteBaby = () => {
    if (!familyId || !selectedBaby) return
    const target = selectedBaby
    Alert.alert(
      `⚠️ ${target.name} 졸업`,
      `정말 졸업하시겠어요?\n\n${target.name}의 모든 기록(수유·수면·기저귀·성장·건강)이 영구적으로 삭제돼요. 한번 졸업하면 되돌릴 수 없어요.\n\n그동안 정말 수고 많았어요 💛`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '졸업하기',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await deleteBaby(familyId, target.id)
              const remaining = babies.filter(b => b.id !== target.id)
              setBabies(remaining)
              if (remaining.length > 0) {
                const next = remaining[0]
                setSelectedBaby(next)
                await setStoredBaby(next.id)
              } else {
                setSelectedBaby(null)
                await clearStoredBaby()
              }
              setEditing(false)
              // 졸업 버튼은 화면 맨 아래 — 완료 후 맨 위로 올려
              // 졸업된 아기가 사라지고 다음 아기로 바뀐 걸 바로 보이게
              scrollRef.current?.scrollTo({ y: 0, animated: true })
              Alert.alert(
                '🎓 졸업 완료',
                `${target.name}의 모든 기록이 정리됐어요.\n그동안 정말 수고 많으셨어요 💛`,
              )
            } catch (err) {
              setError(extractErrorMessage(err, '삭제에 실패했어요'))
            } finally {
              setDeleting(false)
            }
          },
        },
      ],
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!familyId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>가족을 먼저 설정해주세요</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('FamilySetup')}
        >
          <Text style={styles.primaryButtonText}>설정하기</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* 아기 선택 탭 + 추가 버튼 */}
      <View style={styles.babyTabRow}>
        {babies.length > 0 && (
          <View style={styles.babyTabs}>
            {babies.map(baby => (
              <TouchableOpacity
                key={baby.id}
                style={[styles.babyTab, selectedBaby?.id === baby.id && styles.babyTabActive]}
                onPress={() => handleSelectBaby(baby)}
              >
                <Text style={[styles.babyTabText, selectedBaby?.id === baby.id && styles.babyTabTextActive]}>
                  {baby.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.addBabyBtn}
          onPress={() => navigation.navigate('FamilySetup', { mode: 'addBaby', familyId })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="아기 추가"
        >
          <Text style={styles.addBabyBtnText}>+ 아기 추가</Text>
        </TouchableOpacity>
      </View>

      {selectedBaby ? (
        <>
          <View style={styles.card}>
            <View style={styles.babyHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {selectedBaby.gender === 'MALE' ? '👦' : '👧'}
                </Text>
              </View>
              <View style={styles.babyHeaderInfo}>
                <Text style={styles.babyName}>{selectedBaby.name}</Text>
                <Text style={styles.babyMeta}>
                  {GENDER_LABEL[selectedBaby.gender]} · D+{selectedBaby.daysOld}일
                </Text>
              </View>
              {!editing && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditing(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="아기 정보 수정"
                >
                  <Text style={styles.editBtnText}>수정</Text>
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <BabyEditForm
                baby={selectedBaby}
                saving={saving}
                onSave={handleSave}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>생년월일</Text>
                  <Text style={styles.statValue}>{selectedBaby.birthDate}</Text>
                </View>
                {selectedBaby.birthWeightG && (
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>출생 체중</Text>
                    <Text style={styles.statValue}>{(selectedBaby.birthWeightG / 1000).toFixed(2)}kg</Text>
                  </View>
                )}
                {selectedBaby.birthHeightCm && (
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>출생 신장</Text>
                    <Text style={styles.statValue}>{selectedBaby.birthHeightCm}cm</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 수유 가이드 → 홈 화면으로 이동. 성장 기록 / 월 증명사진 → 통계 탭으로 이동.
              아기 탭은 프로필·설정·관리 영역만 남김. */}

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('HealthTips')}
            activeOpacity={0.7}
          >
            <View style={styles.cardTitleRow}>
              <Text style={styles.sectionTitle}>🩺 건강 가이드</Text>
              <NewBadge />
            </View>
            <Text style={styles.guideText}>신생아 0~12개월 흔한 이슈와 체크사항 · AI 자유 질문 ›</Text>
          </TouchableOpacity>

          <NotificationSettingsCard />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>가족 초대</Text>
            <Text style={styles.inviteDesc}>
              이 코드를 공유하면 파트너가 같은 아기를 함께 관리할 수 있어요.
            </Text>
            <TouchableOpacity style={styles.inviteCodeBox} onPress={copyInviteCode} activeOpacity={0.7}>
              <Text style={styles.inviteCode}>{family?.inviteCode ?? '...'}</Text>
              <Text style={styles.inviteCopyHint}>탭해서 복사</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>데이터 내보내기</Text>
            <Text style={styles.exportDesc}>
              수유·기저귀·수면·성장 기록 전체를 파일로 저장하거나 공유해요.{'\n'}
              산부인과 제출엔 CSV(엑셀), 백업엔 JSON 을 권해요.
            </Text>
            <View style={styles.exportRow}>
              <TouchableOpacity
                style={[styles.exportBtn, !!exporting && styles.exportBtnDisabled]}
                onPress={() => handleExport('csv')}
                disabled={!!exporting}
                activeOpacity={0.8}
              >
                <Text style={styles.exportBtnText}>{exporting === 'csv' ? '내보내는 중…' : '📊 CSV'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, !!exporting && styles.exportBtnDisabled]}
                onPress={() => handleExport('json')}
                disabled={!!exporting}
                activeOpacity={0.8}
              >
                <Text style={styles.exportBtnText}>{exporting === 'json' ? '내보내는 중…' : '🗄️ JSON'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>신생아 졸업</Text>
            <Text style={styles.dangerDesc}>
              신생아 시기를 마치고 이 앱과 작별할 때, 모든 기록을 정리하고 졸업할 수 있어요.{'\n'}
              한번 졸업하면 되돌릴 수 없으니 신중하게 결정해주세요.
            </Text>
            <TouchableOpacity
              style={[styles.dangerBtn, deleting && styles.dangerBtnDisabled]}
              onPress={handleDeleteBaby}
              disabled={deleting}
              activeOpacity={0.8}
            >
              <Text style={styles.dangerBtnText}>
                {deleting ? '졸업 처리 중...' : `🎓  ${selectedBaby.name} 졸업하기`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <EmptyState icon="person-add-outline" title="아기 정보가 없어요" />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('FamilySetup')}
          >
            <Text style={styles.primaryButtonText}>아기 등록하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  babyTabRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  babyTabs: { flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addBabyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addBabyBtnText: { fontSize: FONT.label, color: COLORS.primary, fontWeight: '600' },
  babyTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: NEUTRALS.gray50,
  },
  babyTabActive: { backgroundColor: COLORS.primary },
  babyTabText: { fontSize: FONT.bodySm, color: NEUTRALS.gray700, fontWeight: '600' },
  babyTabTextActive: { color: NEUTRALS.white },
  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  babyHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  babyHeaderInfo: { flex: 1 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FONT.display },
  babyName: { fontSize: FONT.h1, fontWeight: '700', color: NEUTRALS.ink },
  babyMeta: { fontSize: FONT.bodySm, color: NEUTRALS.gray600, marginTop: 2 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editBtnText: { fontSize: FONT.label, color: COLORS.primary, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1 },
  statLabel: { fontSize: FONT.caption, color: NEUTRALS.gray500, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: FONT.body, fontWeight: '600', color: NEUTRALS.gray800, marginTop: 2 },
  sectionTitle: { fontSize: FONT.bodyMd, fontWeight: '700', color: NEUTRALS.ink },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideText: { fontSize: FONT.bodyMd, color: NEUTRALS.gray700 },
  inviteDesc: { fontSize: FONT.bodySm, color: '#777' },
  inviteCodeBox: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  inviteCode: { fontSize: 24, fontWeight: '800', color: COLORS.primary, letterSpacing: 4 },
  inviteCopyHint: { fontSize: FONT.caption, color: '#FFAAC8' },
  emptyTitle: { fontSize: FONT.h4, fontWeight: '600', color: NEUTRALS.gray650 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: NEUTRALS.white, fontWeight: '700', fontSize: FONT.body },
  exportDesc: { fontSize: FONT.label, color: NEUTRALS.gray500, lineHeight: 18 },
  exportRow: { flexDirection: 'row', gap: 12 },
  exportBtn: {
    flex: 1,
    backgroundColor: COLORS.primarySurface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: FONT.bodyMd, color: COLORS.primary, fontWeight: '700' },
  dangerDesc: { fontSize: FONT.label, color: NEUTRALS.gray500, lineHeight: 18 },
  dangerBtn: {
    backgroundColor: COLORS.dangerSurface,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnDisabled: { opacity: 0.6 },
  dangerBtnText: { fontSize: FONT.bodyMd, color: COLORS.danger, fontWeight: '700' },
})
