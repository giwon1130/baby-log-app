/**
 * BabyLog 아이콘 생성 스크립트
 * - 분홍 배경 + 아기 젖병 이모지 느낌의 SVG → PNG 변환
 * - icon.png (1024x1024) : iOS / Expo 기본
 * - adaptive-icon.png (1024x1024) : Android foreground (배경 별도)
 * - splash-icon.png (1024x1024) : 스플래시 화면 로고
 */

import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.join(__dirname, '../assets')

const SIZE = 1024

// 아이콘 SVG: 분홍 원형 배경 + 젖병 아이콘
const iconSvg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 -->
  <rect width="${SIZE}" height="${SIZE}" fill="#FF6B9D" rx="220"/>

  <!-- 젖병 몸통 -->
  <rect x="390" y="360" width="244" height="340" rx="122" fill="white" opacity="0.95"/>

  <!-- 젖병 목 -->
  <rect x="432" y="290" width="160" height="90" rx="30" fill="white" opacity="0.95"/>

  <!-- 젖병 뚜껑/캡 -->
  <rect x="420" y="220" width="184" height="90" rx="40" fill="white" opacity="0.85"/>

  <!-- 젖병 젖꼭지 -->
  <ellipse cx="512" cy="205" rx="48" ry="36" fill="white" opacity="0.75"/>

  <!-- 눈금선 -->
  <line x1="430" y1="450" x2="540" y2="450" stroke="#FF6B9D" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
  <line x1="430" y1="510" x2="560" y2="510" stroke="#FF6B9D" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
  <line x1="430" y1="570" x2="540" y2="570" stroke="#FF6B9D" stroke-width="8" stroke-linecap="round" opacity="0.5"/>

  <!-- 하이라이트 -->
  <ellipse cx="440" cy="430" rx="28" ry="60" fill="white" opacity="0.2" transform="rotate(-15 440 430)"/>
</svg>
`

// 스플래시용 SVG: 흰 배경 + 중앙 로고
const splashSvg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- 분홍 원형 배경 -->
  <circle cx="512" cy="512" r="300" fill="#FF6B9D"/>

  <!-- 젖병 몸통 -->
  <rect x="390" y="390" width="244" height="310" rx="122" fill="white" opacity="0.95"/>

  <!-- 젖병 목 -->
  <rect x="432" y="325" width="160" height="85" rx="28" fill="white" opacity="0.95"/>

  <!-- 젖병 캡 -->
  <rect x="422" y="258" width="180" height="82" rx="38" fill="white" opacity="0.85"/>

  <!-- 젖꼭지 -->
  <ellipse cx="512" cy="244" rx="46" ry="34" fill="white" opacity="0.75"/>

  <!-- 눈금선 -->
  <line x1="430" y1="468" x2="540" y2="468" stroke="#FF6B9D" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
  <line x1="430" y1="522" x2="558" y2="522" stroke="#FF6B9D" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
  <line x1="430" y1="576" x2="540" y2="576" stroke="#FF6B9D" stroke-width="8" stroke-linecap="round" opacity="0.5"/>

  <ellipse cx="440" cy="456" rx="26" ry="55" fill="white" opacity="0.2" transform="rotate(-15 440 456)"/>
</svg>
`

// Android adaptive icon foreground: 투명 배경 + 중앙 젖병
const adaptiveSvg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- 젖병 몸통 -->
  <rect x="384" y="380" width="256" height="340" rx="128" fill="#FF6B9D"/>

  <!-- 젖병 목 -->
  <rect x="428" y="308" width="168" height="90" rx="32" fill="#FF6B9D"/>

  <!-- 젖병 캡 -->
  <rect x="416" y="238" width="192" height="86" rx="42" fill="#FF8FB3"/>

  <!-- 젖꼭지 -->
  <ellipse cx="512" cy="224" rx="52" ry="38" fill="#FFB3CC"/>

  <!-- 하이라이트 -->
  <rect x="384" y="380" width="256" height="340" rx="128" fill="white" opacity="0.08"/>
  <ellipse cx="448" cy="470" rx="32" ry="72" fill="white" opacity="0.18" transform="rotate(-12 448 470)"/>

  <!-- 눈금선 -->
  <line x1="424" y1="476" x2="548" y2="476" stroke="white" stroke-width="9" stroke-linecap="round" opacity="0.55"/>
  <line x1="424" y1="536" x2="560" y2="536" stroke="white" stroke-width="9" stroke-linecap="round" opacity="0.55"/>
  <line x1="424" y1="596" x2="548" y2="596" stroke="white" stroke-width="9" stroke-linecap="round" opacity="0.55"/>
</svg>
`

async function generate() {
  console.log('🍼 BabyLog 아이콘 생성 중...')

  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(`${assetsDir}/icon.png`)
  console.log('✓ icon.png (1024x1024)')

  await sharp(Buffer.from(splashSvg))
    .png()
    .toFile(`${assetsDir}/splash-icon.png`)
  console.log('✓ splash-icon.png (1024x1024)')

  await sharp(Buffer.from(adaptiveSvg))
    .png()
    .toFile(`${assetsDir}/adaptive-icon.png`)
  console.log('✓ adaptive-icon.png (1024x1024)')

  // favicon (32x32)
  await sharp(Buffer.from(iconSvg))
    .resize(32, 32)
    .png()
    .toFile(`${assetsDir}/favicon.png`)
  console.log('✓ favicon.png (32x32)')

  console.log('\n✅ 아이콘 생성 완료!')
}

generate().catch(console.error)
