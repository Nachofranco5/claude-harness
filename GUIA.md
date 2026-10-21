# Guía rápida — qué tengo y cómo se usa
Escribí `/` en el cuadro de texto y aparece todo. Casi todo se puede pedir también con palabras (columna «o decí»).

## Trabajo de todos los días (`harness-nacho`)
| Escribí | Para qué | O decí |
|---|---|---|
| `/harness-nacho:tarea T5 docs/PLAN-x.md` | Hace UNA tarea del plan y la cierra (pruebas, ✅, commit) | «Hacé la tarea T5 de docs/PLAN-x.md» · «la próxima tarea» |
| `/harness-nacho:planificar <tema>` | Pedido grande → plan con tareas de una ventana (no ejecuta) | «planificá X» |
| `/harness-nacho:cerrar-tarea` | Checklist de cierre (lo usa Claude solo al terminar) | — |
| `/harness-nacho:cierre-charla` | Guarda tus decisiones en el plan y te da el prompt para seguir | «listo» · «dejémoslo acá» |
| `/harness-nacho:proyecto-nuevo` | Arma un proyecto desde una carpeta vacía (git, repo privado, CLAUDE.md) | «arrancá un proyecto nuevo acá» |
| `/harness-nacho:podar` | Achica la memoria del proyecto (gasta menos por ventana) | «podá el proyecto» |
| `/harness-nacho:plugins-proyecto` | Deja prendidos solo los plugins útiles en ese proyecto | «revisá los plugins» |
| `/harness-nacho:automejora` | Novedades de Claude, skills/mods nuevos, mejoras y críticas (el tablero avisa cada semana) | «¿hay algo nuevo?» · «mejorate» |

## Modo automático (`automatico`)
| Hacé | Qué pasa |
|---|---|
| En una ventana **Opus**: «estamos en 55 % semanal, hasta 65 seguí en automático» · o botón **🤖 Automático** · o `/automatico:automatico hasta 65 %` | Abre cada tarea de la cola en ventana nueva con su modelo, verifica y sigue hasta el tope |
| «hasta 80 % de las 5 h» | Igual, con tope sobre la ventana de 5 h |
| «pará» · botón **🤖 Auto ON** | No arranca más tareas (la que corre termina sola) |
| Te avisa al celu | Cuando para: tope, falla o algo que necesita que decidas |

## En pantalla
| Qué | Cómo |
|---|---|
| Semáforo (🔴 trabajando / 🟢 listo) | Botón **Semáforo** o `/semaforo` |
| Barra de uso 5 h / semanal | Sola, arriba del cuadro de texto |

## Lo que hace Claude solo (no hace falta pedirlo)
- **Tablero** al abrir cada ventana: tareas, git, uso, pruebas pendientes, avisos.
- **Guardianes**: no termina sin CHANGELOG/pruebas/commit; frena lecturas caras; avisa plugin viejo.
- **Subagentes**: `explorador` (busca barato) y `verificador` (corre las pruebas). Podés pedirlos: «usá el explorador para…».

## Por proyecto
- Jarvis: `/buscar-modelos <llm|stt|voz|palabra|todo>` · «¿salió algo mejor?»

## De fábrica (Claude Code), los útiles
| Escribí | Para qué |
|---|---|
| `/code-review` | Busca bugs en lo que cambió (`/code-review high` = más a fondo) |
| `/simplify` | Limpia el código que cambió (sin buscar bugs) |
| `/security-review` | Revisión de seguridad de lo pendiente |
| `/fewer-permission-prompts` | Menos carteles de «¿permitís?» |
| `/loop 10m <pedido>` | Repite algo cada X tiempo |
| `/compact` · `/clear` | Resume la charla para liberar memoria · empieza de cero en la misma ventana |
| «hacé un mod que…» | Cambios a la interfaz de Claude (como el semáforo) |
| «¿en qué se me fueron los tokens?» | Explica el gasto de la ventana |
| Modelo y esfuerzo | Menú de la app, ANTES de escribir (no cambiar a mitad de ventana) |

## Reglas que conviene recordar
- Una tarea = una ventana nueva, con el modelo que dice su Nota.
- Las pruebas que te tocan están en `docs/PRUEBAS-PENDIENTES.md` de cada proyecto: hacelas todas juntas al final.
- Cambiar reglas o mods: pedíselo a Claude; vive en este repo y llega solo a las otras PCs.
