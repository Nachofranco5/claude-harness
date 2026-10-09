---
name: plugins-proyecto
description: Elegir qué plugins quedan prendidos en ESTE proyecto según su stack y tipo de trabajo, apagar el resto en .claude/settings.json (respetando plugins_fijos de harness.json) y medir el ahorro de tokens. La llaman proyecto-nuevo y podar; también ante un pedido que cambie el tipo de trabajo.
---

# /plugins-proyecto

Cada plugin prendido suma tokens en TODAS las sesiones (sus skills y herramientas MCP se listan siempre).
Objetivo: prendido solo lo que este proyecto usa de verdad.

1. **Medir antes**: `get_usage` → tokens de "Skills" y "MCP tools" (si no hay, `/usage`; si tampoco,
   decirlo y seguir sin número).
2. **Inventario**:
   - Instalados: `~/.claude/plugins/installed_plugins.json` (ids `nombre@marketplace`; los hay de usuario y
     de proyecto).
   - Prendidos: `enabledPlugins` de `~/.claude/settings.json`, `.claude/settings.json` y `.claude/settings.local.json`.
   - De la cuenta de claude.ai: no están en installed_plugins.json; sus skills aparecen como `finance:…`,
     `marketing:…` y su id es `<prefijo>@synced` (ej. `finance@synced`). Si se puede, confirmarlo con
     `claude plugin list --json`; si no, usar el prefijo y verificar en la ventana nueva (paso 6).
   - Que falten: `SearchPlugins` / `SearchSkills` / `mcp-registry` con palabras del stack y del trabajo
     (si esas herramientas no están, saltear).
3. **Perfil del proyecto** (solo CLAUDE.md, planes abiertos y los archivos de la raíz: `requirements.txt`,
   `package.json`, `*.csproj`…): stack, tipo de trabajo, si tiene UI web (→ playwright, frontend-design),
   lenguaje (→ su LSP), librerías con doc cambiante (→ context7).
4. **Decidir** cada plugin: prendido / apagado + motivo de 1 línea.
   - Siempre: `harness-nacho` prendido. Los mods de pantalla del harness (`uso-widget`, `semaforo`) no se
     tocan. `plugins_fijos` de `.claude/harness.json` (`{"id": true|false}`) manda sobre todo.
   - Caro = trae herramientas MCP (cada una ~200–600 tokens); barato = solo skills. En duda y barato →
     prendido; en duda y caro → apagado.
   - Faltantes gratis y claramente útiles → `claude plugin install <id> --scope project` (cargan en la
     próxima ventana); pagos, con cuenta o > 1 GB → preguntar.
5. **Escribir** `enabledPlugins` en `.claude/settings.json` del PROYECTO: FUSIONAR con lo que ya tiene (no
   perder `permissions`, `hooks`, `extraKnownMarketplaces`…), con `true`/`false` explícito para cada plugin
   decidido. `"x@synced": false` apaga uno de la cuenta en este proyecto (los "required" de una
   organización no se pueden apagar). No tocar `~/.claude/settings.json`: si conviene apagar los de
   claude.ai en TODOS los proyectos, proponer a Nacho `"syncClaudeAiPlugins": false` en su settings de usuario.
   Un plugin que Nacho quiere solo en SU PC → `.claude/settings.local.json` (no se commitea).
6. **Responder**: tabla corta (plugin · prendido/apagado · por qué) + tokens antes. El "después" se ve recién
   en una ventana NUEVA: agregar a `docs/PRUEBAS-PENDIENTES.md` la línea
   `⬜ Plugins — 1) Abrí una ventana nueva → 2) pedí get_usage → 3) Skills + MCP tools deberían bajar de <X> a ~<Y> y no aparecer <apagados>; si aparecen, avisame.`
   Commit según `git` de `.claude/harness.json` (`"Plugins: …"`).
