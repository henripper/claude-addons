import { expect, mock, test } from 'claude-code/testing'

import { flybySvg } from '../hooks/flyby'
import { cellRuns, hackerWord, shortTool, sweep } from '../hooks/gibson'
import { eyeCells, eyeSvg, eyeTarget } from '../hooks/eye'
import { rabbitSvg } from '../hooks/matrix'
import { globeCells, globePanelSvg, loadLevel, shipLane } from '../hooks/scenes'

const AGENT = { id: 'a1', description: 'Find auth code', type: 'Explore', status: 'running' as const }
const SITE = { bodyColumns: 80, scroll: { offset: 0, bodyRows: 30 }, view: {} }
const BAND = { ...SITE, hasSurvey: false, isWorking: false, maxRows: 10 }
const HACK = { command: 'hack', args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: true, columns: 160 } }
const PANE = { ...SITE, title: 'The Gibson', isFocused: false, placement: 'dock' as const }

test('drawing helpers stay in bounds', async () => {
  expect(sweep(5, 14).length).toBe(14)
  expect(hackerWord('thinking', 0)).toBe('DECRYPTING')
  expect(shortTool('Edit', { file_path: '/a/b/register.tsx' })).toBe('Edit register.tsx')
  const runs = cellRuns(Uint32Array.of(0x41, 0xff0000, 0x01000000, 0x42, 0xff0000, 0x01000000), 2, 1)
  expect(runs).toEqual([[{ text: 'AB', fg: '#ff0000', bg: undefined }]])
})

test('band chip shows running daemons and keeps the other bands', async ($, on) => {
  const clock = mock.clock(on)
  on('agent.list', () => ({ value: [AGENT] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="usage">Session 42%</Text>
  })

  await $.command.run(HACK)
  await clock.advance(1100)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'hack-the-planet',
      surface,
      component: 'AbovePrompt',
      props: BAND,
    })
    expect(await ui.find({ type: 'Text', text: /ICE 1/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Session 42%/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the pane draws a card per daemon on both surfaces', async ($, on) => {
  const clock = mock.clock(on)
  on('agent.list', () => ({ value: [AGENT] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  await $.command.run(HACK)
  await clock.advance(1100)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'hack-the-planet', surface, component: 'Pane', requestId: 'gibson', props: PANE })
    expect(await ui.find({ type: 'Text', text: /EXPLORE/ })).toBeDefined()
    await ui.unmount()
  }
})

test('browsing summons the Eye of Sauron on both surfaces', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', () => ({ result: 'ok' }) as never)
  on('ui.log', () => ({ value: undefined }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="usage">Session 42%</Text>
  })
  await $.command.run(HACK)
  await $.tool.call({ tool: 'mcp__Claude_Browser__navigate', url: 'https://example.com/docs' } as never)
  await clock.advance(300)

  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'hack-the-planet', surface, component: 'Pane', requestId: 'gibson', props: PANE })
    expect(await pane.find({ type: 'Text', text: /example\.com/ })).toBeDefined()
    await pane.unmount()
    const band = await $.ui.mount({ plugin: 'hack-the-planet', surface, component: 'AbovePrompt', props: BAND })
    expect(await band.find({ type: 'Text', text: /example\.com/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /Session 42%/ })).toBeDefined()
    await band.unmount()
  }
})

test('the spinner speaks hacker', async $ => {
  const ui = await $.ui.mount({
    plugin: 'hack-the-planet',
    surface: 'terminal',
    component: 'Spinner',
    props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' as const },
  })
  expect(await ui.find({ type: 'Text', text: /DECRYPTING/ })).toBeDefined()
  await ui.unmount()
})

test('load levels and scene sizes', async () => {
  expect(loadLevel(1, 100, 3)).toBe(0)
  expect(loadLevel(2, 0, 0)).toBe(1)
  expect(loadLevel(0, 2500, 0)).toBe(2)
  expect(loadLevel(0, 0, 30)).toBe(2)
  // Every Svg source must stay under the engine's 131072 characters at the widest pane.
  for (const svg of [flybySvg(720, 330, 99), globePanelSvg(720, 200, 6), eyeSvg(5, true), eyeSvg(1, false), rabbitSvg(720, 'Explore', '14s')]) {
    expect(svg.length).toBeLessThan(131072)
  }
  expect(flybySvg(320, 330, 1).length).toBeLessThan(131072)
  const globe = globeCells(9, 5, 3)
  expect(globe.words.length).toBe(globe.columns * globe.rows * 3)
  expect(shipLane(4, 12).length).toBe(12)
  expect(eyeTarget('mcp__Claude_Browser__navigate', { url: 'https://a.b.com/x?y' })).toBe('a.b.com')
  const eye = eyeCells(7, true)
  expect(eye.words.length).toBe(eye.columns * eye.rows * 3)
})

test('three daemons bring the globe and the cargo ship on both surfaces', async ($, on) => {
  const clock = mock.clock(on)
  const three = ['a1', 'a2', 'a3'].map(id => ({ ...AGENT, id }))
  on('agent.list', () => ({ value: three }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="usage">Session 42%</Text>
  })
  await $.command.run(HACK)
  await clock.advance(1100)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'hack-the-planet', surface, component: 'Pane', requestId: 'gibson', props: PANE })
    expect(await ui.find({ type: 'Text', text: /HEAVY TRAFFIC/ })).toBeDefined()
    await ui.unmount()
    const band = await $.ui.mount({ plugin: 'hack-the-planet', surface, component: 'AbovePrompt', props: BAND })
    expect(await band.find({ type: 'Text', text: /HEAVY TRAFFIC/ })).toBeDefined()
    await band.unmount()
  }
})
