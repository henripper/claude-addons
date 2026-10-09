// The heavy-load cinematic: a recon flyby of a cargo ship, as in a military HUD.
// A tiny 3D engine (flat-shaded boxes, a hull, thermal figures) projects the model at
// a few camera keyframes per feed; SMIL morphs each polygon between them, so the
// desktop plays a smooth camera move with no redraws. One loop is 16 seconds.

import { hash } from './gibson'

type V3 = [number, number, number]

type Face = { kind: 'face'; pts: V3[]; n: V3; fill: string; layer: number }
type Figure = { kind: 'figure'; at: V3 }
type Wire = { kind: 'wire'; a: V3; b: V3 }
type Item = Face | Figure | Wire

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const centroid = (pts: V3[]): V3 => {
  const c: V3 = [0, 0, 0]
  for (const p of pts) for (let i = 0; i < 3; i++) c[i]! += p[i]! / pts.length
  return c
}

const LIGHT = norm([-0.35, -0.6, 0.75])

/** Pale steel, brighter where the face turns to the light, as the reference's render. */
function shade(n: V3, tone = 1): string {
  const k = (0.42 + 0.58 * Math.max(0, dot(n, LIGHT))) * tone
  const c = (v: number) => Math.round(Math.min(255, v * k)).toString(16).padStart(2, '0')
  return `#${c(214)}${c(222)}${c(232)}`
}

function face(pts: V3[], n: V3, layer = 2, tone = 1, fill?: string): Face {
  return { kind: 'face', pts, n, fill: fill ?? shade(n, tone), layer }
}

/** A box sitting on the deck: top and four sides (the bottom never shows). */
function box(items: Item[], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tone = 1): void {
  items.push(
    face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], 2, tone),
    face([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], 2, tone),
    face([[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], [0, 1, 0], 2, tone),
    face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], 2, tone),
    face([[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], [-1, 0, 0], 2, tone),
  )
}

/** A strip of dark windows just proud of a bridge deck's side and front. */
function windows(items: Item[], x0: number, y0: number, x1: number, y1: number, zTop: number): void {
  const dark = '#2f3946'
  const z0 = zTop - 3
  const z1 = zTop - 1.2
  items.push(
    face([[x0 + 1, y0 - 0.08, z0], [x1 - 1, y0 - 0.08, z0], [x1 - 1, y0 - 0.08, z1], [x0 + 1, y0 - 0.08, z1]], [0, -1, 0], 2, 1, dark),
    face([[x1 + 0.08, y0 + 1, z0], [x1 + 0.08, y1 - 1, z0], [x1 + 0.08, y1 - 1, z1], [x1 + 0.08, y0 + 1, z1]], [1, 0, 0], 2, 1, dark),
  )
}

/** The hull's half-beam at x: a long parallel body, a round stern, a fine bow. */
function beam(x: number): number {
  if (x < -85) return 16 * Math.sqrt(Math.max(0, 1 - ((x + 85) / 15) ** 2))
  if (x > 55) return 16 * Math.sqrt(Math.max(0, 1 - ((x - 55) / 45) ** 2))
  return 16
}

let model: Item[] | null = null

