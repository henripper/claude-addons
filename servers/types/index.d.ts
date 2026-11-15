export type Server = {
  pid: number
  name: string
  ports: number[]
  command: string
  cwd: string
  isProject: boolean
}

export type Scope = 'dev' | 'all'

declare module 'claude-code' {
  interface PluginState {
    servers: {
      list: Server[]
      isExpanded: boolean
      scope: Scope
      stopping: number[]
    }
  }
}
