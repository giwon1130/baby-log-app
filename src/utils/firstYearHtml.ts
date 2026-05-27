import type { Baby, MonthlyPhoto } from '../types'
import { COLORS } from './constants'

const TOTAL = 12

export type FirstYearHtmlInput = {
  baby: Baby
  photos: MonthlyPhoto[]
  startDate: string
  endDate: string
  filled: number
}

/**
 * 첫 돌 패키지 PDF 용 HTML 템플릿.
 * 같은 구조를 RN view (view-shot PNG 캡처) 와 시각 일관되게 유지.
 */
export function renderFirstYearHtml({ baby, photos, startDate, endDate, filled }: FirstYearHtmlInput): string {
  const slotPhoto = (m: number) => photos.find(p => p.monthIndex === m) ?? null

  const slotHtml = (m: number) => {
    const p = slotPhoto(m)
    if (p) {
      return `
        <div class="slot">
          <img src="${escapeAttr(p.photoUrl)}" />
          <div class="month-badge">${m}개월</div>
        </div>`
    }
    return `<div class="slot empty"><div class="month-only">${m}개월</div></div>`
  }
  const slots = Array.from({ length: TOTAL }, (_, i) => slotHtml(i + 1)).join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif; padding: 28pt; background: ${COLORS.primaryBg}; margin: 0; }
          .header { text-align: center; margin-bottom: 24pt; }
          .star { font-size: 32pt; }
          .name { font-size: 26pt; font-weight: 800; color: ${COLORS.primary}; margin-top: 4pt; }
          .meta { font-size: 12pt; color: #555; margin-top: 6pt; }
          .grid { display: flex; flex-wrap: wrap; gap: 8pt; }
          .slot {
            width: calc(33.33% - 6pt);
            aspect-ratio: 1;
            border-radius: 12pt;
            overflow: hidden;
            position: relative;
            background: ${COLORS.primarySurface};
            border: 1.5pt dashed ${COLORS.primaryDisabled};
            box-sizing: border-box;
          }
          .slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .month-badge {
            position: absolute; bottom: 6pt; left: 6pt;
            background: rgba(0,0,0,0.55);
            color: #fff;
            padding: 2pt 6pt;
            border-radius: 6pt;
            font-size: 9pt;
            font-weight: 700;
          }
          .slot.empty .month-only {
            text-align: center;
            padding-top: 38%;
            color: ${COLORS.primary};
            font-weight: 700;
            font-size: 14pt;
          }
          .footer { text-align: center; color: #888; font-size: 10pt; margin-top: 28pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="star">⭐</div>
          <div class="name">${escapeHtml(baby.name)}의 첫 해</div>
          <div class="meta">${startDate} ~ ${endDate}</div>
        </div>
        <div class="grid">${slots}</div>
        <div class="footer">BabyLog · 첫 돌 기념 (${filled}/${TOTAL} 채움)</div>
      </body>
    </html>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
function escapeAttr(s: string): string { return escapeHtml(s) }
