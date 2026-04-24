export type CryPermissionStatus = 'granted' | 'denied' | 'undetermined'

export type CryDetectedEvent = {
  /** Confidence in [0, 1] from the SoundAnalysis classifier. */
  confidence: number
  /** Detection time (ms since epoch) from the iOS side. */
  timestamp: number
}

export type SoundClassifiedEvent = {
  /** Top-1 label from SoundAnalysis (e.g. "infant_cry", "speech", "silence"). */
  label: string
  /** Confidence in [0, 1]. */
  confidence: number
}

export type CryDetectorErrorEvent = {
  message: string
}

export type CryDetectorEvents = {
  onCryDetected: (event: CryDetectedEvent) => void
  onSoundClassified: (event: SoundClassifiedEvent) => void
  onError: (event: CryDetectorErrorEvent) => void
}
