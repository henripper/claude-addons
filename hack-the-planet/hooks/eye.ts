// The Eye of Sauron, in pixels, for while Claude browses the web: a fiery almond eye
// with a slit pupil that looks around, flames flickering in four frames, and the horns
// of Barad-dûr, drawn as plain text lines.

import { hash } from './gibson'

export const EYE_MS = 12000

const W = 60
const H = 44
const CX = 30
const CY = 13
const A = 21
const B = 7.5

const FLAME_FRAMES = 4

/** Half the almond's height at a column offset `dx` from the centre. */
function almond(dx: number): number {
  const k = 1 - (dx / A) ** 2
  return k <= 0 ? 0 : B * Math.pow(k, 0.75)
}

function irisColor(dx: number, dy: number): string {
  const r = Math.sqrt((dx / A) ** 2 + (dy / B) ** 2)
  if (r < 0.28) return '#fff6b0'
  if (r < 0.48) return '#ffd23a'
  if (r < 0.68) return '#ff9a1f'
  if (r < 0.86) return '#e4501c'
  return '#a81e0a'
}

/** Flame pixels around the eye for one frame: taller above, licking outward, thinning with distance. */
function flame(x: number, y: number, f: number): string | null {
  const dx = x - CX
  const dy = y - CY
  if (Math.abs(dy) <= almond(dx)) return null
  const up = dy < 0
  const ex = A + 7
  const ey = up ? B + 11 : B + 5
  const r = Math.sqrt((dx / ex) ** 2 + (dy / ey) ** 2)
  if (r > 1) return null
  const noise = (hash(x, y, f, 9) % 1000) / 1000
  const reach = up ? 0.95 : 0.8
  if (noise > reach - r * 0.85) return null
  if (r < 0.55) return '#ff6a1a'
  if (r < 0.78) return '#d2340d'
  return '#6e1006'
}

/** The horns: each a quadratic curve from the tower's crown, out around the eye, up to a tip. */
const HORNS: Map<string, string> = (() => {
  const out = new Map<string, string>()
  for (const side of [-1, 1]) {
    const p0 = [CX + side * 5, CY + 10]
    const p1 = [CX + side * (A + 9), CY + 3]
    const p2 = [CX + side * (A - 2), CY - 11]
    for (let t = 0; t <= 1; t += 0.01) {
      const x = (1 - t) ** 2 * p0[0]! + 2 * (1 - t) * t * p1[0]! + t * t * p2[0]!
      const y = (1 - t) ** 2 * p0[1]! + 2 * (1 - t) * t * p1[1]! + t * t * p2[1]!
      const thick = t < 0.7 ? 1 : 0
      for (let k = -thick; k <= thick; k++) {
        const key = `${Math.round(x + k * side)},${Math.round(y)}`
        out.set(key, t > 0.9 ? '#ff8a2a' : k === -thick && thick ? '#c0561c' : '#74301a')
      }
    }
  }
  return out
})()

/** Barad-dûr: the horns cradling the eye and the tower's crown beneath it. */
function tower(x: number, y: number): string | null {
  const horn = HORNS.get(`${x},${y}`)
  if (horn) return horn
  if (y < CY + 9) return null
  const half = 4 + (y - (CY + 9)) * 0.35
  if (Math.abs(x - CX) <= half) return (x + y) % 7 === 0 ? '#5a2410' : '#2e1108'
  return null
}

type Grid = (string | null)[][]

function base(withTower: boolean, rows: number): Grid {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      const dx = x - CX
      const dy = y - CY
      if (Math.abs(dy) <= almond(dx)) return irisColor(dx, dy)
      return withTower ? tower(x, y) : null
    }),
  )
}

/** The pupil's pixels: a slit, three wide at its middle, at `shift` columns off centre. */
function pupil(shift: number, wide: boolean): [number, number][] {
  const out: [number, number][] = []
  const top = Math.floor(almond(shift) * 0.85)
  for (let dy = -top; dy <= top; dy++) {
    const half = Math.abs(dy) < 2 ? (wide ? 2 : 1) : Math.abs(dy) < top - 1 && wide ? 1 : 0
    for (let k = -half; k <= half; k++) out.push([CX + shift + k, CY + dy])
  }
  return out
}

