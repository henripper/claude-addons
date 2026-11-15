// Phosphor Rain, a look (desktop and mobile apps; the terminal draws no themes).
// Dark only: this is a screen in a dark room.
//   phosphor green  accent  (keywords, links, buttons)
//   teal green      success (strings)                    a clean build
//   amber           warning (variables)
//   neon magenta    pro     (literals)
//   ICE red         danger  (names, errors)
// Behind the chat: slow digital rain and a faint, flickering Eye in the corner.
// `/hack theme off` clears it, `/hack theme on` brings it back (remembered).

import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './rain'

const SCENE_ID = 'digital-rain'

const { theme, problems } = makeColors({
  label: 'Phosphor Rain',
  only: 'dark',
  roles: { accent: '#2fe06f', danger: '#ff3d5a', success: '#1fd1a0', warning: '#ffb000', pro: '#e040fb' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#040806',
        'surface-1': '#0b1510',
        'surface-2': '#101c16',
        'surface-3': '#13231b',
        'text-primary': '#d8f7e4',
        'text-secondary': '#a6d4b9',
        'text-muted': '#80b194',
      },
    },
    git: {
      added: '#2fe06f',
      removed: '#ff3d5a',
      modified: '#ffb000',
      merged: '#e040fb',
      closed: '#ff3d5a',
      conflicting: '#ff7a2f',
      draft: '#80b194',
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: SCENE_ID, glass: { blur: 3, tint: '#030705', opacity: 0.62 } },
}

/** Older builds have no `$.theme`: the call throws, and uncaught it would take the whole hook down. */
function whyNot(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  return `This version of Claude can’t draw the look (${detail}). Update the app, then try again. Everything else in this add-on works.`
}

/** Paints the look. Returns why nothing was drawn, or undefined when it was. */
async function paint($: EngineInterface): Promise<string | undefined> {
  try {
    // While you build: the line that would stop Desktop painting this look.
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) {
      $.ui.status(set.reason)
      return set.reason
    }
    return undefined
  } catch (error) {
    return whyNot(error)
  }
}

/** `/hack theme on` or `/hack theme off`: remembered, and applied now. Returns the reply. */
export async function setThemeOn($: EngineInterface, isOn: boolean): Promise<string> {
  await $.store.set('isThemeOn', isOn)
  if (isOn) {
    const why = await paint($)
    return why === undefined ? 'Phosphor Rain look is on.' : `Phosphor Rain look is on, but nothing is drawn: ${why}`
  }
  try {
    await $.theme.clear()
  } catch (error) {
    return whyNot(error)
  }
  return 'Phosphor Rain look is off: back to the app’s own look.'
}

/** Called from the plugin's one `session.start` hook. Clearing is only ever on the person's ask, never here. */
export async function applyThemeAtStart($: EngineInterface): Promise<void> {
  try {
    if ((await $.store.get('isThemeOn')) !== false) await paint($)
  } catch {
    // Never let the look break a session: it is decoration.
  }
}

export function registerTheme(on: Parameters<Register>[0]): void {
  // The rain, and a faint Eye watching from the corner.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_ID) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return <Svg source={SCENE} alt="Green digital rain falling, a faint amber eye in the corner" isInteractive />
  })
}
