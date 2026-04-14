import React, { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { getBabies, getFamily, getGrowthStage, updateBaby } from '../api/babyLogApi'
import { getStoredBabyId, getStoredFamilyId, storeFamilyAndBaby } from '../api/client'
import {
  getDiaperNotificationEnabled, setDiaperNotificationEnabled,
  getNotificationEnabled, setNotificationEnabled,
  getSleepNotificationEnabled, setSleepNotificationEnabled,
} from '../hooks/useFeedNotification'
import ErrorBanner from '../components/ErrorBanner'
import VaccinationCard from '../components/VaccinationCard'
import type { Baby, Family, GrowthStage } from '../types'

const GENDER_LABEL: Record<string, string> = { MALE: '남아', FEMALE: '여아' }

export default function BabyProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [babies, setBabies] = useState<Baby[]>([])
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null)
  const [growthStage, setGrowthStage] = useState<GrowthStage | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [diaperNotifEnabled, setDiaperNotifEnabled] = useState(true)
  const [sleepNotifEnabled, setSleepNotifEnabled] = useState(true)

  // 편집 상태
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editWeightG, setEditWeightG] = useState('')
  const [editHeightCm, setEditHeightCm] = useState('')
  const [saving, setSaving] = useState(false)

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
    const init = async () => {
      const fid = await getStoredFamilyId()
      const bid = await getStoredBabyId()
      setFamilyId(fid)
      if (fid) await loadAll(fid, bid)
      const [feed, diaper, sleep] = await Promise.all([
        getNotificationEnabled(),
        getDiaperNotificationEnabled(),
        getSleepNotificationEnabled(),
      ])
      setNotifEnabled(feed)
      setDiaperNotifEnabled(diaper)
      setSleepNotifEnabled(sleep)
      setLoading(false)
    }
    init()
  }, [])

  useFocusEffect(useCallback(() => {
    if (!familyId) return
    getStoredBabyId().then(bid => loadAll(familyId, bid))
  }, [familyId]))

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
      setError((err as Error).message || '저장에 실패했어요')
    } finally {
      setSaving(false)
    }
  }

  const copyInviteCode = async () => {
    if (!family) return
    await Clipboard.setStringAsync(family.inviteCode)
    Alert.alert('복사됨', `초대 코드 ${family.inviteCode}가 클립보드에 복사됐어요.`)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B9D" />
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

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>알림 설정</Text>
            <View style={styles.notifRow}>
              <View>
                <Text style={styles.notifTitle}>🍼 수유 알림</Text>
                <Text style={styles.notifDesc}>다음 수유 시간에 알림을 보내요</Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={async (v) => {
                  setNotifEnabled(v)
                  await setNotificationEnabled(v)
                }}
                trackColor={{ false: '#e0e0e0', true: '#FF6B9D' }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.notifRow}>
              <View>
                <Text style={styles.notifTitle}>🧷 기저귀 알림</Text>
                <Text style={styles.notifDesc}>마지막 교환 3시간 후 알림을 보내요</Text>
              </View>
              <Switch
                value={diaperNotifEnabled}
                onValueChange={async (v) => {
                  setDiaperNotifEnabled(v)
                  await setDiaperNotificationEnabled(v)
                }}
                trackColor={{ false: '#e0e0e0', true: '#FF6B9D' }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.notifRow}>
              <View>
                <Text style={styles.notifTitle}>😴 낮잠 알림</Text>
                <Text style={styles.notifDesc}>기상 2시간 후 낮잠 알림을 보내요</Text>
              </View>
              <Switch
                value={sleepNotifEnabled}
                onValueChange={async (v) => {
                  setSleepNotifEnabled(v)
                  await setSleepNotificationEnabled(v)
                }}
                trackColor={{ false: '#e0e0e0', true: '#FF6B9D' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {selectedBaby && (
            <VaccinationCard
              daysOld={selectedBaby.daysOld}
              birthDate={selectedBaby.birthDate}
            />
          )}

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
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  babyTabRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  babyTabs: { flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addBabyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
  },
  addBabyBtnText: { fontSize: 12, color: '#FF6B9D', fontWeight: '600' },
  babyTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  babyTabActive: { backgroundColor: '#FF6B9D' },
  babyTabText: { fontSize: 13, color: '#555', fontWeight: '600' },
  babyTabTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
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
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28 },
  babyName: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  babyMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  editBtnText: { fontSize: 12, color: '#FF6B9D', fontWeight: '600' },
  editForm: { gap: 8 },
  editLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  editInput: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: '#555', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#ffb3cc' },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  guideText: { fontSize: 14, color: '#555' },
  inviteDesc: { fontSize: 13, color: '#777' },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  notifDesc: { fontSize: 12, color: '#aaa', marginTop: 2 },
  inviteCodeBox: {
    backgroundColor: '#FFF0F5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  inviteCode: { fontSize: 24, fontWeight: '800', color: '#FF6B9D', letterSpacing: 4 },
  inviteCopyHint: { fontSize: 11, color: '#FFAAC8' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#666' },
  primaryButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
