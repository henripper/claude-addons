// The white rabbit, in ASCII: when a daemon finishes it hops across The Gibson in
// arcs and is gone. Drawn from the frame counter, so it plays on every surface.

const RABBIT = [' (\\(\\', ' ( -.-)', 'o_(")(")']
const SPRITE_WIDTH = 9
const HOP = [0, 1, 2, 2, 1, 0]

/**
 * The rabbit `frames` frames into its run across `columns`: five lines, the top two
 * the air it hops through. Empty once it has hopped off the right edge.
 */
export function rabbitFrame(frames: number, columns: number): string[] {
  const x = frames * 2
  if (x > columns - SPRITE_WIDTH) return []
  const lift = HOP[frames % HOP.length]!
  const lines = Array.from({ length: 5 }, () => '')
  RABBIT.forEach((row, k) => {
    lines[2 - lift + k] = ' '.repeat(x) + row
  })
  return lines
}
