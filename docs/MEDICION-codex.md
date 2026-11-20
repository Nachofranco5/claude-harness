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

## En Windows: el comando solo no alcanza (20/11)
Con más de 2 archivos cambiados, `/codex:adversarial-review` no le pasa el diff a Codex: le pide que lo lea con git, y el
modo solo-lectura de Codex en Windows se lo bloquea («no pude inspeccionar el diff», cero hallazgos). Usar
`node plugins/harness-nacho/scripts/codex_revision.mjs "$(pwd -W)" <base> "<foco>"` (mismas funciones del plugin, con
el diff incluido; tope 256 KB) en segundo plano. Una corrida fallida así NO cuenta como revisión. Al terminar queda
vivo su `app-server-broker` (node): `procesos_colgados.py` lo muestra y se corta con `--cortar`.

## Registro
| Fecha | Proyecto · lote | Hallazgos | Reales nuevos | Ya vistos | Falsos | Minutos | % semanal de Claude | Notas |
|---|---|---|---|---|---|---|---|---|
| 2026-11-20 | Jarvis · L29 (AU5 · AU6; 19 archivos, 61 KB) | 1 | 1 | 0 | 0 | ~8 (2 corridas) | ~1 % (verificar + arreglar + test) | Media, confianza 0,94: en `ventana._a_la_pagina` el chequeo de «cerrándose» y el `run_js` iban separados. Verificado en pywebview (`run_js` = `Invoke` + semáforo): con la X, el hilo de la ventana esperaba 2 s al puente que lo esperaba a él, y el envío pendiente chocaba con la ventana destruida (la línea de AUD-03). Arreglado con test. La 1.ª corrida (comando del plugin) no revisó nada: ver arriba. |
| 2026-11-20 | Jarvis · L29 (AU10; 10 archivos, 38 KB) | 1 | 0 | 0 | 1 | ~4 (1 corrida, `codex_revision.mjs`) | ~0,3 % (verificar + anotar) | «Alta», confianza 0,91: un programa que inyecta clics (SendInput) aprieta el botón que mira `GetAsyncKeyState`. Cierto en abstracto pero fuera del modelo de amenaza (la página, no un programa local: ese también aprieta el cuadro de Windows de respaldo) y Argos no inyecta botones (grep `MOUSEEVENTF`/`mouse_event`: solo movimientos vacíos). Cuenta como falso; el límite quedó escrito en el docstring. Severidad inflada. |
