import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { createBaby, createFamily, joinFamily } from '../api/babyLogApi'
import { storeFamilyAndBaby } from '../api/client'

type Step = 'choice' | 'create' | 'join' | 'baby'

export default function FamilySetupScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('choice')
  const [inviteCode, setInviteCode] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Baby form
  const [babyName, setBabyName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [birthWeightG, setBirthWeightG] = useState('')
  const [birthHeightCm, setBirthHeightCm] = useState('')

  const handleCreateFamily = async () => {
    setSubmitting(true)
    try {
      const family = await createFamily()
      setFamilyId(family.id)
      setStep('baby')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) return
    setSubmitting(true)
    try {
      const family = await joinFamily(inviteCode.trim().toUpperCase())
      setFamilyId(family.id)
      await storeFamilyAndBaby(family.id, '')
      navigation.replace('Main')
    } catch (e) {
      alert('초대 코드를 찾을 수 없어요.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateBaby = async () => {
    if (!babyName.trim() || !birthDate.trim()) return
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
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {step === 'choice' && (
          <>
            <Text style={styles.title}>BabyLog</Text>
            <Text style={styles.subtitle}>아기의 일상을 함께 기록해요</Text>

            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateFamily}>
              <Text style={styles.primaryButtonText}>
                {submitting ? '...' : '새 가족 시작하기'}
              </Text>
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
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              maxLength={8}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.primaryButton, !inviteCode && styles.buttonDisabled]}
              onPress={handleJoinFamily}
              disabled={!inviteCode || submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? '확인 중...' : '참여하기'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('choice')}>
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
            />

            <Text style={styles.label}>생년월일 (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2025-01-01"
              value={birthDate}
              onChangeText={setBirthDate}
              keyboardType="numbers-and-punctuation"
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
              style={[styles.primaryButton, (!babyName || !birthDate) && styles.buttonDisabled]}
              onPress={handleCreateBaby}
              disabled={!babyName || !birthDate || submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? '저장 중...' : '시작하기'}
              </Text>
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
})
