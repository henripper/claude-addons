// Pure drawing helpers: code rain, bars, hacker words. No `$` here, so tests run them directly.

export const GREEN = '#3dff7a'
export const HOT = '#d8ffe4'
export const DIM = '#1f9e4a'
export const AMBER = '#ffcc33'
export const RED = '#ff4d5e'

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEF<>{}#$%&*+=/|'

const WORDS: Record<string, string[]> = {
  thinking: ['DECRYPTING', 'CRACKING CIPHERS', 'THERE IS NO SPOON', 'BRUTE-FORCING', 'BENDING THE SPOON'],
  requesting: ['DIALING IN', 'CALLING THE OPERATOR', 'REROUTING VIA BULGARIA', 'JACKING IN'],
  responding: ['UPLOADING PAYLOAD', 'TRANSMITTING', 'WRITING TO THE MAINFRAME'],
  'tool-input': ['INJECTING CODE', 'ARMING EXPLOIT'],
  'tool-use': ['INFILTRATING', 'BYPASSING ICE', 'FOLLOWING THE WHITE RABBIT', 'HACKING THE GIBSON', 'DODGING BULLETS'],
}

/** A small deterministic hash, so a frame always draws the same cells. */
export function hash(...parts: number[]): number {
  let h = 2166136261
  for (const part of parts) {
    h ^= part | 0
    h = Math.imul(h, 16777619)
    h ^= h >>> 13
  }
  return h >>> 0
}

export function glyph(...parts: number[]): string {
  return GLYPHS[hash(...parts) % GLYPHS.length] ?? '0'
}

export function hex(seed: number): string {
  return '0x' + hash(seed, 7).toString(16).toUpperCase().padStart(8, '0')
}

/** The spinner's word: picked by what the turn is doing, a new one every ~3 seconds. */
export function hackerWord(mode: string, frame: number): string {
  const list = WORDS[mode] ?? WORDS['tool-use']!
  return list[Math.floor(frame / 15) % list.length]!
}

/** An indeterminate bar: a bright block sweeping back and forth. */
export function sweep(frame: number, width: number): string {
  const span = Math.max(1, width - 3)
  const pos = frame % (span * 2)
  const at = pos < span ? pos : span * 2 - pos
  return Array.from({ length: width }, (_, i) => (i >= at && i < at + 3 ? '█' : '░')).join('')
}

/** A bar that fills over time and loops, as agents report no real percentage. */
export function fill(seconds: number, width: number): string {
  const n = Math.floor((seconds * 1.7) % (width + 1))
  return '▓'.repeat(n) + '·'.repeat(width - n)
}

export function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}

/** One feed line's worth of a tool call: `Grep "auth"`, `Edit register.tsx`. */
export function shortTool(tool: string, input: Record<string, unknown>): string {
  const pick = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '')
  const path = pick('file_path') || pick('path') || pick('notebook_path')
  const arg = path
    ? path.split('/').pop()!
    : pick('pattern') || pick('command') || pick('description') || pick('url') || pick('query') || pick('prompt')
  const one = arg.replace(/\s+/g, ' ').trim()
  return one ? `${tool} ${one.length > 40 ? one.slice(0, 39) + '…' : one}` : tool
}

export function encodeCells(words: Uint32Array): string {
  return toBase64(new Uint8Array(words.buffer, words.byteOffset, words.byteLength))
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += b === undefined ? '=' : B64[(n >> 6) & 63]!
    out += c === undefined ? '=' : B64[n & 63]!
  }
  return out
}

/** A column of the rain: its speed and phase, fixed per column. */
function drop(x: number, seed: number): { speed: number; offset: number; length: number } {
  const h = hash(x, seed)
  return { speed: 1 + (h % 3), offset: h % 97, length: 5 + ((h >>> 8) % 9) }
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, ch => `&#${ch.charCodeAt(0)};`)
}

/**
 * The desktop's rain: one SVG that animates itself with SMIL, so it falls smoothly
 * without a redraw. Its source depends only on the size, so redraws keep it running.
 */
export function titleSvg(width: number, height = 180, seed = 1): string {
  const step = 14
  const columns = Math.floor(width / step)
  const parts: string[] = []
  for (let x = 0; x < columns; x++) {
    const { speed, offset, length } = drop(x, seed)
    const span = length * step
    const dur = (6 / speed + (offset % 5) * 0.4).toFixed(1)
    const begin = -((offset % 40) / 10).toFixed(1)
    const glyphs: string[] = []
    for (let k = 0; k < length; k++) {
      const isHead = k === length - 1
      const opacity = isHead ? 1 : ((k + 1) / length) * 0.85
      const fill = isHead ? HOT : GREEN
      glyphs.push(
        `<text y="${k * step}" fill="${fill}" fill-opacity="${opacity.toFixed(2)}">${escapeXml(glyph(x, k, seed))}</text>`,
      )
    }
    parts.push(
      `<g transform="translate(${x * step + 3} 0)"><g>${glyphs.join('')}` +
        `<animateTransform attributeName="transform" type="translate" from="0 ${-span}" to="0 ${height + step}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></g></g>`,
    )
  }
  const title =
    `<g font-size="22" font-weight="bold" text-anchor="middle">` +
    `<rect x="${width / 2 - 130}" y="${height / 2 - 26}" width="260" height="44" fill="#020a04" fill-opacity="0.82" stroke="${GREEN}" stroke-width="1"/>` +
    `<text x="${width / 2}" y="${height / 2 + 4}" fill="${GREEN}">░▒▓ THE GIBSON ▓▒░` +
    `<animate attributeName="fill-opacity" values="1;1;0.3;1;1;1;0.6;1" dur="3.7s" repeatCount="indefinite"/></text>` +
    `<text x="${width / 2}" y="${height / 2 + 14}" font-size="9" fill="${DIM}" letter-spacing="3">HACK THE PLANET</text></g>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#020a04"/>` +
    `<g font-family="ui-monospace, Menlo, monospace" font-size="13">${parts.join('')}</g>${title}</svg>`
  )
}
