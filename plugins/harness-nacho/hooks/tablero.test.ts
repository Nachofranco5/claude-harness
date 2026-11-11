import { expect, test } from 'claude-code/testing'

import { archivosPorcelain, armarTablero, avisoAutomejora, contarPruebas, lineaErrores, lineaNovedades, lineaPeso, lineaResumen, lotes, resumenPlanes, solapes, tareas, TOPE_KB } from './tablero'
import { leerConfig } from './guardianes'

const ERRORES = [
  '# Errores de Jarvis sin resolver', '', 'Pendientes: **3**', '',
  '## [a1b2c3d4] caida · Jarvis se cerró solo', '', '- Veces: **1**', '',
  '## [0f0f0f0f] excepcion · KeyError: x', '', '- ⚠ **VOLVIÓ**: se había dado por arreglado', '',
  '## [12345678] aviso · ⚠ No pude cargar la voz', '',
].join('\n')

test('errores de la app: cuenta por tipo, avisa los que volvieron y pide arreglarlos antes', async () => {
  const l = lineaErrores({ texto: ERRORES, archivo: 'errores/ERRORES.md', resolver: 'uv run jarvis --errores resuelto <id>' })!
  expect(l).toMatch(/sin resolver: 3 \(caida 1, excepcion 1, aviso 1\)/)
  expect(l).toMatch(/1 VOLVIERON/)
  expect(l).toMatch(/ANTES de la próxima tarea/)
  expect(l).toMatch(/--errores resuelto <id>/)
  expect(armarTablero({ planes: [], errores: { texto: ERRORES, archivo: 'errores/ERRORES.md' } })).toMatch(/🐞/)
})

test('errores de la app: sin archivo o sin pendientes no suma nada; solo avisos = no apura', async () => {
  expect(lineaErrores({ archivo: 'errores/ERRORES.md' })).toBeUndefined()
  expect(lineaErrores({ texto: '# Errores\n\nNada pendiente.\n', archivo: 'x' })).toBeUndefined()
  const avisos = lineaErrores({ texto: '## [abcdef12] aviso · ⚠ algo\n', archivo: 'x' })!
  expect(avisos).toMatch(/Solo avisos/)
  expect(avisos).not.toMatch(/ANTES/)
})

test('harness.json: errores.archivo por defecto es la convención y se puede cambiar', async () => {
  expect(leerConfig(undefined).errores.archivo).toBe('errores/ERRORES.md')
  const c = leerConfig(JSON.stringify({ errores: { archivo: 'logs/ERR.md', resolver: 'npm run errores -- resuelto' } }))
  expect(c.errores).toEqual({ archivo: 'logs/ERR.md', resolver: 'npm run errores -- resuelto' })
})

const PLAN = [
  '# PLAN demo',
  '## T1 — Primera  ✅ (2026-10-01; hecha)',
  '## T2 — Segunda  🟡',
  '> ⏸ Cortado (2026-10-02): falta el paso 3',
  '## T3 — Tercera  ⬜',
  '### T3a — Sub  ⬜',
].join('\n')

test('lee las tareas y la nota de corte', async () => {
  const ts = tareas(PLAN)
  expect(ts.map(t => t.marca)).toEqual(['✅', '🟡', '⬜', '⬜'])
  expect(ts[1].nota).toMatch(/falta el paso 3/)
  expect(ts[2].linea).toBe(5)
})

