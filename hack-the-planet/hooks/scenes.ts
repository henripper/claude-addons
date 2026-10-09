// Heavy-traffic scenes: a spinning pixel globe and a cargo freighter flyby.
// Pure like gibson.ts: cell grids, drawn as a Raster or as colored text.


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
