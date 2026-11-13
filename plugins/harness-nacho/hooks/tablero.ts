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

// Cola por lotes (regla «Lotes»): la tabla `| Lote | Tareas | … | Modelo | Código |` de la cabecera del plan.
// Jarvis 11/11: el tablero mostraba TAREAS en orden de archivo (proponía una de Superfluo) y la tarjeta abría
// «la tarea A9» sola aunque A9 y T60c tocaban el mismo código → lo que manda es la cola, y se abre el LOTE.
export type Lote = { id: string; marca: '⬜' | '🟡' | '✅'; tareas: string[]; pendientes: string[]; modelo?: string; codigo: string[]; aparte: boolean }
const RE_ID_TAREA = /\b([A-Z]{1,3}\d+[a-z0-9]*)\b(\s*✅)?/gu
const celdas = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())

export function lotes(texto: string): { lotes: Lote[]; conCodigo: boolean } | undefined {
  const lineas = texto.split(/\r?\n/)
  const i = lineas.findIndex(l => /^\|\s*Lote\s*\|/iu.test(l))
  if (i < 0) return undefined
  const cab = celdas(lineas[i]).map(c => c.toLowerCase())
  const col = (re: RegExp) => cab.findIndex(c => re.test(c))
  const cT = col(/^tareas/u), cM = col(/^modelo/u), cC = col(/^c[oó]digo/u)
  const out: Lote[] = []
  for (const l of lineas.slice(i + 1)) {
    if (!l.trim().startsWith('|')) break
    const c = celdas(l)
    // Jarvis 13/11: «**L9** 🟡 (seguir: ver ⏸ de A8)» no se leía (texto después de la marca) y el tablero salteaba el
    // lote a medias: decía «Próximo LOTE: L13».
    const m = /^\*{0,2}(L[\w.-]*?)\*{0,2}\s*(⬜|🟡|✅)?(?:\s.*)?$/u.exec(c[0] ?? '')
    if (!m) continue
    const celdaT = (c[cT >= 0 ? cT : 1] ?? '').replace(/\(.*?\)/gu, '')
    const ids = [...celdaT.matchAll(RE_ID_TAREA)]
    const tareasL = ids.map(x => x[1])
    const pendientes = ids.filter(x => !x[2]).map(x => x[1])
    const marca = (m[2] as Lote['marca'] | undefined) ?? (pendientes.length ? '⬜' : '✅')
    const celdaC = cC >= 0 ? c[cC] ?? '' : ''
    out.push({
      id: m[1], marca, tareas: tareasL, pendientes,
      modelo: cM >= 0 ? c[cM] : undefined,
      codigo: celdaC.replace(/\(.*?\)/gu, '').split(/[·,;]/u).map(s => s.replace(/[`*]/g, '').trim().toLowerCase()).filter(s => s && !/^aparte/u.test(s)),
      // Jarvis 13/11: «(aparte: modelo nuevo)» sacaba del control a T56, que tocaba la voz igual que N2. Solo vale con un
      // motivo de ≥ 3 palabras que diga POR QUÉ no se puede juntar.
      aparte: /aparte\s*:\s*\S+(?:\s+\S+){2,}/iu.test(celdaC),
    })
  }
  return { lotes: out, conCodigo: cC >= 0 }
}

// ¿Dos entradas de «Código» tocan lo mismo? Igual, una carpeta y algo adentro (`voz/` y `voz/oido.py`), o el mismo
// archivo nombrado con y sin carpeta (`partidos.py` y `sistema/partidos.py`). Jarvis 13/11: comparaba texto exacto y
// `voz/` no chocaba con `voz/oido.py`.
export function tocan(a: string, b: string): boolean {
  const x = a.replace(/^\.\//u, ''), y = b.replace(/^\.\//u, '')
  if (x === y) return true
  const esRuta = (p: string) => /[\/.]/u.test(p) && !/\s/u.test(p)
  if (!esRuta(x) || !esRuta(y)) return false
  const dentro = (dir: string, p: string) => dir.endsWith('/') && (p.startsWith(dir) || p.includes(`/${dir}`))
  const mismoArchivo = (corta: string, larga: string) => larga.endsWith(`/${corta}`)   // con o sin `src/<paquete>/`
  return dentro(x, y) || dentro(y, x) || mismoArchivo(x, y) || mismoArchivo(y, x)
}

// Dos lotes pendientes que tocan lo mismo = una ventana de más (relee contexto y repite la suite).
// `conAparte`: los choques donde uno de los dos dice «aparte: motivo» (no son error, pero se muestran para revisarlos:
// Jarvis 13/11, «aparte» escondía que T56 y N2 usaban la misma grabación de tu voz).
export function solapes(ls: Lote[], conAparte = false): string[] {
  const vivos = ls.filter(l => l.marca !== '✅')
  const out: string[] = []
  for (let a = 0; a < vivos.length; a++)
    for (let b = a + 1; b < vivos.length; b++) {
      if ((vivos[a].aparte || vivos[b].aparte) !== conAparte) continue
      const comun = vivos[a].codigo.filter(x => vivos[b].codigo.some(y => tocan(x, y)))
      if (comun.length) out.push(`${vivos[a].id} y ${vivos[b].id} (${comun.slice(0, 3).join(', ')})`)
    }
  return out
}

// `docs/RESUMEN-pendientes.md` (el control de Nacho) dice los lotes TAL CUAL la cola: mismo id, mismas tareas
// pendientes, mismo orden (Nacho, 2026-11-13). Líneas `N. **L9 · A8** · …` de la parte de arriba (antes de «Superfluo»).
export function difResumen(resumen: string, cola: Lote[]): string[] {
  const arriba = resumen.split(/^##\s+(?:Superfluo|En pausa)/imu)[0] ?? ''
  const res = [...arriba.matchAll(/^\s*\d+\w*[.)]\s+\*\*(L[\w.-]+)\s*((?:·[^*]*)?)\*\*/gmu)]
    .map(m => ({ id: m[1], tareas: m[2].split('·').map(s => s.trim()).filter(Boolean) }))
  const pend = cola.filter(l => l.marca !== '✅')
  const out: string[] = []
  const faltan = pend.filter(l => !res.some(r => r.id === l.id)).map(l => l.id)
  if (faltan.length) out.push(`faltan ${faltan.join(', ')}`)
  const sobran = res.filter(r => !pend.some(l => l.id === r.id)).map(r => r.id)
  if (sobran.length) out.push(`sobran ${sobran.join(', ')} (hechos o fuera de la cola)`)
  for (const r of res) {
    const l = pend.find(x => x.id === r.id)
    const deberia = l ? (l.pendientes.length ? l.pendientes : l.tareas) : []
    if (l && deberia.join(' · ') !== r.tareas.join(' · '))
      out.push(`${r.id} dice «${r.tareas.join(' · ')}» y la cola «${deberia.join(' · ')}»`)
  }
  const orden = res.map(r => r.id).filter(id => pend.some(l => l.id === id))
  const esperado = pend.map(l => l.id).filter(id => orden.includes(id))
  if (orden.join() !== esperado.join()) out.push(`otro orden (la cola: ${esperado.join(' → ')})`)
  return out
}

function resumenCola(cola: { lotes: Lote[]; conCodigo: boolean }): string[] | undefined {
  const pend = cola.lotes.filter(l => l.marca !== '✅')
  if (!pend.length) return undefined
  const prox = pend.find(l => l.marca === '🟡') ?? pend[0]
  const nombre = (l: Lote) => `${l.id} (${(l.pendientes.length ? l.pendientes : l.tareas).join(' · ')})`
  const out = [`  - Próximo LOTE: ${nombre(prox)}${prox.modelo ? ` — ${prox.modelo}` : ''}.` +
    (pend.length > 1 ? ` Después: ${pend.filter(l => l !== prox).slice(0, 3).map(nombre).join(', ')}.` : '') +
    ' Se hace el LOTE entero en una ventana (también si piden una sola de sus tareas); tarjeta/prompt = «Hacé el lote …».']
  if (!cola.conCodigo && pend.length > 1)
    out.push('  - ⚠️ La cola no tiene columna «Código» (qué archivos/áreas toca cada lote): sumarla; sin ella no se ve qué lotes juntar.')
  const s = solapes(cola.lotes)
  if (s.length)
    out.push(`  - ⚠️ Lotes pendientes que tocan el mismo código: ${s.slice(0, 3).join('; ')}${s.length > 3 ? ` (+${s.length - 3})` : ''}. Juntarlos en uno, o escribir «aparte: <por qué no entran en la misma ventana>» en su Código.`)
  const ap = solapes(cola.lotes, true)
  if (ap.length)
    out.push(`  - Chocan pero dicen «aparte» (revisar que el motivo siga valiendo): ${ap.slice(0, 3).join('; ')}${ap.length > 3 ? ` (+${ap.length - 3})` : ''}.`)
  return out
}

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
    const cola = lotes(p.texto)
    const lineasCola = cola && resumenCola(cola)
    if (lineasCola) {
      // Con cola por lotes, el orden lo da la cola (no el del archivo).
      out.push(`- \`docs/${p.nombre}\`: ${hechas}/${p.ts.length} tareas hechas.`, ...lineasCola)
      for (const t of medias) if (t.nota) out.push(`  - ${corto(t.titulo)}: ${t.nota}`)
      if (pausadas.length) out.push(`  - En pausa por decisión tuya: ${pausadas.map(t => corto(t.titulo)).join(', ')}.`)
      continue
    }
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

// Novedades para Claude Code que juntó scripts/buscar_novedades.py (sin LLM, una vez por semana, en segundo plano).
// Nacho encontró TokenEconomizer en YouTube antes que /automejora (2026-11-01): ahora la lista llega sola.
export function lineaNovedades(texto: string | undefined): string | undefined {
  const n = (texto ?? '').split(/\r?\n/).filter(l => l.startsWith('- ')).length
  return n ? `- 🔧 Novedades para Claude Code: ${n} candidatas nuevas (GitHub, Hacker News, changelog…) → ofrecerle a Nacho \`/harness-nacho:automejora\` (lee solo esa lista).` : undefined
}

// Control de Nacho: docs/RESUMEN-pendientes.md = una línea por tarea pendiente de todos los planes.
export function lineaResumen(texto: string | undefined, hayPendientes: boolean): string | undefined {
  if (texto === undefined) return hayPendientes
    ? '- ⚠️ Falta `docs/RESUMEN-pendientes.md` (el control de Nacho): crearlo con una línea por cada tarea ⬜/🟡 de los planes, en orden de valor (regla «Resumen de pendientes»).'
    : undefined
  const n = texto.split(/\r?\n/).filter(l => /^\s*(?:\d+[.)]|[-*])\s+\*\*/u.test(l)).length
  return `- Control de Nacho: \`docs/RESUMEN-pendientes.md\` (${n} tareas). Tarea nueva → sumar su línea; tarea ✅ → borrarla.`
}

// Errores que la app anotó sola (regla «La app anota sus errores»): cada uno es `## [id] tipo · mensaje`.
export type Errores = { texto?: string; archivo: string; resolver?: string }
const GRAVES = new Set(['caida', 'excepcion', 'error'])

export function lineaErrores(e?: Errores): string | undefined {
  if (!e || e.texto === undefined) return undefined
  const cabezas = e.texto.split(/\r?\n/).map(l => l.match(/^## \[([0-9a-f]+)\]\s+(\S+)/i)).filter(Boolean) as RegExpMatchArray[]
  if (!cabezas.length) return undefined
  const porTipo = new Map<string, number>()
  for (const c of cabezas) porTipo.set(c[2], (porTipo.get(c[2]) ?? 0) + 1)
  const graves = cabezas.filter(c => GRAVES.has(c[2].toLowerCase())).length
  const volvieron = (e.texto.match(/\*\*VOLVI[ÓO]\*\*/g) ?? []).length
  const detalle = [...porTipo].map(([t, n]) => `${t} ${n}`).join(', ')
  return `- 🐞 Errores de la app sin resolver: ${cabezas.length} (${detalle}) en \`${e.archivo}\`` +
    (volvieron ? ` · ⚠️ ${volvieron} VOLVIERON después de darse por arreglados` : '') +
    (graves ? '. Ofrecerle a Nacho arreglarlos ANTES de la próxima tarea (leer solo los que tocan; cada uno es una CLASE)' : '. Solo avisos: mirarlos si la tarea toca esas áreas') +
    (e.resolver ? `; al arreglar uno: \`${e.resolver}\`.` : '.')
}

export const TANDA_PRUEBAS = 6

// Lo que se carga en CADA ventana se mide en peso, no en líneas: el CLAUDE.md de Jarvis cumplía «≤ 100 líneas» con
// 22 KB (~7k tokens en cada ventana, coordinadoras incluidas; 2026-11-03).
export const TOPE_KB = { claudeMd: 12, reglas: 21 }

export function lineaPeso(d: { claudeMd?: string; reglas?: string }): string | undefined {
  const kb = (t?: string) => (t === undefined ? 0 : Math.round(new TextEncoder().encode(t).length / 1024))
  const pesados: string[] = []
  if (kb(d.claudeMd) > TOPE_KB.claudeMd) pesados.push(`\`CLAUDE.md\` ${kb(d.claudeMd)} KB (tope ${TOPE_KB.claudeMd})`)
  if (kb(d.reglas) > TOPE_KB.reglas) pesados.push(`reglas del harness ${kb(d.reglas)} KB (tope ${TOPE_KB.reglas})`)
  return pesados.length
    ? `- ⚖️ Pesa de más lo que se carga en CADA ventana: ${pesados.join(', ')} → ofrecerle a Nacho \`/harness-nacho:podar\` (el detalle pasa a \`.claude/rules/\` con \`paths:\`).`
    : undefined
}

export function armarTablero(d: { planes: Plan[]; pruebas?: string; resumen?: string; git?: Git; uso?: Uso[]; ahora?: number; avisos?: string[]; automejora?: string; errores?: Errores; novedades?: string; claudeMd?: string; reglas?: string }): string {
  // Con novedades a la vista alcanza con esa línea: también ofrece /automejora.
  const mejora = lineaNovedades(d.novedades) ?? avisoAutomejora(d.automejora, d.ahora ?? Date.now())
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
  const conCola = d.planes.map(p => lotes(p.texto)).find(c => c && c.lotes.some(l => l.marca !== '✅'))
  const dif = d.resumen !== undefined && conCola ? difResumen(d.resumen, conCola.lotes) : []
  if (dif.length)
    lineas.push(`  - ⚠️ El resumen no es igual a la cola: ${dif.slice(0, 4).join('; ')}${dif.length > 4 ? ` (+${dif.length - 4})` : ''}. Corregirlo YA (una línea por lote, «N. **Lx · T1 · T2** · qué gana»).`)
  const n = contarPruebas(d.pruebas)
  if (n !== undefined) lineas.push(`- Pruebas pendientes de Nacho: ${n} (\`docs/PRUEBAS-PENDIENTES.md\`).`)
  // Jarvis 21–29/10: con 6–8 pruebas atrasadas, 17 de 41 versiones arreglaron algo ya «hecho»: se construía encima sin probar.
  // Nacho 2026-11-12: las pruebas NO frenan la cola (le dan fiaca y trababan todo): se sigue y se ofrecen en UNA línea al cierre.
  if (n !== undefined && n >= TANDA_PRUEBAS) lineas.push(`  - ${n} ≥ ${TANDA_PRUEBAS}: NO frenan la cola (Nacho, 2026-11-12). Seguir con el lote; al cierre, una línea ofreciendo la tanda (sin insistir).`)
  const err = lineaErrores(d.errores)
  if (err) lineas.push(err)
  const peso = lineaPeso(d)
  if (peso) lineas.push(peso)
  lineas.push('Si Nacho pide "la próxima tarea", es el lote (o la tarea) de arriba: leer SOLO esos rangos del plan.')
  return lineas.join('\n')
}
