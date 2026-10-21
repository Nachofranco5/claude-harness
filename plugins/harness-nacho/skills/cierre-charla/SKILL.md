---
name: cierre-charla
description: Cuando Nacho cierra la charla (opina, decide, "listo", "dejémoslo acá"): vuelca sus decisiones al plan, avisa lo que quedó sin ejecutar y da el prompt exacto para la ventana nueva.
---

# /cierre-charla

1. **Decisiones** (fecha = hoy): cada decisión de Nacho de esta charla → plan que corresponda, sección
   `## Decisiones de Nacho (<fecha>)` (crearla si no existe; una línea numerada por decisión).
   - Si cambia una tarea existente (modelo, alcance, orden) → editar TAMBIÉN esa tarea (su Nota o su
     alcance), para que no se contradigan.
   - Si pide algo nuevo que no tiene tarea → sumarlo a la `⬜` del mismo código si entra en su
     sesión, o tarea nueva `⬜` con su Nota (si es vago, interpretarlo con lo que se sabe de Nacho y anotar
     lo asumido). Sin plan → `/planificar`.
2. **¿Quedó algo a medias?** (`git status`, tarea empezada). Si no quedó nada, saltear.
   - Si se puede cerrar ya y el uso alcanza (`get_usage`: hay margen para pruebas + commit) → `cerrar-tarea`.
   - Si no: tarea `🟡` + `> ⏸ Cortado (fecha): dónde quedó y cómo seguir`.
3. **Commit** de lo guardado (aunque sea solo el plan) si el proyecto autoriza git: `"Decisiones: …"`.
4. **Responder** (corto):
   - Qué quedó guardado (decisiones, estado de la tarea).
   - Lo que quedó sin ejecutar y con qué modelo.
   - **Prompt exacto** SOLO de la próxima tarea, en un bloque de código para copiar:
     ```
     Ventana nueva, <modelo>, esfuerzo <x>: "Hacé la tarea Tn de docs/PLAN-<tema>.md"
     ```
