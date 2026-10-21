---
name: automejora
description: Ponerse al día y mejorar el harness - novedades de Claude/Claude Code (modelos, funciones, comandos), skills/plugins/MCP nuevos que valgan la pena, mejoras y críticas al harness y a cómo trabaja Nacho (sin tapujos, con evidencia). Aplica sola lo chico y seguro; lo grande lo propone. Usar con "/automejora", "¿hay algo nuevo?", "mejorate", "ponete al día", o cuando el tablero avisa que pasó más de una semana.
---

# /automejora

Objetivo: que Nacho no tenga que estar al tanto de todo. Barato: solo lo NUEVO desde la última vez, búsquedas
con subagentes y nada de leer el harness entero (las reglas ya están en tu contexto).
Modelo: Opus · esfuerzo alto (juzgar qué vale la pena es lo caro; buscar lo hacen subagentes baratos).

## 1. Desde cuándo
Leer `docs/AUTOMEJORA.md` del repo del harness (`Documents\Trabajos\claude-harness`): cabecera con la fecha de la
última pasada, la versión de Claude Code vista y lo **descartado** (no volver a proponerlo salvo que cambie algo).
Si no existe, la ventana es 30 días. Versión actual: `claude --version` (o la del system prompt).

## 2. Buscar (en paralelo, subagentes; cada uno devuelve ≤ 15 líneas con fuente y fecha)
- **Claude y Claude Code** (Sonnet, web): changelog de Claude Code desde la versión vista
  (`github.com/anthropics/claude-code` CHANGELOG), novedades de modelos y planes de Anthropic, funciones nuevas
  de la app de escritorio. Solo lo que cambia CÓMO trabajamos (comandos, hooks, skills, mods, límites, precios).
- **Herramientas** (Haiku): `SearchPlugins`, `SearchSkills` y `mcp-registry` con palabras de los proyectos
  vivos (stacks y trabajos de sus `CLAUDE.md`: voz, LLM local, Windows, Python…). Solo gratis o ya pagado.
- **Fricción propia** (Haiku, solo lectura): en los proyectos de `Documents\Trabajos\*`, lo que se repite y
  cuesta: `docs/PRUEBAS-REALIZADAS.md` (fallas que volvieron), CHANGELOG y planes (tareas partidas, 🟡 que
  duran, «Ideas extra» olvidadas), y `search_session_transcripts` de los últimos días por correcciones de Nacho
  («no», «otra vez», «te dije», «mal»). Contar, no adivinar.
- **Gasto** (directo): `get_usage` y, si existe, `~/.claude/automatico/registro.jsonl` (gasto real por
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

## 4. Anotar y responder
- `docs/AUTOMEJORA.md`: cabecera actualizada (fecha, versión vista) + una entrada de ≤ 8 líneas (hecho /
  propuesto / descartado). Si pasa de ~80 líneas, lo viejo a `docs/archivo/`. Commit + push con lo hecho.
- A Nacho, corto y en este orden: **Hice** (qué cambia para él) · **Te propongo** (con la recomendada primero;
  lo que es decisión suya, en una sola pregunta con opciones) · **Críticas** · **Próximo paso**.
- Si no hay nada que valga la pena: decirlo en una línea. No rellenar.
