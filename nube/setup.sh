#!/bin/bash
# Harness de Nacho para la nube (claude.ai/code).
# La nube NO instala los plugins que pide el .claude/settings.json del repo (doc oficial:
# code.claude.com/docs/en/cloud-environments, "What carries over"). Este script lo corre el
# "Setup script" del entorno ANTES de que arranque Claude y deja en ~/.claude:
#   CLAUDE.md (reglas de Nacho + nota de nube), skills/ y agents/ del plugin harness-nacho.
# Los hooks (tablero, guardianes) y los mods visuales NO van: en la nube no hay app de escritorio.
# Nunca falla: si algo sale mal, la sesión arranca igual (sin harness) y lo dice en el log.
# Uso en el entorno: curl -fsSL https://raw.githubusercontent.com/Nachofranco5/claude-harness/main/nube/setup.sh | bash

REPO="${HARNESS_REPO:-https://github.com/Nachofranco5/claude-harness.git}"
TMP="$(mktemp -d)"
DEST="${HOME}/.claude"

if ! git clone --depth 1 --quiet "$REPO" "$TMP/h"; then
  echo "harness-nube: no se pudo clonar $REPO (¿repo privado o sin red?). Sigo sin harness."
  exit 0
fi

P="$TMP/h/plugins/harness-nacho"
mkdir -p "$DEST/skills" "$DEST/agents"

{
  cat "$P/reglas.md"
  cat <<'EOF'

## Estás en la nube (claude.ai/code)
- No hay tablero al arrancar ni `get_usage`: para "la próxima tarea", Grep `^## ` en `docs/PLAN-*.md`
  y tomar la primera ⬜/🟡. El uso no se puede medir: decirlo y seguir.
- Skills: se llaman sin prefijo (`/tarea`, `/cerrar-tarea`…); subagentes `explorador` y `verificador`.
- No hay Windows, GPU ni archivos fuera del repo: si la tarea los necesita, frenar y avisar.
- Los guardianes (hooks) no corren acá: la checklist de `cerrar-tarea` se cumple a mano, igual de estricta.
EOF
} > "$DEST/CLAUDE.md"

cp -r "$P/skills/." "$DEST/skills/"
cp "$P/agents/"*.md "$DEST/agents/"

VER="$(grep -o '"version": *"[^"]*"' "$P/.claude-plugin/plugin.json" | grep -o '[0-9][^"]*')"
echo "harness-nube: listo (harness-nacho $VER): $(ls "$DEST/skills" | wc -l) skills, $(ls "$DEST/agents" | wc -l) subagentes."
rm -rf "$TMP"
exit 0
