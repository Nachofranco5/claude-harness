import { expect, test } from 'claude-code/testing'

import { archivosPorcelain, armarTablero, avisoAutomejora, contarPruebas, lineaErrores, lineaResumen, resumenPlanes, tareas } from './tablero'
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

test('resumen de pendientes: lo cuenta, o avisa que falta si hay tareas pendientes', () => {
  const res = '# Todo lo pendiente\n## Importante (en orden)\n1. **T41** · algo\n2. **T58c** · otra\n## Superfluo\n- **T9** · x\n'
  expect(lineaResumen(res, true)).toMatch(/RESUMEN-pendientes\.md` \(3 tareas\)/)
  expect(lineaResumen(undefined, true)).toMatch(/Falta/)
  expect(lineaResumen(undefined, false)).toBeUndefined()
  expect(armarTablero({ planes: [{ nombre: 'PLAN-demo.md', texto: PLAN, mtimeMs: 1 }] })).toMatch(/Falta `docs\/RESUMEN/)
  expect(armarTablero({ planes: [{ nombre: 'PLAN-demo.md', texto: PLAN, mtimeMs: 1 }], resumen: res })).toMatch(/3 tareas/)
})
