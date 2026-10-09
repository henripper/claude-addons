// Heavy-traffic scenes: a spinning pixel globe and a cargo freighter flyby.
// Pure like gibson.ts: the terminal gets cell grids, the desktop SMIL-animated SVG.

import { AMBER, DIM, GREEN, HOT, RED } from './gibson'

export type Load = 0 | 1 | 2

/** 0 calm, 1 busy (globe), 2 heavy (globe and cargo ship). */
export function loadLevel(live: number, promptChars: number, toolCalls: number): Load {
  if (live >= 3 || promptChars >= 2000 || toolCalls >= 30) return 2
  if (live >= 2 || promptChars >= 600 || toolCalls >= 12) return 1
  return 0
}

// 40 x 20 equirectangular world, '#' land, from 180°W at the left and the pole at the top.
const WORLD = [
  '                                        ',
  '     #####  ####      ###########       ',
  '  ##########  ##    ################### ',
  ' ###########       #################### ',
  '  ########         #################### ',
  '   #######        ## ################   ',
  '    #####         ###  ############     ',
  '     ###         ########  ######       ',
  '      ##         #########  ###  #      ',
  '       ###       #########    ## #      ',
  '        ####      #######      #  #     ',
  '        #####      #####          ##    ',
  '         ####      ####         ####    ',
  '         ###       ###         ######   ',
  '         ##         ##         ######   ',
  '         #                       ##     ',
  '                                        ',
  '                                        ',
  '       ##########  ##############       ',
  '                                        ',
]

function isLand(lon: number, lat: number): boolean {
  const u = (((lon / (2 * Math.PI)) % 1) + 1) % 1
  const x = Math.floor(u * 40)
  const y = Math.min(19, Math.max(0, Math.floor((0.5 - lat / Math.PI) * 20)))
  return WORLD[y]![x] === '#'
}

/** Where a point of a disc lands on the turning sphere: null outside it. */
function project(nx: number, ny: number, rot: number): { land: boolean; z: number } | null {
  const r2 = nx * nx + ny * ny
  if (r2 > 1) return null
  const z = Math.sqrt(1 - r2)
  return { land: isLand(Math.atan2(nx, z) + rot, Math.asin(-ny)), z }
}

export type Cells = { columns: number; rows: number; words: Uint32Array }

const DEFAULT = 0x01000000

export function blank(columns: number, rows: number): Cells {
  const words = new Uint32Array(columns * rows * 3)
  for (let i = 0; i < columns * rows; i++) {
    words[i * 3] = 0x20
    words[i * 3 + 1] = DEFAULT
    words[i * 3 + 2] = DEFAULT
  }
  return { columns, rows, words }
}

function put(cells: Cells, x: number, y: number, ch: string, fg: number): void {
  if (x < 0 || y < 0 || x >= cells.columns || y >= cells.rows) return
  const i = (y * cells.columns + x) * 3
  cells.words[i] = ch.codePointAt(0)!
  cells.words[i + 1] = fg
}

/** The terminal's globe, `rows` tall and twice as wide, cells being twice as tall as wide. */
export function globeCells(rows: number, frame: number, satellites: number): Cells {
  const columns = rows * 2 + 4
  const cells = blank(columns, rows)
  const rot = frame * 0.12
  const cx = columns / 2
  for (let y = 0; y < rows; y++) {
    for (let x = 2; x < columns - 2; x++) {
      const hit = project((x + 0.5 - cx) / (rows - 0.2), (y + 0.5 - rows / 2) / (rows / 2), rot)
      if (!hit) continue
      if (hit.land) put(cells, x, y, hit.z > 0.45 ? '█' : '▓', hit.z > 0.45 ? 0x3dff7a : 0x1f9e4a)
      else if (hit.z < 0.3) put(cells, x, y, '░', 0x0e5a2a)
      else if ((x + y) % 2 === 0) put(cells, x, y, '·', 0x0e5a2a)
    }
  }
  // Satellites ride an ellipse around it, one per running daemon.
  for (let s = 0; s < satellites; s++) {
    const a = frame * (0.18 + s * 0.05) + (s * Math.PI * 2) / Math.max(1, satellites)
    const sx = Math.round(cx + Math.cos(a) * (columns / 2 - 0.5))
    const sy = Math.round(rows / 2 - 0.5 + Math.sin(a) * (rows / 2 - 0.5) * 0.55)
    put(cells, sx, sy, '◆', Math.sin(a) > 0 ? 0xd8ffe4 : 0x1f9e4a)
  }
  return cells
}

