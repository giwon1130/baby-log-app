# API 명세 (앱 측 사용)

> **누가 봄**: FE
> **언제 봄**: 새 호출 추가, 응답 구조 확인
> **단일 진실의 원천**: [API 저장소 API명세](https://github.com/giwon1130/baby-log-api/tree/main/docs/엔지니어링/API명세.md)

이 문서는 **앱이 어떻게 호출하는지** 위주. 서버 응답 schema 정확한 정의는 위 SoT.

## Base URL

`app.config.ts` 에서 환경변수로 주입:

```bash
# 로컬
BABY_LOG_API_URL=http://localhost:8092 npx expo start

# 운영 (기본값)
# Railway 도메인 — 정확한 값은 baby-log-api Railway 대시보드 확인
```

## axios 설정

`src/api/client.ts`:
- 인터셉터 없음 (인증 토큰 미사용)
- AsyncStorage에 `familyId` / `babyId` 보관 (`getStoredFamilyId/setStoredFamilyId` 등)
- 5초 타임아웃 (기본값)

## 호출 함수 목록 (`src/api/babyLogApi.ts`)

### Family
| 함수 | 메서드 | 경로 |
|------|--------|------|
| `createFamily()` | POST | `/api/v1/families` |
| `getFamily(familyId)` | GET | `/api/v1/families/:id` |
| `joinFamily(inviteCode)` | GET | `/api/v1/families/join/:code` |

### Baby
| 함수 | 메서드 | 경로 |
|------|--------|------|
| `createBaby(familyId, data)` | POST | `/api/v1/families/:fid/babies` |
| `getBabies(familyId)` | GET | `/api/v1/families/:fid/babies` |
| `updateBaby(familyId, babyId, data)` | PUT | `/api/v1/families/:fid/babies/:id` |
| `deleteBaby(familyId, babyId)` | DELETE | `/api/v1/families/:fid/babies/:id` |

### Feed / Diaper / Sleep / GrowthRecord
모두 동일 패턴. CRUD + (Sleep만) `start`/`end` 분리.
정확한 경로/페이로드는 [`babyLogApi.ts`](../../src/api/babyLogApi.ts) 직접 참조 — 굳이
복붙 안 함 (드리프트 방지).

### Stats
| 함수 | 메서드 | 경로 |
|------|--------|------|
| `getTodayStats(babyId)` | GET | `/api/v1/babies/:id/stats/today` |
| `getWeeklyStats(babyId)` | GET | `/api/v1/babies/:id/stats/weekly` |

### Cry Analysis
| 함수 | 메서드 | 경로 | 설명 |
|------|--------|------|------|
| `submitCrySample(babyId, data)` | POST | `/api/v1/babies/:id/cry-samples` | 음향 feature 제출 → 분류 결과 받음 |
| `confirmCrySample(sampleId, label, note)` | PATCH | `/api/v1/cry-samples/:id/confirm` | 정정/확인 |
| `getCryHistory(babyId, limit)` | GET | `/api/v1/babies/:id/cry-samples?limit=N` | 시간순 (최신순) |

`submitCrySample` 페이로드는 `CryFeatureSummary` 거의 그대로:
```ts
{
  durationSec: number
  cryConfidenceAvg?: number | null
  cryConfidenceMax?: number | null
  avgVolumeDb?: number | null
  peakVolumeDb?: number | null
  pitchMeanHz?: number | null
  pitchStdHz?: number | null
  pitchMaxHz?: number | null
  voicedRatio?: number | null
  zcrMean?: number | null
  rhythmicity?: number | null
  note?: string
}
```

응답 `CrySample` 구조는 [`데이터모델.md`](데이터모델.md).

## 인증 / 권한

**없음.** `babyId` 가 URL에 노출됨. 알면 누구나 접근.

향후 인증 도입 시 [`운영/보안.md`](../운영/보안.md) 와 [`의사결정로그.md`](의사결정로그.md)
업데이트 필요.

## 에러 처리

서버는 4xx/5xx에 `{ error: string }` 또는 raw 텍스트 반환. 현재 클라이언트는 그대로
사용자에게 노출 — 한국어 매핑 안 됨 (P2 개선 항목).

표준 매핑 가이드:
| 상태 | 표시 | 처리 |
|------|------|------|
| 400 | "입력값을 확인해주세요" | 폼 재입력 |
| 401 (미사용) | "다시 로그인해주세요" | 인증 도입 시 |
| 404 | "찾을 수 없어요" | 새로고침 유도 |
| 409 | "이미 처리된 작업이에요" | 중복 |
| 500 | "잠시 후 다시 시도해주세요" | 재시도 버튼 |
| Network | "네트워크를 확인해주세요" | 재시도 버튼 |

## Cross-link

전체 endpoint 표 / request body schema / 새 endpoint 추가 패턴 →
[API 저장소 API명세](https://github.com/giwon1130/baby-log-api/tree/main/docs/엔지니어링/API명세.md)
