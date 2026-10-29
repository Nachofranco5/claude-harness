// Tablero: lo que la IA necesita saber al arrancar, sin leer archivos.
// Funciones puras (sin $) para poder probarlas solas.

export type Plan = { nombre: string; texto: string; mtimeMs: number }
export type Git = {
  rama?: string
  ultimo?: string
  sinCommit?: string[]
  sinPush?: number
}
type Tarea = { linea: number; titulo: string; marca: '⬜' | '🟡' | '✅'; nota?: string }

const RE_TAREA = /^#{2,4}\s+(.*?)\s*(⬜|🟡|✅)/u
const RE_CORTE = /^>\s*⏸/u
const MAX_PLANES = 3
const MAX_ARCHIVOS = 8

export function tareas(texto: string): Tarea[] {
  const out: Tarea[] = []
  const lineas = texto.split(/\r?\n/)
  lineas.forEach((l, i) => {
    const m = RE_TAREA.exec(l)
    if (m) {
      out.push({ linea: i + 1, titulo: m[1].replace(/\s+$/, ''), marca: m[2] as Tarea['marca'] })
      return
    }
    const ult = out[out.length - 1]
    if (ult && !ult.nota && RE_CORTE.test(l)) ult.nota = l.replace(/^>\s*/, '').trim()
  })
  return out
}

const cerrado = (texto: string) => /\(cerrado\)|✅/u.test(texto.split(/\r?\n/, 1)[0] ?? '')

export function resumenPlanes(planes: Plan[]): string[] {
  const vivos = planes
    .filter(p => !cerrado(p.texto))
    .map(p => ({ ...p, ts: tareas(p.texto) }))
    .filter(p => p.ts.some(t => t.marca !== '✅'))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
  if (vivos.length === 0) return ['- Planes: ninguna tarea pendiente en `docs/PLAN-*.md`.']
  const out: string[] = []
  for (const p of vivos.slice(0, MAX_PLANES)) {
    const pend = p.ts.filter(t => t.marca !== '✅')
    const hechas = p.ts.length - pend.length
    // Pausada por decisión de Nacho: no es "lo próximo" ni gasta líneas con su nota.
    const pausadas = pend.filter(pausada)
    const activas = pend.filter(t => !pausada(t))
    const medias = activas.filter(t => t.marca === '🟡')
    const prox = medias[0] ?? activas[0]
    out.push(`- \`docs/${p.nombre}\`: ${hechas}/${p.ts.length} hechas. ` + (prox
      ? `${prox.marca === '🟡' ? 'A MEDIAS' : 'Próxima'}: «${prox.titulo}» (línea ${prox.linea}).` +
        (activas.length > 1 ? ` Después: ${activas.filter(t => t !== prox).slice(0, 4).map(t => corto(t.titulo)).join(', ')}.` : '')
      : 'Todo lo pendiente está en pausa.'))
    for (const t of medias) if (t.nota) out.push(`  - ${corto(t.titulo)}: ${t.nota}`)
    if (pausadas.length) out.push(`  - En pausa por decisión tuya: ${pausadas.map(t => corto(t.titulo)).join(', ')}.`)
  }
  if (vivos.length > MAX_PLANES) out.push(`- (+${vivos.length - MAX_PLANES} planes más con pendientes)`)
  return out
}

const corto = (titulo: string) => titulo.split(/\s+[—-]\s+/u)[0]
const pausada = (t: Tarea) => !!t.nota && /^⏸\s*EN PAUSA/iu.test(t.nota)

