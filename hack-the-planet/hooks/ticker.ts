// The one-line ticker under the chat box: mini versions of The Gibson's animations,
// so they play even while the side panel is closed. Pure: the caller draws the segments.

import { AMBER, DIM, GREEN, HOT } from './gibson'

export type Segment = { text: string; color: string }

export type TickerState = {
  frame: number
  /** The rabbit's own frame counter while one runs, else null. */
  rabbit: number | null
  live: number
  load: 0 | 1 | 2
  /** The host the Eye is upon while Claude browses, else null. */
  eye: string | null
}

const EYE_ORANGE = '#ff7a1a'
const GLOBE = ['◐', '◓', '◑', '◒']
const RABBIT = ["_(\\'>", "~(\\'>"]
const SHIP = '░▒▓██▙▖'
const GAZE = ['( ◉ )', '(◉  )', '(◉  )', '(  ◉)', '(  ◉)', '( ◉ )']

/** `sprite` on a dotted lane `width` wide with its first character at column `at`. */
function place(sprite: string, at: number, width: number): string {
  const cells = Array.from({ length: width }, () => '·')
  Array.from(sprite).forEach((ch, k) => {
    const i = at + k
    if (i >= 0 && i < width) cells[i] = ch
  })
  return cells.join('')
}

/** Something crossing a dotted lane `width` wide and coming round again. */
function lane(sprite: string, frame: number, width: number): string {
  return place(sprite, (frame % (width + sprite.length)) - sprite.length, width)
}

/** The ticker's segments, most eye-catching first; empty when nothing is going on. */
export function tickerSegments(s: TickerState): Segment[] {
  const out: Segment[] = []
  if (s.eye) {
    out.push({ text: `${GAZE[Math.floor(s.frame / 3) % GAZE.length]} THE EYE IS UPON`, color: EYE_ORANGE })
    out.push({ text: s.eye, color: HOT })
  }
  if (s.rabbit !== null && s.rabbit < 26) {
    // The rabbit runs across a 20-column lane once, at its own fast frame rate, two frames per bound.
    out.push({ text: place(RABBIT[s.rabbit % 2]!, s.rabbit - 5, 20), color: '#f4f8f6' })
  }
  if (s.load === 2) out.push({ text: lane(SHIP, s.frame, 22), color: AMBER })
  if (s.load >= 1) out.push({ text: `${GLOBE[Math.floor(s.frame / 2) % GLOBE.length]} UPLINK ${'◆'.repeat(Math.min(6, s.live))}`, color: GREEN })
  if (s.live > 0) out.push({ text: `ICE ${s.live}`, color: DIM })
  return out
}
