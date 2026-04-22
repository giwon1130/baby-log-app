# baby-log-app

신생아 수유/기저귀/수면/성장 기록 Expo 앱

## 스크린 구성

| 탭 | 설명 |
|----|------|
| 홈 | 빠른 기록 (수유·기저귀·수면 토글), 오늘 요약, 다음 수유 시간 |
| 기록 | 수유/기저귀/수면 상세 기록 (날짜 필터, 수정, 삭제) |
| 통계 | 주간 수유량·횟수·수면 차트 |
| 아기 | 아기 프로필, 수유 가이드, 성장 기록, 알림 설정, 가족 초대 코드 |

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
