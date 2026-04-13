import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { getBabies, getGrowthStage } from '../api/babyLogApi'
import { getStoredBabyId, getStoredFamilyId, storeFamilyAndBaby } from '../api/client'
import type { Baby, GrowthStage } from '../types'

const GENDER_LABEL: Record<string, string> = { MALE: '남아', FEMALE: '여아' }

export default function BabyProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [babies, setBabies] = useState<Baby[]>([])
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null)
  const [growthStage, setGrowthStage] = useState<GrowthStage | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const fid = await getStoredFamilyId()
      const bid = await getStoredBabyId()
      setFamilyId(fid)
      if (!fid) { setLoading(false); return }

      const babyList = await getBabies(fid).catch(() => [])
      setBabies(babyList)

      const current = babyList.find(b => b.id === bid) ?? babyList[0]
      if (current) {
        setSelectedBaby(current)
        const stage = await getGrowthStage(current.id, fid).catch(() => null)
        setGrowthStage(stage)
      }
      setLoading(false)
    }
    load()
  }, [])

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
      {/* 아기 선택 탭 */}
      {babies.length > 1 && (
        <View style={styles.babyTabs}>
          {babies.map(baby => (
            <TouchableOpacity
              key={baby.id}
              style={[styles.babyTab, selectedBaby?.id === baby.id && styles.babyTabActive]}
              onPress={async () => {
                setSelectedBaby(baby)
                if (familyId) {
                  const stage = await getGrowthStage(baby.id, familyId).catch(() => null)
                  setGrowthStage(stage)
                }
              }}
            >
              <Text style={[styles.babyTabText, selectedBaby?.id === baby.id && styles.babyTabTextActive]}>
                {baby.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedBaby ? (
        <>
          <View style={styles.card}>
            <View style={styles.babyHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {selectedBaby.gender === 'MALE' ? '👦' : '👧'}
                </Text>
              </View>
              <View>
                <Text style={styles.babyName}>{selectedBaby.name}</Text>
                <Text style={styles.babyMeta}>
                  {GENDER_LABEL[selectedBaby.gender]} · D+{selectedBaby.daysOld}일
                </Text>
              </View>
            </View>

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
            <Text style={styles.sectionTitle}>가족 초대</Text>
            <Text style={styles.inviteDesc}>
              아래 코드를 공유하면 파트너가 같은 아기를 함께 관리할 수 있어요.
            </Text>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCode}>{selectedBaby.familyId.slice(-8).toUpperCase()}</Text>
            </View>
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
  babyTabs: { flexDirection: 'row', gap: 8, marginBottom: 4 },
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
  statRow: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  guideText: { fontSize: 14, color: '#555' },
  inviteDesc: { fontSize: 13, color: '#777' },
  inviteCodeBox: {
    backgroundColor: '#FFF0F5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inviteCode: { fontSize: 24, fontWeight: '800', color: '#FF6B9D', letterSpacing: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#666' },
  primaryButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  inviteCode2: {},
})