// The freighter, nose to the right. H hull, h hull shade, W windows, C/c/k containers, E engine.
const SHIP = [
  '             HHH          ',
  '            HWWWH         ',
  '   CckCckCck HHHHH        ',
  '   CckCckCckHHHHHHH       ',
  ' EEHHHHHHHHHHHHHHHHHHH    ',
  'EEEHHHWHHWHHWHHWHHHHHHHH  ',
  ' EEhhhhhhhhhhhhhhhhhhhhh  ',
  '    hhhhhhhhhhhhhhhhhh    ',
]

const SHIP_COLORS: Record<string, string> = { H: GREEN, h: DIM, W: HOT, C: AMBER, c: RED, k: HOT, E: AMBER }

// The terminal's freighter, three rows: trail, containers, hull.
const SHIP_CELLS = ['      ▗▄█▖   ', '░▒▓█████████▙▖', '   ▀▀▀▀▀▀▀▀▀▀ ']
const SHIP_CELL_COLORS = [
  '      gggg   ',
  'ddeacracracrgg',
  '   hhhhhhhhhh ',
]
const CELL_RGB: Record<string, number> = {
  g: 0x3dff7a,
  h: 0x1f9e4a,
  d: 0x0e5a2a,
  e: 0xffcc33,
  a: 0xffcc33,
  c: 0xff4d5e,
  r: 0xd8ffe4,
}

/** Paints the freighter over a grid, crossing every ~14 seconds at `FRAME_MS` 200. */
export function paintShip(cells: Cells, frame: number, top: number): void {
  const width = SHIP_CELLS[1]!.length
  const lap = cells.columns + width + 30
  const left = (frame % lap) - width
  SHIP_CELLS.forEach((row, dy) => {
    Array.from(row).forEach((ch, dx) => {
      if (ch === ' ') return
      const key = SHIP_CELL_COLORS[dy]![dx] ?? 'g'
      put(cells, left + dx, top + dy, ch, CELL_RGB[key] ?? 0x3dff7a)
    })
  })
}

/** The spinner's lane: a tiny ship sliding along a dotted line. */
export function shipLane(frame: number, width: number): string {
  const lane = Array.from({ length: width }, () => '·')
  const at = frame % (width + 3)
  ;['▓', '█', '▶'].forEach((ch, k) => {
    const i = at - 2 + k
    if (i >= 0 && i < width) lane[i] = ch
  })
  return lane.join('')
}

/** One path of unit squares per row run, so a pixel picture stays a few kilobytes. */
function runsPath(rows: string[], pick: (ch: string) => boolean): string {
  let d = ''
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!pick(row[x]!)) {
        x++
        continue
      }
      const start = x
      while (x < row.length && pick(row[x]!)) x++
      d += `M${start} ${y}h${x - start}v1h${start - x}z`
    }
  })
  return d
}

const FRAMES = 12
const GRID = 26

