import { expect, test } from 'claude-code/testing'

const OUTPUT: Record<string, string> = {
  lsof: 'p123\ncnode\nf20\nn*:3000\n',
  ps: '  123 node server.js\n',
}

test("another plugin's band still shows with the servers row", async ($, on) => {
  // Beneath the servers plugin: a fake host for its scan, and another band, as usage-band draws.
  on('process.run', (_$, e) => {
    const isCwd = e.argv.includes('cwd')
    const stdout = isCwd ? 'p123\nn/x\n' : OUTPUT[e.argv[0] ?? ''] ?? ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="usage">Session 42%</Text>
  })

  await $.command.run({ command: 'servers' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'servers',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10 },
    })
    expect(await ui.find({ type: 'Text', text: /1 server running/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Session 42%/ })).toBeDefined()
    await ui.unmount()
  }
})
