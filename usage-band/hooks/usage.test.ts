import { describe, expect, mock, test } from 'claude-code/testing'

import { bar, colorFor, untilText } from './register'

describe('usage-band helpers', () => {
  test('bar fills proportionally', async () => {
    expect(bar(89)).toBe('█████████░')
    expect(bar(18)).toBe('██░░░░░░░░')
  })
  test('colors by threshold', async () => {
    expect(colorFor(18)).toBe('green')
    expect(colorFor(75)).toBe('yellow')
    expect(colorFor(95)).toBe('red')
  })
  test('countdown text', async () => {
    const now = Date.parse('2026-10-06T18:00:00Z')
    expect(untilText('2026-10-06T19:10:00Z', now)).toBe('in 1h 10m')
    expect(untilText('2026-10-13T08:00:00Z', now)).toBe('in 6d 14h')
  })
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws limits on ${surface}`, async ($, on) => {
    mock.clock(on)
    on('session.usage', () => ({ value: {
      startedAt: 0,
      context: { window: 200000 } as never,
      rateLimits: [
        { kind: 'seven_day', percentUsed: 18, resetsAt: '2026-10-13T08:00:00Z' },
        { kind: 'five_hour', percentUsed: 89, resetsAt: '2026-10-06T19:10:00Z' },
      ],
    } }) as never)
    on('session.start', () => ({ cwd: '/tmp' }) as never)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true } as never)
    const band = await $.ui.mount({
      plugin: 'usage-band',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, columns: 120 } as never,
    })
    const tree = JSON.stringify(await band.drawn())
    expect(tree).toContain('Session')
    expect(tree).toContain('89%')
    expect(tree).toContain('Week')
    expect(tree.indexOf('Session')).toBeLessThan(tree.indexOf('Week'))
  })
}
