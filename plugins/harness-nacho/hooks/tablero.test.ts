import { expect, test } from 'claude-code/testing'

import { armarTablero, contarPruebas, resumenPlanes, tareas } from './tablero'

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

test('sin planes pendientes lo dice', async () => {
  expect(resumenPlanes([]).join('')).toMatch(/ninguna tarea pendiente/)
})

test('cuenta solo pruebas pendientes', async () => {
  const txt = 'Marcas: ⬜ = falta\n1. ⬜ **Probar A**\n2. ✅ B\n- ⬜ C\n- [ ] D\n- [x] E'
  // la leyenda ("Marcas: ⬜ ...") no cuenta: no empieza con la marca
  expect(contarPruebas(txt)).toBe(3)
  expect(contarPruebas(undefined)).toBeUndefined()
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
})

test('sin git no rompe', async () => {
  expect(armarTablero({ planes: [] })).toMatch(/no es un repo/)
})
