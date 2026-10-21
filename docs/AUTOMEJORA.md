# Automejora del harness (skill `/harness-nacho:automejora`)
Última pasada: 2026-10-21
Claude Code visto: 2.1.306 (instalado en la app: 2.1.304)
Descartado (no volver a proponer salvo que cambie algo): CodeRabbit (cuenta externa) · groundwork-specflow, Roll Call, AI Skills (duplican el harness) · LocalLore (duplica la memoria) · Kobiton (móvil) · Exa (ya hay WebSearch).

## Historial (lo más nuevo arriba; ≤ 8 líneas por pasada)
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