/** The desktop's globe: twelve pre-turned frames shown in turn, plus one satellite per daemon. */
export function globeSvg(cx: number, cy: number, radius: number, satellites: number): string {
  const px = (radius * 2) / GRID
  const frames: string[] = []
  for (let f = 0; f < FRAMES; f++) {
    const rot = (f / FRAMES) * Math.PI * 2
    const front: string[] = []
    const back: string[] = []
    for (let y = 0; y < GRID; y++) {
      let rowFront = ''
      let rowBack = ''
      for (let x = 0; x < GRID; x++) {
        const hit = project((x + 0.5 - GRID / 2) / (GRID / 2), (y + 0.5 - GRID / 2) / (GRID / 2), rot)
        rowFront += hit?.land && hit.z > 0.4 ? '#' : ' '
        rowBack += hit?.land && hit.z <= 0.4 ? '#' : ' '
      }
      front.push(rowFront)
      back.push(rowBack)
    }
    const values = f === 0 ? 'values="1;0" keyTimes="0;' + (1 / FRAMES).toFixed(4) + '"' : `values="0;1;0" keyTimes="0;${(f / FRAMES).toFixed(4)};${((f + 1) / FRAMES).toFixed(4)}"`
    frames.push(
      `<g opacity="${f === 0 ? 1 : 0}"><path fill="${DIM}" d="${runsPath(back, c => c === '#')}"/>` +
        `<path fill="${GREEN}" d="${runsPath(front, c => c === '#')}"/>` +
        `<animate attributeName="opacity" ${values} calcMode="discrete" dur="4.8s" repeatCount="indefinite"/></g>`,
    )
  }
  const orbits: string[] = []
  for (let s = 0; s < Math.min(6, satellites); s++) {
    const rx = radius + 14 + s * 6
    const ry = (radius + 14 + s * 6) * 0.32
    const tilt = -18 + s * 9
    const dur = (5 + s * 1.3).toFixed(1)
    const path = `M${-rx} 0a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0`
    orbits.push(
      `<g transform="translate(${cx} ${cy}) rotate(${tilt})">` +
        `<path d="${path}" fill="none" stroke="${DIM}" stroke-opacity="0.35" stroke-dasharray="2 4"/>` +
        `<rect x="-3" y="-3" width="6" height="6" fill="${HOT}"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/></rect></g>`,
    )
  }
  return (
    `<circle cx="${cx}" cy="${cy}" r="${radius + 6}" fill="none" stroke="${GREEN}" stroke-opacity="0.25" stroke-width="6">` +
    `<animate attributeName="stroke-opacity" values="0.1;0.35;0.1" dur="2.4s" repeatCount="indefinite"/></circle>` +
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#03150a" stroke="${GREEN}" stroke-width="1.5"/>` +
    `<g transform="translate(${cx - radius} ${cy - radius}) scale(${px.toFixed(3)})">${frames.join('')}</g>` +
    `<text x="${cx}" y="${cy + radius + 22}" text-anchor="middle" font-size="10" fill="${DIM}" letter-spacing="2">GLOBAL UPLINK · ${satellites} SAT</text>` +
    orbits.join('')
  )
}

/** The desktop's freighter: crosses in seven seconds, then waits off screen, engines flickering. */
export function shipSvg(width: number, y: number): string {
  const px = 4
  const shipWidth = SHIP[0]!.length * px
  const paths = Object.entries(SHIP_COLORS)
    .map(([ch, color]) => {
      const d = runsPath(SHIP, c => c === ch)
      if (!d) return ''
      const flicker = ch === 'E' ? `<animate attributeName="fill-opacity" values="1;0.4;0.9;0.5;1" dur="0.4s" repeatCount="indefinite"/>` : ''
      return `<path fill="${color}" d="${d}">${flicker}</path>`
    })
    .join('')
  const trail = [0, 1, 2, 3]
    .map(k => `<rect x="${-6 - k * 7}" y="${4.6 + (k % 2) * 0.6}" width="${5 - k}" height="1.2" fill="${AMBER}" fill-opacity="${(0.7 - k * 0.15).toFixed(2)}"/>`)
    .join('')
  return (
    `<g><g transform="scale(${px})">${trail}${paths}</g>` +
    `<text x="${shipWidth / 2 - 8}" y="${SHIP.length * px + 12}" font-size="9" fill="${AMBER}" text-anchor="middle" letter-spacing="2">CARGO: PAYLOAD</text>` +
    `<animateTransform attributeName="transform" type="translate" values="${-shipWidth - 40} ${y};${width + 40} ${y};${width + 40} ${y}" keyTimes="0;0.6;1" dur="11s" repeatCount="indefinite"/></g>`
  )
}