function buildShip(): Item[] {
  if (model) return model
  const items: Item[] = []
  const xs = [-100, -95, -89, -85, -60, -30, 0, 30, 55, 70, 84, 94, 100]
  const outline: V3[] = [
    ...xs.map((x): V3 => [x, -beam(x), 0]),
    ...xs
      .slice(1, -1)
      .reverse()
      .map((x): V3 => [x, beam(x), 0]),
  ]
  const bottom = outline.map(([x, y]): V3 => [x * 0.93, y * 0.72, -15])
  outline.forEach((top, i) => {
    const j = (i + 1) % outline.length
    const pts = [top, outline[j]!, bottom[j]!, bottom[i]!]
    let n = norm(cross(sub(pts[1]!, pts[0]!), sub(pts[3]!, pts[0]!)))
    if (dot(n, sub(centroid(pts), [0, 0, -8])) < 0) n = [-n[0], -n[1], -n[2]]
    items.push(face(pts, n, 0, 0.92))
  })
  items.push(face(outline, [0, 0, 1], 1, 0.9))

  // Bridge tower at the stern, decks stepping up, with a funnel and a mast.
  box(items, -90, -14, 0, -64, 14, 7)
  box(items, -88, -13, 7, -66, 13, 13)
  box(items, -80, -18, 12, -72, 18, 13.6)
  box(items, -86, -11, 13, -68, 11, 19)
  box(items, -83, -6, 19, -72, 6, 22.5)
  windows(items, -88, -13, -66, 13, 13)
  windows(items, -86, -11, -68, 11, 19)
  windows(items, -83, -6, -72, 6, 22.5)
  box(items, -98, -4.5, 0, -91, 4.5, 21, 0.85)
  box(items, -78, -0.6, 22.5, -76.8, 0.6, 38, 0.95)
  items.push({ kind: 'wire', a: [-77.4, 0, 38], b: [-90, 0, 7] }, { kind: 'wire', a: [-77.4, 0, 34], b: [-66, -10, 7] })

  // Crane masts with their booms, and the container stacks between them.
  const masts = [-42, -6, 30, 62]
  for (const x of masts) {
    box(items, x - 1, -1, 0, x + 1, 1, 27, 0.95)
    items.push({ kind: 'wire', a: [x, 0, 26], b: [x + 15, -9, 9] }, { kind: 'wire', a: [x, 0, 26], b: [x - 13, 8, 9] })
  }
  for (let x = -54; x < 92; x += 13) {
    for (let j = 0; j < 4; j++) {
      const y0 = -11 + j * 5.6
      const y1 = y0 + 5
      const x1 = x + 12
      if (Math.max(Math.abs(y0), Math.abs(y1)) > beam(x1) - 3) continue
      if (masts.some(m => m > x - 2 && m < x1 + 2) && j > 0 && j < 3) continue
      const h = hash(x, j, 3)
      if (h % 10 < 3) continue
      const half = h % 7 === 0
      box(items, x, y0, 0, half ? x + 6 : x1, y1, 4 * (1 + (h >>> 4) % 3), 0.9 + ((h >>> 8) % 3) * 0.05)
    }
  }

  // Thermal signatures: crew on the walkways, the deck and the bridge wings.
  const crew: V3[] = [
    [-60, -12.5, 0], [-57, -11.5, 0], [-48, 13, 0], [-20, -13.6, 0], [-16, -13.4, 0], [12, -13.6, 0],
    [44, -13.5, 0], [-74, -16.5, 13.6], [-77, -16.8, 13.6], [-79, -11, 7], [-70, -12, 7], [-61, 2, 0],
  ]
  for (const at of crew) items.push({ kind: 'figure', at })

  model = items
  return items
}

type Cam = { p: V3; r: V3; u: V3; f: V3 }

function camera(target: V3, dist: number, yawDeg: number, pitchDeg: number): Cam {
  const y = (yawDeg * Math.PI) / 180
  const p = (pitchDeg * Math.PI) / 180
  const pos: V3 = [
    target[0] + dist * Math.cos(p) * Math.cos(y),
    target[1] + dist * Math.cos(p) * Math.sin(y),
    target[2] + dist * Math.sin(p),
  ]
  const f = norm(sub(target, pos))
  const r = norm(cross(f, [0, 0, 1]))
  return { p: pos, r, u: cross(r, f), f }
}

type Pose = { t: V3; d: number; yaw: number; pitch: number }

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = (k: number) => k * k * (3 - 2 * k)

function poseAt(a: Pose, b: Pose, k: number): Pose {
  const e = ease(k)
  return {
    t: [lerp(a.t[0], b.t[0], e), lerp(a.t[1], b.t[1], e), lerp(a.t[2], b.t[2], e)],
    d: lerp(a.d, b.d, e),
    yaw: lerp(a.yaw, b.yaw, e),
    pitch: lerp(a.pitch, b.pitch, e),
  }
}

const LOOP = 16
const KEYS = 4

