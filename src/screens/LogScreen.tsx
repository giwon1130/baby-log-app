import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import FeedLogScreen from './FeedLogScreen'
import DiaperLogScreen from './DiaperLogScreen'
import SleepScreen from './SleepScreen'
import HealthScreen from './HealthScreen'

type LogTab = 'feed' | 'diaper' | 'sleep' | 'health'

const TABS: { key: LogTab; label: string }[] = [
  { key: 'feed', label: '🍼 수유' },
  { key: 'diaper', label: '🧷 기저귀' },
  { key: 'sleep', label: '😴 수면' },
  { key: 'health', label: '🌡 건강' },
]

export default function LogScreen() {
  const [activeTab, setActiveTab] = useState<LogTab>('feed')

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {activeTab === 'feed' && <FeedLogScreen />}
        {activeTab === 'diaper' && <DiaperLogScreen />}
        {activeTab === 'sleep' && <SleepScreen />}
        {activeTab === 'health' && <HealthScreen />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
    marginRight: 16,
  },
  tabActive: { borderBottomColor: '#FF6B9D' },
  tabText: { fontSize: 14, color: '#aaa', fontWeight: '600' },
  tabTextActive: { color: '#FF6B9D' },
  content: { flex: 1 },
})
