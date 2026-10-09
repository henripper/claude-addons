// The white rabbit, in ASCII: when a daemon finishes it gallops across The Gibson on
// all fours, side-on, and is gone. Drawn from its own fast frame counter.

// Two poses facing right: gathered on the ground, then stretched out mid-leap.
const GATHER = ['    (\\\\', ' .--( o>', '(___)_/_']
const STRETCH = ['     (\\\\', ' .---( o>', '//    \\\\_']
const SPRITE_WIDTH = 10
// One bound every four frames: gather on the ground, two frames stretched in the air, land.
const GAIT: { pose: string[]; lift: number }[] = [
  { pose: GATHER, lift: 0 },
  { pose: STRETCH, lift: 1 },
  { pose: STRETCH, lift: 1 },
  { pose: GATHER, lift: 0 },
]

/** How fast the rabbit's frames advance, in milliseconds (about 12 a second). */
export const RABBIT_FRAME_MS = 80

/**
 * The rabbit `frames` frames into its run across `columns`: four lines, the top one the
 * air it bounds through. Empty once it has run off the right edge.
 */
export function rabbitFrame(frames: number, columns: number): string[] {
  const x = frames * 2
  if (x > columns - SPRITE_WIDTH) return []
  const { pose, lift } = GAIT[frames % GAIT.length]!
  const lines = ['', '', '', '']
  pose.forEach((row, k) => {
    lines[1 - lift + k] = ' '.repeat(x) + row
  })
  return lines
}
