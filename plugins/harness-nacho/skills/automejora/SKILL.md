---
name: automejora
description: Ponerse al día y mejorar el harness - novedades de Claude/Claude Code (modelos, funciones, comandos), skills/plugins/MCP nuevos que valgan la pena, mejoras y críticas al harness y a cómo trabaja Nacho (sin tapujos, con evidencia). Aplica sola lo chico y seguro; lo grande lo propone. Usar con "/automejora", "¿hay algo nuevo?", "mejorate", "ponete al día", o cuando el tablero avisa que pasó más de una semana o que hay novedades para Claude Code.
---

# /automejora

Objetivo: que Nacho no tenga que estar al tanto de todo. Regla (2026-11-02): **las mejoras para Claude Code las
encuentra Claude, no Nacho, y casi sin gastar tokens** (TokenEconomizer lo encontró él en YouTube: esta skill solo
miraba catálogos y temas de los proyectos, nunca GitHub ni lo que hace gastar menos). Buscar lo hace un script sin
LLM; vos solo juzgás la lista corta. Nada de leer el harness entero (las reglas ya están en tu contexto).
Modelo: Opus · esfuerzo alto (juzgar qué vale la pena es lo caro).
Scripts (repo `Documents\Trabajos\claude-harness`, carpeta `plugins/harness-nacho/scripts/`): `buscar_novedades.py`
y `medir_tokens.py`.

## 1. Desde cuándo
Leer `docs/AUTOMEJORA.md` del repo del harness: cabecera con la fecha de la última pasada, la versión de Claude
Code vista, lo **descartado** (no volver a proponerlo salvo que cambie algo) y lo **a re-medir** (con fecha).

## 2. Buscar
- **Lista corta (sin LLM, ~650 tokens)**: `python …/scripts/buscar_novedades.py --ver`. El tablero la dispara solo
  cada 7 días en segundo plano; si está vacía o vieja, correrla sin `--ver` (~1 min). Trae SOLO lo nuevo: repos de
  GitHub por temas `claude-code`… (⚑ = toca el harness: tokens, contexto, hooks, memoria, mods), marketplaces de
  plugins, awesome-claude-code, el CHANGELOG de Claude Code (lo que cambia cómo trabajamos) y Hacker News.
  Para un ⚑ que pinta bien: abrir SOLO su README (`gh api repos/X/readme -H "Accept: application/vnd.github.raw"`).
  Fuentes que se suman en `~/.claude/harness-nacho/novedades/fuentes.json` (p. ej. `youtube_canales` con el id de
  un canal que Nacho mire; Reddit bloquea a los scripts y la búsqueda de YouTube no tiene API gratis).
  Al terminar: `--vaciar` (lo visto queda guardado y no vuelve a salir).
- **Herramientas para un tema puntual** (solo si un proyecto vivo tiene una necesidad concreta): `SearchPlugins`,
  `SearchSkills`, `mcp-registry`. Solo gratis o ya pagado.
- **Ahorro con números**: lo que prometa gastar menos se mide con `medir_tokens.py` (`--contexto` = cuánto suma al
  contexto base; `--corte FECHA` = antes vs después), nunca con lo que dice su README. Método y tabla de pesos:
  `docs/MEDICION-tokens.md` (1k tokens fijos ≈ 0,3 % del gasto).
- **Fricción propia** (Haiku, solo lectura): en los proyectos de `Documents\Trabajos\*`, lo que se repite y
  cuesta: `docs/PRUEBAS-REALIZADAS.md` (fallas que volvieron), CHANGELOG y planes (tareas partidas, 🟡 que
  duran, secciones «Ideas extra» que hayan quedado), y `search_session_transcripts` de los últimos días por correcciones de Nacho
  («no», «otra vez», «te dije», «mal»). Contar, no adivinar.
- **Gasto** (directo): `medir_tokens.py --dias 30` (fallas c/100 llamadas, contexto base y mediano), `get_usage` y, si existe, `~/.claude/automatico/registro.jsonl` (gasto real por
  modelo/esfuerzo): ¿las Notas eligen bien el modelo? ¿algo se hace con Opus que Sonnet hacía igual?

## 3. Decidir (vos, con criterio; cada ítem = qué es · por qué sirve A NACHO · costo · evidencia)
- **Lo hago ya** (chico, reversible, sin plata ni cuentas): ajustes a reglas/skills/mods del harness, instalar
  algo gratis y claramente útil (regla «Herramientas»), arreglar un test roto. Hacerlo con sus pruebas
  (`claude plugin test plugins/<plugin>`), subir `version`, commit + push. No inventar: cada función/flag
  nueva se verifica en la doc antes de usarla.
- **Propongo** (grande, cambia el flujo, cuesta, o es gusto de Nacho): a `docs/PLAN-harness.md` (crearlo si
  falta) como tareas con su Nota, o al plan del proyecto que corresponda (ideas al plan existente, nunca un
  plan nuevo para algo que ya tiene).
- **Críticas a Nacho** (sin tapujos, máximo 4, cada una con el dato que la respalda y qué hacer distinto):
  cómo pide, cómo prueba, cómo usa modelos/ventanas, qué deja a medias. Si no hay evidencia, no va.
- **Descartado**: una línea cada uno (para no volver a evaluarlo).
- **Lecciones y Perfil** (`reglas.md`): ¿alguna lección se repitió o se puede volver test/hook/guardián? → hacerlo y
  sacarla de Lecciones. ¿El Perfil quedó viejo (programas, PC, plugins)? → corregirlo.

## 4. Anotar y responder
- `docs/AUTOMEJORA.md`: cabecera actualizada (fecha, versión vista) + una entrada de ≤ 8 líneas (hecho /
  propuesto / descartado). Si pasa de ~80 líneas, lo viejo a `docs/archivo/`. Commit + push con lo hecho.
- A Nacho, corto y en este orden: **Hice** (qué cambia para él) · **Te propongo** (con la recomendada primero;
  lo que es decisión suya, en una sola pregunta con opciones) · **Críticas** · **Próximo paso**.
- Si no hay nada que valga la pena: decirlo en una línea. No rellenar.
