import { expect, test } from 'claude-code/testing'

import {
  avisoVersion, cmpVersion, coincide, contarLineas, decidirCierre, faltaAlCerrar, lecturaSinRango, leerConfig, relativa,
} from './guardianes'

const HJ = JSON.stringify({
  docs_obligatorios: ['CHANGELOG.md', 'docs/PRUEBAS-PENDIENTES.md'],
  manual: { archivo: 'docs/manual/manual.md', rutas: ['ui/'] },
  git: { commit: true, push: true },
})
const cfg = leerConfig(HJ)
const base = { cfg, sucios: [] as string[], hayGit: true }

// ── Puras ──────────────────────────────────────────────────────────────────────
test('config: sin harness.json el de cierre no actúa y el de lectura sí (600)', async () => {
  const c = leerConfig(undefined)
  expect(c.guardianes.cierre).toBe(false)
  expect(c.guardianes.lectura_cara).toBe(true)
  expect(c.archivo_grande).toBe(600)
  expect(leerConfig('{roto').guardianes.cierre).toBe(false)
  expect(leerConfig('{"guardianes":{"cierre":false}}').guardianes.cierre).toBe(false)
  expect(leerConfig('\uFEFF{}').guardianes.cierre).toBe(true) // BOM de PowerShell no rompe
})

test('rutas: relativa al repo y patrones', async () => {
  expect(relativa('C:\\Users\\N\\repo\\app\\api.py', 'C:/Users/N/repo')).toBe('app/api.py')
  expect(relativa('c:\\users\\n\\REPO\\a.py', 'C:/Users/N/repo')).toBe('a.py')
  expect(relativa('C:\\Users\\N\\otro\\a.py', 'C:/Users/N/repo')).toBeUndefined()
  expect(coincide('docs/PLAN-x.md', '*.md')).toBe(true)
  expect(coincide('ui/app.js', 'ui/')).toBe(true)
  expect(coincide('uix/app.js', 'ui/')).toBe(false)
  expect(coincide('ui/app.js', 'ui')).toBe(true)
})

test('cierre: una charla o un plan no se frena', async () => {
  expect(faltaAlCerrar({ ...base, tocados: [] })).toEqual([])
  expect(faltaAlCerrar({ ...base, tocados: ['docs/PLAN-x.md', '.claude/settings.json'], sucios: ['docs/PLAN-x.md'] })).toEqual([])
})

