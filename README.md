# baby-log-app

신생아 수유/기저귀/수면/성장/울음분석 Expo 앱 ("베이비로그")

Expo SDK 54 · React Native 0.81 · TypeScript · iOS 중심 (Android도 빌드 가능)
백엔드: [`baby-log-api`](https://github.com/giwon1130/baby-log-api) (Spring Boot, Railway 배포)

## 스크린 구성

| 탭 | 설명 |
|----|------|
| 홈 | 빠른 기록 (수유·기저귀·수면 토글), 오늘 요약, 다음 수유 시간 |
| 기록 | 수유/기저귀/수면 상세 기록 (날짜 필터, 수정, 삭제) |
| 울음분석 | 10초 녹음 → 음향 feature + 컨텍스트로 분류 → 확인 시 개인화 학습 |
| 통계 | 주간 수유량·횟수·수면 차트 |
| 아기 | 아기 프로필, 수유 가이드, 성장 기록, 알림 설정, 가족 초대 코드 |

## 울음 분석 (Phase 2A)

- **온디바이스 feature 추출**: 피치(F0, autocorrelation), ZCR, RMS envelope rhythmicity, infant_cry 신뢰도
- **음성 파일은 저장/전송 안 함** — 숫자 요약만 서버로 (프라이버시)
- **분류 로직**: 컨텍스트 prior (마지막 수유/기저귀/수면 경과) + 음향 규칙 + 과거 확정 샘플과의 similarity
- **학습 단계**: HEURISTIC → SIMILARITY(20+) → PERSONAL(50+)
- 라벨: 배고픔 / 졸림 / 불편함 / 트림 필요 / 통증 / 알 수 없음

네이티브 모듈은 `modules/cry-detector/`에 있음 (Expo 로컬 모듈 + Swift/Accelerate).

## 로컬 실행

```bash
npm install
npx expo start
```

iOS 시뮬레이터: `i` / Android: `a` / 실기기: Expo Go 앱으로 QR 스캔

## 환경변수

`app.config.ts`에서 API URL을 환경변수로 주입:

```bash
# 로컬 (기본값 localhost:8092 사용)
npx expo start

# 배포된 API 사용
BABY_LOG_API_URL=https://baby-log-api.fly.dev npx expo start
```

## 알림

- 수유 기록 시 `nextFeedAt` 기준으로 로컬 알림 자동 등록
- 앱 시작 시 최신 수유 기록으로 알림 재동기화
- iOS: 권한 팝업 자동 요청 / Android: `feed-reminder` 채널

## 가족 공유

1. 첫 번째 기기에서 **새 가족 시작하기** → 아기 등록
2. 아기 탭에서 **초대 코드** 확인 (8자리)
3. 두 번째 기기에서 **초대 코드로 참여하기** → 같은 데이터 공유

## 실기기 빌드 (Swift 네이티브 모듈 수정 시)

JS만 바꿨다면 Metro 핫리로드로 충분하고, Swift/Podfile/Info.plist를 수정했다면 Xcode 재빌드가 필요함.

```bash
cd ios
pod install  # Podfile/의존성 추가 시에만

xcodebuild -workspace BabyLog.xcworkspace -scheme BabyLog \
  -configuration Debug -destination "id=<DEVICE_UDID>" \
  -derivedDataPath build \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=776H9NV6HT \
  -allowProvisioningUpdates build

xcrun devicectl list devices  # UDID 확인
xcrun devicectl device install app --device <UDID> \
  build/Build/Products/Debug-iphoneos/BabyLog.app
```

Pods Unicode 에러나면 `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` 먼저.

## 로드맵

- [x] 수유/기저귀/수면/성장/통계 + 가족 공유
- [x] 울음 분석 Phase 1 (휴리스틱 + 학습 스텁)
- [x] 울음 분석 Phase 2A (음향 feature 확장)
- [ ] 울음 분석 Phase 2B (YAMNet + Donate-a-Cry k-NN)
- [ ] Siri Shortcuts / Live Activity (Apple Developer 유료 업그레이드 후)
- [ ] TestFlight 배포

더 자세한 에이전트용 가이드는 [AGENTS.md](./AGENTS.md) 참고.
