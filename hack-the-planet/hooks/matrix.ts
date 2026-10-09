// Matrix moments, as one-shot SMIL SVGs that play once when drawn: the Nokia 8110
// sliding open when a daemon is dispatched, the white rabbit diving down its hole when
// one finishes, and the "Wake up, Neo" intro when The Gibson opens.

import { AMBER, DIM, GREEN, HOT } from './gibson'

const MONO = 'ui-monospace, Menlo, monospace'

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, ch => `&#${ch.charCodeAt(0)};`)
}

/** A line that types itself out from `begin` seconds: a wipe with a block cursor riding its edge. */
function typed(id: string, x: number, y: number, text: string, begin: number, attrs: string, charWidth = 7.2): string {
  const width = Math.ceil((text.length + 2) * charWidth) + 4
  const dur = Math.max(0.3, text.length * 0.045).toFixed(2)
  return (
    `<clipPath id="${id}"><rect x="${x}" y="${y - 14}" width="0" height="20">` +
    `<animate attributeName="width" from="0" to="${width}" begin="${begin}s" dur="${dur}s" fill="freeze"/></rect></clipPath>` +
    `<text x="${x}" y="${y}" ${attrs} clip-path="url(#${id})">${escapeXml(text)}</text>` +
    `<rect x="${x}" y="${y - 11}" width="7" height="13" fill="${GREEN}" opacity="0">` +
    `<set attributeName="opacity" to="1" begin="${begin}s" dur="${(+dur + 0.5).toFixed(2)}s"/>` +
    `<animate attributeName="x" from="${x}" to="${x + width - 4}" begin="${begin}s" dur="${dur}s" fill="freeze"/></rect>`
  )
}

/** The white rabbit, facing right, feet at the origin. */
const RABBIT =
  `<g fill="#f4f8f6" stroke="#9fb3aa" stroke-width="0.6">` +
  `<ellipse cx="11" cy="-27" rx="2.2" ry="7.5" transform="rotate(-14 11 -27)"/>` +
  `<ellipse cx="15.5" cy="-27" rx="2.2" ry="7.5" transform="rotate(10 15.5 -27)"/>` +
  `<ellipse cx="0" cy="-9" rx="11" ry="8.5"/><circle cx="12" cy="-16" r="6.5"/>` +
  `<circle cx="-11" cy="-11" r="3.2"/><ellipse cx="6" cy="-1.5" rx="4.5" ry="1.8"/></g>` +
  `<circle cx="14.5" cy="-17.5" r="1.2" fill="#ff5d7a"/><circle cx="18.2" cy="-15.2" r="0.9" fill="#ffb3c1"/>`

/**
 * The rabbit and its hole on a ground line at `ground`: `in` hops from the left and dives
 * down the hole at `holeX`; `out` pops up out of it and bounds off to the right.
 */
function rabbitScene(id: string, w: number, holeX: number, ground: number, mode: 'in' | 'out', begin: number): string {
  const hop = (from: number, to: number, height: number) => `Q${(from + to) / 2},${ground - height} ${to},${ground}`
  const path =
    mode === 'in'
      ? `M-30,${ground} ${hop(-30, holeX - 150, 34)} ${hop(holeX - 150, holeX - 80, 30)} ${hop(holeX - 80, holeX - 22, 26)} Q${holeX - 6},${ground - 30} ${holeX},${ground + 40}`
      : `M${holeX},${ground + 40} Q${holeX + 4},${ground - 34} ${holeX + 30},${ground} ${hop(holeX + 30, holeX + 100, 30)} ${hop(holeX + 100, w + 40, 36)}`
  const rim = `M${holeX - 26},${ground} a26 7 0 0 0 52 0`
  return (
    `<clipPath id="${id}-clip"><rect x="0" y="0" width="${w}" height="${ground + 1}"/></clipPath>` +
    `<line x1="0" y1="${ground}" x2="${w}" y2="${ground}" stroke="${DIM}" stroke-opacity="0.5" stroke-dasharray="2 5"/>` +
    `<ellipse cx="${holeX}" cy="${ground}" rx="26" ry="7" fill="#000" stroke="${DIM}"/>` +
    `<g clip-path="url(#${id}-clip)"><g opacity="0">${RABBIT}` +
    `<set attributeName="opacity" to="1" begin="${begin}s" dur="${mode === 'in' ? 2.2 : 2.6}s"/>` +
    `<animateMotion path="${path}" begin="${begin}s" dur="${mode === 'in' ? 2.2 : 2.6}s" fill="freeze"/></g></g>` +
    `<path d="${rim}" fill="none" stroke="${GREEN}" stroke-width="1.5"/>`
  )
}

