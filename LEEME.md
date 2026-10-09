# claude-harness — el "cómo trabaja la IA" de Nacho

Marketplace privado de Claude Code con 3 plugins:

| Plugin | Qué hace |
|---|---|
| `harness-nacho` | Al abrir cada ventana: mete las **reglas de trabajo** (`plugins/harness-nacho/reglas.md`) y un **tablero** del proyecto (próxima tarea del plan, si quedó algo a medias, git, pruebas pendientes, uso del plan). La IA arranca sabiendo todo sin leer archivos. |
| `uso-widget` | Barra de uso 5 h / semanal arriba del cuadro de texto. |
| `semaforo` | Círculo rojo (trabajando) / verde (listo). |

## Instalar en una PC (una sola vez)
En una terminal de Claude Code:
```
/plugin marketplace add Nachofranco5/claude-harness
/plugin install harness-nacho@claude-harness
/plugin install uso-widget@claude-harness
/plugin install semaforo@claude-harness
```
Y crear `%USERPROFILE%\.claude\CLAUDE.md` con 1 línea (ej. "Reglas: plugin harness-nacho"): el plugin se
engancha a ese bloque de instrucciones (así no se mete en subagentes que no cargan CLAUDE.md).

O, más fácil, en una ventana de Claude Code de la PC nueva: *"Instalá mi harness: marketplace
Nachofranco5/claude-harness con auto-update, plugins harness-nacho, uso-widget y semaforo a nivel usuario,
y creá el ~/.claude/CLAUDE.md mínimo que dice el LEEME del repo."*

Después, en `/plugin` → Marketplaces → `claude-harness` → **Enable auto-update**: cada vez que arranca,
Claude Code baja lo nuevo solo. (Repo privado: para que la actualización automática en segundo plano
funcione, la PC necesita estar logueada en GitHub — `gh auth login` — o tener `GITHUB_TOKEN`.)

## Comandos (skills) y ayudantes de `harness-nacho`
Se escriben con el prefijo del plugin (`/harness-nacho:tarea T5`) o se piden con palabras
("hacé la tarea T5 de docs/PLAN-x.md"): la IA las elige sola por su descripción.

| Comando | Para qué |
|---|---|
| `tarea <id>` | hace UNA tarea del plan: lee solo esa, chequea modelo/uso/dónde, la ejecuta y la cierra |
| `cerrar-tarea` | checklist de cierre: pruebas, CHANGELOG, pruebas pendientes, manual, ✅, commit+push, Consejos |
| `planificar <tema>` | pedido grande → `docs/PLAN-<tema>.md` con tareas de una sesión (no ejecuta) |
| `proyecto-nuevo` | carpeta vacía → CLAUDE.md corto, `.claude/settings.json`, `.claude/harness.json`, git, repo privado |
| `cierre-charla` | vuelca decisiones al plan y da el prompt exacto para la ventana nueva |
| `podar` | CLAUDE.md ≤ 100 líneas, detalle a `.claude/rules/`, CHANGELOG/planes viejos al archivo |
| `plugins-proyecto` | prende solo los plugins que sirven en ese proyecto (incluye los `@synced` de claude.ai) |

Subagentes: `explorador` (Haiku, solo lectura, búsquedas baratas) y `verificador` (Sonnet, corre las
pruebas de `.claude/harness.json` y resume). `.claude/harness.json` = config del harness por proyecto
(molde en `plugins/harness-nacho/skills/proyecto-nuevo/plantillas/harness.json`).
Ver qué carga y cuánto cuesta: `claude --plugin-dir plugins/harness-nacho plugin details harness-nacho@inline`.

## Cambiar las reglas
Editar `plugins/harness-nacho/reglas.md` → subir la versión en `plugin.json` → commit + push.
Las otras PCs lo reciben solas al arrancar. Probar el tablero: `claude plugin test plugins/harness-nacho`.

## Marcas que entiende el tablero
- Plan (`docs/PLAN-*.md`): títulos de tarea con `⬜` pendiente · `🟡` a medias · `✅` hecha;
  `> ⏸ Cortado (fecha): …` debajo de una tarea 🟡; `(cerrado)` en el título del plan lo oculta.
- Pruebas (`docs/PRUEBAS-PENDIENTES.md`): líneas que empiezan con `⬜` (o `- [ ]`).