test('cierre: código sin CHANGELOG ni pruebas pendientes ni commit', async () => {
  const f = faltaAlCerrar({ ...base, tocados: ['app/api.py'], sucios: ['app/api.py'] })
  expect(f.join('\n')).toMatch(/CHANGELOG\.md/)
  expect(f.join('\n')).toMatch(/PRUEBAS-PENDIENTES/)
  expect(f.join('\n')).toMatch(/commit \(1 archivo/)
  expect(f.join('\n')).not.toMatch(/manual/) // api.py no es de ui/
})

test('cierre: UI cambiada sin manual lo pide; todo hecho no frena', async () => {
  const docs = ['CHANGELOG.md', 'docs/PRUEBAS-PENDIENTES.md']
  expect(faltaAlCerrar({ ...base, tocados: ['ui/app.js', ...docs] }).join()).toMatch(/manual .*ui\/app\.js/)
  expect(faltaAlCerrar({ ...base, tocados: ['ui/app.js', 'docs/manual/manual.md', ...docs] })).toEqual([])
})

test('cierre: commit hecho pero sin push', async () => {
  const tocados = ['app/a.py', 'CHANGELOG.md', 'docs/PRUEBAS-PENDIENTES.md']
  expect(faltaAlCerrar({ ...base, tocados, sinPush: 2 })).toEqual(['push (2 commit(s) sin subir)'])
  const sinPushCfg = leerConfig(JSON.stringify({ git: { commit: true, push: false } }))
  expect(faltaAlCerrar({ ...base, cfg: sinPushCfg, tocados: ['app/a.py'], sinPush: 2 })).toEqual([])
})

test('cierre: archivos sucios de antes de la sesión no cuentan como sin commitear', async () => {
  const tocados = ['app/a.py', 'CHANGELOG.md', 'docs/PRUEBAS-PENDIENTES.md']
  expect(faltaAlCerrar({ ...base, tocados, sucios: ['viejo/otro.py'] })).toEqual([])
})

test('cierre: freno anti-bucle (stop_hook_active, trabajo de fondo, mismo aviso)', async () => {
  const d = { ...base, tocados: ['app/a.py'], sucios: ['app/a.py'], fondo: 0, avisados: new Set<string>() }
  expect(decidirCierre({ ...d, stopActivo: true })).toBeUndefined()
  expect(decidirCierre({ ...d, stopActivo: false, fondo: 1 })).toBeUndefined()
  expect(decidirCierre({ ...d, stopActivo: false })).toMatch(/Guardián de cierre/)
  expect(decidirCierre({ ...d, stopActivo: false })).toBeUndefined() // lo mismo no se repite
  // si cambia lo que falta (hizo el CHANGELOG pero no el resto), avisa lo nuevo una vez
  expect(decidirCierre({ ...d, stopActivo: false, tocados: ['app/a.py', 'CHANGELOG.md'] })).toMatch(/PRUEBAS-PENDIENTES/)
})

test('cierre: apagado por proyecto', async () => {
  const off = leerConfig(JSON.stringify({ docs_obligatorios: ['CHANGELOG.md'], guardianes: { cierre: false } }))
  expect(faltaAlCerrar({ ...base, cfg: off, tocados: ['app/a.py'] })).toEqual([])
})

test('lectura: solo frena Read sin rango de texto', async () => {
  expect(lecturaSinRango({ file_path: 'a.js' })).toBe(true)
  expect(lecturaSinRango({ file_path: 'a.js', offset: 10 })).toBe(false)
  expect(lecturaSinRango({ file_path: 'a.js', limit: 50 })).toBe(false)
  expect(lecturaSinRango({ file_path: 'foto.PNG' })).toBe(false)
  expect(lecturaSinRango({ file_path: 'doc.pdf', pages: '1-3' })).toBe(false)
  expect(contarLineas('a\nb\nc\n')).toBe(3)
  expect(contarLineas('a\nb')).toBe(2)
  expect(contarLineas('')).toBe(0)
})

test('versión: atrasada, repo sin publicar, instalación vieja del proyecto', async () => {
  expect(cmpVersion('0.10.0', '0.9.1')).toBeGreaterThan(0)
  expect(cmpVersion('0.2.0', '0.2.0')).toBe(0)
  expect(avisoVersion({ cargada: '0.2.0', publicada: '0.2.0', repo: '0.2.0' })).toEqual([])
  expect(avisoVersion({ cargada: '0.2.0', publicada: '0.3.0' }).join()).toMatch(/ATRASADO: esta ventana usa 0\.2\.0 y ya está publicada 0\.3\.0/)
  expect(avisoVersion({ cargada: '0.3.0', publicada: '0.3.0', repo: '0.4.0' }).join()).toMatch(/0\.4\.0 sin publicar/)
  const inst = [
    { scope: 'user', version: '0.2.0' },
    { scope: 'project', version: '0.1.1', projectPath: 'C:\\Users\\N\\reels' },
    { scope: 'project', version: '0.1.0', projectPath: 'C:\\Users\\N\\otro' },
  ]
  const v = avisoVersion({ cargada: '0.2.0', publicada: '0.2.0', instalaciones: inst, proyecto: 'C:/Users/N/reels' })
  expect(v).toHaveLength(1)
  expect(v[0]).toMatch(/alcance «project» en 0\.1\.1.*--scope project/)
})

// ── Con el motor: hooks reales sobre un repo y un disco falsos ─────────────────
type Mundo = { files: Record<string, string>; head: string; sucios: string[]; commits: string[]; sinPush: string }

function falsos(on: any, m: Mundo) {
  // el kit resuelve rutas relativas contra la carpeta del plugin: se busca por el final de la ruta
  const clave = (p: string) => {
    const r = p.replace(/\\/g, '/')
    return Object.keys(m.files).find(k => r === k || r.endsWith('/' + k))
  }
  on('fs.read', ($: any, e: any) => {
    const k = clave(e.path)
    return k ? { value: m.files[k] } : { deny: 'ENOENT ' + e.path }
  })
  on('fs.stat', ($: any, e: any) => {
    const k = clave(e.path)
    return k ? { value: { kind: 'file', size: m.files[k].length, mtimeMs: 0 } } : { deny: 'ENOENT' }
  })
  on('fs.list', () => ({ value: [] }))
  on('process.run', ($: any, e: any) => {
    const a = e.argv.slice(1).join(' ')
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '' } })
    if (a === 'rev-parse --show-toplevel') return ok('C:/repo\n')
    if (a === 'rev-parse HEAD') return ok(m.head + '\n')
    if (a.startsWith('status --porcelain')) return ok(m.sucios.map(s => ` M ${s}`).join('\n'))
    if (a.startsWith('diff --name-only')) return ok(m.commits.join('\n'))
    if (a === 'rev-list --count @{u}..HEAD') return ok(m.sinPush)
    return { value: { exitCode: 1, stdout: '', stderr: 'no' } }
  })
  on('session.start', ($: any, e: any) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: 'ok' }))
  on('classic.Stop', () => ({}))
}

