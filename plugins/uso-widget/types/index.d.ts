export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'uso-widget': { limits: Limit[]; warned: string[] }
  }
}
