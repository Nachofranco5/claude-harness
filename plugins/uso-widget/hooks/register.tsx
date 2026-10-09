import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'uso-widget', key: 'limits' } as const, [] as Limit[])
const warned = atom({ plugin: 'uso-widget', key: 'warned' } as const, [] as string[])

const NAMES: Record<string, string> = { five_hour: 'Sesión 5h', seven_day: 'Semana' }

const bar = (pct: number) => {
  const full = Math.max(0, Math.min(10, Math.round(pct / 10)))
  return '█'.repeat(full) + '░'.repeat(10 - full)
}

const when = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return ` ↻ ${days[d.getDay()]} ${hh}:${mm}`
}

const color = (pct: number) => (pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green')

async function store($: any, ls: Limit[]) {
    await update($, limits, () => ls)
    for (const l of ls) {
      for (const t of [80, 90]) {
        const k = `${l.kind}:${t}:${l.resetsAt ?? ''}`
        if (l.percentUsed >= t && !(await read($, warned)).includes(k)) {
          await update($, warned, w => [...w, k])
          $.ui.toast(`⚠️ ${NAMES[l.kind] ?? l.kind}: ${l.percentUsed}% usado`, { timeoutMs: 8000 })
        }
      }
    }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    try { await store($, (await $.session.usage()).rateLimits) } catch {}
    return r
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await store($, e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const ls = await read($, limits)
    if (e.props.hasSurvey || ls.length === 0) return next(e)
    const below = await next(e) // lo que dibujen otros mods en la franja (ej. el semáforo): no taparlo
    const { Box, Text } = $.ui.resolve(e)
    return (
      // misma fila: la barra de uso y, en el espacio que sobra a la derecha, lo de otros mods (botón Semáforo)
      <Box>
        {ls.map(l => (
          <Text key={l.kind}>
            <Text dimColor>{NAMES[l.kind] ?? l.kind} </Text>
            <Text color={color(l.percentUsed)}>{bar(l.percentUsed)} {l.percentUsed}%</Text>
            <Text dimColor>{when(l.resetsAt)}   </Text>
          </Text>
        ))}
        {below}
      </Box>
    )
  })
}
