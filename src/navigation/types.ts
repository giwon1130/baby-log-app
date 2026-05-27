import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { CompositeScreenProps } from '@react-navigation/native'

export type RootStackParamList = {
  FamilySetup: { mode?: 'addBaby'; familyId?: string } | undefined
  Main: { screen?: keyof MainTabParamList } | undefined
  GrowthRecord: undefined
  CryHistory: undefined
  MonthlyPhotos: { initialMonthIndex?: number } | undefined
  FirstYearPackage: undefined
}

export type MainTabParamList = {
  Home: undefined
  Log: undefined
  CryMonitor: undefined
  Stats: undefined
  BabyProfile: undefined
}

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>

// MainTabs는 Stack 안에 nested 되어 있어 두 navigator 모두 navigate 가능해야 한다.
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>
