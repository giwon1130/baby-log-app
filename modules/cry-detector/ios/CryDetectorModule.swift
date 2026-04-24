import ExpoModulesCore
import AVFoundation
import SoundAnalysis

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

      let request = try SNClassifySoundRequest(classifierIdentifier: .version1)
      try analyzer.add(request, withObserver: accumulator)

      engine.inputNode.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak analyzer, weak self] buffer, time in
        // Feed both the sound classifier and the volume meter in lockstep so their
        // sample windows stay aligned. Swift captures `buffer` by reference; we must
        // hand it to SNAudioStreamAnalyzer on a serial queue.
        guard let analyzer = analyzer else { return }
        meter.ingest(buffer)
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
    let startedAt = self.oneShotStartedAt

    // Stop capture first so we get a final snapshot of buffers in flight.
    stopAudio()

    let actualDuration = startedAt.map { Date().timeIntervalSince($0) } ?? 0

    let cryAvg: Double? = accumulator?.cryConfidenceSamples.nonEmptyAverage()
    let cryMax: Double? = accumulator.map { $0.peakCryConfidence }
    let volAvg: Double? = meter?.samplesDb.nonEmptyAverage()
    let volPeak: Double? = meter?.samplesDb.max()

    promise.resolve([
      "durationSec": actualDuration,
      "cryConfidenceAvg": cryAvg as Any,
      "cryConfidenceMax": cryMax as Any,
      "avgVolumeDb": volAvg as Any,
      "peakVolumeDb": volPeak as Any,
      "sampleCount": accumulator?.cryConfidenceSamples.count ?? 0,
    ])

    self.oneShotAccumulator = nil
    self.oneShotMeter = nil
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
