import type { Server } from '../types'

// Runtimes and tools that usually mean "a server I started", as opposed to
// apps like Spotify or the OS's own listeners.
const DEV = /\b(node|nodejs|bun|deno|python[\d.]*|uvicorn|gunicorn|flask|django|ruby|rails|puma|php|java|go|cargo|dotnet|vite|next|nuxt|astro|webpack|esbuild|http-server|serve|postgres|mysqld|redis-server|mongod|docker|caddy|nginx|hugo|jekyll|godot)\b/i

/** Parses `lsof -nP -iTCP -sTCP:LISTEN -Fpcn` into pid -> { name, ports }. */
export function parseListeners(out: string): Map<number, { name: string; ports: number[] }> {
  const byPid = new Map<number, { name: string; ports: number[] }>()
  let pid = 0
  for (const line of out.split('\n')) {
    const tag = line[0]
    const value = line.slice(1)
    if (tag === 'p') {
      pid = Number(value)
      if (!byPid.has(pid)) byPid.set(pid, { name: '', ports: [] })
    } else if (tag === 'c') {
      const one = byPid.get(pid)
      if (one) one.name = value
    } else if (tag === 'n') {
      const port = Number(value.slice(value.lastIndexOf(':') + 1))
      const one = byPid.get(pid)
      if (one && Number.isInteger(port) && port > 0 && !one.ports.includes(port)) {
        one.ports.push(port)
      }
    }
  }
  for (const one of byPid.values()) one.ports.sort((a, b) => a - b)
  return byPid
}

/** Parses `lsof -a -d cwd -Fpn -p ...` into pid -> cwd. */
export function parseCwds(out: string): Map<number, string> {
  const cwds = new Map<number, string>()
  let pid = 0
  for (const line of out.split('\n')) {
    if (line[0] === 'p') pid = Number(line.slice(1))
    else if (line[0] === 'n' && pid) cwds.set(pid, line.slice(1))
  }
  return cwds
}

/** Parses `ps -o pid=,command= -p ...` into pid -> full command line. */
export function parseCommands(out: string): Map<number, string> {
  const commands = new Map<number, string>()
  for (const line of out.split('\n')) {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line)
    if (match) commands.set(Number(match[1]), match[2] ?? '')
  }
  return commands
}

export function isDev(server: Server): boolean {
  return server.isProject || DEV.test(server.name) || DEV.test(server.command)
}

export function isUnder(path: string, root: string): boolean {
  return path === root || path.startsWith(root.endsWith('/') ? root : root + '/')
}

/** `node /Users/me/app/node_modules/.bin/vite --port 5173` -> `node …/.bin/vite --port 5173` */
export function shortCommand(command: string, max = 60): string {
  const short = command.replace(/\/(?:[^\s/]+\/)+([^\s/]+\/[^\s/]+)/g, '…/$1')
  return short.length > max ? short.slice(0, max - 1) + '…' : short
}
