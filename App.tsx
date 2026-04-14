import React, { useEffect, useRef, useState } from 'react'
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'

import HomeScreen from './src/screens/HomeScreen'
import FeedLogScreen from './src/screens/FeedLogScreen'
import DiaperLogScreen from './src/screens/DiaperLogScreen'
import SleepScreen from './src/screens/SleepScreen'
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
            FeedLog: 'water',
            DiaperLog: 'shirt',
            Sleep: 'moon',
            Growth: 'trending-up',
            Stats: 'bar-chart',
            BabyProfile: 'person',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="FeedLog" component={FeedLogScreen} options={{ title: '수유' }} />
      <Tab.Screen name="DiaperLog" component={DiaperLogScreen} options={{ title: '기저귀' }} />
      <Tab.Screen name="Sleep" component={SleepScreen} options={{ title: '수면' }} />
      <Tab.Screen name="Growth" component={GrowthRecordScreen} options={{ title: '성장' }} />
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

    notificationListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      navigationRef.current?.navigate('Main', { screen: 'Home' })
    })

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
      </Stack.Navigator>
    </NavigationContainer>
  )
}
