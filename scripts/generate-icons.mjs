// Gera os arquivos de marca e ícones do PWA a partir do símbolo vetorial.
// Uso: npm run icons  (requer a dependência de desenvolvimento "sharp")
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const icons = join(pub, 'icons')
const brand = join(root, 'src', 'assets', 'brand')
mkdirSync(icons, { recursive: true })
mkdirSync(brand, { recursive: true })

const CARVAO = '#0F172A'
const AMARELO = '#F59E0B'
const BRANCO = '#FFFFFF'

/**
 * Símbolo ParquiTime (viewBox 0 0 100 100): o aro do cronômetro é também uma roda em movimento.
 * O aro se abre na parte inferior esquerda e dali saem traços de velocidade — o brinquedo andando.
 */
export function symbol(secondary) {
  return `
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="43" y="7" width="14" height="7" rx="2.5" fill="${AMARELO}" stroke="none"/>
    <rect x="47.5" y="13" width="5" height="9" fill="${AMARELO}" stroke="none"/>
    <rect x="74" y="20" width="7" height="11" rx="2" transform="rotate(45 77.5 25.5)" fill="${AMARELO}" stroke="none"/>
    <path d="M22.29 40 A32 32 0 1 1 39.06 86.07" stroke="${AMARELO}" stroke-width="9"/>
    <path d="M50 56 L62.9 40.7" stroke="${secondary}" stroke-width="7"/>
    <circle cx="50" cy="56" r="6" fill="${AMARELO}" stroke="none"/>
    <path d="M4 50 H17" stroke="${secondary}" stroke-width="6.5"/>
    <path d="M-2 62.5 H15" stroke="${secondary}" stroke-width="6.5"/>
    <path d="M9 75 H25" stroke="${secondary}" stroke-width="6.5"/>
  </g>`
}

// Centro visual do símbolo (inclui os traços de velocidade)
const CX = 39.75
const CY = 49.5

const svg = (w, h, body, vb = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>\n`

// Símbolo isolado (para uso sobre fundos escuros e claros)
const symbolOnDark = svg(100, 100, symbol(BRANCO), '-4 0 104 100')
const symbolOnLight = svg(100, 100, symbol(CARVAO), '-4 0 104 100')

// Ícone de app: fundo carvão. "any" usa área maior; "maskable" mantém o símbolo na zona segura (círculo de 80%).
const appIcon = (scale) => {
  const s = 512
  return svg(
    s,
    s,
    `<rect width="${s}" height="${s}" rx="${scale > 3.6 ? 112 : 0}" fill="${CARVAO}"/>` +
      `<g transform="translate(${s / 2 - CX * scale} ${s / 2 - CY * scale}) scale(${scale})">${symbol(BRANCO)}</g>`,
  )
}
const iconAny = appIcon(4.1)
const iconMaskable = appIcon(3.1)

// Favicon: precisa ler bem em 16px, então ganha fundo próprio.
const favicon = svg(
  64,
  64,
  `<rect width="64" height="64" rx="14" fill="${CARVAO}"/><g transform="translate(${32 - CX * 0.6} ${32 - CY * 0.6}) scale(0.6)">${symbol(BRANCO)}</g>`,
)

// Logotipo: símbolo + nome com "Time" em amarelo.
const logo = (ink) =>
  svg(
    420,
    100,
    `<g transform="translate(6 2) scale(0.92)">${symbol(ink)}</g>` +
      `<text x="112" y="68" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-weight="600" font-size="52" letter-spacing="-0.5">` +
      `<tspan fill="${ink}">Parqui</tspan><tspan fill="${AMARELO}">Time</tspan></text>`,
  )

writeFileSync(join(pub, 'favicon.svg'), favicon)
writeFileSync(join(pub, 'logo.svg'), logo(CARVAO))
writeFileSync(join(pub, 'logo-dark.svg'), logo(BRANCO))
writeFileSync(join(brand, 'symbol-on-dark.svg'), symbolOnDark)
writeFileSync(join(brand, 'symbol-on-light.svg'), symbolOnLight)
writeFileSync(join(icons, 'icon.svg'), iconAny)
writeFileSync(join(icons, 'maskable.svg'), iconMaskable)

const png = (src, size) => sharp(Buffer.from(src), { density: 384 }).resize(size, size).png().toBuffer()

for (const size of [192, 512]) {
  writeFileSync(join(icons, `icon-${size}.png`), await png(iconAny, size))
  writeFileSync(join(icons, `maskable-${size}.png`), await png(iconMaskable, size))
}
writeFileSync(join(icons, 'apple-touch-icon.png'), await png(iconMaskable, 180))

// favicon.ico com PNGs embutidos (16, 32, 48)
const sizes = [16, 32, 48]
const images = await Promise.all(sizes.map((s) => png(favicon, s)))
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = 6 + 16 * sizes.length
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(s, 0)
  e.writeUInt8(s, 1)
  e.writeUInt16LE(1, 4)
  e.writeUInt16LE(32, 6)
  e.writeUInt32LE(images[i].length, 8)
  e.writeUInt32LE(offset, 12)
  offset += images[i].length
  return e
})
writeFileSync(join(pub, 'favicon.ico'), Buffer.concat([header, ...entries, ...images]))

// Prévia para revisão visual (não publicada)
const preview = svg(
  1100,
  320,
  `<rect width="1100" height="320" fill="#E5E7EB"/>` +
    `<g transform="translate(20 20) scale(0.5)">${iconAny.replace(/<\/?svg[^>]*>/g, '')}</g>` +
    `<g transform="translate(300 20) scale(0.5)">${iconMaskable.replace(/<\/?svg[^>]*>/g, '')}<circle cx="256" cy="256" r="204.8" fill="none" stroke="red" stroke-width="2"/></g>` +
    `<g transform="translate(580 30)">${logo(CARVAO).replace(/<\/?svg[^>]*>/g, '')}</g>` +
    `<rect x="580" y="160" width="440" height="120" fill="${CARVAO}"/>` +
    `<g transform="translate(590 170)">${logo(BRANCO).replace(/<\/?svg[^>]*>/g, '')}</g>` +
    `<g transform="translate(20 290)">${favicon.replace(/<\/?svg[^>]*>/g, '').replace('width="64"', 'width="64"')}</g>`,
)
const out = process.argv[2]
if (out) writeFileSync(out, await sharp(Buffer.from(preview)).png().toBuffer())
console.log('Ícones gerados.')
