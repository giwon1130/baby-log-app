/**
 * WHO Child Growth Standards – simplified percentile reference
 * Source: WHO Child Growth Standards (2006), boys & girls 0-24 months
 *
 * Data tables: weight-for-age and length-for-age at P3 / P50 / P97
 * by age in completed months.
 */

type PercentileRow = { p3: number; p50: number; p97: number }
type GrowthTable = PercentileRow[]

// ── Weight-for-age (kg) ──────────────────────────────────────────────────────

const WEIGHT_BOYS: GrowthTable = [
  { p3: 2.5, p50: 3.3, p97: 4.4 },   // 0
  { p3: 3.4, p50: 4.5, p97: 5.8 },   // 1
  { p3: 4.3, p50: 5.6, p97: 7.1 },   // 2
  { p3: 5.0, p50: 6.4, p97: 7.9 },   // 3
  { p3: 5.6, p50: 7.0, p97: 8.7 },   // 4
  { p3: 6.1, p50: 7.5, p97: 9.3 },   // 5
  { p3: 6.4, p50: 7.9, p97: 9.8 },   // 6
  { p3: 6.7, p50: 8.3, p97: 10.3 },  // 7
  { p3: 7.0, p50: 8.6, p97: 10.7 },  // 8
  { p3: 7.1, p50: 8.9, p97: 11.0 },  // 9
  { p3: 7.4, p50: 9.2, p97: 11.4 },  // 10
  { p3: 7.6, p50: 9.4, p97: 11.7 },  // 11
  { p3: 7.7, p50: 9.6, p97: 12.0 },  // 12
  { p3: 7.9, p50: 9.9, p97: 12.3 },  // 13
  { p3: 8.1, p50: 10.1, p97: 12.6 }, // 14
  { p3: 8.3, p50: 10.3, p97: 12.8 }, // 15
  { p3: 8.4, p50: 10.5, p97: 13.1 }, // 16
  { p3: 8.6, p50: 10.7, p97: 13.4 }, // 17
  { p3: 8.8, p50: 10.9, p97: 13.7 }, // 18
  { p3: 8.9, p50: 11.1, p97: 13.9 }, // 19
  { p3: 9.1, p50: 11.3, p97: 14.2 }, // 20
  { p3: 9.2, p50: 11.5, p97: 14.5 }, // 21
  { p3: 9.4, p50: 11.8, p97: 14.7 }, // 22
  { p3: 9.5, p50: 12.0, p97: 15.0 }, // 23
  { p3: 9.7, p50: 12.2, p97: 15.3 }, // 24
]

const WEIGHT_GIRLS: GrowthTable = [
  { p3: 2.4, p50: 3.2, p97: 4.2 },   // 0
  { p3: 3.2, p50: 4.2, p97: 5.5 },   // 1
  { p3: 3.9, p50: 5.1, p97: 6.6 },   // 2
  { p3: 4.5, p50: 5.8, p97: 7.5 },   // 3
  { p3: 5.0, p50: 6.4, p97: 8.2 },   // 4
  { p3: 5.4, p50: 6.9, p97: 8.8 },   // 5
  { p3: 5.7, p50: 7.3, p97: 9.3 },   // 6
  { p3: 6.0, p50: 7.6, p97: 9.8 },   // 7
  { p3: 6.3, p50: 7.9, p97: 10.2 },  // 8
  { p3: 6.5, p50: 8.2, p97: 10.5 },  // 9
  { p3: 6.7, p50: 8.5, p97: 10.9 },  // 10
  { p3: 6.9, p50: 8.7, p97: 11.2 },  // 11
  { p3: 7.0, p50: 8.9, p97: 11.5 },  // 12
  { p3: 7.2, p50: 9.2, p97: 11.8 },  // 13
  { p3: 7.4, p50: 9.4, p97: 12.1 },  // 14
  { p3: 7.6, p50: 9.6, p97: 12.4 },  // 15
  { p3: 7.7, p50: 9.8, p97: 12.6 },  // 16
  { p3: 7.9, p50: 10.0, p97: 12.9 }, // 17
  { p3: 8.1, p50: 10.2, p97: 13.2 }, // 18
  { p3: 8.2, p50: 10.4, p97: 13.5 }, // 19
  { p3: 8.4, p50: 10.6, p97: 13.7 }, // 20
  { p3: 8.6, p50: 10.9, p97: 14.0 }, // 21
  { p3: 8.7, p50: 11.1, p97: 14.3 }, // 22
  { p3: 8.9, p50: 11.3, p97: 14.6 }, // 23
  { p3: 9.0, p50: 11.5, p97: 14.8 }, // 24
]

// ── Length-for-age (cm) ──────────────────────────────────────────────────────

const HEIGHT_BOYS: GrowthTable = [
  { p3: 46.3, p50: 49.9, p97: 53.4 }, // 0
  { p3: 50.8, p50: 54.7, p97: 58.6 }, // 1
  { p3: 54.4, p50: 58.4, p97: 62.4 }, // 2
  { p3: 57.3, p50: 61.4, p97: 65.5 }, // 3
  { p3: 59.7, p50: 63.9, p97: 68.0 }, // 4
  { p3: 61.7, p50: 65.9, p97: 70.1 }, // 5
  { p3: 63.3, p50: 67.6, p97: 71.9 }, // 6
  { p3: 64.8, p50: 69.2, p97: 73.5 }, // 7
  { p3: 66.2, p50: 70.6, p97: 75.0 }, // 8
  { p3: 67.5, p50: 72.0, p97: 76.5 }, // 9
  { p3: 68.7, p50: 73.3, p97: 77.9 }, // 10
  { p3: 69.9, p50: 74.5, p97: 79.2 }, // 11
  { p3: 71.0, p50: 75.7, p97: 80.5 }, // 12
  { p3: 72.1, p50: 76.9, p97: 81.8 }, // 13
  { p3: 73.1, p50: 78.0, p97: 83.0 }, // 14
  { p3: 74.1, p50: 79.1, p97: 84.2 }, // 15
  { p3: 75.0, p50: 80.2, p97: 85.4 }, // 16
  { p3: 76.0, p50: 81.2, p97: 86.5 }, // 17
  { p3: 76.9, p50: 82.3, p97: 87.7 }, // 18
  { p3: 77.7, p50: 83.2, p97: 88.8 }, // 19
  { p3: 78.6, p50: 84.2, p97: 89.8 }, // 20
  { p3: 79.4, p50: 85.1, p97: 90.9 }, // 21
  { p3: 80.2, p50: 86.0, p97: 91.9 }, // 22
  { p3: 81.0, p50: 86.9, p97: 92.9 }, // 23
  { p3: 81.7, p50: 87.8, p97: 93.9 }, // 24
]

