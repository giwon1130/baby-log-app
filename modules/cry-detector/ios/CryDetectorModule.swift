import ExpoModulesCore
import AVFoundation
import SoundAnalysis
import Accelerate

// MARK: - Live streaming observer (for always-on monitor mode)

private final class CryResultsObserver: NSObject, SNResultsObserving {
  let onClassification: (String, Double) -> Void
  let onFailure: (String) -> Void

  init(onClassification: @escaping (String, Double) -> Void,
       onFailure: @escaping (String) -> Void) {
    self.onClassification = onClassification
    self.onFailure = onFailure
  }

  func request(_ request: SNRequest, didProduce result: SNResult) {
    guard let classificationResult = result as? SNClassificationResult,
          let top = classificationResult.classifications.first else { return }
    onClassification(top.identifier, Double(top.confidence))
  }

  func request(_ request: SNRequest, didFailWithError error: Error) {
    onFailure(error.localizedDescription)
  }

  func requestDidComplete(_ request: SNRequest) {}
}

// MARK: - One-shot analysis observer (for record-and-analyze mode)

private final class CryAnalysisAccumulator: NSObject, SNResultsObserving {
  var cryConfidenceSamples: [Double] = []
  var peakCryConfidence: Double = 0

  func request(_ request: SNRequest, didProduce result: SNResult) {
    guard let classificationResult = result as? SNClassificationResult else { return }
    // The pretrained classifier has an `infant_cry` class; read it directly for stability.
    if let cry = classificationResult.classifications.first(where: { $0.identifier == "infant_cry" }) {
      let conf = Double(cry.confidence)
      cryConfidenceSamples.append(conf)
      if conf > peakCryConfidence { peakCryConfidence = conf }
    } else {
      cryConfidenceSamples.append(0)
    }
  }

  func request(_ request: SNRequest, didFailWithError error: Error) {}
  func requestDidComplete(_ request: SNRequest) {}
}

// MARK: - Volume meter (rolling RMS from the audio tap)

private final class VolumeMeter {
  private(set) var samplesDb: [Double] = []

  func ingest(_ buffer: AVAudioPCMBuffer) {
    guard let channelData = buffer.floatChannelData?[0] else { return }
    let length = Int(buffer.frameLength)
    var sumSquares: Double = 0
    for i in 0..<length {
      let sample = Double(channelData[i])
      sumSquares += sample * sample
    }
    let rms = sqrt(sumSquares / Double(length))
    // Convert to dBFS; clamp floor at -80 to avoid -inf for silent frames
    let db = rms > 0 ? max(20 * log10(rms), -80) : -80
    samplesDb.append(db)
  }
}

// MARK: - Acoustic feature extractor
//
// Extracts per-buffer features that help distinguish cry "reasons":
//   - pitch (fundamental frequency via autocorrelation) — high/variable pitch ⇒ pain
//   - zero crossing rate — fricative/noisy character
//   - RMS sequence — used later to compute rhythmicity (periodicity of bursts)
//
// Deliberately lightweight: O(n*maxLag) per buffer, no FFT allocation per frame.
// For a ~44kHz stream with 4096-sample buffers that's a few ms of CPU.
private final class AudioFeatureExtractor {
  private(set) var pitchSamples: [Double] = []     // Hz; 0 for unvoiced/quiet frames
  private(set) var zcrSamples: [Double] = []       // 0–1
  private(set) var rmsSamples: [Double] = []       // linear RMS per buffer

  private let minVoicedRms: Float = 0.01           // below this = silence, skip pitch
  private let pitchMinHz: Double = 80
  private let pitchMaxHz: Double = 1500

