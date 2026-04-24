# AGENTS.md — baby-log-app

AI 에이전트(Claude Code, Codex 등)가 이 레포에서 작업할 때 참고할 지침.

## 프로젝트 개요

Expo SDK 54 / React Native 0.81 / TypeScript 기반 신생아 기록 앱 ("베이비로그"). iOS 중심, Android도 빌드는 되지만 주력 아님. 백엔드는 별도 레포 [`baby-log-api`](../baby-log-api).

## 디렉토리 맵

```
baby-log-app/
├── App.tsx                         # 루트: NavigationContainer + Tab/Stack + 알림 부트스트랩
├── app.config.ts                   # Expo 설정 (권한/Info.plist/번들ID). CNG 기반이라 ios/는 재생성됨
├── src/
│   ├── api/                        # client.ts (axios 래퍼), babyLogApi.ts (도메인 엔드포인트)
│   ├── screens/                    # Home / Log / Stats / BabyProfile / FamilySetup / GrowthRecord / CryMonitor
│   ├── hooks/                      # useFeedNotification 등
│   └── types/index.ts              # Family/Baby/Feed/Diaper/Sleep/Growth/Cry 도메인 타입
├── modules/
│   └── cry-detector/               # Expo 로컬 네이티브 모듈 (iOS only)
│       ├── index.ts                # JS 브리지 + useCryDetector 훅
│       ├── ios/CryDetectorModule.swift  # SoundAnalysis + Accelerate 기반 feature 추출
│       └── expo-module.config.json
└── ios/                            # prebuild 산출물 (.gitignore). 네이티브 빌드 시 생성
```

## 핵심 기능

### 기록
- Home: 빠른 기록 (수유/기저귀/수면 토글)
- Log: 상세 기록 + 날짜 필터 + 수정/삭제
- Stats: 주간 차트 (수유량, 횟수, 수면)
- BabyProfile: 아기 프로필, 성장 기록, 수유 가이드, 가족 초대 코드

### 울음 분석 (Phase 2A — 음향 feature 기반)
- CryMonitor 탭에서 10초 녹음 → 온디바이스 feature 추출 → 백엔드 분류
- 네이티브 측 (Swift + Accelerate): 피치 F0(autocorrelation), ZCR, RMS rhythmicity, infant_cry 신뢰도
- 음성 파일은 전송/저장 안 함 — 숫자 요약만 서버로
- 사용자가 정답 라벨을 확인하면 per-baby similarity 학습 강화
- 학습 단계: HEURISTIC(0~20) → SIMILARITY(20~50) → PERSONAL(50+)

### 가족 공유
- 초대 코드로 여러 기기에서 같은 아기 데이터 공유

## 개발 워크플로우

### JS만 수정
```bash
npx expo start
```
→ Metro 핫리로드. 네이티브 rebuild 불필요.

### 네이티브 수정 (Swift / Podfile / Info.plist)
```bash
cd ios
pod install
xcodebuild -workspace BabyLog.xcworkspace -scheme BabyLog \
  -configuration Debug -destination "id=<DEVICE_UDID>" \
  -derivedDataPath build \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=776H9NV6HT \
  -allowProvisioningUpdates build
xcrun devicectl device install app --device <DEVICE_UDID> build/Build/Products/Debug-iphoneos/BabyLog.app
```

Development Team: **776H9NV6HT** (giwon의 Apple ID, free tier — TestFlight/푸시 외 대부분 동작)

### 연결된 디바이스 확인
```bash
xcrun devicectl list devices
```

## 규칙

### 코드 스타일
- 주석은 한국어 + 필요시 영어 혼용 OK. 주석 너무 많이 달지 말고, "왜" 위주로.
- 화면 텍스트는 한국어.
- 네이티브 응답 필드는 camelCase로 JS에서 그대로 소비 (Expo 컨벤션).

### 커밋 메시지
- `feat:`, `fix:`, `refactor:`, `chore:` prefix
- 한국어 본문 OK
- 커밋 trailer에 `Co-Authored-By: Claude ...` 포함 가능

### 네이티브 모듈 추가 시
- `modules/<name>/expo-module.config.json` 작성 → Expo autolink가 Pod에 반영
- Swift 파일 변경 → **반드시 Xcode 재빌드** (Metro reload로는 반영 안 됨)
- `pod install` 후 DerivedData 캐시 오염되면 `pod deintegrate && rm -rf Pods Podfile.lock build && pod install`

### API 레포 동반 수정
- 새 엔드포인트 추가 시 `baby-log-api`에서 먼저 배포 확인 → `babyLogApi.ts`에 추가
- 타입 변경 시 `src/types/index.ts` 먼저 갱신

## 알려진 이슈 / 주의사항

- **Apple Developer 무료 티어**: TestFlight/Push 등 일부 기능 불가. Siri Shortcuts, Live Activity는 유료 업그레이드 후 진행 예정.
- **포트 8081 충돌**: Expo 기본 포트. 다른 Expo 프로젝트 동시에 돌리면 충돌 — 먼저 켠 쪽이 점유.
- **Ruby/CocoaPods Unicode 에러**: `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` 필요할 때 있음.
- **첫 설치 시 "신뢰할 수 없는 개발자"**: 설정 → 일반 → VPN 및 기기 관리 → 개발자 앱 신뢰.

## 로드맵

- [x] Phase 1: 휴리스틱 울음 분류 + 컨텍스트 기반 예측
- [x] Phase 2A: 음향 feature 확장 (피치/리듬/ZCR)
- [ ] Phase 2B: YAMNet 임베딩 + Donate-a-Cry 코퍼스 k-NN 유사도
- [ ] Siri Shortcuts (유료 계정 필요)
- [ ] Live Activity (유료 계정 필요)
- [ ] TestFlight 배포
