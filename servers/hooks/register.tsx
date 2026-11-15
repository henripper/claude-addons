import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Scope, Server } from '../types'
import { isDev, isUnder, parseCommands, parseCwds, parseListeners, shortCommand } from './parse'

const list = atom({ plugin: 'servers', key: 'list' } as const, [] as Server[])
const isExpanded = atom({ plugin: 'servers', key: 'isExpanded' } as const, false)
const scope = atom({ plugin: 'servers', key: 'scope' } as const, 'dev' as Scope)
const stopping = atom({ plugin: 'servers', key: 'stopping' } as const, [] as number[])

const POLL_MS = 5000

let root = ''
let selfPid = 0
let isScanning = false

async function scan($: EngineInterface): Promise<void> {
  if (isScanning) return
  isScanning = true
  try {
    const lsof = await $.process.run(['lsof', '-nP', '+c', '0', '-iTCP', '-sTCP:LISTEN', '-Fpcn'], { timeoutMs: 10000 })
    const listeners = parseListeners(lsof.stdout)
    listeners.delete(selfPid)
    const pids = [...listeners.keys()].join(',')
    const [cwdOut, psOut] = pids
      ? await Promise.all([
          $.process.run(['lsof', '-a', '-d', 'cwd', '-Fpn', '-p', pids], { timeoutMs: 10000 }),
          $.process.run(['ps', '-o', 'pid=,command=', '-p', pids], { timeoutMs: 10000 }),
        ])
      : [{ stdout: '' }, { stdout: '' }]
    const cwds = parseCwds(cwdOut.stdout)
    const commands = parseCommands(psOut.stdout)

    const servers: Server[] = [...listeners].map(([pid, one]) => {
      const cwd = cwds.get(pid) ?? ''
      return {
        pid,
        name: one.name,
        ports: one.ports,
        command: commands.get(pid) ?? one.name,
        cwd,
        isProject: root !== '' && cwd !== '/' && isUnder(cwd, root),
      }
    })
    servers.sort((a, b) => Number(b.isProject) - Number(a.isProject) || (a.ports[0] ?? 0) - (b.ports[0] ?? 0))

    await update($, list, () => servers)
    await update($, stopping, ids => ids.filter(id => listeners.has(id)))
    const dev = servers.filter(isDev).length
    $.ui.status(dev === 0 ? undefined : `${dev} server${dev === 1 ? '' : 's'} running`)
  } catch (error) {
    $.ui.log(`servers: scan failed: ${String(error)}`, { to: 'debug' })
  } finally {
    isScanning = false
  }
}

async function kill($: EngineInterface, server: Server, signal: 'TERM' | 'KILL'): Promise<void> {
  await update($, stopping, ids => [...ids, server.pid])
  const result = await $.process.run(['kill', `-${signal}`, String(server.pid)])
  if (result.exitCode !== 0) {
    $.ui.toast(`Could not stop ${server.name} (pid ${server.pid}): ${result.stderr.trim()}`)
    await update($, stopping, ids => ids.filter(id => id !== server.pid))
    return
  }
  await $.clock.sleep(1500)
  await scan($)
  const still = (await read($, list)).some(one => one.pid === server.pid)
  $.ui.toast(
    still
      ? `${server.name} (pid ${server.pid}) is still running; press Force to SIGKILL it`
      : `Stopped ${server.name} on :${server.ports.join(', :')}`,
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    root = e.cwd
    const parent = await $.process.run(['sh', '-c', 'echo $PPID'])
    selfPid = Number(parent.stdout.trim()) || 0
    await $.command.register({ name: 'servers', description: 'Show servers listening on this machine, with Kill buttons' })
    void scan($)
    $.clock.every(POLL_MS, () => void scan($))
    return next(e)
  })

  on('command.run', { command: 'servers' }, async $ => {
    await update($, isExpanded, () => true)
    await scan($)
    const dev = (await read($, list)).filter(isDev)
    return { text: dev.length === 0 ? 'No dev servers running.' : `${dev.length} server(s) shown above the prompt.` }
  })

  // A Bash call may have started or stopped a server: look again right away.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    try {
      return await next(e)
    } finally {
      $.clock.after(1500, () => void scan($))
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const all = await read($, list)
    const which = await read($, scope)
    const shown = which === 'all' ? all : all.filter(isDev)
    if (shown.length === 0 && which === 'dev') return next(e)

    const open = await read($, isExpanded)
    const busy = await read($, stopping)
    const { Box, Text, Button } = $.ui.resolve(e)
    const ports = shown.flatMap(one => one.ports).slice(0, 6).map(port => `:${port}`).join(' ')
    // The band has one slot: keep whatever another plugin (e.g. usage-band) draws beneath us.
    const beneath = await next(e)

    return (
      <Box flexDirection="column">
        {beneath}
        <Box flexDirection="row" gap={1}>
          <Text color="green">●</Text>
          <Text bold>
            {shown.length} server{shown.length === 1 ? '' : 's'} running
          </Text>
          {!open && <Text dimColor>{ports}</Text>}
          <Button key="toggle" plain dimColor label={open ? 'Hide' : 'Show'} onPress={() => update($, isExpanded, v => !v)} />
          {open && (
            <Button
              key="scope"
              plain
              dimColor
              label={which === 'dev' ? 'Show all listeners' : 'Dev servers only'}
              onPress={() => update($, scope, v => (v === 'dev' ? 'all' : 'dev'))}
            />
          )}
        </Box>
        {open &&
          shown.map(server => {
            const isBusy = busy.includes(server.pid)
            return (
              <Box key={`row-${server.pid}`} flexDirection="row" gap={1}>
                <Text color="cyan">{server.ports.map(port => `:${port}`).join(' ')}</Text>
                <Text>{server.name}</Text>
                <Text dimColor>pid {server.pid}</Text>
                {server.isProject && <Text color="yellow">this project</Text>}
                <Text dimColor wrap="truncate-end">
                  {shortCommand(server.command)}
                </Text>
                {isBusy ? (
                  <Button key={`force-${server.pid}`} label="Force" onPress={() => kill($, server, 'KILL')} />
                ) : (
                  <Button key={`kill-${server.pid}`} label="Kill" onPress={() => kill($, server, 'TERM')} />
                )}
              </Box>
            )
          })}
      </Box>
    )
  })
}