/** Three camera feeds: satellite dive, low drone pass, recon pull-back that settles and zooms. */
const FEEDS: { from: number; to: number; a: Pose; b: Pose; label: string }[] = [
  { from: 0, to: 5.2, a: { t: [0, 0, 0], d: 470, yaw: -118, pitch: 86 }, b: { t: [8, 0, 4], d: 150, yaw: -100, pitch: 52 }, label: 'FEED 01 // SAT-KH11' },
  { from: 5.2, to: 10.4, a: { t: [40, 0, 4], d: 78, yaw: -62, pitch: 30 }, b: { t: [-66, 0, 10], d: 62, yaw: -128, pitch: 20 }, label: 'FEED 02 // DRONE UAV-7' },
  { from: 10.4, to: LOOP, a: { t: [-30, 0, 6], d: 175, yaw: -152, pitch: 40 }, b: { t: [-58, 0, 10], d: 118, yaw: -160, pitch: 36 }, label: 'FEED 03 // RECON' },
]

type Shot = { x: number; y: number; z: number }

function project(cam: Cam, v: V3, w: number, h: number, focal: number): Shot {
  const d = sub(v, cam.p)
  const z = dot(d, cam.f)
  return { x: w / 2 + (focal * dot(d, cam.r)) / z, y: h / 2 + 12 - (focal * dot(d, cam.u)) / z, z }
}

/** A projected polygon's area in square pixels: slivers too small to see are left out. */
function area(shots: Shot[]): number {
  let a = 0
  shots.forEach((s, i) => {
    const t = shots[(i + 1) % shots.length]!
    a += s.x * t.y - t.x * s.y
  })
  return Math.abs(a) / 2
}

const pt = (s: Shot) => `${Math.round(s.x)},${Math.round(s.y)}`

const FIGURE =
  '<path d="M-1.3-7.2h2.6l1 4.3h-1.1l-.4 2.9h-1l-.2-2.9h-.2l-.2 2.9h-1l-.4-2.9h-1.1z"/><circle cy="-8.6" r="1.35"/>'

/**
 * Timing: one master clock restarts itself every LOOP seconds (`begin="0s;clk.end"`) and
 * everything else begins relative to it, so no element carries the whole loop's keyTimes.
 */
const CLOCK = `<rect width="0" height="0"><animate id="clk" attributeName="x" values="0;0" begin="0s;clk.end" dur="${LOOP}s"/></rect>`

/** Shown from `from` to `to` seconds into each loop. */
const during = (from: number, to: number) => `<set attributeName="opacity" to="1" begin="clk.begin+${from}s" dur="${+(to - from).toFixed(2)}s"/>`

function feedSvg(feed: (typeof FEEDS)[number], index: number, w: number, h: number, focal: number): string {
  const cams = Array.from({ length: KEYS }, (_, i) => {
    const pose = poseAt(feed.a, feed.b, i / (KEYS - 1))
    return camera(pose.t, pose.d, pose.yaw, pose.pitch)
  })
  const id = `f${index}`
  const run = (values: string[]) => `values="${values.join(';')}" begin="${id}.begin" dur="${+(feed.to - feed.from).toFixed(2)}s" fill="freeze"`
  const mid = cams[Math.floor(KEYS / 2)]!
  const parts: { depth: number; layer: number; svg: string }[] = []
  const onScreen = (shots: Shot[]) => shots.some(s => s.x > -40 && s.x < w + 40 && s.y > -40 && s.y < h + 40)

  for (const item of buildShip()) {
    if (item.kind === 'face') {
      const per = cams.map(cam => item.pts.map(v => project(cam, v, w, h, focal)))
      if (per.some(shots => shots.some(s => s.z < 3))) continue
      if (!per.some(onScreen)) continue
      if (Math.max(...per.map(area)) < 20) continue
      const c = centroid(item.pts)
      const seen = cams.map(cam => dot(item.n, sub(cam.p, c)) > 0)
      if (!seen.some(Boolean)) continue
      const fade = seen.every(Boolean) ? '' : `<animate attributeName="opacity" ${run(seen.map(x => (x ? '1' : '0')))}/>`
      const values = per.map(shots => shots.map(pt).join(' '))
      parts.push({
        depth: dot(sub(c, mid.p), mid.f),
        layer: item.layer,
        svg: `<polygon fill="${item.fill}" points="0,0"${seen[0] ? '' : ' opacity="0"'}><animate attributeName="points" ${run(values)}/>${fade}</polygon>`,
      })
    } else if (item.kind === 'wire') {
      const per = cams.map(cam => [project(cam, item.a, w, h, focal), project(cam, item.b, w, h, focal)])
      if (per.some(shots => shots.some(s => s.z < 3)) || !per.some(onScreen)) continue
      const values = per.map(shots => shots.map(pt).join(' '))
      parts.push({
        depth: dot(sub(centroid([item.a, item.b]), mid.p), mid.f),
        layer: 2,
        svg: `<polyline fill="none" stroke="#e4ebf3" stroke-width="0.8" points="0,0"><animate attributeName="points" ${run(values)}/></polyline>`,
      })
    } else {
      const shots = cams.map(cam => project(cam, item.at, w, h, focal))
      if (shots.some(s => s.z < 3) || !onScreen(shots)) continue
      const moves = shots.map(s => `${Math.round(s.x)} ${Math.round(s.y)}`)
      const scales = shots.map(s => ((focal * 1.9) / s.z / 10).toFixed(2))
      parts.push({
        depth: dot(sub(item.at, mid.p), mid.f) - 0.5,
        layer: 2,
        svg:
          `<g fill="#ff3d1f" stroke="#ffb199" stroke-width="0.25"><g>${FIGURE}` +
          `<animateTransform attributeName="transform" type="scale" ${run(scales)}/></g>` +
          `<animateTransform attributeName="transform" type="translate" ${run(moves)}/></g>`,
      })
    }
  }
  parts.sort((a, b) => a.layer - b.layer || (a.layer === 2 ? b.depth - a.depth : 0))

  return (
    `<g opacity="0" stroke="#eef3f9" stroke-opacity="0.45" stroke-width="0.6" stroke-linejoin="round">` +
    `<set id="${id}" attributeName="opacity" to="1" begin="clk.begin+${feed.from}s" dur="${+(feed.to - feed.from).toFixed(2)}s"/>` +
    parts.map(p => p.svg).join('') +
    `</g>`
  )
}

