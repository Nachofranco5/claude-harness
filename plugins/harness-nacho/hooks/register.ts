import type { Register } from 'claude-code'

import {
  avisoVersion, contarLineas, decidirCierre, lecturaSinRango, leerConfig, mensajeLectura, relativa,
  type Config, type Instalacion,
} from './guardianes'
import { archivosPorcelain, armarTablero, type Git, type Plan } from './tablero'

// Al armar el contexto de cada conversación nueva:
// 1) las reglas generales (reglas.md) entran como un archivo de instrucciones más del usuario
//    (mismo marco que ~/.claude/CLAUDE.md; el CLAUDE.md del proyecto va después y manda);
// 2) el tablero del proyecto (planes, git, pruebas, versión del plugin) entra como un bloque aparte.
// Guardianes (H3): cierre (classic.Stop) y lectura cara (tool.call Read). Ver guardianes.ts.

const quiet = <T,>(p: Promise<T>) => p.catch(() => undefined)
const ID = 'harness-nacho@claude-harness'

async function git($: any, args: string[]): Promise<string | undefined> {
  const r = await quiet($.process.run(['git', ...args], { timeoutMs: 8000 })) as any
  // trimEnd y no trim: en `git status --porcelain` el espacio inicial es parte de la columna de estado
  return r && r.exitCode === 0 ? String(r.stdout).trimEnd() : undefined
}

