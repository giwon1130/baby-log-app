import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createBaby, createFamily, getBabies, joinFamily } from '../api/babyLogApi'
import { storeFamilyAndBaby } from '../api/client'
import ErrorBanner from '../components/ErrorBanner'
import BirthDatePicker from '../components/BirthDatePicker'
import type { Baby } from '../types'
import type { RootStackScreenProps } from '../navigation/types'
import { extractErrorMessage } from '../utils/errors'

import { COLORS, NEUTRALS, FONT } from '../utils/constants'
type Step = 'choice' | 'create' | 'join' | 'baby' | 'selectBaby'

export default function FamilySetupScreen({ navigation, route }: RootStackScreenProps<'FamilySetup'>) {
  const params = route.params
  const [step, setStep] = useState<Step>(params?.mode === 'addBaby' ? 'baby' : 'choice')
  const [inviteCode, setInviteCode] = useState('')
  const [familyId, setFamilyId] = useState(params?.familyId ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 초대 참여 후 아기 선택
  const [joinedBabies, setJoinedBabies] = useState<Baby[]>([])

  // Baby form
  const [babyName, setBabyName] = useState('')
  const [birthDate, setBirthDate] = useState(new Date())
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [birthWeightG, setBirthWeightG] = useState('')
  const [birthHeightCm, setBirthHeightCm] = useState('')

  const birthDateStr = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`

  const handleCreateFamily = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const family = await createFamily()
      setFamilyId(family.id)
      setStep('baby')
    } catch (err) {
      setError(extractErrorMessage(err, '가족 생성에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const family = await joinFamily(inviteCode.trim().toUpperCase())
      setFamilyId(family.id)
      const babies = await getBabies(family.id).catch(() => [] as Baby[])
      if (babies.length === 1) {
        await storeFamilyAndBaby(family.id, babies[0].id)
        navigation.replace('Main')
      } else if (babies.length > 1) {
        setJoinedBabies(babies)
        setStep('selectBaby')
      } else {
        // 아기가 아직 없으면 등록으로
        setStep('baby')
      }
    } catch (err) {
      setError(extractErrorMessage(err, '초대 코드를 찾을 수 없어요. 다시 확인해주세요.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectBaby = async (baby: Baby) => {
    await storeFamilyAndBaby(familyId, baby.id)
    navigation.replace('Main')
  }

  const handleCreateBaby = async () => {
    if (!babyName.trim()) return
    setSubmitting(true)
    try {
      const baby = await createBaby(familyId, {
        name: babyName,
        birthDate: birthDateStr,
        gender,
        birthWeightG: birthWeightG ? parseInt(birthWeightG) : undefined,
        birthHeightCm: birthHeightCm ? parseFloat(birthHeightCm) : undefined,
      })
      await storeFamilyAndBaby(familyId, baby.id)
      if (params?.mode === 'addBaby') {
        navigation.goBack()
      } else {
        navigation.replace('Main')
      }
    } catch (err) {
      setError(extractErrorMessage(err, '아기 등록에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <ScrollView contentContainerStyle={styles.content}>

        {step === 'choice' && (
          <>
            <Text style={styles.logo}>🍼</Text>
            <Text style={styles.title}>BabyLog</Text>
            <Text style={styles.subtitle}>아기의 일상을 함께 기록해요</Text>

            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
              onPress={handleCreateFamily}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={NEUTRALS.white} />
                : <Text style={styles.primaryButtonText}>새 가족 시작하기</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('join')}>
              <Text style={styles.secondaryButtonText}>초대 코드로 참여하기</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'join' && (
          <>
            <Text style={styles.title}>초대 코드 입력</Text>
            <Text style={styles.subtitle}>파트너에게 받은 8자리 코드를 입력해주세요</Text>

            <TextInput
              style={styles.codeInput}
              placeholder="XXXXXXXX"
              value={inviteCode}
              onChangeText={v => setInviteCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoFocus
              maxLength={8}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.primaryButton, (inviteCode.length < 8 || submitting) && styles.buttonDisabled]}
              onPress={handleJoinFamily}
              disabled={inviteCode.length < 8 || submitting}
            >
              {submitting
                ? <ActivityIndicator color={NEUTRALS.white} />
                : <Text style={styles.primaryButtonText}>참여하기</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('choice')}>
              <Text style={styles.backText}>← 뒤로</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'selectBaby' && (
          <>
            <Text style={styles.title}>아기 선택</Text>
            <Text style={styles.subtitle}>이 가족의 아기를 선택해주세요</Text>

            {joinedBabies.map(baby => (
              <TouchableOpacity
                key={baby.id}
                style={styles.babyOption}
                onPress={() => handleSelectBaby(baby)}
              >
                <Text style={styles.babyOptionEmoji}>
                  {baby.gender === 'MALE' ? '👦' : '👧'}
                </Text>
                <View>
                  <Text style={styles.babyOptionName}>{baby.name}</Text>
                  <Text style={styles.babyOptionMeta}>{baby.birthDate} · D+{baby.daysOld}일</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setStep('join')}>
              <Text style={styles.backText}>← 뒤로</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'baby' && (
          <>
            <Text style={styles.title}>아기 정보 등록</Text>
            <Text style={styles.subtitle}>우리 아기를 소개해주세요</Text>

            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              placeholder="아기 이름"
              value={babyName}
              onChangeText={setBabyName}
              autoFocus
            />

            <Text style={styles.label}>생년월일</Text>
            <BirthDatePicker value={birthDate} onChange={setBirthDate} />

            <Text style={styles.label}>성별</Text>
            <View style={styles.genderRow}>
              {(['MALE', 'FEMALE'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, gender === g && styles.genderChipActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
                    {g === 'MALE' ? '👦 남아' : '👧 여아'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>출생 체중 (g, 선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 3200"
              value={birthWeightG}
              onChangeText={setBirthWeightG}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>출생 신장 (cm, 선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 50.5"
              value={birthHeightCm}
              onChangeText={setBirthHeightCm}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={[styles.primaryButton, (!babyName || submitting) && styles.buttonDisabled]}
              onPress={handleCreateBaby}
              disabled={!babyName || submitting}
            >
              {submitting
                ? <ActivityIndicator color={NEUTRALS.white} />
                : <Text style={styles.primaryButtonText}>시작하기</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  content: {
    flexGrow: 1,
    padding: 32,
    justifyContent: 'center',
    gap: 12,
  },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: FONT.display, fontWeight: '800', color: NEUTRALS.ink, textAlign: 'center' },
  subtitle: { fontSize: FONT.body, color: NEUTRALS.gray600, textAlign: 'center', marginBottom: 12 },
  label: { fontSize: FONT.bodySm, fontWeight: '600', color: NEUTRALS.gray700, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: NEUTRALS.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: FONT.body,
    backgroundColor: NEUTRALS.white,
  },
  inputValid: { borderColor: COLORS.primary },
  codeInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    fontSize: FONT.display,
    fontWeight: '800',
    letterSpacing: 6,
    color: COLORS.primary,
    backgroundColor: NEUTRALS.white,
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: NEUTRALS.gray50,
    alignItems: 'center',
  },
  genderChipActive: { backgroundColor: COLORS.primary },
  genderChipText: { fontSize: FONT.body, fontWeight: '600', color: NEUTRALS.gray700 },
  genderChipTextActive: { color: NEUTRALS.white },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: COLORS.primaryDisabled },
  primaryButtonText: { color: NEUTRALS.white, fontWeight: '700', fontSize: FONT.h4 },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT.body },
  backText: { color: NEUTRALS.gray450, textAlign: 'center', marginTop: 8, fontSize: FONT.bodyMd },
  babyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: NEUTRALS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: NEUTRALS.gray100,
  },
  babyOptionEmoji: { fontSize: 32 },
  babyOptionName: { fontSize: FONT.h4, fontWeight: '700', color: NEUTRALS.ink },
  babyOptionMeta: { fontSize: FONT.label, color: NEUTRALS.gray450, marginTop: 2 },
})