  func ingest(_ buffer: AVAudioPCMBuffer, sampleRate: Double) {
    guard let channelData = buffer.floatChannelData?[0] else { return }
    let length = Int(buffer.frameLength)
    if length < 512 { return }

    // Downsample pointer into a Swift array once for Accelerate reuse
    let samples = UnsafeBufferPointer(start: channelData, count: length)

    // 1. RMS (vDSP)
    var meanSq: Float = 0
    vDSP_measqv(samples.baseAddress!, 1, &meanSq, vDSP_Length(length))
    let rms = sqrt(meanSq)
    rmsSamples.append(Double(rms))

    // 2. Zero crossing rate
    var crossings = 0
    for i in 1..<length {
      if (samples[i] >= 0) != (samples[i - 1] >= 0) { crossings += 1 }
    }
    zcrSamples.append(Double(crossings) / Double(length - 1))

    // 3. Pitch via autocorrelation (skip silent frames)
    if rms < minVoicedRms {
      pitchSamples.append(0)
      return
    }
    let minLag = max(2, Int(sampleRate / pitchMaxHz))
    let maxLag = min(length - 1, Int(sampleRate / pitchMinHz))
    if maxLag <= minLag {
      pitchSamples.append(0)
      return
    }

    // vDSP autocorrelation: compute normalized correlation for lags in [minLag, maxLag]
    var bestCorr: Float = 0
    var bestLag = 0
    // r[0] = sum(x[i]^2) — used for normalization
    var r0: Float = 0
    vDSP_measqv(samples.baseAddress!, 1, &r0, vDSP_Length(length))
    r0 *= Float(length)  // measqv returned mean; convert to sum
    if r0 <= 0 { pitchSamples.append(0); return }

    for lag in stride(from: minLag, through: maxLag, by: 1) {
      var corr: Float = 0
      let n = length - lag
      vDSP_dotpr(samples.baseAddress!, 1,
                 samples.baseAddress! + lag, 1,
                 &corr, vDSP_Length(n))
      // Normalize by variance (rough)
      let normalized = corr / r0
      if normalized > bestCorr {
        bestCorr = normalized
        bestLag = lag
      }
    }

    // Require minimum autocorrelation strength to call it "voiced"
    if bestLag > 0 && bestCorr > 0.3 {
      pitchSamples.append(sampleRate / Double(bestLag))
    } else {
      pitchSamples.append(0)
    }
  }

  // Summary stats — nil if no voiced frames.
  struct Summary {
    let pitchMeanHz: Double?
    let pitchStdHz: Double?
    let pitchMaxHz: Double?
    let voicedRatio: Double          // fraction of frames with pitch > 0
    let zcrMean: Double?
    let rhythmicity: Double?         // 0–1: how periodic is the RMS envelope
  }

  func summarize() -> Summary {
    let voiced = pitchSamples.filter { $0 > 0 }
    let pitchMean = voiced.isEmpty ? nil : voiced.reduce(0, +) / Double(voiced.count)
    let pitchStd: Double? = pitchMean.flatMap { mean in
      guard voiced.count > 1 else { return nil }
      let variance = voiced.map { ($0 - mean) * ($0 - mean) }.reduce(0, +) / Double(voiced.count)
      return sqrt(variance)
    }
    let pitchMax = voiced.max()
    let voicedRatio = pitchSamples.isEmpty ? 0 : Double(voiced.count) / Double(pitchSamples.count)
    let zcrMean = zcrSamples.isEmpty ? nil : zcrSamples.reduce(0, +) / Double(zcrSamples.count)
    let rhythm = computeRhythmicity(rmsSamples)
    return Summary(
      pitchMeanHz: pitchMean,
      pitchStdHz: pitchStd,
      pitchMaxHz: pitchMax,
      voicedRatio: voicedRatio,
      zcrMean: zcrMean,
      rhythmicity: rhythm
    )
  }

  // Rhythmicity = normalized autocorrelation peak of the RMS envelope after the
  // zero-lag. Intuitively: if loudness rises-and-falls periodically (wail-rest-wail)
  // the envelope has a strong non-zero-lag peak; a continuous scream does not.
  private func computeRhythmicity(_ rms: [Double]) -> Double? {
    guard rms.count >= 16 else { return nil }
    // Zero-mean the envelope
    let mean = rms.reduce(0, +) / Double(rms.count)
    let centered = rms.map { $0 - mean }
    let r0 = centered.reduce(0) { $0 + $1 * $1 }
    if r0 <= 0 { return nil }

    let minLag = 2
    let maxLag = min(rms.count / 2, 40)
    var best = 0.0
    for lag in minLag...maxLag {
      var corr = 0.0
      for i in 0..<(centered.count - lag) {
        corr += centered[i] * centered[i + lag]
      }
      let normalized = corr / r0
      if normalized > best { best = normalized }
    }
    return max(0, min(1, best))
  }
}

// MARK: - Module

