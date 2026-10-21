# claude-harness — el "cómo trabaja la IA" de Nacho
Marketplace público de Claude Code (sin secretos: nunca subir tokens ni datos de clientes acá): `harness-nacho` (reglas de trabajo + tablero del proyecto al abrir cada
ventana + skills + guardianes), `uso-widget` (barra de uso 5 h / semanal) `semaforo` (rojo trabajando /
verde listo) y `automatico` (encadena las tareas del plan solo, hasta un tope de uso).

## PC nueva (una sola vez)
1. Instalar la app de escritorio de Claude, Git y GitHub CLI. En una terminal: `gh auth login`, después
   `gh repo clone Nachofranco5/claude-harness "$HOME\Documents\Trabajos\claude-harness"`.
2. Doble clic en **`INSTALAR.bat`**: agrega el marketplace, instala los 4 plugins, prende la
   auto-actualización y crea el `~\.claude\CLAUDE.md` mínimo (no pisa nada; se puede repetir).
3. Cerrar Claude del todo y abrirlo. La primera respuesta en cualquier proyecto ya trae el tablero.

O decirle a Claude: *"Corré `Documents\Trabajos\claude-harness\instalar.ps1` y decime qué salió."*
Si una PC quedó con una versión vieja: repetir `INSTALAR.bat` (también actualiza).

## Nube (claude.ai/code, una sola vez por entorno)
La nube no instala los plugins del repo. En claude.ai/code → entorno (ícono ⚙ del entorno) → **Setup script**, pegar:
`curl -fsSL https://raw.githubusercontent.com/Nachofranco5/claude-harness/main/nube/setup.sh | bash`
Deja reglas + skills (sin prefijo: `/tarea`) + subagentes en cada sesión de todos los repos. Sin tablero,
guardianes ni barras (no hay app). La nube guarda el resultado hasta ~7 días: para bajar reglas nuevas ya,
editar el Setup script (agregar o quitar un espacio) y guardar.

## Comandos de `harness-nacho` (`/harness-nacho:<comando>` o pedidos con palabras)
| Comando | Para qué |
|---|---|
| `tarea <id>` | hace UNA tarea del plan (solo esa; chequea modelo/uso/dónde) y la cierra |
| `cerrar-tarea` | pruebas, CHANGELOG, pruebas pendientes, manual, ✅, commit+push, Consejos |
| `planificar <tema>` | pedido grande → `docs/PLAN-<tema>.md` con tareas de una sesión (no ejecuta) |
| `proyecto-nuevo` | carpeta vacía → CLAUDE.md, `.claude/settings.json` + `harness.json`, git, repo privado |
| `cierre-charla` | vuelca decisiones al plan y da el prompt exacto para la ventana nueva |
| `podar` | CLAUDE.md ≤ 100 líneas, detalle a `.claude/rules/`, lo viejo al archivo |
| `plugins-proyecto` | deja prendidos solo los plugins útiles en ese proyecto |
| `automejora` | novedades de Claude/skills/mods, mejoras y críticas al harness (el tablero avisa cada semana; registro en `docs/AUTOMEJORA.md`) |

**Todo lo que hay y cómo se usa, en una página: [`GUIA.md`](GUIA.md).**

Subagentes: `explorador` (Haiku, búsquedas baratas) y `verificador` (Sonnet, corre las pruebas).
Config por proyecto: `.claude/harness.json` (molde en `plugins/harness-nacho/skills/proyecto-nuevo/plantillas/`).

## Modo automático (`automatico`)
En una ventana **Opus** del proyecto: «estamos en 55 % semanal, hasta 65 seguí en automático» o el botón **🤖 Automático**
sobre el cuadro de texto (escribe la frase; Enter). Esa ventana coordina: abre cada tarea de la cola del plan en una ventana NUEVA con el
modelo/esfuerzo de su Nota, espera, verifica ✅ + commit y sigue, hasta el tope, una falla o algo que necesite a
Nacho (avisa al celu). Apagar: «pará» o el mismo botón (la tarea en curso termina sola). Opus porque una ventana
solo puede abrir otras de su modelo/esfuerzo o más baratas. Gasto por tarea: `~/.claude/automatico/registro.jsonl`.

## Guardianes (hooks; se apagan por proyecto en `harness.json` → `guardianes`)
- **Cierre**: si se cambió código y falta CHANGELOG/pruebas/manual/commit/push, la IA no puede terminar.
- **Lectura cara**: leer entero un archivo de más de 600 líneas se frena ("usá Grep o un rango").
- **Versión atrasada**: el tablero avisa si la ventana usa un plugin viejo o hay versión sin publicar.

## Cambiar las reglas o los mods
Editar `plugins/harness-nacho/reglas.md` (o el mod) → subir `version` en su `plugin.json` → commit + push.
Las otras PCs lo bajan solas al arrancar. Probar: `claude plugin test plugins/harness-nacho`.
Marcas del tablero: tareas `⬜` / `🟡` (+ `> ⏸ Cortado…`) / `✅` en `docs/PLAN-*.md`, `(cerrado)` en el
título del plan; pruebas = títulos o líneas con `⬜` en `docs/PRUEBAS-PENDIENTES.md` (solo pendientes, en orden; lo hecho va a `docs/PRUEBAS-REALIZADAS.md`).
