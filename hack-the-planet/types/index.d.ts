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

export type Browsing = { at: number; target: string } | null

export type Turn = { startedAt: number; promptChars: number; toolCalls: number } | null

declare module 'claude-code' {
  interface PluginState {
    'hack-the-planet': {
      daemons: Daemon[]
      feed: string[]
      frame: number
      second: number
      browsing: Browsing
      turn: Turn
      isPaneOpen: boolean
      isSpinnerOn: boolean
    }
  }
}
