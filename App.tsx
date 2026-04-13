import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

import HomeScreen from './src/screens/HomeScreen'
import FeedLogScreen from './src/screens/FeedLogScreen'
import DiaperLogScreen from './src/screens/DiaperLogScreen'
import BabyProfileScreen from './src/screens/BabyProfileScreen'
import FamilySetupScreen from './src/screens/FamilySetupScreen'
import { getStoredFamilyId } from './src/api/client'

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
            BabyProfile: 'person',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="FeedLog" component={FeedLogScreen} options={{ title: '수유' }} />
      <Tab.Screen name="DiaperLog" component={DiaperLogScreen} options={{ title: '기저귀' }} />
      <Tab.Screen name="BabyProfile" component={BabyProfileScreen} options={{ title: '아기' }} />
    </Tab.Navigator>
  )
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null)

  useEffect(() => {
    const checkSetup = async () => {
      const familyId = await getStoredFamilyId()
      setInitialRoute(familyId ? 'Main' : 'FamilySetup')
    }
    checkSetup()
  }, [])

  if (!initialRoute) return null

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FamilySetup" component={FamilySetupScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
