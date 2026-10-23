---
name: proyecto-nuevo
argument-hint: "[nombre]"
description: Arrancar un proyecto nuevo con el harness armado - CLAUDE.md corto, .claude/settings.json, .claude/harness.json, .gitignore, docs vivos, git + repo privado en GitHub y plugins elegidos para ese proyecto. Usar en una carpeta vacía o casi.
---

# /proyecto-nuevo [nombre]

Plantillas en `plantillas/` (al lado de este archivo). Reemplazar TODOS los `<…>`.

1. **Mirar la carpeta** (la actual; si Nacho nombró otra, esa; si no existe, crearla y trabajar ahí con rutas
   absolutas): si ya tiene `CLAUDE.md`, `.claude/` o `.git`, NO pisar: avisar y ofrecer `/podar`.
2. **Preguntar lo mínimo** (una sola AskUserQuestion, SOLO lo que no dijo; si ya dijo todo, no preguntar): qué quiere construir y para
   quién (¿hay usuario final? → decide el manual), nombre, ¿repo privado en GitHub? (recomendado: sí),
   ¿push automático al cerrar tareas? (recomendado: sí).
3. **Stack**: el más adecuado para ESTE proyecto (no por costumbre), justificado en 2–3 líneas. Portable
   (runtimes, modelos, cachés y configs dentro de la carpeta; rutas relativas; afuera solo si rinde más
   y con lista + comando `migrar`: regla permanente 1). Verificar qué ya está
   instalado antes de proponer instalar; instalar algo grande o pago → preguntar.
4. **Crear** (desde las plantillas):
   - `CLAUDE.md` ← `plantillas/CLAUDE.md` (≤ 100 líneas; nada de lo que ya traen las reglas del plugin).
     Línea de Git según la respuesta de push. Mapa sin código todavía: una fila "(se completa en T1)".
   - `.claude/settings.json` ← `plantillas/settings.json`: `permissions.deny` ajustado al stack (sacar lo
     que no aplica, sumar sus carpetas pesadas y `data/` si guarda datos del usuario).
   - `.claude/harness.json` ← `plantillas/harness.json`: `pruebas` = comando real del stack (si todavía no
     hay pruebas, `""`: el `verificador` lo dice en vez de adivinar; la tarea T1 del plan las crea); `git.push`
     según la respuesta; `manual` solo si hay usuario final; borrar las claves `_ayuda*`.
   - `.gitignore` ← `plantillas/gitignore` ajustado al stack (ojo: ignora `data/`; si `data/` es código, sacarlo).
   - `.gitattributes`: `* text=auto` y `*.bat text eol=crlf`.
   - `CHANGELOG.md`: `# Changelog` + `## 0.1.0 (<fecha>)` + `- Proyecto creado con harness-nacho.`
   - `docs/PRUEBAS-PENDIENTES.md`: `# Pruebas pendientes` + `> Hacelas en orden, de arriba hacia abajo.` +
     comentario de formato `<!-- ## ⬜ <n> · <Tn> — título / **Antes:** / 1. 2. 3. / **Avisame:** -->`
   - `docs/RESUMEN-pendientes.md`: `# Todo lo pendiente, en una línea cada una` + `> El control de Nacho: …` (regla
     «Resumen de pendientes») + `## Importante (en orden)` + `## Superfluo` (las líneas las suma `planificar`).
   - `docs/PRUEBAS-REALIZADAS.md`: `# Pruebas realizadas` + `> Para Claude: resultados de Nacho, la más nueva arriba.`
   - `VERSION`: `0.1.0`. `.claude/rules/` se crea con la primera regla de área (no dejar archivos vacíos).
5. **Plugins**: invocar la skill `plugins-proyecto` (deja `enabledPlugins` antes del primer commit).
6. **Verificar**: no queda ningún `<…>` (Grep `<[a-zA-Z]`; solo valen los de dentro de `<!-- … -->`, que son
   ejemplos de formato) y los JSON parsean.
7. **Git**: `git init -b main` → `git status` sin pesados → commit `"T0: proyecto creado con harness-nacho"`
   (si falla por "Author identity unknown": `git config user.name`/`user.email` SOLO de este repo, con los
   datos de `gh api user`, y avisarlo; no tocar la config global). Si dijo GitHub:
   `gh repo create <nombre> --private --source . --push` (SIEMPRE privado). Si falla (ej. `gh` sin login →
   que Nacho corra `gh auth login`), el commit local queda hecho: decirlo.
8. **Primer plan**: si Nacho ya contó qué quiere construir, invocar `planificar` (commit aparte).
9. **Responder**: qué quedó creado (lista corta), link del repo (si se creó), decisiones de stack y Próximo paso.