export function contarPruebas(texto?: string): number | undefined {
  if (texto === undefined) return undefined
  return texto.split(/\r?\n/).filter(l => /^\s*(?:#{1,6}\s+)?(?:(?:\d+[.)]|[-*])\s+)?(?:⬜|\[ \])/u.test(l)).length
}

// Líneas de `git status --porcelain` ("XY ruta", "XY viejo -> nuevo") → rutas.
export function archivosPorcelain(salida?: string): string[] {
  return (salida ?? '').split(/\r?\n/)
    .map(l => /^.. (.+)$/.exec(l)?.[1])
    .filter((r): r is string => !!r)
    .map(r => r.replace(/^.* -> /, '').replace(/^"(.*)"$/, '$1'))
}

export function resumenGit(g?: Git): string[] {
  if (!g || !g.rama) return ['- Git: no es un repo (o git no está).']
  const out = [`- Git: rama \`${g.rama}\`. Último commit: ${g.ultimo ?? '(ninguno)'}`]
  const sc = g.sinCommit ?? []
  if (sc.length) {
    const lista = sc.slice(0, MAX_ARCHIVOS).join(', ')
    out.push(`- ⚠️ Sin commitear (${sc.length}): ${lista}${sc.length > MAX_ARCHIVOS ? '…' : ''}`)
  } else out.push('- Sin cambios sin commitear.')
  if (g.sinPush) out.push(`- ⚠️ ${g.sinPush} commit(s) sin push.`)
  return out
}

export type Uso = { kind: string; percentUsed: number; resetsAt?: string }
const NOMBRE_USO: Record<string, string> = { five_hour: '5 h', seven_day: 'semanal' }

export function falta(iso: string | undefined, ahora: number): string {
  if (!iso) return ''
  const min = Math.max(0, Math.round((Date.parse(iso) - ahora) / 60000))
  if (Number.isNaN(min)) return ''
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
  return ` (reinicia en ${d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`})`
}

export function resumenUso(uso: Uso[] | undefined, ahora: number): string[] {
  const ls = (uso ?? []).filter(u => NOMBRE_USO[u.kind])
  if (!ls.length) return []
  const alerta = ls.some(u => u.percentUsed >= 80) ? ' ⚠️ viene justo: avisar a Nacho antes de algo largo.' : ''
  return [`- Uso del plan al abrir: ${ls.map(u => `${NOMBRE_USO[u.kind]} ${u.percentUsed} %${falta(u.resetsAt, ahora)}`).join(' · ')}.${alerta}`]
}

// Recordatorio de /automejora: la cabecera de docs/AUTOMEJORA.md del harness dice la última pasada.
export function avisoAutomejora(texto: string | undefined, ahora: number, dias = 7): string | undefined {
  if (texto === undefined) return undefined // sin el repo del harness a mano: no molestar
  const m = texto.match(/[ÚU]ltima pasada:\s*(\d{4}-\d{2}-\d{2})/)
  if (!m) return '- 🔧 Automejora: nunca se corrió → ofrecerle a Nacho `/harness-nacho:automejora` (novedades y mejoras).'
  const d = Math.floor((ahora - Date.parse(`${m[1]}T00:00:00Z`)) / 86_400_000)
  return d > dias ? `- 🔧 Automejora: última pasada hace ${d} días → ofrecerle a Nacho \`/harness-nacho:automejora\`.` : undefined
}

// Control de Nacho: docs/RESUMEN-pendientes.md = una línea por tarea pendiente de todos los planes.
export function lineaResumen(texto: string | undefined, hayPendientes: boolean): string | undefined {
  if (texto === undefined) return hayPendientes
    ? '- ⚠️ Falta `docs/RESUMEN-pendientes.md` (el control de Nacho): crearlo con una línea por cada tarea ⬜/🟡 de los planes, en orden de valor (regla «Resumen de pendientes»).'
    : undefined
  const n = texto.split(/\r?\n/).filter(l => /^\s*(?:\d+[.)]|[-*])\s+\*\*/u.test(l)).length
  return `- Control de Nacho: \`docs/RESUMEN-pendientes.md\` (${n} tareas). Tarea nueva → sumar su línea; tarea ✅ → borrarla.`
}

export const TANDA_PRUEBAS = 6

export function armarTablero(d: { planes: Plan[]; pruebas?: string; resumen?: string; git?: Git; uso?: Uso[]; ahora?: number; avisos?: string[]; automejora?: string }): string {
  const mejora = avisoAutomejora(d.automejora, d.ahora ?? Date.now())
  const lineas = [
    'Estado del proyecto al abrir esta ventana (lo calcula el plugin harness-nacho; no hace falta releerlo):',
    ...(d.avisos ?? []),
    ...(mejora ? [mejora] : []),
    ...resumenPlanes(d.planes),
    ...resumenGit(d.git),
    ...resumenUso(d.uso, d.ahora ?? Date.now()),
  ]
  const res = lineaResumen(d.resumen, d.planes.some(p => !cerrado(p.texto) && tareas(p.texto).some(t => t.marca !== '✅')))
  if (res) lineas.push(res)
  const n = contarPruebas(d.pruebas)
  if (n !== undefined) lineas.push(`- Pruebas pendientes de Nacho: ${n} (\`docs/PRUEBAS-PENDIENTES.md\`).`)
  // Jarvis 21–29/10: con 6–8 pruebas atrasadas, 17 de 41 versiones arreglaron algo ya «hecho»: se construía encima sin probar.
  if (n !== undefined && n >= TANDA_PRUEBAS) lineas.push(`  - ⚠️ ${n} ≥ ${TANDA_PRUEBAS}: ofrecerle a Nacho la tanda de pruebas ANTES de la próxima tarea (lo nuevo se apoya en lo que no probó).`)
  lineas.push('Si Nacho pide "la próxima tarea", es la de arriba: leer SOLO ese rango del plan.')
  return lineas.join('\n')
}
