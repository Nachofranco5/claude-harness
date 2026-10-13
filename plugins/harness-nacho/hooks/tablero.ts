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
    const medias = pend.filter(t => t.marca === '🟡')
    const prox = medias[0] ?? pend[0]
    out.push(`- \`docs/${p.nombre}\`: ${hechas}/${p.ts.length} hechas. ` +
      `${prox.marca === '🟡' ? 'A MEDIAS' : 'Próxima'}: «${prox.titulo}» (línea ${prox.linea}).` +
      (pend.length > 1 ? ` Después: ${pend.filter(t => t !== prox).slice(0, 4).map(t => corto(t.titulo)).join(', ')}.` : ''))
    for (const t of medias) if (t.nota) out.push(`  - ${corto(t.titulo)}: ${t.nota}`)
  }
  if (vivos.length > MAX_PLANES) out.push(`- (+${vivos.length - MAX_PLANES} planes más con pendientes)`)
  return out
}

const corto = (titulo: string) => titulo.split(/\s+[—-]\s+/u)[0]

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

export function armarTablero(d: { planes: Plan[]; pruebas?: string; git?: Git; uso?: Uso[]; ahora?: number; avisos?: string[] }): string {
  const lineas = [
    'Estado del proyecto al abrir esta ventana (lo calcula el plugin harness-nacho; no hace falta releerlo):',
    ...(d.avisos ?? []),
    ...resumenPlanes(d.planes),
    ...resumenGit(d.git),
    ...resumenUso(d.uso, d.ahora ?? Date.now()),
  ]
  const n = contarPruebas(d.pruebas)
  if (n !== undefined) lineas.push(`- Pruebas pendientes de Nacho: ${n} (\`docs/PRUEBAS-PENDIENTES.md\`).`)
  lineas.push('Si Nacho pide "la próxima tarea", es la de arriba: leer SOLO ese rango del plan.')
  return lineas.join('\n')
}
