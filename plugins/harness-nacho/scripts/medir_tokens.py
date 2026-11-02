"""Medidor de tokens de Claude Code, sin LLM: lee los transcripts JSONL de ~/.claude/projects.

Sirve para medir con números si un plugin, una regla o un cambio del harness ahorra o gasta tokens.

  python herramientas/medir_tokens.py                         # sesiones de los últimos 14 días, todas las carpetas
  python herramientas/medir_tokens.py --proyecto Jarvis --dias 30
  python herramientas/medir_tokens.py --corte 2026-11-01T18:26 # antes vs después de instalar algo
  python herramientas/medir_tokens.py --contexto [ID]          # de qué está hecho el contexto base (system, herramientas)
  python herramientas/medir_tokens.py --json                   # salida para otro script

Qué cuenta (por respuesta de la API, sin repetir: un requestId aparece una vez por bloque):
  in = input sin caché · cc = escritura de caché · cr = lectura de caché · out = salida (incluye pensamiento)
  contexto = in + cc + cr de UNA llamada (lo que el modelo leyó); «base» = el de la 1.ª llamada de la sesión.
  pond = tokens ponderados por precio de API relativo al input (cc 5 min ×1,25, cc 1 h ×2, cr ×0,1, out ×5):
  no es lo que descuenta el plan de Nacho (eso no es público), pero ordena bien qué sale caro.
Lo que confunde una comparación: versión de la app, modelo, largo de la tarea y subagentes. Se muestran todos.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PESOS = {"in": 1.0, "cc5": 1.25, "cc1h": 2.0, "cr": 0.1, "out": 5.0}


def raiz_proyectos() -> Path:
    base = os.environ.get("CLAUDE_CONFIG_DIR") or str(Path.home() / ".claude")
    return Path(base) / "projects"


def fecha(texto: str) -> datetime:
    t = datetime.fromisoformat(texto.replace("Z", "+00:00"))
    return t if t.tzinfo else t.astimezone()  # sin zona = hora local de la PC


def leer_sesion(ruta: Path) -> dict | None:
    """Junta las llamadas a la API de un transcript. None si no tiene ninguna."""
    llamadas: dict[str, dict] = {}
    forma = None
    blobs: dict[str, dict] = {}
    primer_pedido = None
    fallas = 0  # herramientas que volvieron con error: lo que podrían evitar «hechos» aprendidos o un freno de bucles
    version = modelo = cwd = sid = None
    with ruta.open(encoding="utf-8", errors="replace") as f:
        for linea in f:
            try:
                d = json.loads(linea)
            except ValueError:
                continue
            tipo = d.get("type")
            if tipo == "api-request-shape" and forma is None:
                forma = d.get("shape")
            if tipo == "api-request-blob" and primer_pedido is None:
                blobs[d.get("hash")] = d.get("message")
            if tipo == "api-request" and primer_pedido is None:
                primer_pedido = d.get("tail") or []
            if tipo == "user" and isinstance((d.get("message") or {}).get("content"), list):
                fallas += sum(1 for b in d["message"]["content"]
                              if isinstance(b, dict) and b.get("type") == "tool_result" and b.get("is_error"))
            if tipo != "assistant":
                continue
            m = d.get("message") or {}
            u = m.get("usage")
            if not u or m.get("model") == "<synthetic>":
                continue
            clave = d.get("requestId") or m.get("id") or d.get("uuid")
            if clave in llamadas:
                continue
            cc = u.get("cache_creation") or {}
            cc_total = u.get("cache_creation_input_tokens", 0) or 0
            cc1h = cc.get("ephemeral_1h_input_tokens", 0) or 0
            llamadas[clave] = {
                "ts": fecha(d["timestamp"]),
                "in": u.get("input_tokens", 0) or 0,
                "cc5": max(cc_total - cc1h, 0),
                "cc1h": cc1h,
                "cr": u.get("cache_read_input_tokens", 0) or 0,
                "out": u.get("output_tokens", 0) or 0,
                "lado": bool(d.get("isSidechain")),
            }
            version = version or d.get("version")
            modelo = modelo or m.get("model")
            cwd = cwd or d.get("cwd")
            sid = sid or d.get("sessionId")
    if not llamadas:
        return None
    ls = sorted(llamadas.values(), key=lambda x: x["ts"])
    tot = {k: sum(x[k] for x in ls) for k in PESOS}
    ctx = [x["in"] + x["cc5"] + x["cc1h"] + x["cr"] for x in ls]
    return {
        "id": sid or ruta.stem, "archivo": str(ruta), "carpeta": ruta.parent.name if "subagents" not in ruta.parts
        else ruta.parents[2].name, "subagente": "subagents" in ruta.parts,
        "inicio": ls[0]["ts"], "fin": ls[-1]["ts"], "version": version, "modelo": modelo, "cwd": cwd,
        "llamadas": len(ls), "fallas": fallas, "base": ctx[0], "ctx_mediana": int(statistics.median(ctx)), "ctx_max": max(ctx),
        **tot, "pond": round(sum(tot[k] * p for k, p in PESOS.items())), "forma": forma,
        "mensajes": [blobs[h] for h in (primer_pedido or []) if blobs.get(h)],
    }


# Cortes del primer mensaje: lo que inyectan la app, los CLAUDE.md, los hooks de SessionStart y los plugins
CORTE = re.compile(r"(?m)^(?=# |## |Contents of |The following |SessionStart hook|Background \(from)")


def secciones(mensajes: list[dict]) -> list[tuple[int, str]]:
    salida = []
    for m in mensajes:
        c = m.get("content")
        bloques = [{"text": c}] if isinstance(c, str) else (c or [])
        for b in bloques:
            texto = b.get("text") or json.dumps(b, ensure_ascii=False)
            for parte in CORTE.split(texto):
                lineas = [x for x in parte.split("\n") if x.strip() and "system-reminder" not in x]
                if lineas:
                    salida.append((len(parte), lineas[0].strip()[:70]))
    return salida


def skills_por_plugin(mensajes: list[dict]) -> dict[str, int]:
    """Caracteres que ocupa en la lista de skills cada plugin (o «sueltas»)."""
    por: dict[str, int] = {}
    for m in mensajes:
        c = m.get("content")
        for b in [{"text": c}] if isinstance(c, str) else (c or []):
            texto = b.get("text") or ""
            if "skills are available for use with the Skill tool" not in texto:
                continue
            lista = texto.split("skills are available for use with the Skill tool", 1)[1]
            for linea in lista.split("\n- ")[1:]:
                skill = linea.split(": ", 1)[0]  # «plugin:skill: descripción» o «skill: descripción»
                nombre = skill.split(":", 1)[0] if ":" in skill else "(sueltas)"
                por[nombre] = por.get(nombre, 0) + len(linea)
    return por


def sesiones(args) -> list[dict]:
    raiz = raiz_proyectos()
    desde = fecha(args.desde) if args.desde else datetime.now(timezone.utc) - timedelta(days=args.dias)
    hasta = fecha(args.hasta) if args.hasta else None
    salida = []
    for ruta in raiz.rglob("*.jsonl"):
        if args.proyecto and args.proyecto.lower() not in str(ruta.relative_to(raiz)).lower():
            continue
        if not args.subagentes and "subagents" in ruta.parts:
            continue
        if datetime.fromtimestamp(ruta.stat().st_mtime, timezone.utc) < desde:
            continue  # la fecha de modificación solo sirve para saltear rápido lo viejo
        s = leer_sesion(ruta)
        if not s or s["inicio"] < desde or (hasta and s["inicio"] >= hasta):
            continue
        salida.append(s)
    return sorted(salida, key=lambda s: s["inicio"])


def miles(n: float) -> str:
    return f"{n / 1000:,.1f}k" if n >= 1000 else str(int(n))


def tabla_sesiones(ss: list[dict]) -> None:
    print(f"{'inicio':16} {'carpeta':22} {'ver':9} {'llam':>5} {'fall':>4} {'base':>7} {'ctx med':>8} "
          f"{'cr':>8} {'cc':>7} {'out':>7} {'pond':>8}")
    for s in ss:
        print(f"{s['inicio'].astimezone():%Y-%m-%d %H:%M} {s['carpeta'][-22:]:22} {str(s['version'])[:9]:9} "
              f"{s['llamadas']:>5} {s['fallas']:>4} {miles(s['base']):>7} {miles(s['ctx_mediana']):>8} {miles(s['cr']):>8} "
              f"{miles(s['cc5'] + s['cc1h']):>7} {miles(s['out']):>7} {miles(s['pond']):>8}")


def resumen(ss: list[dict], nombre: str) -> dict:
    if not ss:
        return {"grupo": nombre, "sesiones": 0}
    med = lambda k: int(statistics.median(s[k] for s in ss))  # noqa: E731
    llam = sum(s["llamadas"] for s in ss)
    return {
        "grupo": nombre, "sesiones": len(ss), "llamadas": llam,
        "base_mediana": med("base"), "ctx_mediana": med("ctx_mediana"),
        "pond_por_llamada": round(sum(s["pond"] for s in ss) / llam),
        "out_por_llamada": round(sum(s["out"] for s in ss) / llam),
        "fallas_cada_100": round(100 * sum(s["fallas"] for s in ss) / llam, 1),
        "versiones": sorted({str(s["version"]) for s in ss}), "modelos": sorted({str(s["modelo"]) for s in ss}),
    }


def contexto(s: dict) -> None:
    """De qué está hecho el pedido: system prompt y cada herramienta cargada (≈ 4 caracteres por token)."""
    forma = s.get("forma")
    if not forma:
        print("Esta sesión no guardó la forma del pedido (api-request-shape).")
        return
    sistema = sum(len(b.get("text", "")) for b in forma.get("system", []))
    tools = forma.get("tools", [])
    tam = sorted(((len(json.dumps(t, ensure_ascii=False)), t.get("name", "?")) for t in tools), reverse=True)
    total_t = sum(n for n, _ in tam)
    print(f"Sesión {s['id']} ({s['inicio'].astimezone():%Y-%m-%d %H:%M}, {s['version']}) · base real {s['base']:,} tok")
    print(f"  system: {sistema:,} car (~{sistema // 4:,} tok) · herramientas cargadas: {len(tools)} = "
          f"{total_t:,} car (~{total_t // 4:,} tok)")
    grupos: dict[str, int] = {}
    for n, nombre in tam:
        g = nombre.split("__")[1] if nombre.startswith("mcp__") else "(de fábrica)"
        grupos[g] = grupos.get(g, 0) + n
    print("  por origen: " + " · ".join(f"{g} ~{n // 4:,}" for g, n in sorted(grupos.items(), key=lambda x: -x[1])))
    print("  las 12 más pesadas: " + ", ".join(f"{nombre} ~{n // 4:,}" for n, nombre in tam[:12]))
    partes = secciones(s.get("mensajes", []))
    if partes:
        total_m = sum(n for n, _ in partes)
        print(f"  primer mensaje: {total_m:,} car (~{total_m // 4:,} tok); lo que pasa de 1.000 car:")
        for n, titulo in sorted(partes, reverse=True):
            if n >= 1000:
                print(f"    {n:>7,} car  {titulo}")
    por = skills_por_plugin(s.get("mensajes", []))
    if por:
        print("  lista de skills por plugin: " + " · ".join(
            f"{p} {n:,}" for p, n in sorted(por.items(), key=lambda x: -x[1])))


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Tokens por sesión desde los transcripts de Claude Code (sin LLM).")
    p.add_argument("--proyecto", help="parte del nombre de la carpeta del proyecto (p. ej. Jarvis)")
    p.add_argument("--dias", type=int, default=14, help="ventana hacia atrás si no hay --desde (14)")
    p.add_argument("--desde"), p.add_argument("--hasta")
    p.add_argument("--corte", help="fecha/hora: compara las sesiones que empezaron antes vs después")
    p.add_argument("--min-llamadas", type=int, default=3, help="descarta sesiones más cortas (3)")
    p.add_argument("--subagentes", action="store_true", help="incluir los transcripts de subagentes")
    p.add_argument("--contexto", nargs="?", const="ultima", help="composición del contexto base (ID o la última)")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)
    if a.corte and not a.desde:
        a.dias = max(a.dias, (datetime.now(timezone.utc) - fecha(a.corte)).days + 7)
    ss = [s for s in sesiones(a) if s["llamadas"] >= a.min_llamadas]
    if a.contexto:
        elegida = [s for s in ss if a.contexto == "ultima" or s["id"].startswith(a.contexto)]
        if not elegida:
            print("No encontré esa sesión.")
            return 1
        contexto(elegida[-1])
        return 0
    grupos = [resumen(ss, "todas")]
    if a.corte:
        c = fecha(a.corte)
        grupos = [resumen([s for s in ss if s["inicio"] < c], "antes"),
                  resumen([s for s in ss if s["inicio"] >= c], "después")]
    if a.json:
        limpio = [{k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in s.items()
                   if k not in ("forma", "mensajes")}
                  for s in ss]
        print(json.dumps({"sesiones": limpio, "grupos": grupos}, ensure_ascii=False, indent=1))
        return 0
    tabla_sesiones(ss)
    print()
    for g in grupos:
        if not g["sesiones"]:
            print(f"{g['grupo']}: sin sesiones")
            continue
        print(f"{g['grupo']}: {g['sesiones']} sesiones, {g['llamadas']} llamadas · base mediana "
              f"{g['base_mediana']:,} · contexto mediano {g['ctx_mediana']:,} · pond/llamada {g['pond_por_llamada']:,}"
              f" · out/llamada {g['out_por_llamada']:,} · fallas c/100 llamadas {g['fallas_cada_100']}"
              f" · versiones {', '.join(g['versiones'])}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
