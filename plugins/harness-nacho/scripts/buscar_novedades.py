"""Novedades para Claude Code, sin LLM: junta candidatos de fuentes buenas y devuelve SOLO lo nuevo, en pocas líneas.

Regla (Nacho, 2026-11-02): las mejoras para Claude Code las encuentra Claude, no Nacho, y casi sin gastar tokens.
El modelo lee solo la lista corta que deja este script (`pendientes.md`) y decide; buscar no gasta tokens.

  python buscar_novedades.py               # corre ya: suma lo nuevo a pendientes.md y lo muestra
  python buscar_novedades.py --si-toca     # lo llama el tablero al abrir: si pasó una semana, corre en segundo plano
  python buscar_novedades.py --ver         # muestra pendientes.md (lo que lee /automejora)
  python buscar_novedades.py --vaciar      # /automejora ya lo evaluó: vacía pendientes.md (lo visto queda en visto.json)
  python buscar_novedades.py --al 2026-10-29 [--verificar dueño/repo]   # backtest: como si se corriera ese día

Fuentes (todas APIs oficiales, sin cuentas nuevas ni raspar páginas): GitHub (repos por temas `claude-code`…,
ordenados por estrellas; con `gh` si está, si no sin autenticar), marketplaces de plugins (oficial y los de
`fuentes.json`), la lista awesome-claude-code, el CHANGELOG de Claude Code y Hacker News (Algolia). YouTube: solo
los feeds RSS de los canales que Nacho anote en `fuentes.json` (la búsqueda de YouTube no tiene API gratis).
Reddit bloquea a los scripts: no se usa.
Estado (por PC): ~/.claude/harness-nacho/novedades/ → visto.json, pendientes.md, fuentes.json (opcional).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

CADA_DIAS = 7
FUENTES = {
    # Temas de GitHub: lo que se publica PARA Claude Code. Una búsqueda por tema (la API no hace OR de temas).
    "temas": ["claude-code", "claude-code-plugin", "claude-code-plugins", "claude-plugin", "claude-skills",
              "claude-code-skills", "claude-code-hooks", "agent-skills"],
    "min_estrellas": 150,  # menos que esto en un mes = ruido
    "max_github": 8,  # repos nuevos ⚑ (tocan el harness) por corrida
    "max_otros": 4,  # y los más populares del resto (un dominio: juegos, diseño, trading…)
    "marketplaces": ["anthropics/claude-plugins-official", "obra/superpowers-marketplace"],
    "awesome": ["hesreallyhim/awesome-claude-code"],
    "hn_consultas": ["claude code", "anthropic claude"],
    "hn_min_puntos": 80,
    "youtube_canales": [],  # ids de canal (UC…): feed oficial https://www.youtube.com/feeds/videos.xml?channel_id=
    "youtube_palabras": ["claude", "anthropic", "mcp"],
}
# Del changelog interesa lo que cambia CÓMO se trabaja con el harness, no los arreglos de nube o gateway.
# Repos que tocan CÓMO trabaja el harness (no un dominio: TV, trading, logos): van primero y con ⚑.
PARA_EL_HARNESS = re.compile(r"token|\bcost|context[- ](window|engineering|management)|prompt[- ]cach|\bhooks?\b|"
                             r"harness|\bmemory\b|sub-?agents?\b|statusline|status line|rate limit|usage limit|"
                             r"\bmods?\b|claude-code-plugin", re.I)
CLAVE_CHANGELOG = re.compile(r"\b(plugin|hook|skill|token|context|cache|compact|subagent|sub-agent|MCP|mod\b|"
                             r"effort|model|desktop|Windows|PowerShell|usage|limit)", re.I)


def carpeta() -> Path:
    base = Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude")
    c = base / "harness-nacho" / "novedades"
    c.mkdir(parents=True, exist_ok=True)
    return c


def leer_json(ruta: Path, defecto):
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return defecto


def escribir(ruta: Path, texto: str) -> None:
    tmp = ruta.with_suffix(ruta.suffix + ".tmp")
    tmp.write_text(texto, encoding="utf-8")
    os.replace(tmp, ruta)


# ── Red: GitHub con `gh` (autenticado, 30 búsquedas/min) o urllib; todo con tope de tiempo ─────────────────────
GH = shutil.which("gh")


def http(url: str, encabezados: dict | None = None, tope: float = 12) -> bytes:
    pedido = urllib.request.Request(url, headers={"User-Agent": "harness-nacho-novedades", **(encabezados or {})})
    with urllib.request.urlopen(pedido, timeout=tope) as r:
        return r.read()


def github(ruta: str, crudo: bool = False, encabezados: dict | None = None):
    enc = dict(encabezados or {})
    if crudo:
        enc["Accept"] = "application/vnd.github.raw"
    if GH:
        cmd = [GH, "api", ruta] + [x for k, v in enc.items() for x in ("-H", f"{k}: {v}")]
        r = subprocess.run(cmd, capture_output=True, timeout=30, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            raise RuntimeError(r.stderr.strip()[:200])
        return r.stdout if crudo else json.loads(r.stdout or "null")
    datos = http("https://api.github.com/" + ruta.lstrip("/"), enc)
    return datos.decode("utf-8", "replace") if crudo else json.loads(datos)


def buscar_repos(cfg: dict, desde: datetime, hasta: datetime) -> list[dict]:
    vistos: dict[str, dict] = {}
    rango = f"{desde:%Y-%m-%d}..{hasta:%Y-%m-%d}"
    for tema in cfg["temas"]:
        q = urllib.parse.quote(f"topic:{tema} created:{rango} stars:>={cfg['min_estrellas']}")
        ruta = f"search/repositories?q={q}&sort=stars&order=desc&per_page=30"
        try:
            res = github(ruta)
        except RuntimeError as e:
            if "rate limit" not in str(e).lower():
                raise
            time.sleep(61)  # la búsqueda de GitHub deja 30 por minuto: se espera una vez y se sigue
            res = github(ruta)
        for it in (res or {}).get("items", []):
            vistos.setdefault(it["full_name"], {
                "clave": "gh:" + it["full_name"].lower(), "nombre": it["full_name"], "estrellas": it["stargazers_count"],
                "fecha": it["created_at"][:10], "frase": (it.get("description") or "").strip()[:110],
                "url": it["html_url"], "temas": it.get("topics", []),
            })
    for r in vistos.values():
        r["harness"] = bool(PARA_EL_HARNESS.search(r["frase"] + " " + " ".join(r["temas"])))
        if r["harness"]:
            r["nombre"] = "⚑ " + r["nombre"]
    # Primero lo que toca cómo trabaja el harness (tokens, contexto, hooks…), después el resto por estrellas.
    return sorted(vistos.values(), key=lambda r: (not r["harness"], -r["estrellas"]))


def marketplaces(cfg: dict) -> list[dict]:
    salida = []
    for repo in cfg["marketplaces"]:
        try:
            m = json.loads(github(f"repos/{repo}/contents/.claude-plugin/marketplace.json", crudo=True))
        except Exception as e:  # noqa: BLE001 — una fuente caída no frena a las demás
            salida.append({"error": f"marketplace {repo}: {e}"})
            continue
        for p in m.get("plugins", []):
            salida.append({"clave": f"mkt:{repo.lower()}:{p.get('name')}", "nombre": f"{p.get('name')} ({repo})",
                           "frase": (p.get("description") or "").strip()[:110]})
    return salida


def awesome(cfg: dict) -> list[dict]:
    salida = []
    for repo in cfg["awesome"]:
        try:
            texto = github(f"repos/{repo}/readme", crudo=True)
        except Exception as e:  # noqa: BLE001
            salida.append({"error": f"awesome {repo}: {e}"})
            continue
        for dueño, nombre in re.findall(r"github\.com/([\w.-]+)/([\w.-]+)", texto):
            nombre = nombre.removesuffix(".git")
            if dueño.lower() in ("sponsors", "topics", "orgs") or f"{dueño}/{nombre}".lower() == repo.lower():
                continue
            salida.append({"clave": f"gh:{dueño.lower()}/{nombre.lower()}", "nombre": f"{dueño}/{nombre}",
                           "frase": f"(en {repo.split('/')[1]})"})
    return salida


def changelog(desde_version: str | None) -> tuple[str | None, list[str]]:
    texto = github("repos/anthropics/claude-code/contents/CHANGELOG.md", crudo=True)
    bloques = re.split(r"(?m)^## (\d+\.\d+\.\d+)\s*$", texto)
    versiones = list(zip(bloques[1::2], bloques[2::2]))
    if not versiones:
        return None, []
    ultima = versiones[0][0]
    num = lambda v: tuple(int(x) for x in v.split("."))  # noqa: E731
    nuevas = [(v, b) for v, b in versiones if desde_version and num(v) > num(desde_version)]
    if not desde_version:
        return ultima, []  # primera corrida: solo anota desde dónde mirar
    lineas = []
    for v, b in nuevas:
        for l in b.splitlines():
            l = l.strip("- ").strip()
            if l.startswith(("Added", "Changed", "Deprecated", "Removed")) and CLAVE_CHANGELOG.search(l):
                lineas.append(f"{v}: {l[:150]}")
    cab = f"Claude Code {nuevas[-1][0]}–{ultima}: {len(nuevas)} versiones" if nuevas else None
    return ultima, ([cab] if cab else []) + lineas[:10]


def hacker_news(cfg: dict, desde: datetime, hasta: datetime) -> list[dict]:
    salida = []
    for consulta in cfg["hn_consultas"]:
        filtro = f"created_at_i>{int(desde.timestamp())},created_at_i<{int(hasta.timestamp())},points>{cfg['hn_min_puntos']}"
        url = ("https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=20&query=" + urllib.parse.quote(consulta)
               + "&numericFilters=" + urllib.parse.quote(filtro))
        for h in json.loads(http(url)).get("hits", []):
            salida.append({"clave": f"hn:{h['objectID']}", "nombre": h.get("title", "")[:110],
                           "estrellas": h.get("points", 0), "fecha": h.get("created_at", "")[:10],
                           "frase": h.get("url") or f"https://news.ycombinator.com/item?id={h['objectID']}"})
    return sorted({x["clave"]: x for x in salida}.values(), key=lambda x: -x["estrellas"])


def youtube(cfg: dict, desde: datetime) -> list[dict]:
    salida = []
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
    for canal in cfg["youtube_canales"]:
        raiz = ET.fromstring(http(f"https://www.youtube.com/feeds/videos.xml?channel_id={canal}"))
        autor = raiz.findtext("a:author/a:name", "", ns)
        for e in raiz.findall("a:entry", ns):
            titulo, fecha = e.findtext("a:title", "", ns), e.findtext("a:published", "", ns)
            if fecha[:10] < f"{desde:%Y-%m-%d}" or not any(p in titulo.lower() for p in cfg["youtube_palabras"]):
                continue
            salida.append({"clave": "yt:" + e.findtext("yt:videoId", "", ns), "nombre": titulo[:110],
                           "fecha": fecha[:10], "frase": f"{autor} · {e.find('a:link', ns).get('href')}"})
    return salida


def instalados() -> set[str]:
    """Repos de los marketplaces que ya están en esta PC (no son novedad): known_marketplaces.json."""
    base = Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude")
    claves = set()
    for m in leer_json(base / "plugins" / "known_marketplaces.json", {}).values():
        f = m.get("source") or {}
        url = f.get("repo") or f.get("url") or ""
        if f.get("path"):  # carpeta local (TokenEconomizer se instala de un clon): su remoto de git
            cfg_git = Path(f["path"]) / ".git" / "config"
            url = cfg_git.read_text(encoding="utf-8", errors="replace") if cfg_git.exists() else ""
        for dueño, repo in re.findall(r"(?:github\.com[/:])?([\w.-]+)/([\w.-]+?)(?:\.git)?(?:\s|$)", url + " "):
            claves.add(f"gh:{dueño.lower()}/{repo.lower()}")
    return claves


# ── Corrida ────────────────────────────────────────────────────────────────────────────────────────────────
def correr(ahora: datetime, cfg: dict, estado: dict, backtest: bool = False) -> list[str]:
    visto: dict = {} if backtest else estado.setdefault("visto", {})
    if not backtest:
        for clave in instalados():
            visto.setdefault(clave, "instalado")
    primera = not backtest and not estado.get("ultima_corrida")
    desde = ahora - timedelta(days=30 if primera or backtest else CADA_DIAS + 3)
    secciones: list[tuple[str, list[str]]] = []
    errores: list[str] = []

    def nuevos(items: list[dict], tope: int, sembrar: bool = False) -> list[str]:
        lineas = []
        for it in items:
            if "error" in it:
                errores.append(it["error"])
                continue
            if it["clave"] in visto:
                continue
            visto[it["clave"]] = f"{ahora:%Y-%m-%d}"
            if sembrar or len(lineas) >= tope:
                continue  # sembrado: lo que ya existía al instalar no se muestra (si no, la 1.ª corrida son 300 líneas)
            est = f"★{it['estrellas']} · " if it.get("estrellas") is not None else ""
            fecha = f" · {it['fecha']}" if it.get("fecha") else ""
            lineas.append(f"- {est}{it['nombre']}{fecha} · {it['frase']}")
        return lineas

    repos: list[dict] = []
    cache = lambda: repos or repos.extend(buscar_repos(cfg, desde, ahora)) or repos  # noqa: E731 — una búsqueda, dos listas
    pasos = [
        ("GitHub · para el harness (tokens, contexto, hooks, memoria, mods…)",
         lambda: [r for r in cache() if r["harness"]], cfg["max_github"], False),
        ("GitHub · otros populares", lambda: [r for r in cache() if not r["harness"]], cfg["max_otros"], False),
        ("Marketplaces de plugins", lambda: marketplaces(cfg), 10, primera),
        ("awesome-claude-code (agregados)", lambda: awesome(cfg), 8, primera),
        ("Hacker News", lambda: hacker_news(cfg, desde, ahora), 5, False),
        ("YouTube (canales anotados)", lambda: youtube(cfg, desde), 5, False),
    ]
    if backtest:
        pasos = pasos[:2] + pasos[4:5]  # lo único que se puede reconstruir hacia atrás (GitHub y Hacker News)
    for titulo, fuente, tope, sembrar in pasos:
        try:
            ls = nuevos(fuente(), tope, sembrar)
        except Exception as e:  # noqa: BLE001
            errores.append(f"{titulo}: {str(e)[:120]}")
            continue
        if ls:
            secciones.append((titulo, ls))
    if not backtest:
        try:
            ultima, ls = changelog(estado.get("claude_code_visto"))
            if ultima:
                estado["claude_code_visto"] = ultima
            if ls:
                secciones.insert(0, ("Claude Code (lo que cambia cómo trabajamos)", ls))
        except Exception as e:  # noqa: BLE001
            errores.append(f"changelog: {str(e)[:120]}")
    salida = []
    for titulo, ls in secciones:
        salida += [f"### {titulo}", *ls]
    if errores:
        salida.append("Fuentes que fallaron: " + " · ".join(errores))
    return salida


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Novedades para Claude Code sin LLM.")
    p.add_argument("--si-toca", action="store_true", help="solo si pasó una semana; corre en segundo plano")
    p.add_argument("--fondo", action="store_true", help=argparse.SUPPRESS)
    p.add_argument("--ver", action="store_true")
    p.add_argument("--vaciar", action="store_true")
    p.add_argument("--al", help="backtest: fecha AAAA-MM-DD como si fuera hoy (no toca el estado)")
    p.add_argument("--verificar", help="con --al: dueño/repo que tendría que aparecer")
    a = p.parse_args(argv)
    c = carpeta()
    pendientes, ruta_estado = c / "pendientes.md", c / "visto.json"
    cfg = {**FUENTES, **leer_json(c / "fuentes.json", {})}

    if a.ver:
        print(pendientes.read_text(encoding="utf-8") if pendientes.exists() else "Sin novedades pendientes.")
        return 0
    if a.vaciar:
        if pendientes.exists():
            pendientes.unlink()
        print("pendientes.md vacío (lo visto queda en visto.json).")
        return 0
    if a.al:
        ahora = datetime.fromisoformat(a.al).replace(tzinfo=timezone.utc) + timedelta(hours=23, minutes=59)
        lineas = correr(ahora, cfg, {}, backtest=True)
        # GitHub ya no da la fecha de cada estrella (stargazers con star+json = 404): se ordena con las de HOY.
        print(f"Backtest al {a.al} (solo repos creados hasta ese día; estrellas de HOY):")
        print("\n".join(lineas) or "(nada)")
        if a.verificar:
            seccion = "\n".join(lineas).split("### GitHub", 1)[-1].split("\n###", 1)[0]
            repos = [l for l in seccion.splitlines() if l.startswith("- ★")]  # la lista ⚑, la primera
            puesto = next((i + 1 for i, l in enumerate(repos) if a.verificar.lower() in l.lower()), None)
            print(f"\n{a.verificar}: " + (f"APARECE, puesto {puesto} de {len(repos)} repos" if puesto
                                         else "NO aparece en la lista corta"))
        print(f"\nTamaño de lo que lee el modelo: {sum(len(l) + 1 for l in lineas)} caracteres "
              f"(~{sum(len(l) + 1 for l in lineas) // 4} tokens)")
        return 0

    estado = leer_json(ruta_estado, {})
    ultima = estado.get("ultima_corrida")
    ahora = datetime.now(timezone.utc)
    if a.si_toca:
        if ultima and ahora - datetime.fromisoformat(ultima) < timedelta(days=CADA_DIAS):
            return 0
        if estado.get("corriendo") and time.time() - estado["corriendo"] < 600:
            return 0  # otra ventana ya la lanzó
        estado["corriendo"] = time.time()
        escribir(ruta_estado, json.dumps(estado, ensure_ascii=False, indent=1))
        bandera = {"creationflags": 0x00000008 | 0x00000200 | 0x08000000} if os.name == "nt" else {"start_new_session": True}
        subprocess.Popen([sys.executable, os.path.abspath(__file__), "--fondo"], stdin=subprocess.DEVNULL,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True, **bandera)
        return 0

    lineas = correr(ahora, cfg, estado)
    estado["ultima_corrida"] = ahora.isoformat()
    estado.pop("corriendo", None)
    escribir(ruta_estado, json.dumps(estado, ensure_ascii=False, indent=1))
    if lineas:
        previo = pendientes.read_text(encoding="utf-8") if pendientes.exists() else ""
        escribir(pendientes, previo + f"## Corrida {ahora.astimezone():%Y-%m-%d %H:%M}\n" + "\n".join(lineas) + "\n")
    if not a.fondo:
        print("\n".join(lineas) if lineas else "Nada nuevo.")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