const HEIGHT_GIRLS: GrowthTable = [
  { p3: 45.6, p50: 49.1, p97: 52.7 }, // 0
  { p3: 49.8, p50: 53.7, p97: 57.6 }, // 1
  { p3: 53.0, p50: 57.1, p97: 61.1 }, // 2
  { p3: 55.6, p50: 59.8, p97: 64.0 }, // 3
  { p3: 57.8, p50: 62.1, p97: 66.4 }, // 4
  { p3: 59.6, p50: 64.0, p97: 68.5 }, // 5
  { p3: 61.2, p50: 65.7, p97: 70.3 }, // 6
  { p3: 62.7, p50: 67.3, p97: 71.9 }, // 7
  { p3: 64.0, p50: 68.7, p97: 73.5 }, // 8
  { p3: 65.3, p50: 70.1, p97: 75.0 }, // 9
  { p3: 66.5, p50: 71.5, p97: 76.4 }, // 10
  { p3: 67.7, p50: 72.8, p97: 77.8 }, // 11
  { p3: 68.9, p50: 74.0, p97: 79.2 }, // 12
  { p3: 70.0, p50: 75.2, p97: 80.5 }, // 13
  { p3: 71.0, p50: 76.4, p97: 81.7 }, // 14
  { p3: 72.0, p50: 77.5, p97: 82.9 }, // 15
  { p3: 73.0, p50: 78.6, p97: 84.1 }, // 16
  { p3: 74.0, p50: 79.7, p97: 85.2 }, // 17
  { p3: 74.9, p50: 80.7, p97: 86.3 }, // 18
  { p3: 75.8, p50: 81.7, p97: 87.4 }, // 19
  { p3: 76.7, p50: 82.7, p97: 88.4 }, // 20
  { p3: 77.5, p50: 83.7, p97: 89.4 }, // 21
  { p3: 78.4, p50: 84.6, p97: 90.4 }, // 22
  { p3: 79.2, p50: 85.5, p97: 91.4 }, // 23
  { p3: 80.0, p50: 86.4, p97: 92.4 }, // 24
]

// ── Normal CDF approximation (Abramowitz & Stegun) ───────────────────────────

function normalCDF(z: number): number {
  if (z < -6) return 0
  if (z > 6) return 1
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const poly =
    t * (0.319381530 +
      t * (-0.356563782 +
        t * (1.781477937 +
          t * (-1.821255978 + t * 1.330274429))))
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
  const p = 1 - pdf * poly
  return z >= 0 ? p : 1 - p
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Age at measurement in completed months */
export function ageInMonths(birthDate: string, measuredAt: string): number {
  const birth = new Date(birthDate)
  const meas = new Date(measuredAt)
  const months =
    (meas.getFullYear() - birth.getFullYear()) * 12 +
    (meas.getMonth() - birth.getMonth())
  return Math.max(0, Math.min(24, months))
}

/**
 * Returns estimated WHO percentile (0-100) for a given measurement.
 * Uses log-normal approximation from p3/p50/p97 reference values.
 * Returns null if age > 24 months or value is invalid.
 */
export function calcPercentile(
  value: number,
  ageMonths: number,
  gender: 'MALE' | 'FEMALE',
  metric: 'weight' | 'height',
): number | null {
  if (ageMonths < 0 || ageMonths > 24) return null

  const table =
    metric === 'weight'
      ? gender === 'MALE' ? WEIGHT_BOYS : WEIGHT_GIRLS
      : gender === 'MALE' ? HEIGHT_BOYS : HEIGHT_GIRLS

  const row = table[ageMonths]
  if (!row) return null

  // Log-normal: sigma = (ln(p97) - ln(p3)) / (2 * z_97)
  // z_97 = 1.880794 (invNorm(0.97))
  const lnP3 = Math.log(row.p3)
  const lnP97 = Math.log(row.p97)
  const mu = Math.log(row.p50)
  const sigma = (lnP97 - lnP3) / (2 * 1.880794)

  const z = (Math.log(value) - mu) / sigma
  return Math.round(normalCDF(z) * 100)
}

/** Human-readable percentile label (e.g. "3rd", "50th", "97th") */
export function formatPercentile(p: number): string {
  if (p <= 3) return '3rd↓'
  if (p >= 97) return '97th↑'
  const suffix = p === 1 ? 'st' : p === 2 ? 'nd' : p === 3 ? 'rd' : 'th'
  return `${p}${suffix}`
}

/** Background color band based on percentile */
export function percentileColor(p: number): string {
  if (p < 3 || p > 97) return '#F44336'   // 저체중/고체중 경고
  if (p < 15 || p > 85) return '#FF8F00'  // 주의
  return '#4CAF50'                          // 정상
}
