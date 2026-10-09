import { expect, mock, test } from 'claude-code/testing'

import { hackerWord, rainCells, rainSvg, shortTool, sweep } from '../hooks/gibson'

const AGENT = { id: 'a1', description: 'Find auth code', type: 'Explore', status: 'running' as const }
const SITE = { bodyColumns: 80, scroll: { offset: 0, bodyRows: 30 }, view: {} }
const BAND = { ...SITE, hasSurvey: false, isWorking: false, maxRows: 10 }
const HACK = { command: 'hack', args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: true, columns: 160 } }
const PANE = { ...SITE, title: 'The Gibson', isFocused: false, placement: 'dock' as const }

test('drawing helpers stay in bounds', async () => {
  expect(sweep(5, 14).length).toBe(14)
  expect(hackerWord('thinking', 0)).toBe('DECRYPTING')
  expect(shortTool('Edit', { file_path: '/a/b/register.tsx' })).toBe('Edit register.tsx')
  expect(rainCells(10, 4, 3).length).toBe(Math.ceil((10 * 4 * 12) / 3) * 4)
  expect(rainSvg(400, 180).length).toBeLessThan(131072)
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
