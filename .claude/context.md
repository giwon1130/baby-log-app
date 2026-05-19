# baby-log-app Claude Context

Expo 기반 React Native 앱. iOS는 TestFlight, Android는 미정.

## 배포 식별자

| 항목 | 값 |
|------|------|
| Expo 프로젝트 | `@giwon1130/baby-log-app` |
| Expo projectId | `8c7b0f38-259b-4760-b10d-e9a9833e63bf` |
| iOS Bundle ID | `com.giwon.babylog` |
| ASC App ID | `6764563994` |
| Apple Team ID | `776H9NV6HT` (Giwon Im Individual) |
| Apple ID (제출) | `giwon1130@gmail.com` |

ASC 앱 이름: `베이비로그-ai` (변경 가능).

## 빌드 / 제출 명령

```bash
# TestFlight까지 한 번에 (다음 빌드부터 기본)
npx eas build --profile production --platform ios --auto-submit

# 분리해서 돌릴 때
npx eas build --profile production --platform ios
npx eas submit --platform ios --latest --non-interactive
```

- `production` 프로필이 store distribution (TestFlight 용). `preview`는 internal distribution(ad-hoc, UDID 등록 필요)이라 TestFlight에 안 올라감.
- 자격증명은 EAS 서버에 저장됨. Distribution Certificate / Provisioning Profile / ASC API Key 모두 자동 사용.

## 환경

- API: `https://baby-log-api-production.up.railway.app` (Railway, 별도 프로젝트)
- `app.config.ts`의 `extra.apiBaseUrl`은 `BABY_LOG_API_URL` env 우선, 없으면 prod URL fallback
- `eas.json` 프로필별 env에서 빌드 시점 BABY_LOG_API_URL 주입
- `appVersionSource: remote` — buildNumber는 EAS가 자동 증가. `ios.buildNumber` 필드는 무시되며 제거 권장.

## 테스터 관리

App Store Connect → 베이비로그-ai → TestFlight 탭

- **Internal Testing**: ASC 사용자(이메일 초대)만, 최대 100명. 리뷰 없음. 부부+가까운 사람 여기로.
- **External Testing**: 최대 10,000명. 그룹 만들고 Public Link 활성화 가능. 첫 빌드는 Beta App Review 1회 필요 (보통 24h). 친구 공유는 여기로.

수출 규정(Export Compliance)은 첫 빌드 처리 후 한 번 답변 — 암호화 사용 안 함으로 답.

## Gotcha

- `eas.json`의 `submit.production.ios.{ascAppId, appleTeamId}`가 빈 문자열이면 `eas init`/`eas build`까지 검증으로 막힘. 위 표의 값으로 채워두면 됨.
- `app.config.ts`의 `extra.eas.projectId`가 비어 있으면 EAS가 새 프로젝트를 만들려고 함. 기존 projectId 박아두면 됨.
- Expo Google OAuth 가입 계정은 비번이 없어서 `eas login`이 안 먹힐 수 있음 — `expo.dev/settings/access-tokens`에서 토큰 발급 후 `EXPO_TOKEN` 환경변수.

## 코드 구조

- 스크린: `src/screens/{Home, Log, FeedLog, DiaperLog, Sleep, Stats, BabyProfile, GrowthRecord, FamilySetup}Screen.tsx`
- 컴포넌트: `src/components/` — Edit*Modal, BreastfeedingTimer, QuickActions, SwipeToDelete, UndoToast, ErrorBanner, SuccessToast 등
- 알림: `expo-notifications`. 수유 기록 시 `nextFeedAt` 기준 로컬 알림 자동 등록 + 앱 시작 시 재동기화
- 가족 공유: 8자리 초대 코드 → 같은 아기 데이터 공유

## 실시간 동기화 (Phase 1+2, Build #4 부터)

- **SSE**: `/api/v1/families/{familyId}/stream` 으로 가족 단위 record 이벤트 구독 (`react-native-sse`, `useFamilyStream` 훅, HomeScreen에 연결됨)
- **Push**: 같은 가족의 다른 디바이스에 Expo Push 발송 (CREATED 이벤트만)
- **자기 제외**: `X-Device-Id` 헤더로 자기 디바이스 제외 (`getOrCreateDeviceId` AsyncStorage 영구, 모든 API 호출에 자동 첨부)
- **Push Token 등록**: HomeScreen 초기화 시 `registerPushTokenForFamily(familyId)` 자동 호출

### 검증 시나리오 (폰 2대 필요, Build #4 이상)

**Step 0 — 사전 준비**
1. 두 기기에 TestFlight로 Build #4 설치 (Version `1.0.0 (4)`)
2. 앱 처음 실행 시 **알림 권한 허용** (안 허용하면 Expo Push Token 발급 안 돼서 푸시 X)
3. 두 기기 모두 같은 **8자리 초대 코드**로 같은 가족 가입
4. 두 기기 모두 홈 → 아기 탭 스크롤 끝에 **🎓 신생아 졸업** 섹션 보이면 Build #4 맞음

**Step 1 — Foreground SSE**
- 두 기기 모두 baby-log 홈 화면 열어둠
- 기기 A에서 수유 한 번 기록
- 기기 B 홈 화면 통계가 30초 안에 자동 새로고침 → ✅

**Step 2 — Background Push**
- 기기 B를 잠금화면 또는 다른 앱으로 (앱 백그라운드)
- 기기 A에서 기저귀 한 번 기록
- 기기 B에 푸시 도착: `💧 기저귀 / {아기이름} 교체 했어요` → ✅

**Step 3 — 자기 제외**
- 기기 A에서 기록 → 기기 A엔 푸시 X
- 같은 동작에 기기 B만 푸시 받음 → ✅

### 디버그 (실패 시)

| 증상 | 원인 후보 | 확인 방법 |
|------|-----------|-----------|
| Step 1 실패 (SSE 안 옴) | SSE 연결 실패, familyId 불일치 | `curl -sN https://baby-log-api-production.up.railway.app/api/v1/families/{id}/stream` 로 `event:ready` 떨어지는지 |
| Step 2 실패 (푸시 안 옴) | 알림 권한 없음 / Push Token 미등록 / Expo Push API 실패 | 폰 설정 → 베이비로그 → 알림 허용 / Railway 로그에 `ExpoPushSender` 호출 확인 / push_tokens 테이블 row 존재 확인 |
| Step 3 실패 (자기에게도 푸시) | X-Device-Id 헤더 미첨부 또는 백엔드 필터 누락 | Railway 로그에서 X-Device-Id 헤더 수신 확인 / `pushTokenService.tokensForFamilyExcept` 로직 |

### 백엔드 직접 점검

```bash
# SSE endpoint 생존 확인
curl -sN --max-time 4 "https://baby-log-api-production.up.railway.app/api/v1/families/<familyId>/stream"
# → event:ready / data:ok 보이면 OK

# 등록된 푸시 토큰 확인 (직접 DB 접근 — Railway shell or psql)
# select device_id, label, platform, updated_at from bl_push_tokens where family_id = '<familyId>';

# Railway 로그
railway logs --service baby-log-api
```
