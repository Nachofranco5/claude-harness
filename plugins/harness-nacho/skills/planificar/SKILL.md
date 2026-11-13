---
name: planificar
argument-hint: "<tema o pedido>"
description: >-
  Convertir un pedido grande o ambiguo en docs/PLAN-<tema>.md con tareas de UNA sesión (alcance, no entra, terminado =, cómo se prueba, Nota para Nacho con modelo/esfuerzo/dónde). No ejecuta nada: deja el plan y espera OK.
---

# /planificar <tema o pedido>

0. **¿Hace falta plan?** Si el pedido entra en una sola sesión y no es ambiguo, decirlo y ofrecer hacerlo
   directo (o un plan de 1 tarea). No inflar con tareas triviales.
1. **Contexto mínimo**: `CLAUDE.md` (ya cargado), `.claude/harness.json`, lista de `docs/PLAN-*.md` abiertos
   (¿hay dependencias o solapes con este?). Sección Stack solo si es el primer plan del proyecto.
2. **Entender antes de escribir.** Si el pedido es flojo, contradictorio o el enfoque está mal: decirlo y
   proponer el correcto. Lo que es de Nacho decidir → pocas preguntas juntas (AskUserQuestion), con
   opciones y la recomendada primero. Si dijo "no preguntes": dejarlas en "Decisiones de Nacho
   (pendientes)" con la recomendada, que es lo que se asume mientras no conteste.
   Lo técnico lo decidís vos con evidencia (código, doc, web), respetando las reglas permanentes
   (portable: todo adentro salvo que afuera rinda más, con lista + `migrar`; .gitignore).
3. **Medir lo que aporte** (tamaños, tiempos, tokens, uso) y citarlo; si no aporta nada, saltear.
   Búsquedas amplias → subagente `explorador`.
4. **Escribir `docs/PLAN-<tema>.md`** con el molde de abajo. Cada tarea entra en UNA sesión; si no, partirla
   (T3a/T3b). Orden por dependencias; marcar cuáles son independientes.
   **Lotes** (regla «Lotes»): la cola se escribe como LOTES (L1, L2…) = tareas que tocan el mismo código y entran
   juntas en una sesión, con UNA Nota (modelo/esfuerzo/necesita) por lote y una sola corrida de pruebas caras/bancadas.
   No juntar lo que no comparte código. Una sola cola vigente en la cabecera; la vieja → `docs/archivo/`.
   Tabla: `| Lote | Tareas (mismo código) | Qué gana Nacho | Modelo | Código |`; «Código» = archivos/carpetas que toca
   (`nucleo/router.py` · `interfaz/web/`), con «aparte: motivo» si de verdad no se puede juntar con otro que toca lo
   mismo. El tablero lee esa columna y avisa dos lotes ⬜ con el mismo código. Al SUMAR tareas (tanda de pruebas,
   ideas): primero buscar el lote ⬜ con su código; lote nuevo solo si no hay ninguno.
   **Antes de dar la cola por buena** (Nacho, 2026-11-13: T56 iba sola y usaba la misma grabación de su voz que N2;
   V4 sola y regeneraba las mismas frases que N1): «Código» = rutas de verdad (archivo o carpeta, nunca «textos de
   todo» ni «diseño»), y por cada lote de UNA tarea preguntarse qué COMPARTE con otro aunque no sea un archivo: la
   misma grabación o dato de Nacho, lo mismo que se regenera, la misma bancada cara. Si comparte → al mismo lote.
   «aparte: motivo» = por qué NO entra en la misma ventana (no entra por tamaño, espera algo de Nacho, necesita que
   el otro esté hecho), nunca «es otro modelo». `docs/RESUMEN-pendientes.md` repite la cola TAL CUAL: una línea
   por lote, `N. **Lx · T1 · T2** · qué gana`, mismas tareas y mismo orden (el tablero avisa si difiere).
   **Pruebas**: si una tarea solo se puede probar con Nacho porque falta una herramienta (simulador, lector de
   registro), el primer lote la construye.
   **Resumen**: sumar cada tarea nueva a `docs/RESUMEN-pendientes.md` (crearlo si falta; ver regla «Resumen de
   pendientes»): una línea en criollo, en Importante en su lugar por valor o en Superfluo.
5. **Commit aparte del plan** según `git` de `.claude/harness.json` (`"Plan <tema>: …"`). No arrancar
   ninguna tarea.
6. **Responder**: resumen del plan en 3–6 líneas + decisiones pendientes + Próximo paso de T1. Si no quedan
   decisiones pendientes: **tarjeta** de T1 (ver «Próximo paso = TARJETA» en las reglas); si las hay, primero
   el OK de Nacho y la tarjeta después. Si T1 pide más modelo/esfuerzo que esta ventana: el prompt exacto
   («Ventana nueva, <modelo>, esfuerzo <x>: "Hacé el lote L1 de docs/PLAN-<tema>.md"»).

## Molde
```markdown
# PLAN <tema> — <objetivo en 1 línea> (pedido de Nacho, <fecha>)
Cada LOTE es de UNA sesión nueva: "Hacé el lote Ln de docs/PLAN-<tema>.md".
Al terminar cada una: /cerrar-tarea.

## Diagnóstico / contexto
<qué hay hoy y qué falla, con números>

## Stack  <!-- solo en el primer plan del proyecto -->
<cuál y por qué en 2–3 líneas; portable (todo dentro de la carpeta; lo que vaya afuera: qué, por qué rinde más, y cómo lo migra `migrar`)>

## Decisiones de Nacho (<fecha>)
<una línea por respuesta (no volver a preguntarlas). Pendientes: "- [ ] <pregunta> — recomendada: <opción> (se asume)">

## Orden recomendado
T1 → T2 y T3 (independientes) → T4

## T1 — <título>  ⬜
- Regla general: <la clase de problema en 1 línea; el pedido literal es solo un ejemplo (regla «Arreglar la CLASE»)>
- Alcance: …
- No entra: …
- Terminado = …
- Cómo se prueba: <comando o pasos; qué queda para Nacho en PRUEBAS-PENDIENTES>

> **Nota para Nacho — T1:** Modelo: <Opus|Sonnet|Haiku> · Esfuerzo: <bajo|medio|alto>. Por qué: <1 línea>.
> **Necesita:** <nada | GPU, reinicio, micrófono, algo de Nacho antes de empezar…>.
```
Sin sección «Ideas extra»: todo lo que vale la pena es una tarea (o parte de una); lo que no, no se anota.

## Criterio para la Nota
- Opus: planificar, arquitectura, bugs difíciles, decisiones que condicionan lo demás.
- Sonnet: tarea bien especificada. Haiku: mecánica (renombrar, mover, completar listas).
- Todo se hace en local (regla «Todo local»): no hay tareas «nube».
- Avisar costo/tiempo en tareas caras (horas de GPU, muchos subagentes).
