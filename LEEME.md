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
Después, en `/plugin` → Marketplaces → `claude-harness` → **Enable auto-update**: cada vez que arranca,
Claude Code baja lo nuevo solo. (Repo privado: para que la actualización automática en segundo plano
funcione, la PC necesita estar logueada en GitHub — `gh auth login` — o tener `GITHUB_TOKEN`.)

## Cambiar las reglas
Editar `plugins/harness-nacho/reglas.md` → subir la versión en `plugin.json` → commit + push.
Las otras PCs lo reciben solas al arrancar. Probar el tablero: `claude plugin test plugins/harness-nacho`.

## Marcas que entiende el tablero
- Plan (`docs/PLAN-*.md`): títulos de tarea con `⬜` pendiente · `🟡` a medias · `✅` hecha;
  `> ⏸ Cortado (fecha): …` debajo de una tarea 🟡; `(cerrado)` en el título del plan lo oculta.
- Pruebas (`docs/PRUEBAS-PENDIENTES.md`): líneas que empiezan con `⬜` (o `- [ ]`).
