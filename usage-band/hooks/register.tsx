import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'usage-band', key: 'limits' } as const, [] as Limit[])
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)

const LABELS: Record<string, string> = {
  five_hour: 'Session',
  seven_day: 'Week',
  spend_limit: 'Spend',
}

const ORDER = ['five_hour', 'seven_day', 'spend_limit']

export function bar(percent: number, width = 10): string {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export function colorFor(percent: number): string {
  if (percent >= 90) return 'red'
  if (percent >= 70) return 'yellow'
  return 'green'
}

export function untilText(resetsAt: string | undefined, nowMs: number): string {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - nowMs
  if (!Number.isFinite(ms)) return ''
  if (ms <= 0) return 'resetting'
  const minutes = Math.ceil(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${mins}m`
  return `in ${mins}m`
}

export function clockText(resetsAt: string | undefined, nowMs: number): string {
  if (!resetsAt) return ''
  try {
    const at = new Date(resetsAt)
    const sameDay = at.getTime() - nowMs < 20 * 3600 * 1000
    const time = at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    if (sameDay) return time
    const day = at.toLocaleDateString(undefined, { weekday: 'short' })
    return `${day} ${time}`
  } catch {
    return ''
  }
}

async function store($: EngineInterface, next: Limit[]) {
  const sorted = [...next].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
  await update($, limits, () => sorted.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })))
  await update($, now, () => Date.now())
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    try {
      const usage = await $.session.usage()
      if (usage.rateLimits.length > 0) await store($, usage.rateLimits)
    } catch {}
    await update($, now, () => Date.now())
    // Keep the "resets in …" countdown fresh.
    $.clock.every(60_000, () => {
      void update($, now, () => Date.now())
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await store($, e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const list = await read($, limits)
    const nowMs = (await read($, now)) || Date.now()
    const { Box, Text } = $.ui.resolve(e)

    if (list.length === 0) {
      return (
        <Box>
          <Text dimColor>Usage: waiting for the first response…</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="row" flexWrap="wrap">
        {list.map(l => {
          const pct = Math.round(l.percentUsed)
          const clock = clockText(l.resetsAt, nowMs)
          const until = untilText(l.resetsAt, nowMs)
          const reset = clock && until ? `resets ${clock} (${until})` : until ? `resets ${until}` : ''
          return (
            <Box key={l.kind} marginRight={3}>
              <Text>
                <Text bold>{`${LABELS[l.kind] ?? l.kind} `}</Text>
                <Text color={colorFor(pct)}>{`${bar(pct)} ${pct}%`}</Text>
                <Text dimColor>{reset ? `  ${reset}` : ''}</Text>
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
