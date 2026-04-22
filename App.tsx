import React, { useEffect, useRef, useState } from 'react'
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'

import HomeScreen from './src/screens/HomeScreen'
import LogScreen from './src/screens/LogScreen'
import GrowthRecordScreen from './src/screens/GrowthRecordScreen'
import StatsScreen from './src/screens/StatsScreen'
import BabyProfileScreen from './src/screens/BabyProfileScreen'
import FamilySetupScreen from './src/screens/FamilySetupScreen'
import { getStoredFamilyId } from './src/api/client'
import { requestNotificationPermission } from './src/hooks/useFeedNotification'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#FF6B9D',
        tabBarInactiveTintColor: '#bbb',
        tabBarStyle: { borderTopColor: '#f0f0f0' },
        headerStyle: { backgroundColor: '#FFF9FB' },
        headerShadowVisible: false,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Log: 'journal',
            Stats: 'bar-chart',
            BabyProfile: 'person',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Log" component={LogScreen} options={{ title: '기록' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '통계' }} />
      <Tab.Screen name="BabyProfile" component={BabyProfileScreen} options={{ title: '아기' }} />
    </Tab.Navigator>
  )
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null)
  const navigationRef = useRef<NavigationContainerRef<any>>(null)
  const notificationListenerRef = useRef<Notifications.EventSubscription | null>(null)
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    const init = async () => {
      const familyId = await getStoredFamilyId()
      setInitialRoute(familyId ? 'Main' : 'FamilySetup')
      await requestNotificationPermission()
    }
    init()

    // 포그라운드 수신은 배너만 표시 (setNotificationHandler에서 처리) — 강제 이동 없음
    notificationListenerRef.current = Notifications.addNotificationReceivedListener(() => {})

    // 사용자가 알림을 탭했을 때만 홈으로 이동
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(() => {
      navigationRef.current?.navigate('Main', { screen: 'Home' })
    })

    return () => {
      notificationListenerRef.current?.remove()
      responseListenerRef.current?.remove()
    }
  }, [])

  if (!initialRoute) return null

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FamilySetup" component={FamilySetupScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="GrowthRecord"
          component={GrowthRecordScreen}
          options={{ headerShown: true, title: '성장 기록', headerStyle: { backgroundColor: '#FFF9FB' }, headerShadowVisible: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