async function leerGit($: any): Promise<Git | undefined> {
  const rama = await git($, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (!rama) return undefined
  const [ultimo, estado, push] = await Promise.all([
    git($, ['log', '-1', '--format=%h %s (%cr)']),
    git($, ['status', '--porcelain', '--untracked-files=normal']),
    git($, ['rev-list', '--count', '@{u}..HEAD']),
  ])
  const sinCommit = archivosPorcelain(estado)
  return {
    rama,
    ultimo: ultimo && ultimo.length > 140 ? ultimo.slice(0, 137) + '…' : ultimo,
    sinCommit,
    sinPush: push ? Number(push) : undefined,
  }
}

async function leerPlanes($: any): Promise<Plan[]> {
  const docs = (await quiet($.fs.list('docs'))) as any[] | undefined
  if (!docs) return []
  const out: Plan[] = []
  for (const f of docs) {
    if (f.kind !== 'file' || !/^PLAN.*\.md$/i.test(f.name)) continue
    const texto = await quiet($.fs.read(`docs/${f.name}`)) as string | undefined
    if (texto !== undefined) out.push({ nombre: f.name, texto, mtimeMs: f.mtimeMs })
  }
  return out
}

async function leerJson($: any, ruta: string): Promise<any> {
  const t = await quiet($.fs.read(ruta)) as string | undefined
  try { return t === undefined ? undefined : JSON.parse(t.replace(/^﻿/, '')) } catch { return undefined }
}

// Versión cargada (la de esta ventana) vs. publicada (clon del marketplace, que se actualiza solo al
// arrancar) vs. repo local de desarrollo, + instalaciones viejas con alcance de proyecto.
async function leerVersiones($: any): Promise<string[]> {
  const root = String($.plugin.root)
  const sep = root.includes('\\') ? '\\' : '/'
  const i = root.toLowerCase().lastIndexOf(`${sep}cache${sep}`)
  if (i < 0) return [] // cargado desde una carpeta de desarrollo (--plugin-dir): no aplica
  const plugins = root.slice(0, i)
  const home = plugins.split(sep).slice(0, -2).join(sep)
  const pj = (...base: string[]) => [...base, 'plugins', 'harness-nacho', '.claude-plugin', 'plugin.json'].join(sep)
  const [propio, mkt, repo, inst, proyecto] = await Promise.all([
    leerJson($, [root, '.claude-plugin', 'plugin.json'].join(sep)),
    leerJson($, pj(plugins, 'marketplaces', 'claude-harness')),
    leerJson($, pj(home, 'Documents', 'Trabajos', 'claude-harness')),
    leerJson($, [plugins, 'installed_plugins.json'].join(sep)),
    quiet($.session.root()) as Promise<string | undefined>,
  ])
  const lista = inst?.plugins?.[ID] ?? inst?.[ID]
  return avisoVersion({
    cargada: propio?.version, publicada: mkt?.version, repo: repo?.version,
    instalaciones: Array.isArray(lista) ? lista as Instalacion[] : [], proyecto,
  })
}

// Cabecera de docs/AUTOMEJORA.md: del clon del marketplace (se actualiza solo) o, si no, del repo local.
async function leerAutomejora($: any): Promise<string | undefined> {
  const root = String($.plugin.root)
  const sep = root.includes('\\') ? '\\' : '/'
  const i = root.toLowerCase().lastIndexOf(`${sep}cache${sep}`)
  const plugins = i < 0 ? undefined : root.slice(0, i)
  const home = plugins?.split(sep).slice(0, -2).join(sep)
  const rutas = [
    plugins && [plugins, 'marketplaces', 'claude-harness', 'docs', 'AUTOMEJORA.md'].join(sep),
    home && [home, 'Documents', 'Trabajos', 'claude-harness', 'docs', 'AUTOMEJORA.md'].join(sep),
    i < 0 ? [root, '..', '..', 'docs', 'AUTOMEJORA.md'].join(sep) : undefined, // --plugin-dir del repo
  ]
  for (const r of rutas) {
    const t = r ? (await quiet($.fs.read(r)) as string | undefined) : undefined
    if (t !== undefined) return t
  }
  return undefined
}

// ── Estado de la sesión para el guardián de cierre (variables del módulo: se rehacen al recargar) ──
let raiz: string | undefined // raíz del repo git (con /)
let headInicio: string | undefined
let suciosInicio = new Set<string>()
let conFoto = false
const editados = new Set<string>() // rutas relativas tocadas con Edit/Write/NotebookEdit
const avisados = new Set<string>() // anti-bucle: lo ya avisado no se repite
let avisoVersionDado = false

const porcelainTodo = async ($: any) => archivosPorcelain(await git($, ['status', '--porcelain', '--untracked-files=all']))

async function foto($: any) {
  editados.clear(); avisados.clear()
  raiz = await git($, ['rev-parse', '--show-toplevel'])
  headInicio = raiz ? await git($, ['rev-parse', 'HEAD']) : undefined
  suciosInicio = new Set(raiz ? await porcelainTodo($) : [])
  conFoto = true
}

const leerConfigProyecto = async ($: any): Promise<Config> =>
  leerConfig(await quiet($.fs.read('.claude/harness.json')) as string | undefined)

const EDITORES = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit'])

export const register: Register = on => {
  on('session.start', async ($: any, e: any, next: any) => {
    const r = await next(e)
    await foto($).catch(() => undefined)
    return r
  })
  on('session.end', async ($: any, e: any, next: any) => {
    const r = await next(e)
    if (e.reason === 'clear') await foto($).catch(() => undefined) // /clear = otra conversación, sin session.start
    return r
  })

  // Anota qué archivos cambió la sesión (los cambios por Bash los ve git al cerrar).
  on('tool.call', async ($: any, e: any, next: any) => {
    const r = await next(e)
    // Nunca tirar error después de next: la herramienta ya corrió y no debe repetirse.
    try {
      if (EDITORES.has(e.tool) && !r?.deny && !r?.isError) {
        if (!conFoto) await foto($) // recargado a mitad de sesión
        const ruta = e.file_path ?? e.notebook_path
        const rel = typeof ruta === 'string' && raiz ? relativa(ruta, raiz) : undefined
        if (rel) editados.add(rel)
      }
    } catch { /* solo anotaba */ }
    return r
  })

  // Guardián de lectura cara: Read sin rango de un archivo de texto con más líneas que el tope.
  on('tool.call', { tool: 'Read' }, async ($: any, e: any, next: any) => {
    if (!lecturaSinRango(e)) return next(e)
    const cfg = await leerConfigProyecto($)
    if (!cfg.guardianes.lectura_cara) return next(e)
    const st = await quiet($.fs.stat(e.file_path)) as any
    // Archivo chico (menos de 4 bytes por línea permitida): no puede pasarse del tope; ni se lee.
    if (!st || st.kind !== 'file' || st.size < cfg.archivo_grande * 4) return next(e)
    let lineas: number | undefined
    try { lineas = contarLineas(String(await $.fs.read(e.file_path))) } catch { lineas = undefined } // > 4 MB
    if (lineas !== undefined && lineas <= cfg.archivo_grande) return next(e)
    return { deny: mensajeLectura(e.file_path, lineas, cfg.archivo_grande) }
  }).catch(($: any, e: any, next: any) => next(e)) // si el guardián falla, no traba la lectura

  // Guardián de cierre: si la sesión cambió código y falta CHANGELOG/pruebas/manual/commit/push, no deja terminar.
  on('classic.Stop', async ($: any, e: any, next: any) => {
    const r = await next(e)
    if (r?.block) return r
    try {
      const cfg = await leerConfigProyecto($)
      if (!cfg.guardianes.cierre) return r
      if (!conFoto) await foto($) // recargado a mitad de sesión: desde acá en adelante
      const sucios = raiz ? await porcelainTodo($) : []
      const head = raiz ? await git($, ['rev-parse', 'HEAD']) : undefined
      const commiteados = raiz && headInicio && head && head !== headInicio
        ? (await git($, ['diff', '--name-only', headInicio, head]) ?? '').split(/\r?\n/).filter(Boolean)
        : []
      const tocados = [...new Set([...editados, ...sucios.filter(s => !suciosInicio.has(s)), ...commiteados])]
      const push = raiz && cfg.git.push ? await git($, ['rev-list', '--count', '@{u}..HEAD']) : undefined
      const msg = decidirCierre({
        cfg, tocados, sucios, hayGit: !!raiz, sinPush: push ? Number(push) : undefined,
        stopActivo: e.stop_hook_active === true, fondo: (e.background_tasks ?? []).length, avisados,
      })
      return msg ? { ...r, block: msg } : r
    } catch (err) {
      $.ui.log(`harness-nacho: guardián de cierre falló: ${err}`, { to: 'debug' })
      return r
    }
  })

  on('prompt.context', async ($: any, e: any, next: any) => {
    const r = await next(e)
    // Sin bloque claudeMd = conversación que no carga instrucciones (subagentes tipo Explore): no sumar nada.
    // Por eso ~/.claude/CLAUDE.md existe siempre (aunque sea de 1 línea): garantiza el bloque en la ventana principal.
    if (!r.blocks.some((b: any) => b.name === 'claudeMd')) return r
    try {
      const sep = String($.plugin.root).includes('\\') ? '\\' : '/'
      const ruta = `${$.plugin.root}${sep}reglas.md`
      const cfg = await leerConfigProyecto($)
      const [reglas, planes, pruebas, resumen, g, uso, avisos, mejora, textoErrores] = await Promise.all([
        quiet($.fs.read(ruta)) as Promise<string | undefined>,
        leerPlanes($),
        quiet($.fs.read('docs/PRUEBAS-PENDIENTES.md')) as Promise<string | undefined>,
        quiet($.fs.read('docs/RESUMEN-pendientes.md')) as Promise<string | undefined>,
        leerGit($),
        quiet($.session.usage()) as Promise<any>,
        leerVersiones($).catch(() => [] as string[]),
        leerAutomejora($),
        quiet($.fs.read(cfg.errores.archivo)) as Promise<string | undefined>,
      ])
      if (avisos.length && !avisoVersionDado) {
        avisoVersionDado = true
        $.ui.toast('harness-nacho: plugin desactualizado o sin publicar (la IA te dice cómo arreglarlo)')
      }
      const blocks = [...r.blocks]
      let files = r.instructionFiles as any[] | undefined
      if (reglas) {
        const propio = { path: ruta, kind: 'user', content: reglas }
        if (files) files = [propio, ...files]
        else blocks.unshift({ name: 'reglasNacho', text: reglas }) // otro hook reescribió claudeMd: bloque aparte
      }
      blocks.push({ name: 'tablero', text: armarTablero({ planes, pruebas, resumen, git: g, uso: uso?.rateLimits, avisos, automejora: mejora, errores: { texto: textoErrores, ...cfg.errores } }) })
      return files ? { ...r, blocks, instructionFiles: files } : { ...r, blocks }
    } catch (err) {
      $.ui.log(`harness-nacho: prompt.context falló: ${err}`, { to: 'debug' })
      return r
    }
  })
}
