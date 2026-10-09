// Semáforo: círculo al costado del chat, visible desde lejos.
// Rojo = Claude en un turno O alguna tarea de fondo corriendo (comandos en segundo plano,
// monitores, agentes) · Verde = no queda nada corriendo.
// /semaforo lo abre y lo cierra cuantas veces se quiera. "Reiniciar" limpia las tareas a mano.
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const PANE = 'semaforo'
const working = atom({ plugin: 'semaforo', key: 'working' } as const, false)
const tasks = atom({ plugin: 'semaforo', key: 'tasks' } as const, [] as string[])

const ROJO = '#e53935'
const VERDE = '#2ecc40'
const LADO = 170 // px del círculo

// Una tarea de fondo arranca: lo que responde la herramienta al lanzarla.
const STARTS = [
  /running in background with ID: ([A-Za-z0-9_-]+)/g, // Bash / PowerShell en segundo plano
  /Monitor started \(task ([A-Za-z0-9_-]+)/g, // Monitor
  /agentId[^A-Za-z0-9]+([A-Za-z0-9_-]{6,})/g, // Agent en segundo plano
]
// ...y termina: el aviso que llega después (con estado final, o el monitor que venció).
const ENDS = [
  /<task-id>([A-Za-z0-9_-]+)<\/task-id>[\s\S]{0,600}?<status>(?:completed|failed|killed|stopped|cancelled|error|timeout)/g,
  /<task-id>([A-Za-z0-9_-]+)<\/task-id>[\s\S]{0,600}?(?:Monitor expired|stream ended)/g,
]

const ids = (text: string, res: RegExp[]) => {
  const out: string[] = []
  for (const re of res) for (const m of text.matchAll(re)) if (m[1]) out.push(m[1])
  return out
}

function circle(color: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${LADO}" height="${LADO}">` +
    `<circle cx="50" cy="50" r="47" fill="${color}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>` +
    '</svg>'
  )
}

// abre o cierra el panel grande y recuerda la elección (entre sesiones)
async function toggle($: any): Promise<boolean> {
  const open = (await $.ui.panes()).some((p: { id: string }) => p.id === PANE)
  if (open) {
    await $.ui.close({ id: PANE })
  } else {
    await $.ui.open({ id: PANE, title: 'Semáforo' })
  }
  await $.store.set('open', !open)

  return !open
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'semaforo', description: 'Abrir / cerrar el semáforo (rojo trabajando, verde listo)' })
    // arranca cerrado, salvo que la última vez lo hayas dejado abierto
    if ((await $.store.get('open')) === true) void $.ui.open({ id: PANE, title: 'Semáforo' })

    return next(e)
  })

  // /semaforo: si está abierto lo cierra, si no lo abre (las veces que se quiera)
  on('command.run', { command: 'semaforo' }, async $ => {
    const open = await toggle($)

    return { text: open ? 'Semáforo abierto.' : 'Semáforo cerrado (botón “Semáforo” o /semaforo lo reabre).' }
  })

  // cerrado con la X del panel: recordar que lo quisiste cerrado
  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if ((e as { id?: string; origin?: string }).id === PANE && (e as { origin?: string }).origin === 'person') {
      await $.store.set('open', false)
    }

    return r
  })

  // botón chico fijo sobre el cuadro de texto: punto del color actual + abre/cierra el panel
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // lo que dibujen otros mods (ej. la barra de uso): no taparlo
    const below = await Promise.resolve(next(e)).catch(() => null)
    if (e.props.hasSurvey) return below ?? next(e)
    const { Box, Button } = $.ui.resolve(e)
    const red = (await read($, working)) || (await read($, tasks)).length > 0

    return (
      // misma fila que lo de otros mods (barra de uso), el botón a la derecha
      <Box>
        {below}
        <Button key="semaforo-toggle" label={`${red ? '🔴' : '🟢'} Semáforo`} onPress={() => toggle($)} />
      </Box>
    )
  })

  on('turn.start', async ($, e, next) => {
    await update($, working, () => true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await update($, working, () => false)

    return done
  })

  // tareas de fondo que arrancan (por la respuesta de la herramienta que las lanzó)
  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    if (e.tool === 'TaskStop') {
      const inp = e.input as { task_id?: string; shell_id?: string }
      const id = String(inp.task_id ?? inp.shell_id ?? '')
      if (id) await update($, tasks, ts => ts.filter(t => t !== id))
      return r
    }
    const started = ids(JSON.stringify(r ?? ''), STARTS)
    if (started.length) await update($, tasks, ts => [...new Set([...ts, ...started])])

    return r
  })

  // ...y las que terminan (por el aviso que llega a la conversación)
  on('session.append', async ($, e, next) => {
    const ended = ids(JSON.stringify(e ?? ''), ENDS)
    if (ended.length) await update($, tasks, ts => ts.filter(t => !ended.includes(t)))

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Svg, Button } = $.ui.resolve(e)
    const busy = await read($, working)
    const bg = (await read($, tasks)).length
    const red = busy || bg > 0
    const color = red ? ROJO : VERDE
    const label = red ? 'TRABAJANDO' : 'LISTO'
    const sub = bg > 0 ? `${bg} tarea${bg > 1 ? 's' : ''} de fondo` : busy ? 'respondiendo' : 'nada corriendo'

    return (
      <Box flexDirection="column" alignItems="center">
        {Svg ? (
          <Svg source={circle(color)} alt={label} width={LADO} height={LADO} />
        ) : (
          <Text color={color} bold>{'████████████'}</Text>
        )}
        <Text color={color} bold>{label}</Text>
        <Text dimColor>{sub}</Text>
        {bg > 0 && <Button key="reset" label="Reiniciar" onPress={() => update($, tasks, () => [])} />}
      </Box>
    )
  })
}
