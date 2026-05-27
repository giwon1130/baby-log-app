export const COLORS = {
  primary: '#FF6B9D',
  primaryDisabled: '#ffb3cc',
  primaryBg: '#FFF9FB',
  primarySurface: '#FFF0F5',
  sleep: '#5C6BC0',
  amber: '#FF8F00',
  success: '#4CAF50',
  error: '#F44336',        // 상태 표시용 빨강 (성장 백분위 경고 등)
  errorStrong: '#FF3B30',  // 솔리드 에러 배너 / 삭제 버튼 — 흰 텍스트 위
  errorSurface: '#FFECEC', // 연한 인라인 에러 카드 배경
  danger: '#D04848',       // 위험 액션 텍스트·아이콘 (졸업 등)
  dangerSurface: '#FFF5F5',// 위험 액션 카드/버튼 배경
  dangerBorder: '#FFCCCC', // 위험 액션 테두리
} as const

/**
 * Spacing scale. 신규 코드는 이 토큰을 사용. 기존 화면은 점진 적용.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

/**
 * Typography scale. fontSize 만 토큰화(fontWeight/lineHeight 은 기존 그대로).
 * 추후 lineHeight 등 typography 시스템 확장 시 객체로 키울 수 있음.
 */
export const FONT = {
  display: 28,    // 아바타·큰 강조 (4회)
  hero: 22,       // 화면 hero (4회)
  h1: 20,         // 헤딩 큰 (4회)
  h2: 18,         // 헤딩 (8회)
  h3: 17,         // 헤딩 작은 (4회)
  h4: 16,         // 섹션 헤딩 (17회)
  body: 15,       // 본문 큰 / 버튼 (26회)
  bodyMd: 14,     // 본문 (30회)
  bodySm: 13,     // 본문 작은 (34회)
  label: 12,      // 라벨 — 가장 흔함 (36회)
  caption: 11,    // caption (17회)
  micro: 10,      // 매우 작음 / uppercase 라벨 (3회)
} as const

/**
 * Neutral gray scale. hex 값을 그대로 보존(1:1 매핑)하면서 의미적 이름 부여.
 * 다크모드 도입 시 이 한 곳만 바꾸면 됨.
 * 스케일은 hex 가 어두워질수록 숫자 증가.
 */
export const NEUTRALS = {
  white: '#fff',
  gray50: '#f5f5f5',    // 가장 밝은 배경
  gray100: '#f0f0f0',   // 배경 alt (대소문자 #F0F0F0 도 동일 hex)
  gray150: '#eee',      // 매우 흐린 border
  gray200: '#e8e8e8',   // border alt
  gray250: '#e0e0e0',   // border
  gray300: '#ccc',
  gray400: '#bbb',      // placeholder
  gray450: '#aaa',      // 흐린 텍스트
  gray500: '#999',
  gray600: '#888',      // 보조 텍스트 (가장 흔함)
  gray650: '#666',
  gray700: '#555',      // 진한 회색 텍스트
  gray750: '#444',
  gray800: '#333',
  gray850: '#222',      // 강조 텍스트
  ink: '#1a1a1a',       // 메인 텍스트
  black: '#000',
} as const

export const DIAPER_TYPE_LABEL: Record<string, string> = {
  WET: '💧 소변',
  DIRTY: '💩 대변',
  MIXED: '💧💩 혼합',
  DRY: '✅ 깨끗',
}

export const FEED_TYPE_LABEL: Record<string, string> = {
  FORMULA: '분유',
  BREAST: '모유',
  MIXED: '혼합',
}
