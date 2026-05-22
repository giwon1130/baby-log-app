import React, { useCallback, useRef, useState } from 'react'
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import FeedLogScreen from './FeedLogScreen'
import DiaperLogScreen from './DiaperLogScreen'
import SleepScreen from './SleepScreen'
import { COLORS, NEUTRALS, FONT } from '../utils/constants'

const TABS = [
  { key: 'feed', label: '🍼 수유' },
  { key: 'diaper', label: '🧷 기저귀' },
  { key: 'sleep', label: '😴 수면' },
] as const

/**
 * 수유·기저귀·수면을 가로 페이징으로 묶은 기록 탭.
 * 세 화면이 항상 마운트돼 있어 탭 전환 시 입력값·스크롤 위치가 보존되고,
 * 좌우 스와이프 + 슬라이딩 인디케이터로 전환이 부드럽다.
 */
export default function LogScreen() {
  const { width } = useWindowDimensions()
  const tabWidth = width / TABS.length
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const scrollX = useRef(new Animated.Value(0)).current

  // 스크롤 위치(0..2*width)를 탭 인디케이터 위치(0..2*tabWidth)로 매핑
  const indicatorTranslate = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [0, tabWidth],
  })

  const goToTab = useCallback((i: number) => {
    setActiveIndex(i)
    scrollRef.current?.scrollTo({ x: i * width, animated: true })
  }, [width])

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))
  }, [width])

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => goToTab(i)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeIndex === i }}
          >
            <Text style={[styles.tabText, activeIndex === i && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Animated.View
          style={[
            styles.indicator,
            { width: tabWidth, transform: [{ translateX: indicatorTranslate }] },
          ]}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}
      >
        <View style={{ width }}><FeedLogScreen /></View>
        <View style={{ width }}><DiaperLogScreen /></View>
        <View style={{ width }}><SleepScreen /></View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: NEUTRALS.white,
    borderBottomWidth: 1,
    borderBottomColor: NEUTRALS.gray100,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: { fontSize: FONT.bodyMd, color: NEUTRALS.gray450, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  indicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    height: 2,
    backgroundColor: COLORS.primary,
  },
  pager: { flex: 1 },
})
