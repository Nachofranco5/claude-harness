// Modo automático: esta ventana pasa a ser la "coordinadora" que encadena las tareas del plan, cada una en una
// ventana nueva con su modelo/esfuerzo, hasta un tope de uso. El que coordina es el modelo (skill `automatico`);
// el mod pone lo que el modelo no puede tener solo:
// - Botón sobre el cuadro de texto: prende (escribe "seguí en automático hasta N %"; Enter) y apaga (al instante).
// - Herramienta `mcp__automatico__automatico`: el modelo prende/apaga, anota la tarea en curso y pide despertarse.
// - Vigía: con el modo prendido y la ventana quieta, la despierta cada tanto (por si una tarea quedó trabada
//   o el aviso de "terminó" no llegó) y a la hora que pidió el modelo (ej. cuando se renueva la ventana de 5 h).
// - Freno: con el modo apagado no deja arrancar sesiones `auto-*` (por si lo apagaste en medio de un turno).
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Modo, Ventana } from '../types'

const APAGADO: Modo = { on: false, tope: 0, ventana: 'semanal', tarea: null, sesion: null }
const modo = atom({ plugin: 'automatico', key: 'modo' } as const, APAGADO)
const trabajando = atom({ plugin: 'automatico', key: 'trabajando' } as const, false)

const TOOL = 'mcp__automatico__automatico'
// minutos de ventana quieta antes de despertarla: último recurso (tarea trabada, aviso perdido). Largo a propósito:
// la app deja arrancar sesiones solo en turnos tuyos o en avisos de fin que vienen detrás de uno; un turno del vigía
// en el medio puede cortar esa cadena.
const VIGIA_MIN = 90
const SEGUIR = 'Modo automático: revisá cómo va la tarea en curso y seguí con la próxima si corresponde (skill automatico).'

type Uso = { semanal: number | null; '5h': number | null; renuevaSemanal: string | null; renueva5h: string | null }

async function uso($: any): Promise<Uso> {
  const u: Uso = { semanal: null, '5h': null, renuevaSemanal: null, renueva5h: null }
  try {
    for (const r of (await $.session.usage()).rateLimits ?? []) {
      if (r.kind === 'seven_day') (u.semanal = r.percentUsed), (u.renuevaSemanal = r.resetsAt ?? null)
      if (r.kind === 'five_hour') (u['5h'] = r.percentUsed), (u.renueva5h = r.resetsAt ?? null)
    }
  } catch {
    // sin datos de uso (API key, gateway): el modelo usa get_usage
  }
  return u
}

const nombreVentana = (v: Ventana) => (v === '5h' ? 'de las 5 h' : 'semanal')

// lo de abajo se pierde en una recarga del mod: el turno siguiente lo vuelve a armar
let timer: { cancel(): void } | null = null
let pedido: number | null = null // minutos que pidió el modelo con accion "despertar"

function cancelar() {
  timer?.cancel()
  timer = null
}

function armar($: any, minutos: number) {
  cancelar()
  timer = $.clock.after(minutos * 60_000, () => despertar($))
}

async function despertar($: any) {
  timer = null
  if (!(await read($, modo)).on) return
  if (await read($, trabajando)) return armar($, 5) // en medio de un turno: más tarde
  void $.prompt.submit({ text: SEGUIR })
}

