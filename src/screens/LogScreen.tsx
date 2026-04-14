import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import FeedLogScreen from './FeedLogScreen'
import DiaperLogScreen from './DiaperLogScreen'
import SleepScreen from './SleepScreen'

type LogTab = 'feed' | 'diaper' | 'sleep'

const TABS: { key: LogTab; label: string }[] = [
  { key: 'feed', label: '🍼 수유' },
  { key: 'diaper', label: '🧷 기저귀' },
  { key: 'sleep', label: '😴 수면' },
]

export default function LogScreen() {
  const [activeTab, setActiveTab] = useState<LogTab>('feed')

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
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
      </View>

      <View style={styles.content}>
        {activeTab === 'feed' && <FeedLogScreen />}
        {activeTab === 'diaper' && <DiaperLogScreen />}
        {activeTab === 'sleep' && <SleepScreen />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: { borderBottomColor: '#FF6B9D' },
  tabText: { fontSize: 14, color: '#aaa', fontWeight: '600' },
  tabTextActive: { color: '#FF6B9D' },
  content: { flex: 1 },
})
