/**
 * 서버에서 내려오는 타임스탬프를 파싱.
 * 'YYYY-MM-DD HH:MM' 또는 'YYYY-MM-DDTHH:MM+09:00' 등 다양한 포맷 정규화.
 */
export function parseApiTimestamp(iso: string | null | undefined): number | null {
  if (!iso) return null
  const trimmed = iso.trim()
  const normalized = trimmed
    .replace(' ', 'T')
    .replace(/T(\d{2}:\d{2})(Z|[+-]\d{2}:?\d{2})$/, 'T$1:00$2')
  const ts = new Date(normalized).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function formatTime(iso: string | null | undefined): string {
  const ts = parseApiTimestamp(iso)
  if (ts == null) return '-'
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function timeSince(iso: string | null | undefined): string {
  const ts = parseApiTimestamp(iso)
  if (ts == null) return '시간 확인 필요'
  const diff = Date.now() - ts
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}시간 ${remainingMins}분 전` : `${hours}시간 전`
}

export function timeUntil(iso: string | null | undefined): string {
  const ts = parseApiTimestamp(iso)
  if (ts == null) return '시간 확인 필요'
  const diff = ts - Date.now()
  if (diff <= 0) return '지금 수유 가능'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 후`
  const hours = Math.floor(mins / 60)
  return `${hours}시간 ${mins % 60}분 후`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return `${h}시간 ${m}분`
}

export function formatAge(daysOld: number): string {
  const months = Math.floor(daysOld / 30)
  const days = daysOld % 30
  if (months === 0) return `${daysOld}일`
  if (days === 0) return `${months}개월`
  return `${months}개월 ${days}일`
}

export function toDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function yesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toDateString(d)
}