// botón: prender = deja escrita la frase con el último tope (si todavía está adelante) o el uso actual + 10;
// apagar = al instante
async function alternar($: any) {
  const m = await read($, modo)
  if (m.on) {
    await update($, modo, x => ({ ...x, on: false }))
    cancelar()
    void $.prompt.submit({ text: 'Pará el modo automático (lo apagué con el botón). No arranques más tareas.' })
    return
  }
  const ventana: Ventana = (await $.store.get('ventana')) === '5h' ? '5h' : 'semanal'
  const ahora = (await uso($))[ventana] ?? 0
  const ultimo = Number(await $.store.get('tope'))
  const tope = ultimo > ahora ? ultimo : Math.min(100, Math.ceil(ahora) + 10)
  // se escribe en el cuadro y Nacho aprieta Enter: la app solo deja abrir ventanas en turnos que él mandó
  await $.prompt.fill({ text: `Seguí en automático hasta ${tope} % ${nombreVentana(ventana)}` })
  $.ui.toast('Modo automático: revisá el tope y apretá Enter')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'automatico',
      description:
        'Estado del modo automático de Nacho (skill automatico). accion: "activar" (tope 1-100 y ventana "semanal"|"5h"), ' +
        '"desactivar", "estado" (devuelve si está prendido, tope, tarea en curso y uso actual), "tarea" (anota la tarea ' +
        'en curso y el id de su sesión; sin tarea la borra), "despertar" (minutos: el mod manda "seguí" a esta ventana ' +
        'cuando pasen, si sigue quieta). Mirá "estado" antes de arrancar cada tarea: el botón puede haberlo apagado.',
      inputSchema: {
        type: 'object',
        properties: {
          accion: { type: 'string', enum: ['activar', 'desactivar', 'estado', 'tarea', 'despertar'] },
          tope: { type: 'number', minimum: 1, maximum: 100 },
          ventana: { type: 'string', enum: ['semanal', '5h'] },
          tarea: { type: 'string' },
          sesion: { type: 'string' },
          minutos: { type: 'number', minimum: 1, maximum: 600 },
        },
        required: ['accion'],
      },
      isDeferred: true,
    })

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === TOOL) {
      const inp = (e.input ?? {}) as { accion?: string; tope?: number; ventana?: string; tarea?: string; sesion?: string; minutos?: number }
      const responder = async (extra: Record<string, unknown> = {}) =>
        ({ result: JSON.stringify({ ...(await read($, modo)), uso: await uso($), ...extra }) }) as never

      switch (inp.accion) {
        case 'activar': {
          const tope = Number(inp.tope)
          if (!(tope >= 1 && tope <= 100)) return { deny: 'Falta el tope (1-100).' }
          const ventana: Ventana = inp.ventana === '5h' ? '5h' : 'semanal'
          await update($, modo, x => ({ ...x, on: true, tope, ventana }))
          await $.store.set('tope', tope)
          await $.store.set('ventana', ventana)
          return responder()
        }
        case 'desactivar':
          await update($, modo, x => ({ ...x, on: false, tarea: null, sesion: null }))
          cancelar()
          pedido = null
          return responder()
        case 'estado':
          return responder()
        case 'tarea':
          await update($, modo, x => ({ ...x, tarea: inp.tarea || null, sesion: inp.tarea ? inp.sesion || null : null }))
          return responder()
        case 'despertar': {
          const min = Number(inp.minutos)
          if (!(min >= 1 && min <= 600)) return { deny: 'minutos entre 1 y 600.' }
          pedido = min
          return responder({ despierto_en_minutos: min })
        }
        default:
          return { deny: 'accion: activar, desactivar, estado, tarea o despertar.' }
      }
    }

    // freno: modo apagado → no arranca más tareas encadenadas
    if (e.tool === 'mcp__ccd_session__start_session') {
      const nombre = String((e.input as { name?: string } | undefined)?.name ?? '')
      const prendido = await read($, modo).then(m => m.on).catch(() => true) // sin estado: no frenar nada
      if (nombre.startsWith('auto-') && !prendido) {
        return { deny: 'El modo automático está apagado (botón o pedido de Nacho): no arranco más tareas.' }
      }
    }

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if ((e as { agentId?: string }).agentId === undefined) {
      cancelar()
      await update($, trabajando, () => true)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if ((e as { agentId?: string }).agentId !== undefined) return done
    await update($, trabajando, () => false)
    if ((await read($, modo)).on) armar($, pedido ?? VIGIA_MIN)
    pedido = null

    return done
  })

  // botón sobre el cuadro de texto, en la misma fila que lo de otros mods (barra de uso, semáforo)
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await Promise.resolve(next(e)).catch(() => null)
    if (e.props.hasSurvey) return below ?? next(e)
    const { Box, Button } = $.ui.resolve(e)
    const m = await read($, modo)
    const label = m.on
      ? `🤖 Auto ON · ${(await uso($))[m.ventana] ?? '?'}/${m.tope} % ${m.ventana === '5h' ? '5 h' : 'sem.'}`
      : '🤖 Automático'

    return (
      <Box>
        {below}
        <Button key="automatico-toggle" label={label} onPress={() => alternar($)} />
      </Box>
    )
  })
}
