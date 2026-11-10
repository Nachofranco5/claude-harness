# Automejora del harness (skill `/harness-nacho:automejora`)
Última pasada: 2026-11-10
Claude Code visto: 2.1.319 en el CHANGELOG (la app trae 2.1.309; `claude` de consola = `~\.local\bin\claude.cmd`)
A re-medir: **TokenEconomizer el 2026-11-16** con `medir_tokens.py --corte 2026-11-01T18:26` + `te --host claude status` (si no ahorró > 0,5 % → sacarlo; ver `docs/MEDICION-tokens.md`).
Descartado (no volver a proponer salvo que cambie algo): de la 1.ª lista corta (2/11): pixelfx, founder-skill, bama, animate, day-trader-skill, replica-skill, cleanyourtv, free-my-tv (un dominio, no el harness) · new-term-radar (duplica `buscar_novedades.py`) · my-claude-code-mods (mods personales) · CodeRabbit (cuenta externa) · groundwork-specflow, Roll Call, AI Skills (duplican el harness) · LocalLore (duplica la memoria) · Kobiton (móvil) · Exa (ya hay WebSearch) · coding-agent-skills, py-pit (pisan superpowers/uv) · claude-telegram-voice, plugin oficial de Telegram (Jarvis tiene su bot) · code-review-harness (lo cubre el verificador) · AnythingMCP (nube de terceros) · (10/11) best-agent-memory-mcp (ranking; duplica la memoria) · agent-autoloop (duplica `automatico`) · champion-kit, xcode (otro uso).

## Historial (lo más nuevo arriba; ≤ 8 líneas por pasada)
### 2026-11-10 — pasada corta (lista del 9/11)
- Hecho: `.claude/settings.local.json` al `.gitignore` del harness (HN 7/11: «No preguntar de nuevo» guarda comandos con
  contraseñas y 1.122 repos públicos los subieron). Revisados Jarvis, Karaoke, reels: ya lo ignoran; ningún settings con secretos. La plantilla de `proyecto-nuevo` ya lo traía.
- Claude Code 2.1.317–319: nada rompe el harness. `permissions.denyInsteadOfPrompting` (negar en vez de esperar un permiso)
  vale solo en terminal/subagentes/teammates, no en sesiones de la app → no sirve al modo automático; y los permisos los toca Nacho.
- A/B Sonnet (I15, I17c, T65b) sigue sin datos: ninguna de las tres se hizo todavía.
- Pendiente de Nacho: reglas 23 KB > tope 21 → `/harness-nacho:podar`.
### 2026-11-02 (0.3.20) — Nacho encontró TokenEconomizer en YouTube antes que esta skill
- Por qué falló: solo miraba catálogos (SearchPlugins/registro MCP) con palabras de los proyectos (voz, Windows…); TE es
  un repo de GitHub (13/10, tema `claude-code`, 4.380 ⭐) que nunca entra ahí. Y solo corría si Nacho aceptaba el aviso.
- Hecho: `scripts/buscar_novedades.py` (sin LLM: GitHub por temas con ⚑ para lo del harness, marketplaces, awesome-claude-code,
  CHANGELOG, Hacker News; RSS de YouTube opcional) + el tablero lo dispara cada 7 días en segundo plano y avisa con la cuenta.
  Backtest al 20, 29 y 31/10: TE sale 3.º, 2.º y 1.º de la lista ⚑ (estrellas de hoy: GitHub ya no da la fecha de cada una);
  la lista cuesta ~650 tokens. Tests del plugin: 32/32 (nuevo: `register.ts` carga).
