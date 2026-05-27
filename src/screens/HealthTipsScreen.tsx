import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import {
  askHealthQuestion,
  createDiagnosis,
  getHealthTips,
  listDiagnoses,
} from '../api/babyLogApi'
import { useStoredBaby } from '../hooks/useStoredBaby'
import ErrorBanner from '../components/ErrorBanner'
import { useErrorRetry } from '../hooks/useErrorRetry'
import { extractErrorMessage } from '../utils/errors'
import type { BabyDiagnosis, HealthTip } from '../types'
import DiagnosisCard from '../components/health/DiagnosisCard'
import DiagnosisAddModal from '../components/health/DiagnosisAddModal'
import DiagnosisChecklistModal from '../components/health/DiagnosisChecklistModal'
import PromoBadge from '../components/PromoBadge'
import { COLORS, FONT, NEUTRALS, SPACING } from '../utils/constants'

const CATEGORY_LABEL: Record<string, string> = {
  movement: '근골격',
  skin: '피부',
  gut: '소화·배변',
  breathing: '호흡',
  fever: '발열',
  development: '발달',
  feeding: '수유',
}

/**
 * 신생아 0~12개월 건강 가이드.
 * - 사전 작성된 카드 (백엔드 정적 카탈로그) + Gemini 자유 질문
 * - 의학 면책 배너 상단 고정
 * - 진단·약 추천 없음. 응급 사인은 별도 색으로 강조.
 */
