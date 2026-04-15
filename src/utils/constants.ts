export const COLORS = {
  primary: '#FF6B9D',
  primaryDisabled: '#ffb3cc',
  primaryBg: '#FFF9FB',
  primarySurface: '#FFF0F5',
  sleep: '#5C6BC0',
  amber: '#FF8F00',
  success: '#4CAF50',
  error: '#F44336',
} as const

export const DIAPER_TYPE_LABEL: Record<string, string> = {
  WET: '💧 소변',
  DIRTY: '💩 대변',
  MIXED: '🔄 혼합',
  DRY: '✅ 깨끗',
}

export const FEED_TYPE_LABEL: Record<string, string> = {
  FORMULA: '분유',
  BREAST: '모유',
  MIXED: '혼합',
}
