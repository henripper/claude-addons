import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import type { Browsing, Daemon, Turn } from '../types'
import {
  AMBER,
  DIM,
  GREEN,
  HOT,
  RED,
  elapsed,
  fill,
  glyph,
  hackerWord,
  hex,
  encodeCells,
  shortTool,
  sweep,
  titleSvg,
} from './gibson'
import { flybySvg } from './flyby'
import { EYE_MS, eyeCells, eyeSvg, eyeTarget, isBrowserTool } from './eye'
import { RABBIT_TEXT, rabbitSvg, wakeUpSvg } from './matrix'
import { blank, globeCells, globePanelSvg, loadLevel, paintShip, shipLane } from './scenes'
import type { Load } from './scenes'

const PANE = 'gibson'
const TITLE = 'The Gibson'
const FRAME_MS = 200
const POLL_MS = 1000
const LINGER_MS = 8000
const GLITCH_MS = 1600
const RABBIT_MS = 5000
const INTRO_MS = 9500
const FEED_MAX = 40

const daemons = atom({ plugin: 'hack-the-planet', key: 'daemons' } as const, [] as Daemon[])
const feed = atom({ plugin: 'hack-the-planet', key: 'feed' } as const, [] as string[])
const frame = atom({ plugin: 'hack-the-planet', key: 'frame' } as const, 0)
// The desktop pane redraws once a second, not every frame: its SVGs animate themselves.
const second = atom({ plugin: 'hack-the-planet', key: 'second' } as const, 0)
const openedAt = atom({ plugin: 'hack-the-planet', key: 'openedAt' } as const, 0)
const browsing = atom({ plugin: 'hack-the-planet', key: 'browsing' } as const, null as Browsing)

const isEyeOpen = (eye: Browsing) => !!eye && Date.now() - eye.at < EYE_MS
const EYE_WORDS = ['THE EYE IS WATCHING', 'ONE TAB TO RULE THEM ALL', 'SCRYING THE WEB', 'THE EYE SEES ALL']
const turn = atom({ plugin: 'hack-the-planet', key: 'turn' } as const, null as Turn)
const isPaneOpen = atom({ plugin: 'hack-the-planet', key: 'isPaneOpen' } as const, false)
const isSpinnerOn = atom({ plugin: 'hack-the-planet', key: 'isSpinnerOn' } as const, true)

const LIVE = new Set(['pending', 'running', 'waiting', 'idle'])
const FAILED = new Set(['failed', 'killed'])

let feedCount = 0
let isPolling = false
let lastLoad: Load = 0
let lastCargoToast = 0

function levelOf(list: readonly Daemon[], current: Turn): Load {
  const live = list.filter(one => one.status === 'running').length
  return loadLevel(live, current?.promptChars ?? 0, current?.toolCalls ?? 0)
}

const LOAD_LABEL = ['NOMINAL', 'BUSY', 'HEAVY TRAFFIC'] as const
const EYE_ORANGE = '#ff7a1a'

async function openPane($: EngineInterface): Promise<void> {
  const wasOpen = await read($, isPaneOpen)
  await $.ui.open({ id: PANE, title: TITLE })
  await update($, isPaneOpen, () => true)
  if (!wasOpen) await update($, openedAt, () => Date.now())
}

