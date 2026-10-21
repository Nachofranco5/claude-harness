---
name: podar
description: Mantener liviana la memoria del proyecto - CLAUDE.md ≤ 100 líneas, detalle por área a .claude/rules/, CHANGELOG y docs viejos al archivo, planes cerrados archivados, plugins revisados. Usar cuando el CLAUDE.md crece o cada tanto.
---

# /podar

Objetivo: que cada sesión cargue lo mínimo SIN perder conocimiento. Nada se borra: se mueve.

1. **Medir antes**: líneas y caracteres de `CLAUDE.md`, `CHANGELOG.md`, `.claude/rules/*` (tokens ≈ caracteres/4).
   Si hay `get_usage`: categorías "Memory files", "Skills", "MCP tools". Si todo ya está liviano
   (CLAUDE.md ≤ 100 líneas, CHANGELOG ≤ ~40, nada cerrado para archivar) → decirlo y saltar al paso 6.
2. **Proponer antes de mover** (si se mueve más de ~30 líneas): tabla corta "qué bloque → adónde" y esperar
   OK (salvo "no preguntes"). Antes de mover: commit de lo pendiente (si el proyecto autoriza git) o copia.
3. **CLAUDE.md ≤ 100 líneas**: queda qué es, reglas propias, mapa (1 línea por archivo), cómo probar y un
   puntero de 1 línea a las reglas de área (cuenta dentro de las 100). El detalle → `.claude/rules/<área>.md`:
   - Un archivo por ÁREA del código (agrupar por los archivos que menciona cada bloque: ej. importación,
     timeline, render), no uno por tarea. Un bloque que toca varias áreas va a la principal.
   - Formato (si el YAML no parsea, la regla se carga SIEMPRE: revisarlo):
     ```markdown
     ---
     paths:
       - "app/import*.py"
       - "ui/timeline.js"
     ---
     # <Área>
     - …
     ```
   - Lo que ya no aplica (decisiones viejas, historia) → `docs/archivo/`.
4. **Duplicados**: lo que ya dicen las reglas del plugin `harness-nacho` (están en tu contexto como
   instrucciones del usuario) no se repite en el proyecto. Si dos textos dicen lo mismo con matices
   distintos, dejar el mejor y listar la diferencia en la respuesta.
5. **Archivo** (en `docs/archivo/`; si ya existe un archivo del mismo tipo, anexar):
   - `CHANGELOG.md`: dejar las entradas completas más recientes hasta ~40 líneas; el resto a
     `docs/archivo/CHANGELOG-<versión más vieja>-a-<más nueva>.md` y un link arriba del CHANGELOG.
   - Planes con `(cerrado)` en el título → `docs/archivo/`.
   - Si quedó algún `✅` en `docs/PRUEBAS-PENDIENTES.md` → arriba de `docs/PRUEBAS-REALIZADAS.md`.
   - `docs/PRUEBAS-REALIZADAS.md` de más de ~80 líneas: lo viejo → `docs/archivo/PRUEBAS-REALIZADAS-<fecha>.md`.
   - `docs/archivo/` suele estar bloqueado para LEER: se mueve con `git mv` sin leerlo.
   - `## Ideas extra` de un plan con más de ~20 ítems: lista corta para Nacho con la recomendación de cada uno
     (→ tarea nueva, juntando las compatibles · → descartada a `docs/archivo/` · sigue). Nada se mueve sin su OK.
6. **Plugins**: invocar la skill `plugins-proyecto`.
7. **Verificar**: correr `pruebas` de `.claude/harness.json` (subagente `verificador`); Grep de cada nombre
   de archivo movido para corregir links rotos.
8. **Responder**: antes → después (líneas y tokens aprox.) + qué se movió adónde.
   Commit `"Poda: …"` según `git` de `.claude/harness.json` (o lo que autorice el CLAUDE.md).
