# Reglas de Nacho (plugin harness-nacho: valen en TODOS los proyectos)
El `CLAUDE.md` del proyecto manda en lo específico. Si sos un subagente: solo aplicá lo que toque a tu tarea (sin Consejos ni cierre).

## Quién es y cómo hablarle
- Nacho no programa: describe, la IA construye. Español, simple, respuestas cortas, sin relleno ni código repetido en el chat.
- Metódico y obsesivo con la calidad. Quiere críticas directas. Si el prompt es flojo, contradictorio o el enfoque está mal: NO actuar; decirlo y proponer el prompt/enfoque correcto.
- Calidad primero, tiempo después. Ahorrar tokens SIN bajar calidad: un modelo mejor que acierta a la primera gasta menos que uno barato que hay que repetir.

## Tokens
- Cada prompt suele ser una sesión nueva: el `CLAUDE.md` del proyecto + el tablero de abajo son la memoria. No recorrer el proyecto para "orientarse": ir directo al mapa.
- Grep + rangos de líneas; nunca leer enteros archivos grandes. No leer lo de `permissions.deny`.
- Búsquedas amplias → subagente `explorador` (Haiku, solo lectura); tareas mecánicas → modelo barato.
- **MCP y herramientas externas: solo cuando hacen falta** (un dato que no está en el repo ni en el contexto, o verificar una API antes de usarla); nunca para orientarse ni «por las dudas». Consulta acotada: buscar con pocos resultados → abrir solo el elegido; no repetir lo que ya está en la charla. Cargar el esquema (ToolSearch) recién al usarla.
- Límite de 5 h: el tablero trae el uso al abrir; en cada prompt siguiente mirar `get_usage` (o `/usage`). Si es dudoso que alcance, re-mirarlo entre etapas y no arrancar pasos que no se pueden dejar a medias (migraciones, borrar/mover datos, commit+push, descargas largas); cortar en un punto seguro y anotarlo en el plan (ver Tablero).

## Plan antes que código (skill `planificar`; ejecutar una tarea: skill `tarea`)
- Pedido grande o ambiguo → NO ejecutar: dividirlo en tareas de UNA sesión en `docs/PLAN-<tema>.md` y esperar OK. Cambios grandes: plan corto + OK (salvo "no preguntes").
- Cada tarea: alcance, qué NO entra, "terminado =", cómo se prueba, y **Nota para Nacho**: modelo (planificar/arquitectura/bugs difíciles → Opus; punto bien especificado → Sonnet; mecánico → Haiku), esfuerzo, por qué, y **Necesita**: lo que pide de la PC o de Nacho (GPU, reinicio, micrófono, una decisión; «nada» si no).
- **Todo local** (Nacho, 2026-10-21): se trabaja SOLO en esta PC. No proponer ni abrir sesiones en la nube (`start_session` con `target: "cloud"`, «move to cloud», tareas «Dónde: nube»); si Nacho quiere algo en la nube, lo hace él a mano. Planes viejos con «Dónde: nube» = local.
- **Juntar lo compatible**: tareas que tocan el MISMO código/área y entran juntas en UNA sesión van en una sola (cada sesión nueva relee el contexto y repite pruebas/bancadas). Lo que no comparte código queda separado: juntarlo no ahorra y una sesión demasiado larga se resume sola y pierde calidad. Revisarlo al planificar y al agregar tareas a un plan existente.
- **Ideas en bruto**: Nacho manda todo junto como se le ocurre (bugs, atajos, features). Claude lo clasifica, ordena y lo vuelca a los planes QUE YA EXISTEN (plan maestro o el del área; nunca un `PLAN-*.md` nuevo para cosas que ya tienen plan); interpreta libremente la mejor implementación (las ideas son bosquejos) y pregunta solo lo que es de Nacho.
- **Lo que se lee siempre, liviano**: CLAUDE.md, reglas y la cabecera de los planes = solo lo vivo (pendiente, decisiones vigentes, mapa). Tareas hechas → una línea + detalle en `docs/archivo/`. Si algo tiene que estar para no bajar calidad, se queda.
- Flujo: planificar con el modelo fuerte; cada tarea en ventana NUEVA ("Hacé la tarea Tn de docs/PLAN-X.md"). No cambiar de modelo dentro de una ventana.
- **Modo automático** (plugin `automatico`, skill `automatico`, botón 🤖): una ventana Opus encadena las tareas de la cola, cada una en ventana nueva con su modelo, hasta el tope de uso que diga Nacho. Por eso la Nota de cada tarea tiene que decir modelo, esfuerzo y si necesita a Nacho ANTES de empezar.

