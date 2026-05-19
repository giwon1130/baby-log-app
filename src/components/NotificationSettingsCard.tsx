import React, { useEffect, useState } from 'react'
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import {
  getDiaperNotificationEnabled, setDiaperNotificationEnabled,
  getNotificationEnabled, setNotificationEnabled,
  getSleepNotificationEnabled, setSleepNotificationEnabled,
  getDiaperReminderHours, setDiaperReminderHours,
  getNapReminderHours, setNapReminderHours,
  getFeedIntervalOverride, setFeedIntervalOverride,
} from '../utils/notifications'
import { COLORS, NEUTRALS, FONT } from '../utils/constants'

/**
 * 알림 설정 카드 — 수유 / 기저귀 / 낮잠 3가지.
 * AsyncStorage 직접 접근하므로 부모 화면에서 props 전달 불필요.
 */
export function NotificationSettingsCard() {
  const [feedEnabled, setFeedEnabledLocal] = useState(true)
  const [diaperEnabled, setDiaperEnabledLocal] = useState(true)
  const [sleepEnabled, setSleepEnabledLocal] = useState(true)
  const [diaperHours, setDiaperHoursLocal] = useState(3)
  const [napHours, setNapHoursLocal] = useState(2)
  const [feedInterval, setFeedIntervalLocal] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const [f, d, s, dh, nh, fi] = await Promise.all([
        getNotificationEnabled(),
        getDiaperNotificationEnabled(),
        getSleepNotificationEnabled(),
        getDiaperReminderHours(),
        getNapReminderHours(),
        getFeedIntervalOverride(),
      ])
      setFeedEnabledLocal(f)
      setDiaperEnabledLocal(d)
      setSleepEnabledLocal(s)
      setDiaperHoursLocal(dh)
      setNapHoursLocal(nh)
      setFeedIntervalLocal(fi)
    }
    load()
  }, [])

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>알림 설정</Text>

      {/* 수유 */}
      <View style={styles.notifRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifTitle}>🍼 수유 알림</Text>
          <Text style={styles.notifDesc}>
            {feedInterval != null
              ? `수유 ${feedInterval}시간 후 알림`
              : '다음 수유 시간에 알림을 보내요 (자동)'}
          </Text>
          {feedEnabled && (
            <View style={styles.hourPicker}>
              {([null, 2, 2.5, 3, 3.5, 4] as (number | null)[]).map(h => (
                <TouchableOpacity
                  key={String(h)}
                  style={[styles.hourChip, feedInterval === h && styles.hourChipActive]}
                  onPress={async () => {
                    setFeedIntervalLocal(h)
                    await setFeedIntervalOverride(h)
                  }}
                >
                  <Text style={[styles.hourChipText, feedInterval === h && styles.hourChipTextActive]}>
                    {h == null ? '자동' : `${h}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <Switch
          value={feedEnabled}
          onValueChange={async (v) => {
            setFeedEnabledLocal(v)
            await setNotificationEnabled(v)
          }}
          trackColor={{ false: NEUTRALS.gray250, true: COLORS.primary }}
          thumbColor={NEUTRALS.white}
        />
      </View>

      {/* 기저귀 */}
      <View style={styles.notifRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifTitle}>🧷 기저귀 알림</Text>
          <Text style={styles.notifDesc}>마지막 교환 {diaperHours}시간 후 알림</Text>
          {diaperEnabled && (
            <View style={styles.hourPicker}>
              {[1, 2, 3, 4, 5, 6].map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.hourChip, diaperHours === h && styles.hourChipActive]}
                  onPress={async () => { setDiaperHoursLocal(h); await setDiaperReminderHours(h) }}
                >
                  <Text style={[styles.hourChipText, diaperHours === h && styles.hourChipTextActive]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <Switch
          value={diaperEnabled}
          onValueChange={async (v) => { setDiaperEnabledLocal(v); await setDiaperNotificationEnabled(v) }}
          trackColor={{ false: NEUTRALS.gray250, true: COLORS.primary }}
          thumbColor={NEUTRALS.white}
        />
      </View>

      {/* 낮잠 */}
      <View style={styles.notifRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifTitle}>😴 낮잠 알림</Text>
          <Text style={styles.notifDesc}>기상 {napHours}시간 후 알림</Text>
          {sleepEnabled && (
            <View style={styles.hourPicker}>
              {[1, 2, 3, 4].map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.hourChip, napHours === h && styles.hourChipActive]}
                  onPress={async () => { setNapHoursLocal(h); await setNapReminderHours(h) }}
                >
                  <Text style={[styles.hourChipText, napHours === h && styles.hourChipTextActive]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <Switch
          value={sleepEnabled}
          onValueChange={async (v) => { setSleepEnabledLocal(v); await setSleepNotificationEnabled(v) }}
          trackColor={{ false: NEUTRALS.gray250, true: COLORS.primary }}
          thumbColor={NEUTRALS.white}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NEUTRALS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: NEUTRALS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  sectionTitle: { fontSize: FONT.bodyMd, fontWeight: '700', color: NEUTRALS.ink },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { fontSize: FONT.bodySm, fontWeight: '600', color: NEUTRALS.gray800 },
  notifDesc: { fontSize: FONT.label, color: NEUTRALS.gray450, marginTop: 2 },
  hourPicker: { flexDirection: 'row', gap: 6, marginTop: 8 },
  hourChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: NEUTRALS.gray50,
  },
  hourChipActive: { backgroundColor: COLORS.primary },
  hourChipText: { fontSize: FONT.label, color: NEUTRALS.gray650, fontWeight: '600' },
  hourChipTextActive: { color: NEUTRALS.white },
})