/** Brings the daemon list in line with the engine's agents; toasts each one that finishes. */
async function poll($: EngineInterface): Promise<void> {
  if (isPolling) return
  isPolling = true
  try {
    const agents: readonly AgentInfo[] = await $.agent.list()
    const byId = new Map(agents.map(agent => [agent.id, agent]))
    const now = Date.now()
    const before = await read($, daemons)
    const next: Daemon[] = []
    const finished: Daemon[] = []
    const started: Daemon[] = []

    for (const one of before) {
      if (one.status !== 'running') {
        if (now - one.endedAt < LINGER_MS) next.push(one)
        continue
      }
      const agent = byId.get(one.id)
      if (agent && LIVE.has(agent.status)) {
        next.push(one)
        continue
      }
      const done: Daemon = { ...one, status: agent && FAILED.has(agent.status) ? 'denied' : 'granted', endedAt: now }
      next.push(done)
      finished.push(done)
    }
    for (const agent of agents) {
      if (!LIVE.has(agent.status) || next.some(one => one.id === agent.id)) continue
      started.push({
        id: agent.id,
        type: agent.type || 'agent',
        description: agent.description,
        tool: '',
        status: 'running',
        startedAt: now,
        endedAt: 0,
      })
      next.push({
        id: agent.id,
        type: agent.type || 'agent',
        description: agent.description,
        tool: '',
        status: 'running',
        startedAt: now,
        endedAt: 0,
      })
    }

    if (JSON.stringify(next) !== JSON.stringify(before)) await update($, daemons, () => next)
    for (const one of finished) {
      const took = elapsed(one.endedAt - one.startedAt)
      $.ui.toast(
        one.status === 'granted'
          ? `◉ ${one.type.toUpperCase()} daemon followed the white rabbit: ACCESS GRANTED (${took})`
          : `◉ ${one.type.toUpperCase()} daemon: ACCESS DENIED (${took}). Agent Smith got it.`,
      )
    }
  } catch (error) {
    $.ui.log(`hack-the-planet: poll failed: ${String(error)}`, { to: 'debug' })
  } finally {
    isPolling = false
  }
}

