# Automejora del harness (skill `/harness-nacho:automejora`)
Última pasada: 2026-10-29
Claude Code visto: 2.1.312 (el CLI no está en el PATH: la app lo trae adentro; tests del tablero corridos con node + reemplazo de `claude-code/testing`)
Descartado (no volver a proponer salvo que cambie algo): CodeRabbit (cuenta externa) · groundwork-specflow, Roll Call, AI Skills (duplican el harness) · LocalLore (duplica la memoria) · Kobiton (móvil) · Exa (ya hay WebSearch) · coding-agent-skills, py-pit (pisan superpowers/uv) · claude-telegram-voice, plugin oficial de Telegram (Jarvis tiene su bot) · code-review-harness (lo cubre el verificador) · AnythingMCP (nube de terceros).

## Historial (lo más nuevo arriba; ≤ 8 líneas por pasada)
### 2026-10-29 (0.3.17)
- Hecho: tablero avisa con ≥ 6 pruebas pendientes y pide ofrecer la tanda ANTES de la próxima tarea (Jarvis 21–29/10: 17 de 41 versiones arreglaron algo ya «hecho»; 13 temas fallaron en ≥ 2 tandas; T14 🟡 desde 14/10 esperando solo la prueba). Test nuevo, 12/12.
- Hecho: regla «editar con Edit/Write, no heredoc ni `sed -i`; borrar = ELIMINAR/ o Papelera, no `rm`» (heredocs metieron caracteres de control en T53/T58d; 2.1.309: `sed` no se deshace con `/rewind` y `rm` se niega en bypass).
- Claude Code 2.1.307–312: nada rompe el harness (sin hooks PowerShell, sin `SubagentStop`, ningún mod lee «session limit»). Útil: pasado 200K compacta y sigue (antes cortaba); `ultrathink` = xhigh.
- Gasto: semanal 87 % con 22 % de la semana por delante (adelantado). Modo automático: 30/32 tareas Opus, las 15 últimas en alto (~3,8 %/tarea; Opus medio ~2,8 %; Sonnet 1 %, 2/2 ok). Notas de los planes: 67 Opus / 15 Sonnet.
- Propuesto a Nacho: probar Sonnet 5.5 alto en las próximas 3 tareas bien especificadas (A/B contra Opus); si salen igual, Sonnet por defecto en `planificar`.
- context7 no conecta (OAuth `invalid_target`): Nacho lo reconecta desde la app (Conectores / `/mcp` en terminal).
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
