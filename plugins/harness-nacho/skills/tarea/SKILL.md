---
name: tarea
argument-hint: "<T5 | H2 [docs/PLAN-x.md] | próxima>"
description: Hacer UNA tarea de un plan docs/PLAN-*.md ("/tarea T5", "hacé la tarea H2 de docs/PLAN-x.md", "la próxima tarea"). Lee solo esa tarea por rango, chequea modelo/uso/dónde, la ejecuta y la cierra.
---

# /tarea <id> [plan]

## 1. Ubicar la tarea (sin leer el plan entero)
- `<id>` = T5, H2, T3b… Sin id o "la próxima" = la que trae el tablero.
- Un solo Grep `^## ` con `-n` sobre el plan (o sobre `docs/PLAN-*.md` si no se dijo cuál; si el id está en
  más de uno, preguntar): da la línea de la tarea y la del título siguiente. Leer SOLO ese rango + las
  primeras ~5 líneas del plan. "Decisiones" solo si la tarea la nombra o hay dudas.

## 2. Antes de tocar nada (si algo falla, decirlo y frenar)
- **Estado**: `✅` → avisar, no rehacer. `🟡` con `> ⏸ Cortado…` → seguir desde ahí y borrar esa línea.
- **Modelo** (el tuyo lo dice el system prompt; orden Haiku < Sonnet < Opus): si es MÁS DÉBIL que el de la
  Nota → avisar y no arrancar (salvo que Nacho insista). Si es más fuerte → seguir y decirlo en Consejos.
- **Todo local**: se hace en esta PC aunque un plan viejo diga «Dónde: nube». Si esta sesión corre en la nube
  (sin Windows/GPU/archivos fuera del repo) → frenar: Nacho trabaja solo en local.
- **Dependencias**: si nombra tareas anteriores que siguen `⬜`, avisar.
- **Uso**: `get_usage` (o `/usage`). Ventana de 5 h > 80 % o semanal > 90 % → elegir un punto de corte
  seguro ANTES de empezar y no arrancar pasos que no se pueden dejar a medias. Si no se puede medir,
  decirlo y seguir.
- **Calor/costo**: si la tarea usa mucha GPU/CPU o muchos subagentes, avisar costo y tiempo primero
  (y lo que pida el CLAUDE.md del proyecto, ej. ventilador).

## 3. Hacer
- Contexto: el `CLAUDE.md` del proyecto (ya cargado) + su mapa; las reglas de `.claude/rules/` se cargan
  solas al tocar esos archivos. No recorrer el proyecto. Búsqueda amplia → subagente `explorador`.
- Alcance EXACTO de la tarea ("No entra" se respeta). Lo que veas de paso → al plan: sumado a la `⬜`
  del mismo código si entra en su sesión, o tarea `⬜` nueva con su Nota (nunca una sección «Ideas extra»).
- Si resulta más grande que una sesión: partirla en el plan (T3a ⬜ / T3b ⬜, cada una con su Nota) y hacer
  la primera.
- Si hay que cortar: marcar `🟡` en el título y debajo `> ⏸ Cortado (fecha): dónde quedó y cómo seguir`;
  commit de lo hecho si el proyecto lo autoriza.

## 4. Cerrar
Invocar la skill `cerrar-tarea` (no cerrar "a mano": ahí está la checklist completa).