/** Advances the animation only while something is on screen to animate. */
async function tick($: EngineInterface): Promise<void> {
  const [running, open, list, eye] = await Promise.all([read($, turn), read($, isPaneOpen), read($, daemons), read($, browsing)])
  if (running || open || list.length > 0 || (eye && Date.now() - eye.at < EYE_MS + 2000)) {
    const n = await update($, frame, k => k + 1)
    if (typeof n === 'number' && n % 5 === 0) await update($, second, k => k + 1)
  }
  const load = levelOf(list, running)
  if (load === 2 && lastLoad < 2 && Date.now() - lastCargoToast > 60000) {
    lastCargoToast = Date.now()
    $.ui.toast('⚠ HEAVY TRAFFIC: recon drone dispatched. Scanning the cargo ship.')
  }
  lastLoad = load
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'hack',
      description: 'Jack into The Gibson: a pane of your running agents, Hackers and Matrix style',
      argumentHint: '[close | spinner on | spinner off]',
    })
    const saved = await $.store.get('isSpinnerOn')
    if (typeof saved === 'boolean') await update($, isSpinnerOn, () => saved)
    const isUp = (await $.ui.panes()).some(pane => pane.id === PANE)
    await update($, isPaneOpen, () => isUp)
    $.clock.every(FRAME_MS, () => void tick($))
    $.clock.every(POLL_MS, () => void poll($))
    return next(e)
  })

  on('command.run', { command: 'hack' }, async ($, e) => {
    const args = e.args.trim().toLowerCase()
    if (args === 'close') {
      await $.ui.close({ id: PANE })
      await update($, isPaneOpen, () => false)
      return { text: 'Connection terminated. The Gibson is closed.' }
    }
    if (args === 'spinner on' || args === 'spinner off') {
      const isOn = args === 'spinner on'
      await update($, isSpinnerOn, () => isOn)
      await $.store.set('isSpinnerOn', isOn)
      return { text: isOn ? 'Hacker spinner on.' : 'Hacker spinner off: back to the stock spinner.' }
    }
    await openPane($)
    void poll($)
    return { text: 'Jacked in. The Gibson is open beside the chat. Hack the planet.' }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) await update($, isPaneOpen, () => false)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    await update($, turn, () => ({ startedAt: Date.now(), promptChars: e.text.length, toolCalls: 0 }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await update($, turn, () => null)
    return next(e)
  })

  // Every tool call scrolls by in the pane's hex feed; a subagent's also shows on its card.
  on('tool.call', async ($, e, next) => {
    const line = shortTool(e.tool, e as unknown as Record<string, unknown>)
    const agentId = e.agentId
    const list = await read($, daemons)
    const who = agentId ? (list.find(one => one.id === agentId)?.type ?? 'daemon') : 'root'
    feedCount += 1
    const entry = `${hex(feedCount)}  ${who.toUpperCase().slice(0, 10).padEnd(10)} ${line}`
    void update($, feed, lines => [...lines, entry].slice(-FEED_MAX))
    void update($, turn, now => (now ? { ...now, toolCalls: now.toolCalls + 1 } : now))
    if (agentId) void update($, daemons, all => all.map(one => (one.id === agentId ? { ...one, tool: line } : one)))
    if (isBrowserTool(e.tool)) {
      const target = eyeTarget(e.tool, e as unknown as Record<string, unknown>)
      void update($, browsing, eye => ({ at: Date.now(), target: target.includes('.') || !eye ? target : eye.target }))
    }
    const result = await next(e)
    if (e.tool === 'Agent') void poll($)
    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!(await read($, isSpinnerOn))) return next(e)
    const [n, current, list, eye] = await Promise.all([read($, frame), read($, turn), read($, daemons), read($, browsing)])
    const { Box, Text } = $.ui.resolve(e)
    const live = list.filter(one => one.status === 'running').length
    const isEye = isEyeOpen(eye)
    const word = isEye ? EYE_WORDS[Math.floor(n / 15) % EYE_WORDS.length]! : hackerWord(e.props.mode, n)
    const cursor = n % 4 < 2 ? '_' : ' '
    const since = current ? elapsed(Date.now() - current.startedAt) : '0s'
    const tail = live > 0 ? ` · ${live} daemon${live === 1 ? '' : 's'}` : ''
    const load = levelOf(list, current)

    return (
      <Box flexDirection="row" gap={1}>
        <Text color={isEye ? EYE_ORANGE : HOT} bold>
          {`${isEye ? '◉' : '>'} ${word}${cursor}`}
        </Text>
        <Text color={GREEN}>{`[${sweep(n, 14)}]`}</Text>
        <Text color={DIM}>{`${hex(Math.floor(n / 2))} · ${since}${tail}`}</Text>
        {load >= 1 && (
          <Text color={AMBER} bold={n % 4 < 2}>
            {`⚠ ${LOAD_LABEL[load]}`}
          </Text>
        )}
        {load === 2 && <Text color={AMBER}>{shipLane(n, 12)}</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const [list, current, eye] = await Promise.all([read($, daemons), read($, turn), read($, browsing)])
    const live = list.filter(one => one.status === 'running').length
    const load = levelOf(list, current)
    const isEye = isEyeOpen(eye)
    if (live === 0 && load === 0 && !isEye) return next(e)

    const [n, open] = await Promise.all([read($, frame), read($, isPaneOpen)])
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    // The band has one slot: keep what the other plugins (servers, usage-band) draw beneath us.
    const beneath = await next(e)

    return (
      <Box flexDirection="column">
        {beneath}
        {(live > 0 || load > 0) && (
          <Box flexDirection="row" gap={1}>
            <Text color={GREEN} bold>
              {n % 6 < 3 ? '◉' : '○'} ICE {live}
            </Text>
            <Text color={DIM}>
              {live === 1 ? 'daemon' : 'daemons'} breaching the mainframe
            </Text>
            {load >= 1 && <Text color={AMBER} bold={n % 4 < 2}>{`⚠ ${LOAD_LABEL[load]}`}</Text>}
            {!open && <Button key="jack-in" plain dimColor label="Jack in" onPress={() => openPane($)} />}
          </Box>
        )}
        {isEye && eye && (
          <Box key="eye-row" flexDirection="row" gap={1} alignItems="center">
            {e.surface !== 'terminal' && 'Svg' in ui && <ui.Svg source={eyeSvg(1, false)} alt="The Eye of Sauron" width={60} height={26} isInteractive />}
            <Text color={EYE_ORANGE} bold>
              {e.surface === 'terminal' ? (n % 6 < 3 ? '◉' : '◎') + ' ' : ''}THE EYE IS UPON
            </Text>
            <Text color={HOT}>{eye.target}</Text>
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const isTerminal = e.surface === 'terminal'
    // The terminal animates by redrawing; the desktop's SVGs animate themselves, so it redraws per second.
    const n = isTerminal ? await read($, frame) : (await read($, second)) * 5
    const [list, lines, current, opened, eye] = await Promise.all([read($, daemons), read($, feed), read($, turn), read($, openedAt), read($, browsing)])
    const isEye = isEyeOpen(eye)
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const columns = Math.max(20, e.props.bodyColumns)
    const rows = e.props.scroll.bodyRows || e.viewport?.rows || 30
    const now = Date.now()
    const live = list.filter(one => one.status === 'running').length
    const load = levelOf(list, current)
    const width = Math.min(columns * 8, 720)

    const rabbit = [...list].reverse().find(one => one.status === 'granted' && now - one.endedAt < RABBIT_MS)
    const isIntro = opened > 0 && now - opened < INTRO_MS

    let header
    if (!isTerminal && 'Svg' in ui) {
      // Each Svg sits in a keyed Box, so a redraw keeps it mounted and its animation running.
      header = (
        <Box flexDirection="column" gap={1}>
          <Box key="title">
            <ui.Svg source={titleSvg(width)} alt="Green code rain behind the words The Gibson" width={width} height={180} isInteractive />
          </Box>
          {isIntro && (
            <Box key={`intro-${opened}`}>
              <ui.Svg source={wakeUpSvg(width)} alt="Wake up, Neo. The Matrix has you. Follow the white rabbit. Knock, knock." width={width} height={150} isInteractive />
            </Box>
          )}
          {load === 2 && (
            <Box key="flyby">
              <ui.Svg source={flybySvg(width, 330, live)} alt="Recon flyby of a cargo ship, ending on a scan of its bridge" width={width} height={330} isInteractive />
            </Box>
          )}
          {load === 1 && (
            <Box key="globe">
              <ui.Svg source={globePanelSvg(width, 200, live)} alt={`A spinning globe with ${live} satellites`} width={width} height={200} isInteractive />
            </Box>
          )}
          {isEye && eye && (
            <Box key="eye" flexDirection="column" alignItems="center">
              <ui.Svg source={eyeSvg(5, true)} alt="The Eye of Sauron atop Barad-dûr" width={300} height={220} isInteractive />
              <Text color={EYE_ORANGE} bold>
                THE EYE IS UPON <Text color={HOT}>{eye.target}</Text>
              </Text>
            </Box>
          )}
          {rabbit && (
            <Box key={`rabbit-${rabbit.id}`}>
              <ui.Svg source={rabbitSvg(width, rabbit.type, elapsed(rabbit.endedAt - rabbit.startedAt))} alt={`The white rabbit dives down its hole: ${rabbit.type} finished`} width={width} height={104} isInteractive />
            </Box>
          )}
        </Box>
      )
    } else {
      const globe = isTerminal && load >= 1 ? globeCells(9, n, live) : null
      let lane = null
      if (isTerminal && load === 2 && 'Raster' in ui) {
        const cells = blank(columns, 3)
        paintShip(cells, n, 0)
        lane = <ui.Raster key="lane" columns={columns} rows={3} cells={encodeCells(cells.words)} />
      }
      header = (
        <Box flexDirection="column">
          <Text color={GREEN} bold>
            {'░▒▓ THE GIBSON ▓▒░'}
            <Text color={DIM}> hack the planet</Text>
          </Text>
          {isIntro && (
            <Text color={GREEN}>
              {['Wake up, Neo…', 'The Matrix has you…', 'Follow the white rabbit.', 'Knock, knock, Neo.'][Math.min(3, Math.floor((now - opened) / 1500))]}
            </Text>
          )}
          {globe && 'Raster' in ui && (
            <Box flexDirection="row" gap={2}>
              <ui.Raster key="globe" columns={globe.columns} rows={globe.rows} cells={encodeCells(globe.words)} />
              <Box flexDirection="column">
                <Text color={GREEN} bold>
                  GLOBAL UPLINK
                </Text>
                <Text color={DIM}>{`${live} satellite${live === 1 ? '' : 's'} tracking`}</Text>
                <Text color={AMBER} bold={n % 4 < 2}>
                  {`⚠ ${LOAD_LABEL[load]}`}
                </Text>
                {load === 2 && <Text color={AMBER}>recon drone on the cargo ship</Text>}
              </Box>
            </Box>
          )}
          {lane}
          {isEye && eye && 'Raster' in ui && (() => {
            const pix = eyeCells(n, true)
            return (
              <Box flexDirection="column">
                <ui.Raster key="eye" columns={pix.columns} rows={pix.rows} cells={encodeCells(pix.words)} />
                <Text color={EYE_ORANGE} bold>
                  THE EYE IS UPON <Text color={HOT}>{eye.target}</Text>
                </Text>
              </Box>
            )
          })()}
          {rabbit && RABBIT_TEXT.map((line, k) => <Text key={`r-${k}`} color={HOT}>{line}</Text>)}
        </Box>
      )
    }

    const cards = list.map((one, i) => {
      const age = (one.status === 'running' ? now : one.endedAt) - one.startedAt
      const isGlitching = one.status !== 'running' && now - one.endedAt < GLITCH_MS
      const color = one.status === 'running' ? GREEN : one.status === 'granted' ? AMBER : RED
      const verdict = one.status === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'
      const status =
        one.status === 'running'
          ? `${fill(age / 1000, 12)} ${elapsed(age)}`
          : isGlitching
            ? Array.from(verdict, (ch, k) => (ch === ' ' || (n + k) % 3 === 0 ? ch : glyph(k, n))).join('')
            : `${verdict} · ${elapsed(age)}`
      return (
        <Box key={`d-${one.id}`} flexDirection="column" borderStyle="single" borderColor={color} paddingX={1}>
          <Text color={color} bold wrap="truncate-end">
            {`[${i}] ${one.type.toUpperCase()}`}
            <Text color={DIM}>{`  ${one.description}`}</Text>
          </Text>
          <Text color={DIM} wrap="truncate-end">
            {`> ${one.tool || 'establishing uplink…'}`}
          </Text>
          <Text color={one.status === 'running' ? HOT : color} bold={one.status !== 'running'}>
            {status}
          </Text>
        </Box>
      )
    })

    const feedRows = Math.max(3, Math.min(12, rows - 14 - list.length * 5))

    return (
      <Box flexDirection="column" gap={1}>
        {header}
        <Text color={GREEN}>
          {`ROOT // uplink ${n % 10 < 5 ? '●' : '○'}  `}
          <Text color={DIM}>
            {current ? `turn ${elapsed(now - current.startedAt)} · ` : 'idle · '}
            {live} daemon{live === 1 ? '' : 's'} online · load {LOAD_LABEL[load]}
          </Text>
        </Text>
        {cards.length > 0 ? (
          <Box flexDirection="column">{cards}</Box>
        ) : (
          <Text color={DIM}>No daemons online. Spawn an agent to breach the mainframe.</Text>
        )}
        <Box flexDirection="column">
          <Text color={DIM} bold>
            {'── traffic ──'}
          </Text>
          {lines.length === 0 && <Text color={DIM}>waiting for packets…</Text>}
          {lines.slice(-feedRows).map((line, k, shown) => (
            <Text key={`f-${k}`} color={k === shown.length - 1 ? GREEN : DIM} wrap="truncate-end">
              {line}
            </Text>
          ))}
        </Box>
        <Button key="close" plain dimColor label="Disconnect" onPress={() => $.ui.close({ id: PANE })} />
      </Box>
    )
  })
}
