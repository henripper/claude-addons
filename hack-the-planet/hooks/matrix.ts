// Matrix moments, as one-shot SMIL SVGs that play once when drawn: the white rabbit
// diving down its hole when a daemon finishes.

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

/** The terminal's rabbit, three lines. */
export const RABBIT_TEXT = ['(\\_/)', '(o.o)  follow the white rabbit', '(")(")']
