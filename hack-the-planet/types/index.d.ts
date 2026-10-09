export type DaemonStatus = 'running' | 'granted' | 'denied'

export type Daemon = {
  id: string
  type: string
  description: string
  /** The last tool this agent called, short form (`Grep "auth"`). */
  tool: string
  status: DaemonStatus
  startedAt: number
  endedAt: number
}

export type Turn = { startedAt: number } | null

declare module 'claude-code' {
  interface PluginState {
    'hack-the-planet': {
      daemons: Daemon[]
      feed: string[]
      frame: number
      turn: Turn
      isPaneOpen: boolean
      isSpinnerOn: boolean
    }
  }
}
