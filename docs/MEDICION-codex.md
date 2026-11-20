# Prueba de Codex (plugin `codex@openai-codex`) — ¿vale la pena quedárnoslo?
Pedido de Nacho (2026-11-20): «es una prueba para ver si aporta, hay que medir si vale la pena quedárnoslo».
Instalado el 20/11 (plugin user + `@openai/codex` 0.171.0, sesión de ChatGPT de Nacho). TokenEconomizer apagado el mismo día.

## Cómo se usa durante la prueba
- En cada lote de riesgo (Opus · alto que toque permisos, secretos, lo que sale de la PC o el cerebro; en Jarvis: L29,
  L33, L34, L35, L37…), con la suite ya verde y ANTES del último commit: `/codex:adversarial-review` sobre el cambio
  del lote. Solo revisa: nunca `/codex:rescue` ni que escriba código.
- Claude verifica CADA hallazgo (lee el código o escribe el test que lo prueba) y lo clasifica: **real nuevo** (bug que
  Claude no había visto), **ya visto**, **falso**. Los reales nuevos se arreglan en el mismo lote, con su test.
- Una fila por revisión en la tabla de abajo.

## Criterio (decidido antes de medir, para no acomodarlo después)
- Fin de la prueba: **4 revisiones o el 2026-12-04**, lo que llegue primero. La decide la próxima `/automejora`.
- **Se queda** si hay ≥ 1 bug real nuevo cada 2 revisiones y los falsos son ≤ 50 %.
- **Se va** si no (desinstalar plugin + `npm uninstall -g @openai/codex` + borrar `~\.local\bin\codex.cmd` a ELIMINAR/).
- También cuenta en contra: si leer y verificar sus hallazgos gasta > 1 % semanal por revisión, o si el cupo gratis de
  Codex no alcanza para una revisión por lote.

## Registro
| Fecha | Proyecto · lote | Hallazgos | Reales nuevos | Ya vistos | Falsos | Minutos | % semanal de Claude | Notas |
|---|---|---|---|---|---|---|---|---|