- Hecho: `scripts/medir_tokens.py` + `docs/MEDICION-tokens.md`: TE ahorró 0 hasta ahora, techo ~0,1–1 %, +0,5 s por herramienta.
- Hecho (changelog 2.1.316: los subagentes heredan el esfuerzo de la ventana): `explorador` effort low, `verificador` medium.
- Propuesto: lista de skills por proyecto (~6k tokens fijos, 1,8 % del gasto) y podar el «Mapa» del CLAUDE.md de Jarvis (~4,5k, 1,3 %).
### 2026-10-29 (0.3.17)
- Hecho: tablero avisa con ≥ 6 pruebas pendientes y pide ofrecer la tanda ANTES de la próxima tarea (Jarvis 21–29/10: 17 de 41 versiones arreglaron algo ya «hecho»; 13 temas fallaron en ≥ 2 tandas; T14 🟡 desde 14/10 esperando solo la prueba). Test nuevo, 12/12.
- Hecho: regla «editar con Edit/Write, no heredoc ni `sed -i`; borrar = ELIMINAR/ o Papelera, no `rm`» (heredocs metieron caracteres de control en T53/T58d; 2.1.309: `sed` no se deshace con `/rewind` y `rm` se niega en bypass).
- Claude Code 2.1.307–312: nada rompe el harness (sin hooks PowerShell, sin `SubagentStop`, ningún mod lee «session limit»). Útil: pasado 200K compacta y sigue (antes cortaba); `ultrathink` = xhigh.
- Gasto: semanal 87 % con 22 % de la semana por delante (adelantado). Modo automático: 30/32 tareas Opus, las 15 últimas en alto (~3,8 %/tarea; Opus medio ~2,8 %; Sonnet 1 %, 2/2 ok). Notas de los planes: 67 Opus / 15 Sonnet.
- **Aceptado por Nacho — A/B de modelo EN CURSO**: Jarvis I15, I17c y T65b (eran Opus · medio) van con Sonnet · alto. La próxima pasada compara en `registro.jsonl` (% semanal por tarea vs Opus medio ~2,8 %) y en `PRUEBAS-REALIZADAS` (fallas de esas tareas); si empata → `planificar`: Sonnet · alto por defecto en lo bien especificado.
- context7 falló al arrancar (OAuth `invalid_target`) y se reconectó solo más tarde en la misma sesión: vigilar si se repite.
### 2026-10-21 (0.3.12, automatico 0.1.5) — decisiones de Nacho tras la pasada
- «Todo local»: sin sesiones en la nube; las Notas dicen **Necesita** en vez de **Dónde**; `tarea` y `automatico` toman «nube» vieja como local.
- Sin «Ideas extra»: lo visto de paso va directo al plan (o no se anota). Jarvis: ~100 ideas repartidas en T52–T57, I10, I11.
- Regla de MCP: solo cuando hacen falta y con consultas acotadas. Jarvis suma MCP de Hugging Face y Microsoft Learn (conectados, probado con `claude mcp list`).
- Pruebas: «Avisame» pide la frase exacta y la respuesta cuando falla.
### 2026-10-21 (0.3.11)
- Hecho: tablero separa las tareas `> ⏸ EN PAUSA` (decisión de Nacho) de las 🟡 reales: no salen como «A MEDIAS» ni como próxima, van en una línea. Antes Jarvis mostraba «A MEDIAS: T8» (pausada por cero nube). Test nuevo, 25/25.
- Hecho: anti-bucle también para pruebas de Nacho que fallan 2 veces en el mismo tema (Jarvis 19/10 y 21/10: Telegram, multimedia, «abrí X», Brave, clima). `podar` repasa «Ideas extra» > 20 ítems (Jarvis: 47, 2 hechas).
- Claude Code 2.1.305–306: nada rompe el harness (hooks son módulos de mod, no hay permisos `mcp__` por prefijo). Útil saber: compactación en reposo > 200K, aviso al retomar charla inactiva, fork de subagentes por defecto.
- Propuesto: MCP de Hugging Face (para `/buscar-modelos`) y Microsoft Learn (APIs de Windows) en Jarvis.
- Gasto: semanal 59 % con 62 % de la semana pasada: en ritmo. Sin `registro.jsonl` del modo automático todavía.
