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

/** A cell grid's characters as plain lines, cropped to `maxColumns` keeping the middle. */
export function cellLines(words: Uint32Array, columns: number, rows: number, maxColumns = columns): string[] {
  const width = Math.min(columns, maxColumns)
  const left = Math.floor((columns - width) / 2)
  return Array.from({ length: rows }, (_, y) => {
    let line = ''
    for (let x = left; x < left + width; x++) line += String.fromCodePoint(words[(y * columns + x) * 3]!)
    return line.trimEnd()
  })
}
