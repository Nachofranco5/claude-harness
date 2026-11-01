// Guardianes: controles deterministas en vez de "la IA se tiene que acordar".
// Funciones puras (sin $) para poder probarlas solas; register.ts las engancha.

// ── Configuración del proyecto (.claude/harness.json) ──────────────────────────
export type Config = {
  existe: boolean
  docs_obligatorios: string[]
  manual?: { archivo: string; rutas: string[] }
  git: { commit: boolean; push: boolean }
  archivo_grande: number
  guardianes: { cierre: boolean; lectura_cara: boolean }
  no_es_codigo: string[]
  // Registro de errores de la app que se construye (regla «La app anota sus errores»): archivo que escribe la app sola
  // y el comando con que Claude saca uno arreglado. Sin la clave vale la convención `errores/ERRORES.md`.
  errores: { archivo: string; resolver?: string }
}

// Lo que NO cuenta como "cambio de código": una charla, un plan o docs no se frenan.
export const NO_ES_CODIGO = ['*.md', '*.txt', 'docs/', '.claude/']

export function leerConfig(texto?: string): Config {
  let j: any = {}
  let existe = false
  if (texto !== undefined) {
    try { j = JSON.parse(texto.replace(/^﻿/, '')) ?? {}; existe = true } catch { j = {} }
  }
  const lista = (v: any) => Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : undefined
  const m = j.manual
  return {
    existe,
    docs_obligatorios: lista(j.docs_obligatorios) ?? [],
    manual: m && typeof m.archivo === 'string' ? { archivo: m.archivo, rutas: lista(m.rutas) ?? [] } : undefined,
    git: { commit: j.git?.commit === true, push: j.git?.push === true },
    archivo_grande: Number.isFinite(j.archivo_grande) && j.archivo_grande > 0 ? j.archivo_grande : 600,
    // Sin harness.json el de cierre no actúa (no sabe qué exigir); el de lectura sí (regla general).
    guardianes: { cierre: existe && j.guardianes?.cierre !== false, lectura_cara: j.guardianes?.lectura_cara !== false },
    no_es_codigo: lista(j.no_es_codigo) ?? NO_ES_CODIGO,
    errores: {
      archivo: typeof j.errores?.archivo === 'string' && j.errores.archivo.trim() ? j.errores.archivo : 'errores/ERRORES.md',
      resolver: typeof j.errores?.resolver === 'string' ? j.errores.resolver : undefined,
    },
  }
}

// ── Rutas ──────────────────────────────────────────────────────────────────────
const barras = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '')
const igual = (a: string, b: string) => barras(a).toLowerCase() === barras(b).toLowerCase()

