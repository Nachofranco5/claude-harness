---
name: cerrar-tarea
description: >-
  Checklist para dar por terminada una tarea (o cambio de código): pruebas con evidencia, CHANGELOG, pruebas pendientes, manual, CLAUDE.md/reglas de área, ✅ en el plan, commit+push y Consejos. Usar SIEMPRE al terminar una tarea.
---

# /cerrar-tarea

Config: `.claude/harness.json` del proyecto MANDA; si no existe o le falta una clave, vale lo que diga el
`CLAUDE.md`. Ir en orden; no saltear pasos en silencio: si uno no aplica, decir por qué.

1. **Pruebas** → subagente `verificador` (si no está disponible, correr vos el comando `pruebas`). Si algo
   falla: arreglar y volver a correr; NO se cierra con pruebas rojas. Lo que no se pudo probar (GPU, app
   real, red) se declara con cómo probarlo.
2. **Bug arreglado** → test que lo hubiera atrapado (si el proyecto tiene tests). **¿Se arregló la CLASE?** (regla
   «Arreglar la CLASE, no el caso»): regla general escrita, todos los lugares donde aplica revisados, test con el literal +
   ≥ 3 casos de otros temas. Si no, NO se cierra: completarlo o partir lo que falta en una tarea ⬜.
   **Errores de la app** (`errores.archivo` de harness.json, por defecto `errores/ERRORES.md`): cada uno que esta tarea
   arregló se saca con `errores.resolver` (con la nota de qué se arregló); nunca editando el archivo a mano.
3. **CHANGELOG.md**: entrada nueva arriba, 3–8 líneas: fecha, versión, qué cambió para el usuario y por qué.
   Versión: seguir la costumbre del proyecto (mirar las últimas entradas: por tarea o por plan); si no hay
   costumbre y existe `VERSION`, subir el último número (0.1.0 → 0.1.1) y actualizar `VERSION`.
4. **docs/PRUEBAS-PENDIENTES.md**: solo lo que Claude NO pudo probar solo (voz, celular, reinicio, hardware, gusto);
   lo demás se prueba acá con evidencia. Si ya hay una prueba parecida, sumar el paso ahí en vez de crear otra (si no hay nada,
   no agregar). Formato (ver Reglas de Nacho → Tablero):
   ```
   ## ⬜ <n> · <Tn> — <qué se prueba>
   **Antes:** <lo que tiene que saber/preparar desde el principio, o quitar la línea>
   1. Abrí <X>
   2. Tocá <Y> → debería pasar <Z>; si pasa <W>, avisame.
   **Avisame:** <qué datos devolver>
   ```
   Insertarla en el ORDEN en que conviene hacerlas (renumerar). Si Nacho ya devolvió resultados de alguna:
   sacarla de pendientes y resumirla arriba de `docs/PRUEBAS-REALIZADAS.md` (`## ✅ <fecha> · <Tn> — título`
   + 1–3 viñetas: qué salió y a qué tarea fue cada problema). En pendientes nunca quedan ✅.
5. **Manual** (`manual` de harness.json, o lo que diga el CLAUDE.md): si cambió algo que el usuario ve,
   actualizarlo y regenerarlo con su comando.
6. **Memoria del proyecto**: si cambió algo estructural (archivo nuevo, API nueva, cómo probar) → mapa del
   `CLAUDE.md` en 1 línea. El detalle de un área va a `.claude/rules/<área>.md` (con `paths:`), no al
   CLAUDE.md. Si el CLAUDE.md pasa de ~100 líneas → sugerir `/podar` en Consejos.
7. **Plan**: título → `✅ (fecha; resumen de 1 línea)`. Borrar `> ⏸` si quedó. En `docs/RESUMEN-pendientes.md`: borrar la línea de la tarea y sumar la de cada tarea nueva. Lo visto de paso → al plan
   (sumado a la ⬜ del mismo código o tarea ⬜ nueva con su Nota; regla «Lo que NO es de la misma clase»). Si todas las tareas quedaron ✅ → `(cerrado)` en el título del plan.
7b. **Aprender** (regla «Aprender siempre»): correcciones de Nacho, fallas repetidas y datos nuevos de su PC/programas/forma
   de trabajar de ESTA sesión → al Perfil/Lecciones del harness (si vale para todo proyecto; commit + push del harness) o a la
   memoria/`CLAUDE.md` del proyecto. Si se puede volver test/hook/guardián, eso en vez de una línea.
8. **Git** (`git.commit` / `git.push`):
   - `git status` primero. Frenar y avisar si aparece algo pesado o privado (modelos, binarios, `.venv`,
     zips, respaldos, datos de clientes, secretos) que no esté en `.gitignore`.
   - Commit en español `"<id>: qué se hizo"` + `git push` si corresponde. Nunca `--force`, `reset --hard`
     ni `--no-verify`.
9. **Respuesta a Nacho** (corta):
   - Qué cambió PARA ÉL (qué ve o hace distinto) en 1–3 líneas.
   - Evidencia: qué se corrió y qué dio (ej. "61 tests OK, 3 salteados").
   - Lo que no se pudo probar y cómo probarlo.
   - **Consejos** (1–4 líneas) + **Próximo paso**: la siguiente `⬜` del plan con el modelo y esfuerzo de su
     Nota (si a la Nota le falta algo, elegirlo con el criterio de `planificar`) como **TARJETA** (`start_session`
     `own_initiative`, ver «Próximo paso = TARJETA» en las reglas), después del commit + push. En el texto una
     línea: «Te dejé la tarjeta de T3 (Sonnet · medio) — T3 · <título>: <qué hace, 1 frase breve>».
     Si la Nota pide un modelo o esfuerzo MAYOR que el de esta ventana, la app no lo deja: en vez de tarjeta,
     prompt exacto ENTERO y seguido para copiar («Ventana nueva, Opus, esfuerzo alto: `Hacé la tarea T3 de docs/PLAN-x.md`»)
     y DESPUÉS, fuera del prompt, «— T3 · <título>: <qué hace>». En modo automático no se hace esto (lo maneja `automatico`).
