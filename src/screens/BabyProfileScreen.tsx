import React, { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { deleteBaby, getBabies, getFamily, getGrowthStage, updateBaby } from '../api/babyLogApi'
import { clearStoredBaby, setStoredBaby, storeFamilyAndBaby } from '../api/client'
import { useStoredBaby } from '../hooks/useStoredBaby'
import ErrorBanner from '../components/ErrorBanner'
import { NotificationSettingsCard } from '../components/NotificationSettingsCard'
import type { Baby, Family, GrowthStage } from '../types'
import type { MainTabScreenProps } from '../navigation/types'
import { extractErrorMessage } from '../utils/errors'

import { COLORS, NEUTRALS, FONT } from '../utils/constants'
const GENDER_LABEL: Record<string, string> = { MALE: '남아', FEMALE: '여아' }

export default function BabyProfileScreen({ navigation }: MainTabScreenProps<'BabyProfile'>) {
  const { babyId: storedBabyId, familyId, initialized, loadBaby } = useStoredBaby()
  const [loading, setLoading] = useState(true)
  const [babies, setBabies] = useState<Baby[]>([])
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null)
  const [growthStage, setGrowthStage] = useState<GrowthStage | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 편집 상태
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editWeightG, setEditWeightG] = useState('')
  const [editHeightCm, setEditHeightCm] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadAll = async (fid: string, bid: string | null) => {
    const [babyList, fam] = await Promise.all([
      getBabies(fid).catch(() => [] as Baby[]),
      getFamily(fid).catch(() => null),
    ])
    setBabies(babyList)
    setFamily(fam)

    const current = babyList.find(b => b.id === bid) ?? babyList[0]
    if (current) {
      setSelectedBaby(current)
      const stage = await getGrowthStage(current.id, fid).catch(() => null)
      setGrowthStage(stage)
    }
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
      const stage = await getGrowthStage(baby.id, familyId).catch(() => null)
      setGrowthStage(stage)
    }
  }

  const startEdit = () => {
    if (!selectedBaby) return
    setEditName(selectedBaby.name)
    setEditWeightG(selectedBaby.birthWeightG ? String(selectedBaby.birthWeightG) : '')
    setEditHeightCm(selectedBaby.birthHeightCm ? String(selectedBaby.birthHeightCm) : '')
    setEditing(true)
  }

  const handleSave = async () => {
    if (!familyId || !selectedBaby) return
    setSaving(true)
    try {
      const updated = await updateBaby(familyId, selectedBaby.id, {
        name: editName || undefined,
        birthWeightG: editWeightG ? parseInt(editWeightG) : undefined,
        birthHeightCm: editHeightCm ? parseFloat(editHeightCm) : undefined,
      })
      setSelectedBaby(updated)
      setBabies(prev => prev.map(b => b.id === updated.id ? updated : b))
      setEditing(false)
    } catch (err) {
      setError(extractErrorMessage(err, '저장에 실패했어요'))
    } finally {
      setSaving(false)
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
                const stage = await getGrowthStage(next.id, familyId).catch(() => null)
                setGrowthStage(stage)
              } else {
                setSelectedBaby(null)
                setGrowthStage(null)
                await clearStoredBaby()
              }
              setEditing(false)
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
                <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
                  <Text style={styles.editBtnText}>수정</Text>
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <View style={styles.editForm}>
                <Text style={styles.editLabel}>이름</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="아기 이름"
                />
                <Text style={styles.editLabel}>출생 체중 (g)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editWeightG}
                  onChangeText={setEditWeightG}
                  keyboardType="number-pad"
                  placeholder="예: 3500"
                />
                <Text style={styles.editLabel}>출생 신장 (cm)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editHeightCm}
                  onChangeText={setEditHeightCm}
                  keyboardType="decimal-pad"
                  placeholder="예: 50.5"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setEditing(false)}
                  >
                    <Text style={styles.cancelBtnText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
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

          {growthStage && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>수유 가이드</Text>
              <Text style={styles.guideText}>
                권장 수유량: {growthStage.feedingGuideMl.start}~{growthStage.feedingGuideMl.end}ml
              </Text>
              <Text style={styles.guideText}>
                수유 간격: {growthStage.feedingIntervalHours.start}~{growthStage.feedingIntervalHours.end}시간
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('GrowthRecord')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>성장 기록</Text>
            <Text style={styles.guideText}>체중·키·머리둘레를 기록하고 그래프로 보기 ›</Text>
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
          <Text style={styles.emptyTitle}>아기 정보가 없어요</Text>
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
  editForm: { gap: 8 },
  editLabel: { fontSize: FONT.caption, color: NEUTRALS.gray600, fontWeight: '600' },
  editInput: {
    borderWidth: 1,
    borderColor: NEUTRALS.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONT.bodyMd,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: NEUTRALS.gray50,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: FONT.bodyMd, color: NEUTRALS.gray700, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: COLORS.primaryDisabled },
  saveBtnText: { fontSize: FONT.bodyMd, color: NEUTRALS.white, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1 },
  statLabel: { fontSize: FONT.caption, color: NEUTRALS.gray500, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: FONT.body, fontWeight: '600', color: NEUTRALS.gray800, marginTop: 2 },
  sectionTitle: { fontSize: FONT.bodyMd, fontWeight: '700', color: NEUTRALS.ink },
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
  dangerDesc: { fontSize: FONT.label, color: NEUTRALS.gray500, lineHeight: 18 },
  dangerBtn: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffcccc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnDisabled: { opacity: 0.6 },
  dangerBtnText: { fontSize: FONT.bodyMd, color: '#d04848', fontWeight: '700' },
})
