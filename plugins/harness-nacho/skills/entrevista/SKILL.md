---
name: entrevista
description: >-
  Entrevista corta a Nacho ANTES de una tarea o lote (o cada tanto) para sacarle las dudas reales sobre enfoque,
  prioridades, gustos y lo que falta saber, en vez de inventarlo. Solo preguntas serias que cambian lo que se va a
  hacer, nunca relleno. Usar con "/entrevista", "entrevistame", "preguntame lo que necesites", al arrancar un lote
  con decisiones abiertas, o cuando aparece una duda que no se puede resolver con el código, el plan o la memoria.
---

# /entrevista

Regla de fondo (vale SIEMPRE, con o sin esta skill): **ante una duda que no se resuelve con el código, el plan, la
memoria o la doc, se pregunta ANTES de actuar; nunca se inventa** (un supuesto inventado = un error que Nacho paga
después). Lo que sí se puede averiguar solo, se averigua: preguntarlo es hacerle perder tiempo.

## Cuándo
- Al arrancar una tarea/lote con decisiones abiertas (alcance ambiguo, dos caminos razonables, un gusto suyo).
- Cada tanto (≥ 1 semana sin entrevista, o tras 3+ correcciones suyas sobre lo mismo): ronda sobre prioridades y
  forma de trabajar.
- En medio de una tarea, si aparece una duda que bloquea: UNA pregunta, en ese momento.
- NO: si todo está claro, si la respuesta está en `Decisiones` del plan/memoria, o si Nacho dijo «no preguntes»
  (ahí se asume la recomendada y se anota como supuesto).

## Cómo
1. **Juntar antes** (barato): plan del lote, `Decisiones` del plan, memoria, `PRUEBAS-REALIZADAS`. Tachar toda duda
   que ya tenga respuesta.
2. **Filtrar**: cada pregunta pasa SOLO si cumple las tres:
   - es de Nacho (gusto, prioridad, plata, privacidad, riesgo que acepta), no algo técnico que decide Claude;
   - su respuesta cambia lo que se hace (si cualquier respuesta lleva a lo mismo, no se pregunta);
   - no se puede averiguar leyendo, midiendo o probando.
3. **Preguntar** con `AskUserQuestion`: máx. 4 por ronda, cada una con 2–4 opciones concretas, la recomendada
   primera con «(Recomendado)» y qué implica cada una en una línea. Sin jerga. Si hay más de 4, las 4 que más
   cambian el resultado; el resto se asume la recomendada y se dice.
4. **Guardar** cada respuesta en el lugar más general: decisión de un proyecto → `## Decisiones (<fecha>)` del plan;
   gusto/forma de trabajar de todo proyecto → Perfil de `reglas.md` del harness (commit + push); de un proyecto →
   su memoria. Nunca duplicar: si contradice algo viejo, se corrige lo viejo.
5. **Seguir** con la tarea usando las respuestas. Al entregar: «Pregunté X, Y; asumí Z (recomendada)».

## Ejemplos de preguntas que SÍ pasan
- «Para avisarte que bajó un precio: ¿por Telegram al toque o en el resumen del día?»
- «Este arreglo puede ir rápido (cubre tu caso) o completo (+1 h, cubre 6 casos más): ¿cuál?»

## Que NO pasan (relleno)
- «¿Querés que lo pruebe?» (siempre se prueba) · «¿Uso Python?» (lo decide Claude) · «¿Está bien el plan?» (para
  eso está el OK del plan) · cualquier cosa ya respondida en `Decisiones`.
