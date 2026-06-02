import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { getDiapers, getFeeds, getGrowthRecords, getSleepRecords } from '../api/babyLogApi'
import { FEED_TYPE_LABEL } from './constants'
import type { Baby, DiaperRecord, FeedRecord, GrowthRecord, SleepRecord } from '../types'

/**
 * 우리 아기 기록(수유/기저귀/수면/성장) 전체를 CSV·JSON 파일로 만들어 공유 시트로 내보낸다.
 * 산부인과 제출(CSV: Excel 호환) / 백업(JSON: 원본 보존) 용도.
 *
 * expo-file-system 의 legacy API(writeAsStringAsync)를 쓰는 이유: 단순 텍스트 파일 1개를
 * cache 에 쓰고 Sharing 으로 넘기는 데엔 새 File API 보다 검증된 legacy 가 안전.
 */

const EXPORT_LIMIT = 2000

// CSV 에는 이모지 없는 평문 라벨 사용 (스프레드시트 가독성)
const DIAPER_PLAIN: Record<string, string> = {
  WET: '소변', DIRTY: '대변', MIXED: '혼합', DRY: '깨끗',
}

type AllRecords = {
  feeds: FeedRecord[]
  diapers: DiaperRecord[]
  sleeps: SleepRecord[]
  growth: GrowthRecord[]
}

async function fetchAll(babyId: string): Promise<AllRecords> {
  const [feeds, diapers, sleeps, growth] = await Promise.all([
    getFeeds(babyId, EXPORT_LIMIT).catch(() => [] as FeedRecord[]),
    getDiapers(babyId, EXPORT_LIMIT).catch(() => [] as DiaperRecord[]),
    getSleepRecords(babyId, EXPORT_LIMIT).catch(() => [] as SleepRecord[]),
    getGrowthRecords(babyId, EXPORT_LIMIT).catch(() => [] as GrowthRecord[]),
  ])
  return { feeds, diapers, sleeps, growth }
}

function totalCount(d: AllRecords): number {
  return d.feeds.length + d.diapers.length + d.sleeps.length + d.growth.length
}

// ── CSV ─────────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvRow(cols: Array<string | number | null | undefined>): string {
  return cols.map(csvCell).join(',')
}

function feedDetail(f: FeedRecord): string {
  if (f.feedType === 'BREAST' && (f.leftMinutes != null || f.rightMinutes != null)) {
    return `모유 좌${f.leftMinutes ?? 0}분/우${f.rightMinutes ?? 0}분`
  }
  return `${FEED_TYPE_LABEL[f.feedType] ?? f.feedType} ${f.amountMl}ml`
}

function growthDetail(g: GrowthRecord): string {
  const parts: string[] = []
  if (g.weightG != null) parts.push(`체중 ${g.weightG}g`)
  if (g.heightCm != null) parts.push(`신장 ${g.heightCm}cm`)
  if (g.headCm != null) parts.push(`두위 ${g.headCm}cm`)
  return parts.join(' / ')
}

function buildCsv(d: AllRecords): string {
  type Line = { sort: string; cols: Array<string | number | null> }
  const lines: Line[] = []

  for (const f of d.feeds) lines.push({ sort: f.fedAt, cols: ['수유', f.fedAt, '', feedDetail(f), f.note] })
  for (const x of d.diapers) lines.push({ sort: x.changedAt, cols: ['기저귀', x.changedAt, '', DIAPER_PLAIN[x.diaperType] ?? x.diaperType, x.note] })
  for (const s of d.sleeps) lines.push({ sort: s.sleptAt, cols: ['수면', s.sleptAt, s.wokeAt ?? '', s.durationMinutes != null ? `${s.durationMinutes}분` : '진행중', s.note] })
  for (const g of d.growth) lines.push({ sort: g.measuredAt, cols: ['성장', g.measuredAt, '', growthDetail(g), g.note] })

  // 최신순 정렬 (ISO 문자열은 사전식 비교가 곧 시간순)
  lines.sort((a, b) => (a.sort < b.sort ? 1 : a.sort > b.sort ? -1 : 0))

  const header = csvRow(['유형', '일시', '종료', '상세', '메모'])
  const body = lines.map(l => csvRow(l.cols))
  // ﻿(BOM): Excel 이 UTF-8 한글을 깨지 않게
  return '﻿' + [header, ...body].join('\r\n')
}

// ── JSON ────────────────────────────────────────────────────────────────────

function buildJson(baby: Baby, d: AllRecords, exportedAt: string): string {
  return JSON.stringify(
    {
      app: 'BabyLog',
      schema: 1,
      exportedAt,
      baby: { id: baby.id, name: baby.name, birthDate: baby.birthDate, gender: baby.gender },
      counts: {
        feeds: d.feeds.length,
        diapers: d.diapers.length,
        sleeps: d.sleeps.length,
        growth: d.growth.length,
      },
      records: d,
    },
    null,
    2,
  )
}

// ── Write + share ─────────────────────────────────────────────────────────────

function safeName(name: string): string {
  return (name || 'baby').replace(/[^0-9A-Za-z가-힣]/g, '_')
}

async function writeAndShare(
  filename: string,
  content: string,
  mimeType: string,
  uti: string,
): Promise<void> {
  const uri = `${FileSystem.cacheDirectory}${filename}`
  await FileSystem.writeAsStringAsync(uri, content)
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'BabyLog 데이터 내보내기', UTI: uti })
  }
}

/** CSV 내보내기. 내보낸 기록 수를 반환(0이면 호출부에서 안내). */
export async function exportBabyDataCsv(baby: Baby): Promise<number> {
  const data = await fetchAll(baby.id)
  const total = totalCount(data)
  if (total === 0) return 0
  const date = new Date().toISOString().slice(0, 10)
  await writeAndShare(
    `babylog_${safeName(baby.name)}_${date}.csv`,
    buildCsv(data),
    'text/csv',
    'public.comma-separated-values-text',
  )
  return total
}

/** JSON 백업 내보내기. 내보낸 기록 수를 반환. */
export async function exportBabyDataJson(baby: Baby): Promise<number> {
  const data = await fetchAll(baby.id)
  const total = totalCount(data)
  if (total === 0) return 0
  const exportedAt = new Date().toISOString()
  await writeAndShare(
    `babylog_${safeName(baby.name)}_${exportedAt.slice(0, 10)}.json`,
    buildJson(baby, data, exportedAt),
    'application/json',
    'public.json',
  )
  return total
}