test('la tarea a medias va primero; plan cerrado o terminado no aparece', async () => {
  const out = resumenPlanes([
    { nombre: 'PLAN-demo.md', texto: PLAN, mtimeMs: 2 },
    { nombre: 'PLAN-viejo.md', texto: '# PLAN viejo (cerrado)\n## T9 — x  ⬜', mtimeMs: 3 },
    { nombre: 'PLAN-listo.md', texto: '# PLAN listo\n## T1 — x  ✅', mtimeMs: 4 },
  ]).join('\n')
  expect(out).toMatch(/PLAN-demo\.md`: 1\/4 hechas\. A MEDIAS: «T2 — Segunda» \(línea 3\)/)
  expect(out).toMatch(/T2: ⏸ Cortado/)
  expect(out).not.toMatch(/viejo|listo/)
})

test('la pausada por decisión no es «A MEDIAS» ni la próxima; va en una línea aparte', async () => {
  const plan = [
    '# PLAN p',
    '## T1 — Nube  🟡',
    '> ⏸ EN PAUSA (2026-10-14): no quiere nube',
    '## T2 — Placa  🟡',
    '> ⏸ Cortado (2026-10-21): falta medir',
    '## T3 — Clima  ⬜',
  ].join('\n')
  const out = resumenPlanes([{ nombre: 'PLAN-p.md', texto: plan, mtimeMs: 1 }]).join('\n')
  expect(out).toMatch(/A MEDIAS: «T2 — Placa» \(línea 4\)\. Después: T3\./)
  expect(out).toMatch(/T2: ⏸ Cortado/)
  expect(out).toMatch(/En pausa por decisión tuya: T1\./)
  expect(out).not.toMatch(/no quiere nube/)
  const soloPausa = resumenPlanes([{ nombre: 'PLAN-q.md', texto: '# q\n## T1 — x  🟡\n> ⏸ EN PAUSA (hoy): y', mtimeMs: 1 }]).join('\n')
  expect(soloPausa).toMatch(/0\/1 hechas\. Todo lo pendiente está en pausa\./)
})

// Jarvis 11/11 (literal): el tablero dijo «Próxima: T34b» (estaba en Superfluo, pero antes en el archivo) y la tarjeta
// abrió «la tarea A9» sola, aunque A9 y T60c tocaban el mismo código.
const PLAN_COLA = [
  '# PLAN j',
  '## Cola por lotes',
  '| Lote | Tareas (mismo código) | Qué gana | Modelo | Código |',
  '|---|---|---|---|---|',
  '| **L6** ✅ | T22 ✅ · T34 ✅ (resto → T34b, tras T3d) | escribir | Opus · alto | `nucleo/dictado.py` |',
  '| **L8b** ⬜ | A9 | orden directa | Opus · alto | `nucleo/router.py` · `nucleo/permisos.py` |',
  '| **L8c** ⬜ | T60c | seguir el hilo | Opus · alto | `nucleo/router.py` · `nucleo/espera.py` |',
  '| **L9** ⬜ | A8 | ensayo | Opus · medio | `nucleo/router.py` (aparte: necesita L8b probado) |',
  '| **L10** 🟡 | I15 ✅ · F1 | ventana | Sonnet · alto | `interfaz/web/` |',
  '',
  '## T34b — Traducir  ⬜',
  '## A9 — Orden directa  ⬜',
  '## T60c — Hilo  ⬜',
].join('\n')

test('cola por lotes: lee lotes, tareas pendientes, modelo y código', async () => {
  const c = lotes(PLAN_COLA)!
  expect(c.conCodigo).toBe(true)
  expect(c.lotes.map(l => l.id)).toEqual(['L6', 'L8b', 'L8c', 'L9', 'L10'])
  expect(c.lotes[0].tareas).toEqual(['T22', 'T34'])
  expect(c.lotes[4].pendientes).toEqual(['F1'])
  expect(c.lotes[1].codigo).toEqual(['nucleo/router.py', 'nucleo/permisos.py'])
  expect(c.lotes[3].aparte).toBe(true)
  expect(lotes('# sin cola\n## T1 — x  ⬜')).toBeUndefined()
})

test('cola por lotes: lo próximo es el LOTE de la cola (a medias primero), no la primera tarea del archivo', async () => {
  const out = resumenPlanes([{ nombre: 'PLAN-j.md', texto: PLAN_COLA, mtimeMs: 1 }]).join('\n')
  expect(out).toMatch(/Próximo LOTE: L10 \(F1\) — Sonnet · alto/)
  expect(out).toMatch(/Después: L8b \(A9\), L8c \(T60c\), L9 \(A8\)/)
  expect(out).toMatch(/Hacé el lote/)
  expect(out).not.toMatch(/T34b/)
})

test('cola por lotes: dos lotes pendientes que tocan el mismo código se avisan; «aparte» no', async () => {
  const out = resumenPlanes([{ nombre: 'PLAN-j.md', texto: PLAN_COLA, mtimeMs: 1 }]).join('\n')
  expect(out).toMatch(/mismo código: L8b y L8c \(nucleo\/router\.py\)\./)
  expect(out).not.toMatch(/L9 \(nucleo/)
  expect(out).not.toMatch(/L6 y/) // un lote hecho no cuenta
  const ls = lotes(PLAN_COLA)!.lotes
  expect(solapes(ls)).toEqual(['L8b y L8c (nucleo/router.py)'])
  // otros temas: carpetas iguales, sin solape, y la cola sin columna Código
  const otra = '| Lote | Tareas | Modelo | Código |\n|---|---|---|---|\n| L1 ⬜ | T1 | Opus | `src/ui/` |\n| L2 ⬜ | T2 | Opus | `src/db.py` |\n| L3 ⬜ | T3 · T4 | Haiku | `src/ui/` · `css/` |'
  expect(solapes(lotes(otra)!.lotes)).toEqual(['L1 y L3 (src/ui/)'])
  const sinCod = resumenPlanes([{ nombre: 'PLAN-s.md', texto: '# s\n| Lote | Tareas | Modelo |\n|---|---|---|\n| L1 ⬜ | T1 | Opus |\n| L2 ⬜ | T2 | Opus |\n## T1 — a  ⬜\n## T2 — b  ⬜', mtimeMs: 1 }]).join('\n')
  expect(sinCod).toMatch(/no tiene columna «Código»/)
})

test('sin planes pendientes lo dice', async () => {
  expect(resumenPlanes([]).join('')).toMatch(/ninguna tarea pendiente/)
})

test('cuenta solo pruebas pendientes', async () => {
  const txt = 'Marcas: ⬜ = falta\n1. ⬜ **Probar A**\n2. ✅ B\n- ⬜ C\n- [ ] D\n- [x] E'
  // la leyenda ("Marcas: ⬜ ...") no cuenta: no empieza con la marca
  expect(contarPruebas(txt)).toBe(3)
  expect(contarPruebas(undefined)).toBeUndefined()
})

test('cuenta pruebas escritas como títulos (formato ordenado)', async () => {
  const txt = `# Pruebas pendientes
## ⬜ 1 · T7d — Despertar
1. Abrí X
## ✅ 2 · hecha
### ⬜ 2a · Sub`
  expect(contarPruebas(txt)).toBe(2)
})

test('tablero completo con git y uso', async () => {
  const t = armarTablero({
    planes: [{ nombre: 'PLAN-demo.md', texto: PLAN, mtimeMs: 1 }],
    pruebas: '- ⬜ a',
    git: { rama: 'main', ultimo: 'abc T1: algo (hace 2 horas)', sinCommit: ['a.py', 'b.js'], sinPush: 1 },
    uso: [{ kind: 'five_hour', percentUsed: 6 }, { kind: 'seven_day', percentUsed: 82, resetsAt: '2026-10-10T12:00:00Z' }],
    ahora: Date.parse('2026-10-09T21:00:00Z'),
  })
  expect(t).toMatch(/rama `main`/)
  expect(t).toMatch(/Sin commitear \(2\): a\.py, b\.js/)
  expect(t).toMatch(/1 commit\(s\) sin push/)
  expect(t).toMatch(/semanal 82 % \(reinicia en 15 h 0 min\)/)
  expect(t).toMatch(/viene justo/)
  expect(t).toMatch(/Pruebas pendientes de Nacho: 1/)
  expect(t).not.toMatch(/tanda de pruebas/)
})

test('con 6 o más pruebas atrasadas, pide la tanda antes de seguir', async () => {
  const pruebas = Array.from({ length: 6 }, (_, i) => `## ⬜ ${i + 1} · T${i} — algo`).join('\n')
  const t = armarTablero({ planes: [], pruebas })
  expect(t).toMatch(/Pruebas pendientes de Nacho: 6/)
  expect(t).toMatch(/tanda de pruebas ANTES de la próxima tarea/)
})

test('git status: no se come la primera letra de la ruta', async () => {
  expect(archivosPorcelain(' M docs/PLAN-v1.37.md\nM  a.py\n?? nuevo.txt\nR  viejo.md -> nuevo.md'))
    .toEqual(['docs/PLAN-v1.37.md', 'a.py', 'nuevo.txt', 'nuevo.md'])
  expect(archivosPorcelain('')).toEqual([])
})

test('sin git no rompe', async () => {
  expect(armarTablero({ planes: [] })).toMatch(/no es un repo/)
})

test('automejora: avisa si nunca se corrió o pasó más de una semana; sin el archivo, nada', () => {
  const ahora = Date.parse('2026-10-21T12:00:00Z')
  expect(avisoAutomejora(undefined, ahora)).toBeUndefined()
  expect(avisoAutomejora('# Automejora\nÚltima pasada: —', ahora)).toMatch(/nunca/)
  expect(avisoAutomejora('Última pasada: 2026-10-18', ahora)).toBeUndefined()
  expect(avisoAutomejora('Última pasada: 2026-10-10', ahora)).toMatch(/hace 11 días/)
  expect(armarTablero({ planes: [], automejora: 'Última pasada: 2026-10-01', ahora })).toMatch(/Automejora/)
})

test('novedades: cuenta las candidatas de pendientes.md y reemplaza el aviso de 7 días', () => {
  const ahora = Date.parse('2026-11-02T12:00:00Z')
  const pend = '## Corrida 2026-11-02 11:58\n### GitHub · para el harness\n- ★4380 · ⚑ microsoft/TokenEconomizer · 2026-10-13 · Cost\n- ★1106 · ⚑ a/b · x\n'
  expect(lineaNovedades(undefined)).toBeUndefined()
  expect(lineaNovedades('## Corrida 2026-11-02\n')).toBeUndefined() // corrida sin nada nuevo
  expect(lineaNovedades(pend)).toMatch(/2 candidatas nuevas/)
  const t = armarTablero({ planes: [], automejora: 'Última pasada: 2026-10-01', novedades: pend, ahora })
  expect(t).toMatch(/Novedades para Claude Code: 2/)
  expect(t).not.toMatch(/última pasada hace/) // una sola línea que ofrece /automejora
  expect(armarTablero({ planes: [], automejora: 'Última pasada: 2026-10-01', ahora })).toMatch(/última pasada hace/)
})

test('peso: lo que se carga en cada ventana se mide en KB, no en líneas (CLAUDE.md y reglas)', () => {
  const kb = (n: number) => 'x'.repeat(n * 1024)
  // el caso que pasó: Jarvis con 95 líneas pero 22 KB
  const jarvis = Array.from({ length: 95 }, () => 'y'.repeat(237)).join('\n')
  expect(lineaPeso({ claudeMd: jarvis })).toMatch(/CLAUDE\.md` 22 KB/)
  expect(lineaPeso({ claudeMd: kb(TOPE_KB.claudeMd) })).toBeUndefined()
  expect(lineaPeso({ reglas: kb(TOPE_KB.reglas + 3) })).toMatch(/reglas del harness/)
  expect(lineaPeso({ claudeMd: '' })).toBeUndefined()
  expect(lineaPeso({})).toBeUndefined() // proyecto sin CLAUDE.md
  // tildes y «» pesan más de un byte: se cuenta en bytes, que es lo que se acerca a los tokens
  expect(lineaPeso({ claudeMd: 'á'.repeat(7 * 1024) })).toMatch(/14 KB/)
  expect(armarTablero({ planes: [], claudeMd: jarvis })).toMatch(/⚖️.*podar/)
})

test('resumen de pendientes: lo cuenta, o avisa que falta si hay tareas pendientes', () => {
  const res = '# Todo lo pendiente\n## Importante (en orden)\n1. **T41** · algo\n2. **T58c** · otra\n## Superfluo\n- **T9** · x\n'
  expect(lineaResumen(res, true)).toMatch(/RESUMEN-pendientes\.md` \(3 tareas\)/)
  expect(lineaResumen(undefined, true)).toMatch(/Falta/)
  expect(lineaResumen(undefined, false)).toBeUndefined()
  expect(armarTablero({ planes: [{ nombre: 'PLAN-demo.md', texto: PLAN, mtimeMs: 1 }] })).toMatch(/Falta `docs\/RESUMEN/)
  expect(armarTablero({ planes: [{ nombre: 'PLAN-demo.md', texto: PLAN, mtimeMs: 1 }], resumen: res })).toMatch(/3 tareas/)
})
