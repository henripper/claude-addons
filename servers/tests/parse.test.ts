import { describe, expect, test } from 'claude-code/testing'

import { isDev, isUnder, parseCommands, parseCwds, parseListeners, shortCommand } from '../hooks/parse'

describe('parse', () => {
  test('listeners group ports by pid', async () => {
    const out = ['p501', 'cnode', 'f23', 'n*:3000', 'f24', 'n[::1]:3000', 'f25', 'n127.0.0.1:9229', 'p77', 'cSpotify', 'f9', 'n*:57621', ''].join('\n')
    const byPid = parseListeners(out)
    expect(byPid.get(501)).toEqual({ name: 'node', ports: [3000, 9229] })
    expect(byPid.get(77)?.ports).toEqual([57621])
  })

  test('cwds and commands', async () => {
    expect(parseCwds('p501\nfcwd\nn/Users/me/app\n').get(501)).toBe('/Users/me/app')
    expect(parseCommands('  501 node /x/vite --port 5173\n').get(501)).toBe('node /x/vite --port 5173')
  })

  test('dev filter and project scope', async () => {
    const base = { pid: 1, ports: [1], cwd: '/', isProject: false }
    expect(isDev({ ...base, name: 'node', command: 'node server.js' })).toBe(true)
    expect(isDev({ ...base, name: 'Python', command: '/usr/bin/python3 -m http.server' })).toBe(true)
    expect(isDev({ ...base, name: 'Spotify', command: '/Applications/Spotify.app/Contents/MacOS/Spotify' })).toBe(false)
    expect(isUnder('/a/b/c', '/a/b')).toBe(true)
    expect(isUnder('/a/bc', '/a/b')).toBe(false)
    expect(shortCommand('node /Users/me/app/node_modules/.bin/vite --port 5173')).toBe('node …/.bin/vite --port 5173')
  })
})
