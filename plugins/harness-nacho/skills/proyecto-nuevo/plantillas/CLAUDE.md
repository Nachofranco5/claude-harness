# CLAUDE.md — <Nombre> (leer ESTO primero; alcanza para trabajar)
Las reglas generales las trae el plugin `harness-nacho`. Acá va SOLO lo propio de este proyecto (≤ 100 líneas).
El detalle de cada área vive en `.claude/rules/<área>.md` (se carga solo al tocar esos archivos).

## 1. Qué es
<qué hace, para quién, por qué importa — 2–4 líneas>

## 2. Stack
<lenguaje/runtime + por qué en 1–2 líneas. Portable: todo dentro de la carpeta.>

## 3. Reglas propias
- Git: al cerrar cada tarea commit en español <+ push | sin push> (ver `.claude/harness.json`).
- <reglas que solo aplican acá>

## 4. Mapa (1 línea por archivo)
| Archivo | Qué hace |
|---|---|
| `<archivo>` | <qué hace> |

## 5. Cómo probar
- Tests: `<comando>` (el mismo que `pruebas` en `.claude/harness.json`).
- App real: <cómo se abre>.

## 6. Docs vivos
`CHANGELOG.md` · `docs/PRUEBAS-PENDIENTES.md` · `docs/PLAN-*.md` · `VERSION`
