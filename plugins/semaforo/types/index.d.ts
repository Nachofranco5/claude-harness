export type Working = boolean
export type TaskIds = string[]

declare module 'claude-code' {
  interface PluginState {
    semaforo: { working: Working; tasks: TaskIds }
  }
}
