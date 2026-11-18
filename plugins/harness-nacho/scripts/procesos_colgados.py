"""Procesos que dejó Claude corriendo (Nacho, 2026-11-04: «quedan procesos de agentes o subagentes por horas»).

    python procesos_colgados.py [carpeta_del_proyecto] [--min 0]      # lista (no corta nada)
    python procesos_colgados.py --cortar PID [PID…]                   # corta esos y sus hijos (taskkill /T /F)
    python procesos_colgados.py --probar                              # sus propios casos (sin Windows)

Regla: antes de Consejos y tarjeta (skill cerrar-tarea, paso 8) y al terminar cada tarea del modo automático, no queda
corriendo NADA que lanzó Claude y ya no hace falta (tests, bancadas, servidores, llama-server, `claude -p` de prueba,
vigilantes `tail -f` de un Monitor…). Por defecto mira todo lo vivo (`--min 0`), menos su propio árbol.

Cuenta como «de Claude» un proceso que:
  - desciende de un Claude Code de consola o de la app (`claude.exe` de `claude-code\\…`), o
  - quedó HUÉRFANO (su padre ya no existe) y su línea de comandos nombra la carpeta del proyecto o los archivos de
    Claude (`…\\Temp\\claude\\…` = scratchpad y salidas de tareas, `.claude\\`). Lo típico tras cortar con `kill` de
    Git Bash. 2026-11-18: el `tail -f` de un Monitor es huérfano DESDE EL PRIMER SEGUNDO (Git Bash no deja su padre en
    Windows) y `TaskStop` del Monitor no lo corta; nombraba el scratchpad, no el proyecto → se escapaban (7 vivos,
    de 3 sesiones).
Se saltean los procesos propios de Claude Code / la app y los shells vacíos. Lo que el usuario abrió a mano (su
Jarvis desde el menú Inicio, su terminal) no desciende de Claude ni está huérfano: no aparece.
Lo lanzado con `run_in_background` se corta con TaskStop; DESPUÉS correr esto: lo que TaskStop dejó (nietos) aparece acá.
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
# un huérfano que nombra esto es de Claude aunque no nombre el proyecto (scratchpad, salidas de tareas, snapshots)
DE_CLAUDE = ("\\temp\\claude\\", "\\.claude\\")


def _normal(texto: str) -> str:
    return texto.replace("/", "\\").lower()


def ancestros(todos: dict[int, dict], pid: int) -> set[int]:
    """`pid` y sus padres (el árbol de este mismo chequeo no se lista)."""
    vistos: set[int] = set()
    while pid and pid not in vistos:
        vistos.add(pid)
        pid = (todos.get(pid) or {}).get("ParentProcessId") or 0
    return vistos


def procesos() -> dict[int, dict]:
    salida = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", PS],
                            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60).stdout
    datos = json.loads(salida or "[]")
    return {p["ProcessId"]: p for p in (datos if isinstance(datos, list) else [datos])}


def es_claude(p: dict) -> bool:
    cmd = p.get("CommandLine") or ""
    return p.get("Name", "").lower() == "claude.exe" and "claude-code" in cmd


def colgados(todos: dict[int, dict], carpeta: str, minimos: float, propio: set[int] | None = None,
             ahora: datetime | None = None) -> list[dict]:
    ahora = ahora or datetime.now(timezone.utc)
    carpeta = _normal(carpeta).rstrip("\\")
    res = []
    for pid, p in todos.items():
        cmd = p.get("CommandLine") or ""
        nombre = (p.get("Name") or "").lower()
        if not cmd or any(s.lower() in cmd.lower() for s in PROPIOS) or pid == 0 or pid in (propio or ()):
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
                if carpeta and carpeta in _normal(cmd):
                    motivo = "huérfano (su padre ya no existe) y es del proyecto"
                elif any(m in _normal(cmd) for m in DE_CLAUDE):
                    motivo = "huérfano y usa archivos de Claude (p. ej. el `tail -f` de un Monitor)"
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
    ap.add_argument("--min", type=float, default=0, help="minutos mínimos de vida (por defecto 0 = todo)")
    ap.add_argument("--cortar", nargs="+", type=int, metavar="PID")
    ap.add_argument("--probar", action="store_true", help="corre sus propios casos y sale")
    a = ap.parse_args()
    if a.probar:
        return probar()
    if sys.platform != "win32":
        print("Solo Windows.")
        return 0
    if a.cortar:
        for pid in a.cortar:
            r = subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, text=True)
            print(f"{pid}: {'cortado' if r.returncode == 0 else (r.stderr or r.stdout).strip()}")
        return 0
    import os
    todos = procesos()
    lista = colgados(todos, str(Path(a.carpeta).resolve()), a.min,   # «.» a secas está en todo
                     propio=ancestros(todos, os.getpid()))
    if not lista:
        print(f"OK: nada de Claude corriendo hace más de {a.min:g} min.")
        return 0
    print(f"{len(lista)} proceso(s) de Claude corriendo hace más de {a.min:g} min (raíz de cada árbol):")
    for r in lista:
        print(f"- PID {r['pid']} · {r['nombre']} · {r['minutos']} min · {r['motivo']}\n    {r['cmd']}")
    print("Si ya no hacen falta: TaskStop si es una tarea de fondo de ESTA sesión; si no, "
          "`python procesos_colgados.py --cortar PID…`. Lo que es del usuario (su app, su terminal) no se toca.")
    return 1


def probar() -> int:
    """Casos sin Windows (tabla de procesos inventada). El literal: el `tail -f` huérfano de un Monitor (18/11)."""
    t = "2026-11-18T14:00:00+00:00"
    ahora = datetime(2026, 11, 18, 14, 30, tzinfo=timezone.utc)
    cc = r"C:\Users\N\AppData\Local\Claude-Data\x\claude-code\2.1\y\claude.exe --output-format stream-json"
    todos = {
        1: {"ProcessId": 1, "ParentProcessId": 0, "Name": "claude.exe", "CommandLine": cc, "Inicio": t},
        # el literal: huérfano, nombra el scratchpad con barras de Git Bash
        10: {"ProcessId": 10, "ParentProcessId": 999, "Name": "tail.exe", "Inicio": t, "CommandLine":
             '"C:\\Program Files\\Git\\usr\\bin\\tail.exe" -n 0 -f C:/Users/N/AppData/Local/Temp/claude/abc/x/s/ensayo.log'},
        11: {"ProcessId": 11, "ParentProcessId": 998, "Name": "grep.exe", "Inicio": t, "CommandLine":
             'grep --line-buffered -E "pasos bien" C:/Users/N/AppData/Local/Temp/claude/abc/tasks/b.output'},
        # huérfano del proyecto (como antes)
        20: {"ProcessId": 20, "ParentProcessId": 997, "Name": "python.exe", "Inicio": t,
             "CommandLine": r"C:\Proy\Jarvis\.venv\Scripts\python.exe -m pytest"},
        # hijo de Claude Code, recién lanzado (antes se escapaba por el tope de 10 min)
        30: {"ProcessId": 30, "ParentProcessId": 1, "Name": "python.exe", "Inicio": "2026-11-18T14:29:30+00:00",
             "CommandLine": "python bancada.py"},
        # lo del usuario: huérfano que no nombra ni el proyecto ni a Claude → no aparece
        40: {"ProcessId": 40, "ParentProcessId": 996, "Name": "tail.exe", "Inicio": t,
             "CommandLine": "tail -f C:/Users/N/logs/mio.log"},
        # el propio chequeo → no aparece
        50: {"ProcessId": 50, "ParentProcessId": 1, "Name": "python.exe", "Inicio": t,
             "CommandLine": "python procesos_colgados.py ."},
    }
    hallados = {r["pid"] for r in colgados(todos, r"C:\Proy\Jarvis", 0, propio={50, 1}, ahora=ahora)}
    esperado = {10, 11, 20, 30}
    ok = hallados == esperado
    print(("OK" if ok else "FALLA") + f": hallados {sorted(hallados)} · esperado {sorted(esperado)}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