// Where the pupil looks over its 8-second cycle, and when it dilates.
const GAZE = [0, 0, -5, -5, -5, 4, 4, 0, 0, 2, -2, 0]

// Brightness as characters, brightest first: the iris's white-hot core out to its rim,
// then the flames, the tower and the horns. The pupil is left blank so it reads as a slit.
const CHAR: Record<string, string> = {
  '#fff6b0': '@', '#ffd23a': '#', '#ff9a1f': '*', '#e4501c': '+', '#a81e0a': '=',
  '#ff6a1a': '^', '#d2340d': "'", '#6e1006': '.',
  '#e0681e': '^', '#ff8a2a': '^', '#c0561c': '/', '#74301a': '|', '#5a2410': ':', '#2e1108': '.',
  '#120200': ' ',
}
const RANK = Object.keys(CHAR)

export type Line = { text: string; color: string }

/**
 * The eye as plain text lines, one color per line like the loading bars: two grid rows
 * per line (characters are twice as tall as wide), cropped to `maxColumns`. Animated by
 * `frame`: the flames flicker and the pupil looks around.
 */
export function eyeLines(frame: number, maxColumns: number): Line[] {
  const grid = base(true, H)
  const f = Math.floor(frame / 2) % FLAME_FRAMES
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) grid[y]![x] ??= flame(x, y, f)
  const step = Math.floor(frame / 5) % GAZE.length
  const wide = step >= 7 && step <= 9
  for (const [x, y] of pupil(GAZE[step]!, wide)) if (grid[y]) grid[y]![x] = '#120200'
  const width = Math.min(W, maxColumns)
  const left = Math.floor((W - width) / 2)
  const lines: Line[] = []
  // The eye, the horns and the top of the tower: the rest of the tower would only add height.
  for (let r = 0; r < 15; r++) {
    let text = ''
    for (let x = left; x < left + width; x++) {
      const a = grid[r * 2]![x] ?? null
      const b = grid[r * 2 + 1]![x] ?? null
      // The pupil wins so the slit stays whole; otherwise the brighter of the two pixels.
      const pick = a === '#120200' || b === '#120200' ? '#120200' : a && b ? (RANK.indexOf(a) <= RANK.indexOf(b) ? a : b) : a ?? b
      text += pick ? CHAR[pick] ?? '.' : ' '
    }
    const y = r * 2
    const color = y >= CY + 10 ? '#8a3a15' : Math.abs(y - CY) <= 3 ? '#ffc23a' : Math.abs(y - CY) <= 7 ? '#ff7a1a' : '#d2340d'
    lines.push({ text: text.trimEnd(), color })
  }
  return lines
}

/** What the browser tool is looking at, short: a host for a URL, else the action. */
export function eyeTarget(tool: string, input: Record<string, unknown>): string {
  const url = typeof input.url === 'string' ? input.url : ''
  if (url) {
    const host = url.replace(/^[a-z]+:\/\//i, '').split(/[/?#]/)[0]
    return host || url
  }
  return tool.replace(/^.*Claude_Browser__/, '').replace(/_/g, ' ')
}

const LOOKABLE = /([\w.-]+\.(?:png|jpe?g|gif|webp|heic|bmp|tiff?|svg|pdf|mov|mp4))\b/i

/**
 * The image, PDF or video an input looks at, by file name: a tool's arguments or a prompt
 * with an upload in it. Null when there is nothing to look at.
 */
export function lookedAt(input: Record<string, unknown>): string | null {
  for (const value of Object.values(input)) {
    if (typeof value !== 'string') continue
    const hit = LOOKABLE.exec(value)
    if (hit) return hit[1]!
    if (/\[Image\b/.test(value)) return 'your upload'
  }
  return null
}

export function isBrowserTool(tool: string): boolean {
  return tool.includes('Claude_Browser__')
}