/** The rabbit diving down its hole, said when a daemon finishes. */
export function rabbitSvg(w: number, type: string, elapsed: string): string {
  const h = 104
  const holeX = Math.min(w - 50, 420)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="#020a04"/>` +
    rabbitScene('rb', w, holeX, 80, 'in', 0.1) +
    `<g font-family="${MONO}" font-size="12">` +
    typed('rt1', 14, 22, 'Follow the white rabbit.', 0.3, `fill="${GREEN}"`) +
    typed('rt2', 14, 42, `${type.toUpperCase()} daemon went down the hole: ACCESS GRANTED (${elapsed})`, 2.1, `fill="${AMBER}" font-weight="bold"`, 7.2) +
    `</g></svg>`
  )
}

/** The Nokia 8110 sliding in and snapping open, the operator on the line. */
export function nokiaSvg(w: number, type: string, description: string): string {
  const h = 186
  const keys = Array.from({ length: 12 }, (_, i) => {
    const x = 9 + (i % 3) * 11
    const y = 63 + Math.floor(i / 3) * 8.5
    return `<rect x="${x}" y="${y}" width="9" height="6.5" rx="2.5" fill="#c9d0d6" stroke="#7fe8a0" stroke-opacity="0.5" stroke-width="0.5"/>`
  }).join('')
  const phone =
    // The banana: a curved black body, its earpiece and screen, the keypad under the slider.
    `<path d="M6 8Q28 -2 50 8L52 60Q54 96 44 112Q28 122 12 112Q2 96 4 60Z" fill="#15181b" stroke="#3b4248"/>` +
    `<rect x="20" y="13" width="18" height="2" rx="1" fill="#3b4248"/>` +
    `<rect x="12" y="20" width="34" height="26" rx="3" fill="#6d8f45"><animate attributeName="fill" values="#2a3a1c;#a8d86a" begin="0.85s" dur="0.15s" fill="freeze"/></rect>` +
    `<text x="29" y="31" font-family="${MONO}" font-size="5.5" fill="#1b2a10" text-anchor="middle" opacity="0">OPERATOR<set attributeName="opacity" to="1" begin="0.95s" dur="indefinite"/></text>` +
    `<text x="29" y="40" font-family="${MONO}" font-size="4.5" fill="#1b2a10" text-anchor="middle" opacity="0">calling…<set attributeName="opacity" to="1" begin="1.1s" dur="indefinite"/>` +
    `<animate attributeName="opacity" values="1;0.2;1" begin="1.1s" dur="0.8s" repeatCount="indefinite"/></text>` +
    `<g opacity="0.95">${keys}<animate attributeName="opacity" values="0.4;1" begin="0.7s" dur="0.2s" fill="freeze"/></g>` +
    // The slider: covers the keypad, then drops with a spring and a snap.
    `<g><path d="M5 56Q29 52 53 56L52 70Q50 100 42 108Q29 115 16 108Q7 100 6 70Z" fill="#202428" stroke="#4a535b"/>` +
    `<path d="M14 98Q29 104 44 98" fill="none" stroke="#4a535b" stroke-width="1.5"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 56;0 47;0 50" keyTimes="0;0.3;0.7;0.85;1" begin="0.35s" dur="0.55s" fill="freeze"/></g>`
  const lines = [
    { text: '☎ INCOMING CALL', at: 1.0, attrs: `fill="${HOT}" font-weight="bold" font-size="13"` },
    { text: `> Operator: dispatching ${type.toUpperCase()} daemon`, at: 1.5, attrs: `fill="${GREEN}"` },
    { text: `> "${description.slice(0, 44)}"`, at: 2.4, attrs: `fill="${DIM}"` },
    { text: '> Knock, knock.', at: 3.4, attrs: `fill="${GREEN}" font-weight="bold"` },
  ]
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="#020a04"/>` +
    `<g transform="translate(26 10)"><g>${phone}` +
    `<animateTransform attributeName="transform" type="translate" values="-90 0;6 0;0 0" keyTimes="0;0.7;1" dur="0.4s" fill="freeze"/></g></g>` +
    `<g font-family="${MONO}" font-size="12">` +
    lines.map((line, i) => typed(`nk${i}`, 108, 50 + i * 26, line.text, line.at, line.attrs)).join('') +
    `</g></svg>`
  )
}

/** "Wake up, Neo…": typed on a black screen, then the rabbit climbs out of its hole and bounds away. */
export function wakeUpSvg(w: number): string {
  const h = 150
  const lines = ['Wake up, Neo…', 'The Matrix has you…', 'Follow the white rabbit.', 'Knock, knock, Neo.']
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="#000"/>` +
    `<g font-family="${MONO}" font-size="14">` +
    lines.map((text, i) => typed(`wk${i}`, 18, 28 + i * 24, text, 0.3 + i * 1.5, `fill="${GREEN}"`, 8.4)).join('') +
    `</g>` +
    rabbitScene('wr', w, Math.min(w - 120, 470), 128, 'out', 6.2) +
    `</svg>`
  )
}

/** The terminal's rabbit, three lines. */
export const RABBIT_TEXT = ['(\\_/)', '(o.o)  follow the white rabbit', '(")(")']
