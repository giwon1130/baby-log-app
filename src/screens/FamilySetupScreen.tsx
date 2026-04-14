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
import { createBaby, createFamily, getBabies, joinFamily } from '../api/babyLogApi'
import { storeFamilyAndBaby } from '../api/client'
import ErrorBanner from '../components/ErrorBanner'
import type { Baby } from '../types'

type Step = 'choice' | 'create' | 'join' | 'baby' | 'selectBaby'

function autoFormatDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

export default function FamilySetupScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('choice')
  const [inviteCode, setInviteCode] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 초대 참여 후 아기 선택
  const [joinedBabies, setJoinedBabies] = useState<Baby[]>([])

  // Baby form
  const [babyName, setBabyName] = useState('')
  const [birthDateRaw, setBirthDateRaw] = useState('')
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [birthWeightG, setBirthWeightG] = useState('')
  const [birthHeightCm, setBirthHeightCm] = useState('')

  const birthDate = autoFormatDate(birthDateRaw)

  const handleCreateFamily = async () => {
    setSubmitting(true)
    try {
      const family = await createFamily()
      setFamilyId(family.id)
      setStep('baby')
    } catch {
      setError('가족 생성에 실패했어요. 다시 시도해주세요.')
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
    } catch {
      setError('초대 코드를 찾을 수 없어요. 다시 확인해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectBaby = async (baby: Baby) => {
    await storeFamilyAndBaby(familyId, baby.id)
    navigation.replace('Main')
  }

  const handleCreateBaby = async () => {
    if (!babyName.trim() || birthDate.length !== 10) return
    setSubmitting(true)
    try {
      const baby = await createBaby(familyId, {
        name: babyName,
        birthDate,
        gender,
        birthWeightG: birthWeightG ? parseInt(birthWeightG) : undefined,
        birthHeightCm: birthHeightCm ? parseFloat(birthHeightCm) : undefined,
      })
      await storeFamilyAndBaby(familyId, baby.id)
      navigation.replace('Main')
    } catch {
      setError('아기 등록에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
                ? <ActivityIndicator color="#fff" />
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
                ? <ActivityIndicator color="#fff" />
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
            <TextInput
              style={[styles.input, birthDate.length === 10 && styles.inputValid]}
              placeholder="20250101 입력 → 자동 포맷"
              value={birthDate}
              onChangeText={v => setBirthDateRaw(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={10}
            />

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
              style={[styles.primaryButton, (!babyName || birthDate.length !== 10 || submitting) && styles.buttonDisabled]}
              onPress={handleCreateBaby}
              disabled={!babyName || birthDate.length !== 10 || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryButtonText}>시작하기</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  content: {
    flexGrow: 1,
    padding: 32,
    justifyContent: 'center',
    gap: 12,
  },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  inputValid: { borderColor: '#FF6B9D' },
  codeInput: {
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderRadius: 16,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    color: '#FF6B9D',
    backgroundColor: '#fff',
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  genderChipActive: { backgroundColor: '#FF6B9D' },
  genderChipText: { fontSize: 15, fontWeight: '600', color: '#555' },
  genderChipTextActive: { color: '#fff' },
  primaryButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#ffb3cc' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B9D',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#FF6B9D', fontWeight: '600', fontSize: 15 },
  backText: { color: '#aaa', textAlign: 'center', marginTop: 8, fontSize: 14 },
  babyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
  },
  babyOptionEmoji: { fontSize: 32 },
  babyOptionName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  babyOptionMeta: { fontSize: 12, color: '#aaa', marginTop: 2 },
})