const arrancar = ($: any) => $.session.start({ cwd: 'C:/repo', surface: null, isInteractive: false })

test('motor: sin cambios no frena; con código sin CHANGELOG frena una vez', async ($: any, on: any) => {
  const m: Mundo = { files: { '.claude/harness.json': HJ }, head: 'aaa', sucios: [], commits: [], sinPush: '0' }
  falsos(on, m)
  await arrancar($)
  expect((await $.classic.Stop({ stop_hook_active: false })).block).toBeUndefined()

  await $.tool.call({ tool: 'Edit', file_path: 'C:\\repo\\app\\api.py', old_string: 'a', new_string: 'b' })
  m.sucios = ['app/api.py']
  const r = await $.classic.Stop({ stop_hook_active: false })
  expect(r.block).toMatch(/CHANGELOG\.md/)
  expect(r.block).toMatch(/commit/)
  // el modelo sigue, vuelve a terminar: stop_hook_active = true → pasa (no hay bucle)
  expect((await $.classic.Stop({ stop_hook_active: true })).block).toBeUndefined()
})

test('motor: todo cerrado (commit con docs, push hecho) no frena', async ($: any, on: any) => {
  const m: Mundo = { files: { '.claude/harness.json': HJ }, head: 'aaa', sucios: [], commits: [], sinPush: '0' }
  falsos(on, m)
  await arrancar($)
  m.head = 'bbb'
  m.commits = ['app/api.py', 'CHANGELOG.md', 'docs/PRUEBAS-PENDIENTES.md']
  expect((await $.classic.Stop({ stop_hook_active: false })).block).toBeUndefined()
  m.sinPush = '1'
  expect((await $.classic.Stop({ stop_hook_active: false })).block).toMatch(/push/)
})

test('motor: sin harness.json el de cierre no actúa', async ($: any, on: any) => {
  const m: Mundo = { files: {}, head: 'aaa', sucios: [], commits: [], sinPush: '0' }
  falsos(on, m)
  await arrancar($)
  m.sucios = ['app/api.py']
  expect((await $.classic.Stop({ stop_hook_active: false })).block).toBeUndefined()
})

test('motor: Read entero de un archivo grande se frena; con rango o chico pasa', async ($: any, on: any) => {
  const grande = Array.from({ length: 700 }, (_, i) => `linea ${i} con algo de texto`).join('\n')
  const m: Mundo = { files: { 'big.js': grande, 'chico.js': 'a\nb\n' }, head: 'aaa', sucios: [], commits: [], sinPush: '0' }
  falsos(on, m)
  const r = await $.tool.call({ tool: 'Read', file_path: 'C:\\repo\\big.js' })
  // el kit devuelve { deny } a una llamada frenada (en una sesión real el modelo la ve como error)
  expect(String(r.deny ?? r.text)).toMatch(/700 líneas \(tope 600\).*Grep/)
  expect((await $.tool.call({ tool: 'Read', file_path: 'C:\\repo\\big.js', offset: 1, limit: 100 })).result).toBe('ok')
  expect((await $.tool.call({ tool: 'Read', file_path: 'C:\\repo\\chico.js' })).result).toBe('ok')
})