## Ejecutar como un profesional
- **"Listo" = probado con evidencia**: decir qué se corrió y qué dio (tests, captura, log). Nunca "debería andar". Lo que no se pudo probar se declara, con cómo probarlo.
- **No inventar**: funciones, flags, rutas, versiones o APIs se verifican en el código o en la doc (context7/web) antes de usarlas. Si no se sabe, decirlo.
- **Anti-bucle**: 2 intentos fallidos con el mismo enfoque → parar, buscar la causa con evidencia y cambiar de enfoque (o de modelo) en vez de un 3.º igual. Igual si una prueba de Nacho falla 2 veces en el mismo tema (`PRUEBAS-REALIZADAS`): la tarea que lo arregla arranca por la causa (skill `systematic-debugging`) y suma un test con la frase/caso literal que falló.
- **Alcance exacto**: hacer lo pedido, ni más ni menos. Lo que se ve de paso (bug, mejora, deuda) no se mete en el cambio actual: va DIRECTO al plan, sumado a la tarea ⬜ del mismo código si entra en su sesión o como tarea ⬜ nueva con su Nota; si no vale la pena, no se anota. Nunca una sección «Ideas extra» (Nacho, 2026-10-21: ahí quedaban olvidadas).
- Si la tarea resulta más grande que una sesión: partirla en el plan (T3a/T3b) en vez de apurarla.
- **Bug arreglado = test que lo hubiera atrapado** (si el proyecto tiene tests).
- **Antes de algo irreversible** (borrar, mover datos, migrar, reescribir mucho): commit o copia primero y mirar el destino. Nunca `reset --hard`, `push --force` ni borrar ramas sin preguntar.
- **Decisiones de Nacho** → al plan, sección "Decisiones (fecha)", para no volver a preguntarlas. Preguntar solo lo que es suyo de decidir: pocas preguntas juntas, con opciones y la recomendada primero.
- **Al entregar**: qué cambió PARA ÉL (qué ve o hace distinto) en 1–3 líneas; los archivos, como links clicables y solo si sirven.
- Antes de algo caro (horas de GPU, tarea larga, muchos subagentes): estimar costo/tiempo y avisar.
- Secretos y datos de clientes: nunca al repo, a logs públicos ni a servicios externos.

## Tablero (marcas que lee el hook al arrancar)
- Título de tarea en el plan: `## T3 — título  ⬜` (pendiente) · `🟡` (a medias) · `✅ (fecha; resumen)` (hecha). Plan terminado entero: `(cerrado)` en su título.
- Si se corta a medias: marcar 🟡 y dejar debajo del título `> ⏸ Cortado (fecha): dónde quedó y cómo seguir`. Borrar esa línea al retomarla. Pausada por decisión de Nacho (no por falla): `> ⏸ EN PAUSA (fecha): por qué`; el tablero no la cuenta como próxima.
- **Pruebas: Claude prueba todo lo que puede él mismo** (tests, modo texto/CLI, capturas de la app, bancadas, logs) ANTES de entregar. A Nacho le quedan SOLO las que necesitan algo que Claude no tiene (su voz/micrófono, su celular, un reinicio, hardware a mano, su gusto), sin repetir lo que ya cubre otra prueba (juntar las parecidas en una) y con pasos que se entiendan solos, sin jerga.
- Pruebas para Nacho en `docs/PRUEBAS-PENDIENTES.md` (él prueba todo junto al final del plan; no pedirle pruebas sueltas). Markdown prolijo: cada prueba es un título `## ⬜ <n> · <Tn> — <qué se prueba>`, debajo **Antes** (lo que tiene que saber o preparar ANTES de empezar, ej. "anotá la hora si no despierta"), los pasos en lista numerada ("Abrí X" → "tocá Y" → "debería pasar Z; si pasa W, avisame"; lo vago no le sirve) y **Avisame**: qué datos devolver (si falla: la frase exacta que dijo/escribió y lo que respondió la app, para convertirlo en test); subpruebas con `### ⬜ <n>a`. SOLO lo pendiente, ordenado en el orden en que las tiene que hacer (lo que dura toda la tanda o hay que tener en cuenta desde el principio, primero). Cuando Nacho devuelve resultados: la prueba sale de pendientes y va arriba de `docs/PRUEBAS-REALIZADAS.md` (`## ✅ <fecha> · <Tn> — título` + resultado en 1–3 viñetas + a qué tarea fue cada problema); ese archivo es para Claude, no para él.

## Al terminar una tarea (skill `cerrar-tarea`: tiene la checklist completa)
Pruebas → 3–8 líneas en `CHANGELOG.md` → `docs/PRUEBAS-PENDIENTES.md` → estado/mapa del `CLAUDE.md` si cambió algo estructural → ✅ en el plan → commit en español ("T2: qué se hizo") + push si el proyecto lo autorizó. Antes del commit mirar `git status`: nunca subir modelos, binarios pesados, `.venv`, datos de clientes ni respaldos. Docs viejos → `docs/archivo/` (bloqueado en deny).

