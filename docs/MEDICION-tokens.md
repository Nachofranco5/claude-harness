# Medición de tokens — ¿TokenEconomizer (y lo del 2026-11-01) ahorra de verdad?
Medido el 2026-11-02 con `plugins/harness-nacho/scripts/medir_tokens.py` (sin LLM, lee los transcripts de
`~/.claude/projects`). Datos: 183 sesiones / 13.743 llamadas de los últimos 30 días (casi todas Jarvis, Opus 5.5,
app 2.1.304–2.1.309). TokenEconomizer (TE) se instaló el 2026-11-01 18:26; después hay solo 3 sesiones.

## En criollo
- **TE todavía no ahorró nada** (0 hechos aprendidos, 0 herramientas sacadas, 0 frenos): con 3 sesiones no juntó
  la evidencia que pide. Y en esta app su techo es chico: ~0,1 % por la poda y ≤ 1 % por los hechos.
- **Cuesta poco pero cuesta**: ~250 tokens más por llamada (sus 7 skills en la lista) y **+0,5 s por cada herramienta**
  que usa Claude (su hook en Python): en una sesión de 150 llamadas, ~1 min más de espera.
- **Lo que pesa de verdad** es otra cosa: la lista de skills (~6k tokens), el mapa del CLAUDE.md de Jarvis (~4,5k) y,
  sobre todo, las sesiones largas (releer la charla es el 69 % del gasto).

## Dónde se va el gasto (30 días, tokens ponderados por precio de API)
| Parte | % del gasto |
|---|---|
| Releer la charla desde la caché (`cache_read`) | 69,4 % |
| Escribir en la caché (charla nueva de cada llamada) | 17,6 % |
| Lo que escribe Claude (salida + pensamiento) | 13,0 % |
| … de eso, releer el **contexto base** en cada llamada | 26,7 % |

→ 1.000 tokens de contexto base fijo ≈ 0,3 % del gasto. Sirve para pesar cualquier cosa que se agrega «siempre».

## De qué está hecho el contexto base (~95k tokens por sesión; caracteres ÷ 4 ≈ tokens, ±30 %)
| Pieza | Tamaño | ¿Se puede tocar? |
|---|---|---|
| Herramientas cargadas (52) | ~127k car (Artifact solo: ~36k car; navegador interno ~22k) | Las pone la app; no |
| Lista de skills | ~24k car (anthropic-skills 8,4k · sueltas 8,4k · superpowers 2,8k · harness 2,2k · TE 0,8k) | Sí, por proyecto (`plugins-proyecto`) |
| CLAUDE.md de Jarvis, «4. Mapa» | ~17k car | Sí: podarlo (tarea de Jarvis) |
| `reglas.md` del harness | ~22k car (+3,8k el 2026-11-01: «Aprender siempre» y regla 9) | Pedido de Nacho; vigilar que no crezca |
| Instrucciones de MCP (Hugging Face, Chrome, context7…) | ~6k car | Por proyecto |
| Herramientas diferidas (solo nombres, ~150) | ~4,6k car (~8 tokens cada una) | — |
| system prompt de la app | ~33k car | No |

## TokenEconomizer, mecanismo por mecanismo
| Mecanismo | Qué promete | Medido | Veredicto |
|---|---|---|---|
| Poda de herramientas (`toolprune=auto`) | sacar las que el repo no usa | 0 sacadas (pide 10 prompts en 2+ sesiones). En la app el ~75 % de las herramientas ya es «diferida» (~8 tok c/u) y las cargadas pesadas están en `toolprune_protect`. Techo ≈ 30 × 8 = **~250 tok/llamada ≈ 0,08 %** | **Dejar** (no molesta); no esperar ahorro |
| Hechos aprendidos (`microskills=on`) | evitar comandos que fallan igual en varias sesiones | 0 hechos. Fallas reales: **4–5 cada 100 llamadas**; la que más se repite (heredoc «unexpected EOF», 40 en 30 días, 2,8 % de los heredocs) no tiene «otra forma de escribirlo» que TE aprenda. Costo: 1 llamada Haiku cada 3 sesiones (~14k tok, según su código) | **Dejar 2 semanas** y re-medir |
| Freno de bucles (`loopguard=nudge`) | cortar vueltas trabadas | 0 intervenciones; necesita 5 turnos «verdes» para aprender (lleva 2) | **Dejar**; re-medir |
| Su propio costo | — | +844 car en la lista de skills (2 son alias viejos: `facts`, `untool`) · hook de 0,5 s (mediana) en CADA herramienta: 35 llamadas = 19 s · 1 error de archivo bloqueado en `~\.tokeneconomizer\errors.log` | Aceptable a prueba |

**Decisión**: queda a prueba hasta el **2026-11-16**. Ese día: `python plugins/harness-nacho/scripts/medir_tokens.py
--corte 2026-11-01T18:26` + `~\.tokeneconomizer\bin\te --host claude status` (gratis, desde la terminal en Jarvis).
Si no aplicó ningún hecho ni poda que valga > 0,5 % → **sacarlo** (`claude plugin uninstall tokeneconomizer@tokeneconomizer`):
el +0,5 s por herramienta no se paga con nada.

## Lo que confunde la comparación antes/después
- Las 3 sesiones «después» son cortas (18–30 llamadas) y abiertas por la coordinadora con prompts largos: su base
  (95k vs 89k) sube por el prompt y por `reglas.md`, no por TE (TE suma ~250 tok). Por eso se midió **por pieza**
  (forma del pedido guardada en el transcript) y no solo «antes vs después».
- El «pond/llamada» baja después (25k vs 34k) solo porque las sesiones son más cortas: el contexto crece con el largo.
- Misma versión de la app (2.1.309) y mismo modelo antes y después.

## Cómo medir cualquier plugin o cambio futuro
1. `python plugins/harness-nacho/scripts/medir_tokens.py --contexto` → cuánto suma al contexto base (herramientas,
   skills por plugin, bloques del primer mensaje).
2. `… --corte AAAA-MM-DDTHH:MM [--proyecto X]` → antes vs después: base, contexto mediano, pond/llamada, fallas.
3. Pesarlo con la tabla de arriba: 1k tokens fijos ≈ 0,3 % del gasto; una falla evitada ≈ una llamada (~35k pond).