public class CryDetectorModule: Module {
  // Shared audio pipeline (reused by both live stream and one-shot modes)
  private var audioEngine: AVAudioEngine?
  private var streamAnalyzer: SNAudioStreamAnalyzer?
  private var resultsObserver: CryResultsObserver?
  private let analysisQueue = DispatchQueue(label: "com.giwon.babylog.crydetector.analysis")

  // Live-stream state
  private var cryConfidenceThreshold: Double = 0.5
  private var isRunning: Bool = false

  // One-shot state (record+analyze)
  private var oneShotAccumulator: CryAnalysisAccumulator?
  private var oneShotMeter: VolumeMeter?
  private var oneShotFeatures: AudioFeatureExtractor?
  private var oneShotSampleRate: Double = 44100
  private var oneShotPromise: Promise?
  private var oneShotStartedAt: Date?

  public func definition() -> ModuleDefinition {
    Name("CryDetector")

    Events("onCryDetected", "onSoundClassified", "onError")

    AsyncFunction("requestPermission") { (promise: Promise) in
      if #available(iOS 17.0, *) {
        AVAudioApplication.requestRecordPermission { granted in
          promise.resolve(granted)
        }
      } else {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          promise.resolve(granted)
        }
      }
    }

    AsyncFunction("getPermissionStatus") { () -> String in
      if #available(iOS 17.0, *) {
        switch AVAudioApplication.shared.recordPermission {
        case .granted: return "granted"
        case .denied: return "denied"
        case .undetermined: return "undetermined"
        @unknown default: return "undetermined"
        }
      } else {
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted: return "granted"
        case .denied: return "denied"
        case .undetermined: return "undetermined"
        @unknown default: return "undetermined"
        }
      }
    }

    AsyncFunction("setCryConfidenceThreshold") { (threshold: Double) -> Void in
      self.cryConfidenceThreshold = max(0.0, min(1.0, threshold))
    }

    // Live monitor: streams onSoundClassified/onCryDetected events until stop().
    AsyncFunction("start") { (promise: Promise) in
      if self.isRunning { promise.resolve(true); return }
      self.startLive(promise: promise)
    }

    AsyncFunction("stop") { () -> Void in
      self.stopAudio()
    }

    AsyncFunction("isRunning") { () -> Bool in
      return self.isRunning
    }

    // One-shot analysis: records for `seconds`, returns aggregated features.
    // This is the primary entry point for the "tap button → analyze → confirm" flow.
    AsyncFunction("recordAndAnalyze") { (seconds: Double, promise: Promise) in
      self.startOneShot(seconds: seconds, promise: promise)
    }

    OnDestroy {
      self.stopAudio()
    }
  }

  // MARK: - Live monitor

  private func startLive(promise: Promise) {
    do {
      let (engine, analyzer, format) = try setupAudioPipeline()

      let request = try SNClassifySoundRequest(classifierIdentifier: .version1)
      let observer = CryResultsObserver(
        onClassification: { [weak self] label, confidence in
          guard let self = self else { return }
          self.sendEvent("onSoundClassified", ["label": label, "confidence": confidence])
          if label == "infant_cry" && confidence >= self.cryConfidenceThreshold {
            self.sendEvent("onCryDetected", [
              "confidence": confidence,
              "timestamp": Date().timeIntervalSince1970 * 1000,
            ])
          }
        },
        onFailure: { [weak self] msg in
          self?.sendEvent("onError", ["message": msg])
        }
      )
      try analyzer.add(request, withObserver: observer)

      engine.inputNode.installTap(onBus: 0, bufferSize: 8192, format: format) { [weak analyzer, weak self] buffer, time in
        guard let analyzer = analyzer else { return }
        self?.analysisQueue.async {
          analyzer.analyze(buffer, atAudioFramePosition: time.sampleTime)
        }
      }

      engine.prepare()
      try engine.start()

      self.audioEngine = engine
      self.streamAnalyzer = analyzer
      self.resultsObserver = observer
      self.isRunning = true
      promise.resolve(true)
    } catch {
      self.stopAudio()
      promise.reject("E_CRY_START", error.localizedDescription)
    }
  }

  // MARK: - One-shot record+analyze

  private func startOneShot(seconds: Double, promise: Promise) {
    if oneShotPromise != nil {
      promise.reject("E_BUSY", "이미 분석 중이에요")
      return
    }
    do {
      let (engine, analyzer, format) = try setupAudioPipeline()

      let accumulator = CryAnalysisAccumulator()
      let meter = VolumeMeter()
      let features = AudioFeatureExtractor()
      let sampleRate = format.sampleRate

      let request = try SNClassifySoundRequest(classifierIdentifier: .version1)
      try analyzer.add(request, withObserver: accumulator)

      engine.inputNode.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak analyzer, weak self] buffer, time in
        // Feed the sound classifier, volume meter, and feature extractor in lockstep
        // so their sample windows stay aligned. SNAudioStreamAnalyzer must run on a
        // serial queue; the lightweight meter + feature work stays on the tap thread.
        guard let analyzer = analyzer else { return }
        meter.ingest(buffer)
        features.ingest(buffer, sampleRate: sampleRate)
        self?.analysisQueue.async {
          analyzer.analyze(buffer, atAudioFramePosition: time.sampleTime)
        }
      }

      engine.prepare()
      try engine.start()

      self.audioEngine = engine
      self.streamAnalyzer = analyzer
      self.oneShotAccumulator = accumulator
      self.oneShotMeter = meter
      self.oneShotFeatures = features
      self.oneShotSampleRate = sampleRate
      self.oneShotPromise = promise
      self.oneShotStartedAt = Date()
      self.isRunning = true

      let clamped = max(1.0, min(20.0, seconds))
      DispatchQueue.main.asyncAfter(deadline: .now() + clamped) { [weak self] in
        self?.finishOneShot()
      }
    } catch {
      self.stopAudio()
      promise.reject("E_CRY_START", error.localizedDescription)
    }
  }

  private func finishOneShot() {
    guard let promise = self.oneShotPromise else { return }
    let accumulator = self.oneShotAccumulator
    let meter = self.oneShotMeter
    let features = self.oneShotFeatures
    let startedAt = self.oneShotStartedAt

    // Stop capture first so we get a final snapshot of buffers in flight.
    stopAudio()

    let actualDuration = startedAt.map { Date().timeIntervalSince($0) } ?? 0

    let cryAvg: Double? = accumulator?.cryConfidenceSamples.nonEmptyAverage()
    let cryMax: Double? = accumulator.map { $0.peakCryConfidence }
    let volAvg: Double? = meter?.samplesDb.nonEmptyAverage()
    let volPeak: Double? = meter?.samplesDb.max()
    let summary = features?.summarize()

    promise.resolve([
      "durationSec": actualDuration,
      "cryConfidenceAvg": cryAvg as Any,
      "cryConfidenceMax": cryMax as Any,
      "avgVolumeDb": volAvg as Any,
      "peakVolumeDb": volPeak as Any,
      "sampleCount": accumulator?.cryConfidenceSamples.count ?? 0,
      // Acoustic features — nullable, may be absent for silent recordings
      "pitchMeanHz": summary?.pitchMeanHz as Any,
      "pitchStdHz": summary?.pitchStdHz as Any,
      "pitchMaxHz": summary?.pitchMaxHz as Any,
      "voicedRatio": summary?.voicedRatio as Any,
      "zcrMean": summary?.zcrMean as Any,
      "rhythmicity": summary?.rhythmicity as Any,
    ])

    self.oneShotAccumulator = nil
    self.oneShotMeter = nil
    self.oneShotFeatures = nil
    self.oneShotPromise = nil
    self.oneShotStartedAt = nil
  }

  // MARK: - Shared audio setup

  private func setupAudioPipeline() throws -> (AVAudioEngine, SNAudioStreamAnalyzer, AVAudioFormat) {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.record, mode: .measurement, options: [.mixWithOthers])
    try session.setActive(true, options: [])

    let engine = AVAudioEngine()
    let format = engine.inputNode.outputFormat(forBus: 0)
    let analyzer = SNAudioStreamAnalyzer(format: format)
    return (engine, analyzer, format)
  }

  private func stopAudio() {
    if let engine = audioEngine {
      engine.inputNode.removeTap(onBus: 0)
      engine.stop()
    }
    streamAnalyzer?.removeAllRequests()
    audioEngine = nil
    streamAnalyzer = nil
    resultsObserver = nil
    isRunning = false
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }
}

private extension Array where Element == Double {
  func nonEmptyAverage() -> Double? {
    guard !isEmpty else { return nil }
    return reduce(0, +) / Double(count)
  }
}