/** Text shown in turn, one per window of the loop. */
function swaps(x: number, y: number, attrs: string, windows: { from: number; to: number; text: string }[]): string {
  return windows.map(({ from, to, text }) => `<text x="${x}" y="${y}" ${attrs} opacity="0">${text}${during(from, to)}</text>`).join('')
}

function hud(w: number, agents: number): string {
  const grey = 'fill="#8d97a5" font-size="8" letter-spacing="1"'
  const ticks = Array.from({ length: LOOP }, (_, s) => ({ from: s, to: s + 1, text: `T+00:${String(s).padStart(2, '0')}` }))
  const stripes = Array.from({ length: 22 }, (_, i) => `<path d="M${w - 330 + i * 9} 22l8-14h4l-8 14z"/>`).join('')
  return (
    `<g font-family="'Eurostile', 'Bank Gothic', 'Arial Black', sans-serif" font-weight="bold">` +
    `<rect width="${w}" height="34" fill="#0b0f16" opacity="0.85"/>` +
    `<path d="M18 9c5 3 7 8 6 14-3-3-6-4-8-4 1-3 2-6 2-10zm10 0c-5 3-7 8-6 14 3-3 6-4 8-4-1-3-2-6-2-10z" fill="#b8c4d2"/>` +
    `<text x="44" y="15" ${grey}>▸ SELECT</text><text x="104" y="15" ${grey}>▸ FILTERS</text><text x="166" y="15" ${grey}>NEXT</text>` +
    `<text x="44" y="27" fill="#5d6775" font-size="7">enabled/</text><text x="104" y="27" fill="#5d6775" font-size="7">enabled/</text><text x="166" y="27" fill="#5d6775" font-size="7">St:100x</text>` +
    `<text x="214" y="15" fill="#c9d3df" font-size="9">[</text><text x="262" y="15" fill="#c9d3df" font-size="9">]</text>` +
    swaps(238, 15, 'fill="#c9d3df" font-size="7" text-anchor="middle"', ticks) +
    `<text x="214" y="28" fill="#27c2b4" font-size="9" letter-spacing="1">CORE:SYSTEM</text>` +
    `<text x="300" y="28" fill="#8d97a5" font-size="7" letter-spacing="1">AGENT DATABASE · ${agents} DAEMONS</text>` +
    `<g fill="#3a4350" opacity="0.8">${stripes}</g>` +
    `<text x="${w - 12}" y="26" fill="#c9d3df" font-size="20" text-anchor="end" font-style="italic">IX87</text></g>`
  )
}

