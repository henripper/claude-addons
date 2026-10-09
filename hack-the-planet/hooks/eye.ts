// The Eye of Sauron, in pixels, for while Claude browses the web: a fiery almond eye
// with a slit pupil that looks around, flames flickering in four frames, and the horns
// of Barad-dûr, drawn as half-block cells.

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

const hexRgb = (c: string | null) => (c ? parseInt(c.slice(1), 16) : 0x080201)

/**
 * The terminal's eye: two grid rows per cell as an upper half block, the top pixel its
 * foreground and the bottom its background, so pixels stay square. Animated by `frame`.
 */
export function eyeCells(frame: number, withTower: boolean): { columns: number; rows: number; words: Uint32Array } {
  const rows = withTower ? H : 26
  const grid = base(withTower, rows)
  const f = Math.floor(frame / 2) % FLAME_FRAMES
  for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) grid[y]![x] ??= flame(x, y, f)
  const step = Math.floor(frame / 5) % GAZE.length
  const wide = step >= 7 && step <= 9
  for (const [x, y] of pupil(GAZE[step]!, wide)) if (grid[y]) grid[y]![x] = '#120200'
  const cellRows = Math.ceil(rows / 2)
  const words = new Uint32Array(W * cellRows * 3)
  for (let r = 0; r < cellRows; r++) {
    for (let x = 0; x < W; x++) {
      const i = (r * W + x) * 3
      words[i] = 0x2580
      words[i + 1] = hexRgb(grid[r * 2]![x] ?? null)
      words[i + 2] = hexRgb(grid[r * 2 + 1]?.[x] ?? null)
    }
  }
  return { columns: W, rows: cellRows, words }
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

export function isBrowserTool(tool: string): boolean {
  return tool.includes('Claude_Browser__')
}