// Ruta absoluta (de Edit/Write) → relativa a la raíz del repo; fuera del repo → undefined.
export function relativa(ruta: string, raiz: string): string | undefined {
  const r = barras(ruta), base = barras(raiz).replace(/\/+$/, '')
  if (!/^([a-z]:)?\//i.test(r)) return r // ya era relativa
  return r.toLowerCase().startsWith(base.toLowerCase() + '/') ? r.slice(base.length + 1) : undefined
}

// Patrón: "*.md" = extensión, "docs/" = carpeta, otro = archivo exacto o carpeta.
export function coincide(ruta: string, patron: string): boolean {
  const r = barras(ruta).toLowerCase(), p = barras(patron).toLowerCase()
  if (p.startsWith('*.')) return r.endsWith(p.slice(1))
  if (p.endsWith('/')) return r.startsWith(p)
  return r === p || r.startsWith(p + '/')
}

export const esCodigo = (ruta: string, cfg: Config) => !cfg.no_es_codigo.some(p => coincide(ruta, p))

// ── Guardián de cierre (Stop) ──────────────────────────────────────────────────
export type Cierre = {
  cfg: Config
  tocados: string[] // archivos que cambió ESTA sesión (relativos al repo)
  sucios: string[] // `git status` ahora
  sinPush?: number // commits sin subir (undefined = sin upstream o sin git)
  hayGit: boolean
}

// Qué falta para poder cerrar; vacío = nada (o no hubo código, o el guardián está apagado).
export function faltaAlCerrar(d: Cierre): string[] {
  const { cfg } = d
  if (!cfg.guardianes.cierre) return []
  const codigo = d.tocados.filter(t => esCodigo(t, cfg))
  if (!codigo.length) return []
  const tocado = (f: string) => d.tocados.some(t => igual(t, f))
  const falta = cfg.docs_obligatorios.filter(f => !tocado(f)).map(f => `actualizar \`${f}\``)
  const m = cfg.manual
  if (m && m.rutas.length && !tocado(m.archivo)) {
    const vistos = codigo.filter(t => m.rutas.some(p => coincide(t, p)))
    if (vistos.length) falta.push(`manual \`${m.archivo}\` (cambiaste ${vistos.slice(0, 3).join(', ')}${vistos.length > 3 ? '…' : ''}, que el usuario ve)`)
  }
  if (d.hayGit && cfg.git.commit) {
    const sinCommit = d.sucios.filter(s => d.tocados.some(t => igual(t, s)))
    if (sinCommit.length) falta.push(`commit (${sinCommit.length} archivo(s) de esta sesión sin commitear)`)
    else if (cfg.git.push && d.sinPush) falta.push(`push (${d.sinPush} commit(s) sin subir)`)
  }
  return falta
}

export function mensajeCierre(falta: string[]): string {
  return [
    'Guardián de cierre (harness-nacho): esta sesión cambió código y falta:',
    ...falta.map(f => `- ${f}`),
    'Hacelo ahora (skill harness-nacho:cerrar-tarea tiene la checklist). Si la tarea quedó a medias o',
    'estás esperando una respuesta de Nacho, no lo fuerces: marcá 🟡 / decilo en una línea y terminá;',
    'este aviso no se repite para lo mismo.',
  ].join('\n')
}

// Freno anti-bucle: no frenar si ya se frenó en este turno (stop_hook_active), si hay trabajo
// de fondo que va a despertar la sesión, o si ya se avisó exactamente lo mismo antes.
export function decidirCierre(d: Cierre & { stopActivo: boolean; fondo: number; avisados: Set<string> }): string | undefined {
  if (d.stopActivo || d.fondo > 0) return undefined
  const falta = faltaAlCerrar(d)
  if (!falta.length) return undefined
  const firma = falta.join('|')
  if (d.avisados.has(firma)) return undefined
  d.avisados.add(firma)
  return mensajeCierre(falta)
}

// ── Guardián de lectura cara (Read entero de un archivo grande) ────────────────
const NO_TEXTO = /\.(png|jpe?g|gif|webp|bmp|ico|svg|pdf|ipynb|mp4|mov|webm|mp3|wav|zip|exe|dll|bin|pt|safetensors|gguf)$/i

// ¿Hace falta contar líneas? Solo un Read sin rango de un archivo de texto.
export const lecturaSinRango = (inp: any) =>
  typeof inp?.file_path === 'string' && inp.offset == null && inp.limit == null && inp.pages == null && !NO_TEXTO.test(inp.file_path)

export const contarLineas = (texto: string) => texto.length ? texto.split('\n').length - (texto.endsWith('\n') ? 1 : 0) : 0

export function mensajeLectura(ruta: string, lineas: number | undefined, max: number): string {
  const cuanto = lineas === undefined ? 'más de 4 MB' : `${lineas} líneas`
  return `Guardián de lectura (harness-nacho): ${ruta} tiene ${cuanto} (tope ${max}). ` +
    'Buscá con Grep (con -n) y leé solo el rango que necesitás (offset/limit). ' +
    'Si de verdad hace falta todo, leelo en tramos con offset/limit.'
}

// ── Versión del plugin (¿esta ventana usa uno atrasado?) ───────────────────────
export type Instalacion = { scope: string; version: string; projectPath?: string }

export function cmpVersion(a?: string, b?: string): number {
  const n = (v?: string) => (v ?? '').split(/[.+-]/).slice(0, 3).map(x => parseInt(x, 10) || 0)
  const x = n(a), y = n(b)
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0)
  return 0
}

export function avisoVersion(d: { cargada?: string; publicada?: string; repo?: string; instalaciones?: Instalacion[]; proyecto?: string }): string[] {
  if (!d.cargada) return []
  const out: string[] = []
  const nueva = [d.publicada, d.repo].reduce((m, v) => (v && cmpVersion(v, m) > 0 ? v : m), d.cargada)
  if (d.publicada && cmpVersion(d.publicada, d.cargada) > 0)
    out.push(`- ⚠️ harness-nacho ATRASADO: esta ventana usa ${d.cargada} y ya está publicada ${d.publicada}. ` +
      'Decirle a Nacho: cerrar y abrir Claude Code (o `claude plugin update harness-nacho@claude-harness`).')
  if (d.repo && cmpVersion(d.repo, d.publicada ?? d.cargada) > 0 && cmpVersion(d.repo, d.cargada) > 0)
    out.push(`- ⚠️ El repo local \`claude-harness\` tiene harness-nacho ${d.repo} sin publicar: falta commit + push ahí.`)
  const viejas = (d.instalaciones ?? []).filter(i =>
    i.scope !== 'user' && i.projectPath && d.proyecto && igual(i.projectPath, d.proyecto) && cmpVersion(i.version, nueva) < 0)
  for (const i of viejas)
    out.push(`- ⚠️ Este proyecto tiene harness-nacho instalado también con alcance «${i.scope}» en ${i.version} (viejo; ` +
      `la última es ${nueva}). Arreglo: \`claude plugin update harness-nacho@claude-harness --scope ${i.scope}\`.`)
  return out
}
