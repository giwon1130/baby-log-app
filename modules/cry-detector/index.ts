import { requireNativeModule, NativeModule } from 'expo-modules-core'
import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import type {
  CryDetectedEvent,
  CryDetectorErrorEvent,
  CryDetectorEvents,
  CryPermissionStatus,
  SoundClassifiedEvent,
} from './src/CryDetector.types'

export type {
  CryDetectedEvent,
  CryDetectorErrorEvent,
  CryDetectorEvents,
  CryPermissionStatus,
  SoundClassifiedEvent,
}

export type CryFeatureSummary = {
  durationSec: number
  cryConfidenceAvg: number | null
  cryConfidenceMax: number | null
  avgVolumeDb: number | null
  peakVolumeDb: number | null
  sampleCount: number
  // Acoustic features (may be null for silent recordings)
  pitchMeanHz: number | null
  pitchStdHz: number | null
  pitchMaxHz: number | null
  voicedRatio: number | null
  zcrMean: number | null
  rhythmicity: number | null
}

declare class CryDetectorNative extends NativeModule<CryDetectorEvents> {
  requestPermission(): Promise<boolean>
  getPermissionStatus(): Promise<CryPermissionStatus>
  setCryConfidenceThreshold(threshold: number): Promise<void>
  start(): Promise<boolean>
  stop(): Promise<void>
  isRunning(): Promise<boolean>
  /**
   * Records for `seconds` (clamped 1–20 on native side) and returns aggregated
   * audio features. No audio is stored; only numeric summaries come back.
   */
  recordAndAnalyze(seconds: number): Promise<CryFeatureSummary>
}

const isSupported = Platform.OS === 'ios'

const native: CryDetectorNative | null = isSupported
  ? requireNativeModule<CryDetectorNative>('CryDetector')
  : null

function unsupported(): never {
  throw new Error('CryDetector is only available on iOS')
}

export const CryDetector = {
  isSupported,

  requestPermission: (): Promise<boolean> =>
    native ? native.requestPermission() : Promise.resolve(false),

  getPermissionStatus: (): Promise<CryPermissionStatus> =>
    native ? native.getPermissionStatus() : Promise.resolve('denied'),

  setCryConfidenceThreshold: (threshold: number): Promise<void> =>
    native ? native.setCryConfidenceThreshold(threshold) : Promise.resolve(),

  start: (): Promise<boolean> => (native ? native.start() : Promise.resolve(false)),

  stop: (): Promise<void> => (native ? native.stop() : Promise.resolve()),

  isRunning: (): Promise<boolean> => (native ? native.isRunning() : Promise.resolve(false)),

  recordAndAnalyze: (seconds: number): Promise<CryFeatureSummary> =>
    native
      ? native.recordAndAnalyze(seconds)
      : Promise.resolve({
          durationSec: 0,
          cryConfidenceAvg: null,
          cryConfidenceMax: null,
          avgVolumeDb: null,
          peakVolumeDb: null,
          sampleCount: 0,
          pitchMeanHz: null,
          pitchStdHz: null,
          pitchMaxHz: null,
          voicedRatio: null,
          zcrMean: null,
          rhythmicity: null,
        }),

  addCryListener(listener: (event: CryDetectedEvent) => void) {
    if (!native) return { remove() {} }
    return native.addListener('onCryDetected', listener)
  },

  addClassificationListener(listener: (event: SoundClassifiedEvent) => void) {
    if (!native) return { remove() {} }
    return native.addListener('onSoundClassified', listener)
  },

  addErrorListener(listener: (event: CryDetectorErrorEvent) => void) {
    if (!native) return { remove() {} }
    return native.addListener('onError', listener)
  },
}

// ── React hook ────────────────────────────────────────────────────────────────

export type UseCryDetectorState = {
  running: boolean
  permission: CryPermissionStatus
  lastLabel: string | null
  lastConfidence: number | null
  cryCount: number
  lastCryAt: number | null
  error: string | null
}

/**
 * Hook that wires start/stop + subscribes to events in one place.
 * Auto-stops on unmount. On non-iOS it simply reports `permission: 'denied'`.
 */
export function useCryDetector(): UseCryDetectorState & {
  start: () => Promise<void>
  stop: () => Promise<void>
  requestPermission: () => Promise<boolean>
} {
  const [running, setRunning] = useState(false)
  const [permission, setPermission] = useState<CryPermissionStatus>('undetermined')
  const [lastLabel, setLastLabel] = useState<string | null>(null)
  const [lastConfidence, setLastConfidence] = useState<number | null>(null)
  const [cryCount, setCryCount] = useState(0)
  const [lastCryAt, setLastCryAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const unmountedRef = useRef(false)

  useEffect(() => {
    let mounted = true
    CryDetector.getPermissionStatus().then((status) => {
      if (mounted) setPermission(status)
    })

    const classSub = CryDetector.addClassificationListener((e) => {
      setLastLabel(e.label)
      setLastConfidence(e.confidence)
    })
    const crySub = CryDetector.addCryListener((e) => {
      setCryCount((c) => c + 1)
      setLastCryAt(e.timestamp)
    })
    const errSub = CryDetector.addErrorListener((e) => setError(e.message))

    return () => {
      mounted = false
      unmountedRef.current = true
      classSub.remove()
      crySub.remove()
      errSub.remove()
      CryDetector.stop().catch(() => {})
    }
  }, [])

  return {
    running,
    permission,
    lastLabel,
    lastConfidence,
    cryCount,
    lastCryAt,
    error,
    async start() {
      setError(null)
      let status = permission
      if (status !== 'granted') {
        const granted = await CryDetector.requestPermission()
        status = granted ? 'granted' : 'denied'
        if (!unmountedRef.current) setPermission(status)
        if (!granted) {
          setError('마이크 권한이 거부됐어요')
          return
        }
      }
      const ok = await CryDetector.start()
      if (!unmountedRef.current) setRunning(ok)
    },
    async stop() {
      await CryDetector.stop()
      if (!unmountedRef.current) setRunning(false)
    },
    async requestPermission() {
      const granted = await CryDetector.requestPermission()
      setPermission(granted ? 'granted' : 'denied')
      return granted
    },
  }
}