function scanning(w: number, h: number, focal: number): string {
  const feed = FEEDS[2]!
  const start = 12.4
  const target: V3 = [-77, 0, 16]
  const moves = Array.from({ length: KEYS }, (_, i) => {
    const pose = poseAt(feed.a, feed.b, i / (KEYS - 1))
    const s = project(camera(pose.t, pose.d, pose.yaw, pose.pitch), target, w, h, focal)
    return `${Math.round(s.x)} ${Math.round(s.y)}`
  })
  const corner = 'fill="none" stroke="#7ff5e6" stroke-width="2"'
  const shape = 'M-30-22v-8h8M22-30h8v8M30 22v8h-8M-22 30h-8v-8'
  const brackets =
    `<path fill="none" stroke="#06090e" stroke-width="4.5" stroke-opacity="0.8" d="${shape}"/>` +
    `<path ${corner} d="${shape}"/>` +
    `<path ${corner} stroke-width="1" d="M-26-18v-8h8M18-26h8v8M26 18v8h-8M-18 26h-8v-8" opacity="0.6"/>` +
    `<path fill="#c9d3df" d="M-6 1h10l3-2h4v1l-4 2h-3l-1 2h-7zm3-3h7v1h-7z"/>`
  const dots = [
    { from: start, to: start + 0.6, text: 'Scanning.' },
    { from: start + 0.6, to: start + 1.2, text: 'Scanning..' },
    { from: start + 1.2, to: start + 2.2, text: 'Scanning...' },
    { from: start + 2.2, to: LOOP, text: 'TARGET LOCKED' },
  ]
  return (
    `<g opacity="0">${during(start, LOOP)}<g>${brackets}` +
    `<animateTransform attributeName="transform" type="scale" values="1.8;1" begin="clk.begin+${start}s" dur="1s" fill="freeze"/></g>` +
    `<g font-family="'Eurostile', 'Arial Black', sans-serif" font-weight="bold" font-size="13" fill="#e9f0f7" stroke="#06090e" stroke-width="3" paint-order="stroke" text-anchor="end">${swaps(-40, -16, '', dots)}</g>` +
    `<animateTransform attributeName="transform" type="translate" values="${moves.join(';')}" begin="f2.begin" dur="${+(feed.to - feed.from).toFixed(2)}s" fill="freeze"/></g>`
  )
}

const cache = new Map<string, string>()

/** The whole flyby, `w` by `h` CSS pixels; its source depends only on the size and agent count. */
export function flybySvg(w: number, h: number, agents: number): string {
  const key = `${w}x${h}x${agents}`
  const hit = cache.get(key)
  if (hit) return hit
  const focal = h / (2 * Math.tan((24 * Math.PI) / 180))
  const glitch = [5.2, 10.4]
    .map(t => `<rect width="${w}" height="${h}" fill="#dfe8f2" opacity="0"><animate attributeName="opacity" values="0.5;0" begin="clk.begin+${t}s" dur="0.3s"/></rect>`)
    .join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="3" height="7" fill="#121822"/></pattern>` +
    `<radialGradient id="vig" cx="50%" cy="55%" r="75%"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient></defs>` +
    CLOCK +
    `<rect width="${w}" height="${h}" fill="#0a0e15"/><rect width="${w}" height="${h}" fill="url(#hatch)" opacity="0.7"/>` +
    FEEDS.map((feed, i) => feedSvg(feed, i, w, h, focal)).join('') +
    scanning(w, h, focal) +
    `<rect width="${w}" height="${h}" fill="url(#vig)"/>` +
    glitch +
    hud(w, agents) +
    `<g font-family="ui-monospace, Menlo, monospace" font-size="9" fill="#8d97a5">` +
    `<circle cx="16" cy="${h - 14}" r="3.5" fill="#ff3d1f"><animate attributeName="opacity" values="1;0.15;1" dur="1.1s" repeatCount="indefinite"/></circle>` +
    `<text x="25" y="${h - 11}" fill="#ff8a70">REC</text>` +
    swaps(56, h - 11, '', FEEDS.map(f => ({ from: f.from, to: f.to, text: f.label }))) +
    `<text x="${w - 12}" y="${h - 11}" text-anchor="end">52°22'N 4°53'E · ALT 1200FT · HDG 274</text></g>` +
    `</svg>`
  cache.set(key, svg)
  return svg
}
