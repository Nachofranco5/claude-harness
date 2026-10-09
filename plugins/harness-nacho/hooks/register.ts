import type { Register } from 'claude-code'

import { archivosPorcelain, armarTablero, type Git, type Plan } from './tablero'

// Al armar el contexto de cada conversación nueva:
// 1) las reglas generales (reglas.md) entran como un archivo de instrucciones más del usuario
//    (mismo marco que ~/.claude/CLAUDE.md; el CLAUDE.md del proyecto va después y manda);
// 2) el tablero del proyecto (planes, git, pruebas) entra como un bloque aparte.

const quiet = <T,>(p: Promise<T>) => p.catch(() => undefined)

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

export const register: Register = on => {
  on('prompt.context', async ($: any, e: any, next: any) => {
    const r = await next(e)
    // Sin bloque claudeMd = conversación que no carga instrucciones (subagentes tipo Explore): no sumar nada.
    // Por eso ~/.claude/CLAUDE.md existe siempre (aunque sea de 1 línea): garantiza el bloque en la ventana principal.
    if (!r.blocks.some((b: any) => b.name === 'claudeMd')) return r
    try {
      const sep = String($.plugin.root).includes('\\') ? '\\' : '/'
      const ruta = `${$.plugin.root}${sep}reglas.md`
      const [reglas, planes, pruebas, g, uso] = await Promise.all([
        quiet($.fs.read(ruta)) as Promise<string | undefined>,
        leerPlanes($),
        quiet($.fs.read('docs/PRUEBAS-PENDIENTES.md')) as Promise<string | undefined>,
        leerGit($),
        quiet($.session.usage()) as Promise<any>,
      ])
      const blocks = [...r.blocks]
      let files = r.instructionFiles as any[] | undefined
      if (reglas) {
        const propio = { path: ruta, kind: 'user', content: reglas }
        if (files) files = [propio, ...files]
        else blocks.unshift({ name: 'reglasNacho', text: reglas }) // otro hook reescribió claudeMd: bloque aparte
      }
      blocks.push({ name: 'tablero', text: armarTablero({ planes, pruebas, git: g, uso: uso?.rateLimits }) })
      return files ? { ...r, blocks, instructionFiles: files } : { ...r, blocks }
    } catch (err) {
      $.ui.log(`harness-nacho: prompt.context falló: ${err}`, { to: 'debug' })
      return r
    }
  })
}
