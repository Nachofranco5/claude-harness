"""Procesos que dejó Claude corriendo (Nacho, 2026-11-04: «quedan procesos de agentes o subagentes por horas»).

    python procesos_colgados.py [carpeta_del_proyecto] [--min 10]     # lista (no corta nada)
    python procesos_colgados.py --cortar PID [PID…]                   # corta esos y sus hijos (taskkill /T /F)

Regla: antes de cada commit + push (skill cerrar-tarea) y al terminar cada tarea del modo automático, no queda corriendo
nada que lanzó Claude y ya no hace falta (tests, bancadas, servidores, llama-server, `claude -p` de prueba…).

Cuenta como «de Claude» un proceso con más de `--min` minutos que:
  - desciende de un Claude Code de consola o de la app (`claude.exe` de `claude-code\\…`), o
  - quedó HUÉRFANO (su padre ya no existe) y su línea de comandos nombra la carpeta del proyecto
    (lo típico tras cortar con `kill` de Git Bash: el bash muere y sus procesos de Windows siguen).
Se saltean los procesos propios de Claude Code / la app y los shells vacíos. Lo que el usuario abrió a mano (su
Jarvis desde el menú Inicio, su terminal) no desciende de Claude ni está huérfano: no aparece.
Lo lanzado con `run_in_background` y todavía vivo se corta con TaskStop (no con esto); esto es para lo que se escapó.
Solo Windows (usa PowerShell/CIM). Sin dependencias.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PS = ("Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,"
      "@{n='Inicio';e={$_.CreationDate.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress")
PROPIOS = ("claude-code", "WindowsApps\\Claude_", "tokeneconomizer", "crashpad")
SHELLS = {"bash.exe", "powershell.exe", "pwsh.exe", "cmd.exe", "conhost.exe", "sh.exe"}


def procesos() -> dict[int, dict]:
    salida = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", PS],
                            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60).stdout
    datos = json.loads(salida or "[]")
    return {p["ProcessId"]: p for p in (datos if isinstance(datos, list) else [datos])}


def es_claude(p: dict) -> bool:
    cmd = p.get("CommandLine") or ""
    return p.get("Name", "").lower() == "claude.exe" and "claude-code" in cmd


def colgados(todos: dict[int, dict], carpeta: str, minimos: float) -> list[dict]:
    ahora = datetime.now(timezone.utc)
    carpeta = carpeta.lower().rstrip("\\/")
    res = []
    for pid, p in todos.items():
        cmd = p.get("CommandLine") or ""
        nombre = (p.get("Name") or "").lower()
        if not cmd or any(s.lower() in cmd.lower() for s in PROPIOS) or pid == 0:
            continue
        try:
            edad = (ahora - datetime.fromisoformat(p["Inicio"])).total_seconds() / 60
        except (KeyError, TypeError, ValueError):
            continue
        if edad < minimos:
            continue
        cadena, actual, motivo, hijo = [], p.get("ParentProcessId"), "", p
        for _ in range(30):   # sube por los padres
            padre = todos.get(actual)
            # Windows recicla los PID: un «padre» que arrancó DESPUÉS que el hijo es otro proceso (el real ya murió).
            if padre is not None and str(padre.get("Inicio", "")) > str(hijo.get("Inicio", "")):
                padre = None
            if padre is None:
                if carpeta and carpeta in cmd.lower():
                    motivo = "huérfano (su padre ya no existe) y es del proyecto"
                break
            if es_claude(padre):
                motivo = "lo lanzó Claude Code"
                break
            cadena.append(actual)
            actual, hijo = padre.get("ParentProcessId"), padre
        if not motivo:
            continue
        if nombre == "conhost.exe" or (nombre in SHELLS and not any(
                x in cmd.lower() for x in (".py", ".bat", "pytest", "uv ", "uv.exe", "node", "llama"))):
            continue   # el shell de Claude en sí: muere con la sesión
        res.append({"pid": pid, "nombre": p.get("Name"), "minutos": round(edad), "motivo": motivo, "cmd": cmd[:160]})
    # Solo la raíz de cada árbol colgado (cortar la raíz con /T corta los hijos)
    pids = {r["pid"] for r in res}
    return sorted((r for r in res if todos[r["pid"]].get("ParentProcessId") not in pids),
                  key=lambda r: -r["minutos"])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("carpeta", nargs="?", default=str(Path.cwd()))
    ap.add_argument("--min", type=float, default=10, help="minutos mínimos de vida (por defecto 10)")
    ap.add_argument("--cortar", nargs="+", type=int, metavar="PID")
    a = ap.parse_args()
    if sys.platform != "win32":
        print("Solo Windows.")
        return 0
    if a.cortar:
        for pid in a.cortar:
            r = subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, text=True)
            print(f"{pid}: {'cortado' if r.returncode == 0 else (r.stderr or r.stdout).strip()}")
        return 0
    lista = colgados(procesos(), a.carpeta, a.min)
    if not lista:
        print(f"OK: nada de Claude corriendo hace más de {a.min:g} min.")
        return 0
    print(f"{len(lista)} proceso(s) de Claude corriendo hace más de {a.min:g} min (raíz de cada árbol):")
    for r in lista:
        print(f"- PID {r['pid']} · {r['nombre']} · {r['minutos']} min · {r['motivo']}\n    {r['cmd']}")
    print("Si ya no hacen falta: TaskStop si es una tarea de fondo de ESTA sesión; si no, "
          "`python procesos_colgados.py --cortar PID…`. Lo que es del usuario (su app, su terminal) no se toca.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
