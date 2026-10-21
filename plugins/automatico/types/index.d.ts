export type Ventana = 'semanal' | '5h'
export type Modo = {
  on: boolean
  tope: number // % de la ventana hasta donde seguir
  ventana: Ventana
  tarea: string | null // tarea en curso (ej. "T51 de docs/PLAN-jarvis.md")
  sesion: string | null // id de la sesión que la hace
}

declare module 'claude-code' {
  interface PluginState {
    automatico: { modo: Modo; trabajando: boolean }
  }
}
