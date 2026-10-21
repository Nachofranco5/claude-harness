---
name: planificar
argument-hint: "<tema o pedido>"
description: Convertir un pedido grande o ambiguo en docs/PLAN-<tema>.md con tareas de UNA sesión (alcance, no entra, terminado =, cómo se prueba, Nota para Nacho con modelo/esfuerzo/dónde). No ejecuta nada: deja el plan y espera OK.
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
   **Juntar lo compatible**: si dos tareas (nuevas o ya en el plan) tocan el mismo código y entran juntas en una
   sesión, fusionarlas (anotar «se hace junto con Tx»); también una sola corrida de pruebas caras/bancadas para
   varias tareas. No juntar lo que no comparte código.
5. **Commit aparte del plan** según `git` de `.claude/harness.json` (`"Plan <tema>: …"`). No arrancar
   ninguna tarea.
6. **Responder**: resumen del plan en 3–6 líneas + decisiones pendientes + Próximo paso con el prompt exacto
   de T1 («Ventana nueva, <modelo>, esfuerzo <x>: "Hacé la tarea T1 de docs/PLAN-<tema>.md"»).

## Molde
```markdown
# PLAN <tema> — <objetivo en 1 línea> (pedido de Nacho, <fecha>)
Cada tarea es de UNA sesión nueva: "Hacé la tarea Tn de docs/PLAN-<tema>.md".
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
