import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { getBabies, getDiapers, getGrowthStage, getLatestFeed } from '../api/babyLogApi'
import { getStoredBabyId, getStoredFamilyId } from '../api/client'
import { scheduleFeedNotification } from '../hooks/useFeedNotification'
import type { FeedRecord, GrowthStage, DiaperRecord } from '../types'

function timeSince(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 ${mins % 60}분 전`
  return `${Math.floor(hours / 24)}일 전`
}

function timeUntil(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now()
  if (diff <= 0) return '지금 수유 가능'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 후`
  const hours = Math.floor(mins / 60)
  return `${hours}시간 ${mins % 60}분 후`
}

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [latestFeed, setLatestFeed] = useState<FeedRecord | null>(null)
  const [latestDiaper, setLatestDiaper] = useState<DiaperRecord | null>(null)
  const [growthStage, setGrowthStage] = useState<GrowthStage | null>(null)
  const [babyId, setBabyId] = useState<string | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const bid = await getStoredBabyId()
      const fid = await getStoredFamilyId()
      setBabyId(bid)
      setFamilyId(fid)
      if (!bid || !fid) { setLoading(false); return }

      const [feed, diaper, stage, babies] = await Promise.allSettled([
        getLatestFeed(bid),
        getDiapers(bid, 1),
        getGrowthStage(bid, fid),
        getBabies(fid),
      ])

      if (feed.status === 'fulfilled' && feed.value) {
        setLatestFeed(feed.value)
        // 앱 재시작 시에도 알림 재동기화
        const babyName = babies.status === 'fulfilled'
          ? babies.value.find(b => b.id === bid)?.name
          : undefined
        await scheduleFeedNotification(feed.value.nextFeedAt, babyName)
      }
      if (diaper.status === 'fulfilled' && diaper.value.length > 0)
        setLatestDiaper(diaper.value[0])
      if (stage.status === 'fulfilled') setGrowthStage(stage.value)
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

  if (!babyId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>아직 아기가 없어요</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('FamilySetup')}
        >
          <Text style={styles.primaryButtonText}>시작하기</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 성장 단계 카드 */}
      {growthStage && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>성장 단계</Text>
          <Text style={styles.cardTitle}>{growthStage.title}</Text>
          <Text style={styles.cardDesc}>{growthStage.description}</Text>
        </View>
      )}

      {/* 마지막 수유 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>마지막 수유</Text>
        {latestFeed ? (
          <>
            <Text style={styles.cardTitle}>{latestFeed.amountMl}ml</Text>
            <Text style={styles.cardDesc}>{timeSince(latestFeed.fedAt)}</Text>
            <Text style={[styles.cardDesc, styles.nextFeed]}>
              다음 수유: {timeUntil(latestFeed.nextFeedAt)}
            </Text>
          </>
        ) : (
          <Text style={styles.cardDesc}>기록 없음</Text>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('FeedLog')}
        >
          <Text style={styles.actionButtonText}>수유 기록</Text>
        </TouchableOpacity>
      </View>

      {/* 마지막 기저귀 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>마지막 기저귀</Text>
        {latestDiaper ? (
          <>
            <Text style={styles.cardTitle}>{latestDiaper.diaperType}</Text>
            <Text style={styles.cardDesc}>{timeSince(latestDiaper.changedAt)}</Text>
          </>
        ) : (
          <Text style={styles.cardDesc}>기록 없음</Text>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('DiaperLog')}
        >
          <Text style={styles.actionButtonText}>기저귀 기록</Text>
        </TouchableOpacity>
      </View>

      {/* 성장 팁 */}
      {growthStage && growthStage.tips.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>이 시기 팁</Text>
          {growthStage.tips.map((tip, i) => (
            <Text key={i} style={styles.tipItem}>• {tip}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  cardLabel: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  cardDesc: { fontSize: 14, color: '#666' },
  nextFeed: { color: '#FF6B9D', fontWeight: '600' },
  tipItem: { fontSize: 13, color: '#555', lineHeight: 20 },
  actionButton: {
    marginTop: 8,
    backgroundColor: '#FF6B9D',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#444' },
  primaryButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