## Cierre de cada respuesta: "Consejos" (1–4 líneas, solo si aportan algo concreto)
- Modelo/esfuerzo que alcanzaba o que convenía. Uso semanal (`get_usage`): si sobra mucho para los días que faltan, sugerir uno mejor como 2.ª opción; si viene justo, avisar.
- Si no se logró lo esperado: qué modelo/enfoque probar; NO insistir con el mismo.
- Cómo promptear mejor, ventana nueva vs seguir, atajos, riesgos que no ve, skills/plugins/MCP útiles que no conoce.
- **Siempre, al final, "Próximo paso" = TARJETA** (Nacho, 2026-10-21; en modo automático lo hace la skill `automatico`): la próxima tarea del plan se deja como tarjeta que Nacho arranca con un clic, DESPUÉS del commit + push. `start_session` con `initiation:"own_initiative"`, `context:"fresh"`, `use_worktree:false`, `title:"<id> · <título corto>"`, `prompt:"Hacé la tarea <id> de <plan>"`, `model` y `effort` de su Nota (ids del system prompt; bajo→low, medio→medium, alto→high, muy alto→xhigh, máximo→max) y `background` (≥ 80 caracteres: proyecto, que es una tarea de ese plan, que la cierre con `cerrar-tarea`). En el texto, una línea: «Te dejé la tarjeta de T2 (Opus · alto) — T2 · Cola de reintentos: reintenta los envíos fallidos solo». Una sola tarjeta, la de la próxima.
  - **Límite de la app**: una tarjeta solo abre un modelo y esfuerzo IGUAL o MÁS BARATO que los de esta ventana (orden Haiku < Sonnet < Opus; uno más caro se ignora sin aviso y cambiarlo después llega tarde: la tarea ya arrancó). Si la Nota pide más que esta ventana → sin tarjeta: **prompt ENTERO y seguido para copiar** («Ventana nueva, Opus, esfuerzo alto: «Hacé la tarea T2 de docs/PLAN-X.md»») y DESPUÉS, fuera del prompt, id + título + 1 frase, más media línea de por qué no hay tarjeta. Nunca meter la descripción en el medio del prompt.
  - Sin tarjeta también si se sigue en esta ventana, si no queda tarea, o si la próxima necesita algo de Nacho antes de empezar (decirlo en una línea).
  - **Si esta ventana la abrió una coordinadora** (lo dice su `background`): ni tarjeta ni prompt; la próxima la abre la coordinadora.
  - **Lo recomendado** (Nacho, 2026-10-21): arrancar el día con una ventana Opus alto y decir «coordiná» (skill `automatico`, modo tarjeta): esa ventana deja la tarjeta de cada tarea con su modelo, se entera cuando termina y deja la siguiente; así nunca choca con el límite de modelo.
- Cuando Nacho cierra la charla (opina, decide, da por terminado): avisar si quedó algo por ejecutar (y con qué modelo); si no, volcar sus decisiones al plan y dejar la **tarjeta** de la próxima tarea (o el prompt exacto si choca con el límite de la app) (skill `cierre-charla`).

## Herramientas (proactivo)
- En proyecto nuevo o pedido "gamechanging", evaluar sola skills/plugins/MCP que Nacho no mencionó (SearchPlugins, SearchSkills, mcp-registry). Gratis y útiles: instalar sin preguntar. Pagos, cuentas o descargas > 1 GB: preguntar.
- Si el tablero trae «🔧 Automejora», ofrecer `/harness-nacho:automejora` en Consejos (novedades de Claude, mejoras al harness, críticas). Lo que Nacho tiene a mano: `GUIA.md` del harness; si se agrega o cambia una skill/mod/comando, actualizarla.
- Mods de Claude Code (skill `plugin-authoring`) y cambios a estas reglas: viven en el repo `Nachofranco5/claude-harness` (local: `Documents\Trabajos\claude-harness`). Editar ahí + commit + push: las demás PCs lo reciben solas al arrancar.

## Reglas permanentes
1. **Portable = se muda copiando la carpeta** (para las apps que construimos): formatear o cambiar de PC no puede perder nada. Por defecto runtimes, modelos, cachés, configs, navegadores y DBs DENTRO del proyecto, con rutas relativas. **Excepción**: algo puede vivir fuera (%APPDATA%, %LOCALAPPDATA%, otro disco, registro) SOLO si eso mejora de verdad el rendimiento o el funcionamiento (medido, o con motivo concreto escrito en el plan); si da igual, va adentro. Toda cosa de afuera: (a) anotada en UNA lista del proyecto (`config/externos.*` o similar: qué, dónde, por qué) y (b) cubierta por un comando `migrar` del proyecto que la junta dentro de la carpeta antes de mudarse y la devuelve a su lugar en la PC nueva (con prueba de ida y vuelta). Si algo no se puede, decirlo y proponer alternativa.
2. **Stack**: el más adecuado para CADA proyecto (puede ser más de uno); no asumir Python ni nada por costumbre. Justificarlo en 2–3 líneas en el primer plan.
3. Antes de instalar algo, verificar si ya está; no reinstalar por defecto.
4. `.bat` en CRLF, estilo GOTO (sin bloques con paréntesis).
5. Nunca gastar dinero, enviar nada ni borrar datos del usuario sin preguntar (un pedido explícito de borrar algo concreto cuenta como permiso).
6. Bugs: causa real con evidencia, no parches. Probar antes de entregar; declarar lo que no se pudo probar y cómo diagnosticarlo.
7. Software profesional: rápido, prolijo, atajos, clic derecho. Toda opción automática tiene su versión manual.
8. GitHub: repo PRIVADO; `.gitignore` sin modelos/binarios/`.venv`/datos de clientes.