export default function HealthTipsScreen() {
  const { babyId, daysOld } = useStoredBaby()
  const [tips, setTips] = useState<HealthTip[]>([])
  const [diagnoses, setDiagnoses] = useState<BabyDiagnosis[]>([])
  const [loading, setLoading] = useState(true)
  const { error, retry, showError, dismissError } = useErrorRetry()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [openTip, setOpenTip] = useState<HealthTip | null>(null)
  const [qaOpen, setQaOpen] = useState(false)
  const [addModalTip, setAddModalTip] = useState<HealthTip | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [openDiagnosis, setOpenDiagnosis] = useState<BabyDiagnosis | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [tipsList, diagList] = await Promise.all([
        getHealthTips(),
        babyId ? listDiagnoses(babyId, false) : Promise.resolve([] as BabyDiagnosis[]),
      ])
      setTips(tipsList)
      setDiagnoses(diagList)
    } catch (err) {
      showError(extractErrorMessage(err, '건강 가이드를 불러오지 못했어요'), () => void load())
    } finally {
      setLoading(false)
    }
  }, [babyId, showError])

  useEffect(() => { void load() }, [load])

  const handleRegister = async (data: { tipId: string; side?: string; notes?: string }) => {
    if (!babyId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createDiagnosis(babyId, data)
      setDiagnoses(prev => [created, ...prev])
      const title = addModalTip?.title ?? '진단'
      setAddModalTip(null)
      setOpenTip(null)
      // 모달 닫힌 뒤 명확한 성공 피드백
      setTimeout(() => {
        Alert.alert('등록 완료', `${title} 진단이 등록됐어요.\n오늘부터 일일 체크리스트가 시작돼요.`)
      }, 250)
    } catch (err) {
      // 화면 뒤 ErrorBanner는 모달에 가리므로 모달 안에서 표시
      setSubmitError(extractErrorMessage(err, '진단 등록에 실패했어요. 잠시 후 다시 시도해주세요.'))
    } finally {
      setSubmitting(false)
    }
  }

  // RN Modal 은 같은 부모에서 동시 2개 표시 불가 → detail 닫고 슬라이드 아웃 끝난 뒤 add 모달 오픈
  const openAddModalFromDetail = useCallback(() => {
    if (!openTip) return
    const tip = openTip
    setOpenTip(null)
    setTimeout(() => {
      setSubmitError(null)
      setAddModalTip(tip)
    }, 320)
  }, [openTip])

  const closeAddModal = useCallback(() => {
    setAddModalTip(null)
    setSubmitError(null)
  }, [])

  const availableCategories = useMemo(() => {
    const set = new Set(tips.map(t => t.category))
    return Array.from(set)
  }, [tips])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tips.filter(t => {
      if (category && t.category !== category) return false
      if (!q) return true
      return t.title.toLowerCase().includes(q) ||
        t.oneLineSummary.toLowerCase().includes(q) ||
        t.whatItIs.toLowerCase().includes(q) ||
        (CATEGORY_LABEL[t.category] ?? '').includes(q)
    })
  }, [tips, query, category])

  const ageMonths = daysOld != null ? Math.floor(daysOld / 30) : undefined

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} onDismiss={dismissError} onRetry={retry ?? undefined} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* 면책 배너 — 항상 상단 */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.amber} />
          <Text style={styles.disclaimerText}>
            참고용 정보예요. 진단·치료는 소아과 상담이 필수예요.
          </Text>
        </View>

        {/* 우리 아기 진단 — 활성 진단 있을 때만 노출 */}
        {diagnoses.length > 0 && (
          <View style={styles.diagSection}>
            <Text style={styles.diagSectionTitle}>우리 아기 진단</Text>
            {diagnoses.map(d => (
              <DiagnosisCard
                key={d.id}
                diagnosis={d}
                todayDone={d.todayDone}
                todayTotal={d.todayTotal}
                onPress={() => setOpenDiagnosis(d)}
              />
            ))}
          </View>
        )}

        {/* 검색바 */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={NEUTRALS.gray500} />
          <TextInput
            style={styles.searchInput}
            placeholder="증상·이슈 검색 (예: 사경)"
            placeholderTextColor={NEUTRALS.gray400}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="건강 가이드 검색"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={NEUTRALS.gray500} />
            </TouchableOpacity>
          )}
        </View>

        {/* 카테고리 필터 칩 */}
        {availableCategories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            <TouchableOpacity
              style={[styles.catChip, !category && styles.catChipActive]}
              onPress={() => setCategory(null)}
            >
              <Text style={[styles.catChipText, !category && styles.catChipTextActive]}>전체</Text>
            </TouchableOpacity>
            {availableCategories.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, category === c && styles.catChipActive]}
                onPress={() => setCategory(category === c ? null : c)}
              >
                <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>
                  {CATEGORY_LABEL[c] ?? c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* AI 자유 질문 진입 */}
        <TouchableOpacity
          style={styles.askCard}
          onPress={() => setQaOpen(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.askCardEmoji}>💬</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.askCardTitle}>다른 증상이 궁금하면 AI에게 물어보기</Text>
            <View style={styles.askMetaRow}>
              <PromoBadge />
              <Text style={styles.askCardSub} numberOfLines={1}>일반론·체크 포인트만 안내해요</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* 카드 리스트 */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>매칭되는 가이드가 없어요. AI에게 물어보세요.</Text>
        ) : (
          filtered.map(tip => (
            <TouchableOpacity
              key={tip.id}
              style={styles.tipCard}
              onPress={() => setOpenTip(tip)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${tip.title} 가이드`}
            >
              <Text style={styles.tipEmoji}>{tip.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.tipTitleRow}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipCategory}>{CATEGORY_LABEL[tip.category] ?? tip.category}</Text>
                </View>
                <Text style={styles.tipSummary}>{tip.oneLineSummary}</Text>
                <Text style={styles.tipAge}>{tip.ageRange}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={NEUTRALS.gray400} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 상세 모달 — '내 아기에 등록' 진입 포함 */}
      <TipDetailModal
        tip={openTip}
        onClose={() => setOpenTip(null)}
        alreadyRegistered={!!openTip && diagnoses.some(d => d.tipId === openTip.id)}
        onRegister={openAddModalFromDetail}
      />

      {/* 진단 등록 모달 */}
      <DiagnosisAddModal
        visible={addModalTip != null}
        tip={addModalTip}
        submitting={submitting}
        error={submitError}
        onClose={closeAddModal}
        onSubmit={handleRegister}
      />

      {/* 진단 체크리스트 모달 */}
      <DiagnosisChecklistModal
        visible={openDiagnosis != null}
        babyId={babyId}
        diagnosis={openDiagnosis}
        onClose={() => setOpenDiagnosis(null)}
        onChanged={load}
      />

      {/* AI 질문 모달 */}
      <AskModal
        visible={qaOpen}
        onClose={() => setQaOpen(false)}
        babyAgeMonths={ageMonths}
      />
    </View>
  )
}

function TipDetailModal({
  tip, onClose, alreadyRegistered, onRegister,
}: {
  tip: HealthTip | null
  onClose: () => void
  alreadyRegistered: boolean
  onRegister: () => void
}) {
  if (!tip) return null
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.detailCard} onPress={() => { /* swallow */ }}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailEmoji}>{tip.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>{tip.title}</Text>
              <Text style={styles.detailAge}>{CATEGORY_LABEL[tip.category] ?? tip.category} · {tip.ageRange}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color={NEUTRALS.gray600} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ gap: SPACING.md, paddingBottom: SPACING.lg }}>
            <Text style={styles.detailSummary}>{tip.oneLineSummary}</Text>
            <Text style={styles.detailBody}>{tip.whatItIs}</Text>

            <Section title="자가 체크">
              {tip.selfChecks.map((c, i) => <Bullet key={i} text={c} />)}
            </Section>
            <Section title="일반 관리 팁">
              {tip.careTips.map((c, i) => <Bullet key={i} text={c} />)}
            </Section>
            <Section title="이런 사인이면 즉시 병원" danger>
              {tip.redFlags.map((c, i) => <Bullet key={i} text={c} danger />)}
            </Section>

            {alreadyRegistered ? (
              <View style={styles.alreadyBox}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.alreadyText}>이미 등록된 진단이에요</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.registerBtn} onPress={onRegister}>
                <Text style={styles.registerBtnText}>🩺 내 아기에 등록 + 일일 체크 시작</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.detailDisclaimer}>
              ⓘ 참고용 정보예요. 진단·치료는 소아과 상담이 필수예요.
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <View style={[styles.section, danger && styles.sectionDanger]}>
      <Text style={[styles.sectionTitle, danger && styles.sectionTitleDanger]}>{title}</Text>
      <View style={{ gap: 4 }}>{children}</View>
    </View>
  )
}

function Bullet({ text, danger }: { text: string; danger?: boolean }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, danger && { color: COLORS.danger }]}>•</Text>
      <Text style={[styles.bulletText, danger && { color: COLORS.danger }]}>{text}</Text>
    </View>
  )
}

function AskModal({ visible, onClose, babyAgeMonths }: { visible: boolean; onClose: () => void; babyAgeMonths?: number }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAsk = useCallback(async () => {
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    try {
      const res = await askHealthQuestion(question.trim(), babyAgeMonths)
      setAnswer(res.answer)
    } catch (err) {
      setError(extractErrorMessage(err, 'AI 답변을 가져오지 못했어요'))
    } finally {
      setLoading(false)
    }
  }, [question, babyAgeMonths])

  const handleClose = () => {
    setQuestion('')
    setAnswer(null)
    setError(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalBackdropFill} onPress={handleClose} />
        <View style={styles.askCardOpen}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailEmoji}>💬</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.detailTitle} numberOfLines={1}>AI에게 물어보기</Text>
              <PromoBadge />
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={10} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color={NEUTRALS.gray600} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.askInput}
            placeholder="예: 우리 애기 변이 녹색인데 괜찮을까요?"
            placeholderTextColor={NEUTRALS.gray400}
            value={question}
            onChangeText={setQuestion}
            multiline
            accessibilityLabel="건강 질문 입력"
          />
          <TouchableOpacity
            style={[styles.askBtn, (!question.trim() || loading) && styles.askBtnDisabled]}
            onPress={handleAsk}
            disabled={!question.trim() || loading}
          >
            {loading ? <ActivityIndicator color={NEUTRALS.white} /> : <Text style={styles.askBtnText}>물어보기</Text>}
          </TouchableOpacity>

          {error && <Text style={styles.askErrorText}>{error}</Text>}

          {answer && (
            <ScrollView style={styles.answerBox} contentContainerStyle={{ padding: SPACING.md }}>
              <Text style={styles.answerText}>{answer}</Text>
            </ScrollView>
          )}

          <Text style={styles.detailDisclaimer}>
            ⓘ 참고용. 응급 상황 같으면 즉시 소아과·응급실로 가세요.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryBg },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },

  disclaimerCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FFF8E7', borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: '#F4E1A6',
  },
  disclaimerText: { flex: 1, fontSize: FONT.bodySm, color: NEUTRALS.gray800, lineHeight: 18 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: NEUTRALS.white, borderRadius: 12,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: FONT.bodyMd, color: NEUTRALS.ink },

  catRow: { gap: 6, paddingVertical: 2, paddingRight: SPACING.lg },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: NEUTRALS.white,
    borderWidth: 1, borderColor: NEUTRALS.gray150,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: FONT.label, color: NEUTRALS.gray700, fontWeight: '600' },
  catChipTextActive: { color: NEUTRALS.white },

  askCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 14, padding: SPACING.md,
  },
  askCardEmoji: { fontSize: 22 },
  askMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  askCardTitle: { fontSize: FONT.bodyMd, fontWeight: '700', color: COLORS.primary },
  askCardSub: { flex: 1, fontSize: FONT.caption, color: NEUTRALS.gray650 },

  empty: { textAlign: 'center', color: NEUTRALS.gray500, marginTop: SPACING.lg },

  tipCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: NEUTRALS.white, borderRadius: 14, padding: SPACING.md,
  },
  tipEmoji: { fontSize: 26 },
  tipTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipTitle: { fontSize: FONT.bodyMd, fontWeight: '700', color: NEUTRALS.ink },
  tipCategory: { fontSize: FONT.caption, color: NEUTRALS.gray500 },
  tipSummary: { fontSize: FONT.bodySm, color: NEUTRALS.gray700, marginTop: 2 },
  tipAge: { fontSize: FONT.caption, color: NEUTRALS.gray500, marginTop: 2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBackdropFill: { ...StyleSheet.absoluteFillObject },

  detailCard: {
    backgroundColor: NEUTRALS.white,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg,
    maxHeight: '88%',
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  detailEmoji: { fontSize: 26 },
  detailTitle: { fontSize: FONT.h2, fontWeight: '800', color: NEUTRALS.ink, flexShrink: 1 },
  detailAge: { fontSize: FONT.caption, color: NEUTRALS.gray600, marginTop: 2 },
  detailSummary: { fontSize: FONT.bodyMd, color: COLORS.primary, fontWeight: '700' },
  detailBody: { fontSize: FONT.bodySm, color: NEUTRALS.gray800, lineHeight: 20 },
  detailDisclaimer: { fontSize: FONT.caption, color: NEUTRALS.gray500, textAlign: 'center', marginTop: SPACING.md },

  diagSection: { gap: 8 },
  diagSectionTitle: { fontSize: FONT.label, color: NEUTRALS.gray600, fontWeight: '700', marginTop: 2 },

  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  registerBtnText: { color: NEUTRALS.white, fontSize: FONT.body, fontWeight: '700' },
  alreadyBox: {
    flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEUTRALS.gray50, borderRadius: 10, paddingVertical: 10,
  },
  alreadyText: { color: NEUTRALS.gray700, fontWeight: '600', fontSize: FONT.bodySm },

  section: {
    backgroundColor: NEUTRALS.gray50,
    borderRadius: 10,
    padding: SPACING.md,
    gap: 6,
  },
  sectionDanger: { backgroundColor: COLORS.dangerSurface, borderWidth: 1, borderColor: COLORS.dangerBorder },
  sectionTitle: { fontSize: FONT.label, fontWeight: '700', color: NEUTRALS.gray800 },
  sectionTitleDanger: { color: COLORS.danger },
  bulletRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  bulletDot: { color: NEUTRALS.gray600, fontSize: FONT.bodySm, lineHeight: 19 },
  bulletText: { flex: 1, color: NEUTRALS.gray800, fontSize: FONT.bodySm, lineHeight: 19 },

  askCardOpen: {
    backgroundColor: NEUTRALS.white,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  askInput: {
    borderWidth: 1, borderColor: NEUTRALS.gray200,
    borderRadius: 10,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: FONT.bodyMd,
    minHeight: 80,
    color: NEUTRALS.ink,
    textAlignVertical: 'top',
  },
  askBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  askBtnDisabled: { opacity: 0.5 },
  askBtnText: { color: NEUTRALS.white, fontSize: FONT.body, fontWeight: '700' },
  askErrorText: { color: COLORS.danger, fontSize: FONT.bodySm },
  answerBox: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: 10,
    maxHeight: 260,
  },
  answerText: { fontSize: FONT.bodySm, color: NEUTRALS.gray800, lineHeight: 20 },
})
