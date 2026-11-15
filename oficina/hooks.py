"""Instala y desinstala los hooks de la oficina en ~/.claude/settings.json.

El hook es un comando curl (incluido en Windows 10/11, macOS y Linux), así que
no hace falta Python ni ninguna ruta de este equipo: funciona igual con el .exe.
Solo se tocan las entradas de la oficina; el resto de la configuración se respeta.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

SETTINGS = Path.home() / ".claude" / "settings.json"
BACKUP = SETTINGS.with_name("settings.json.bak-oficina")
MARKER = "oficina-virtual"          # user-agent del curl: identifica nuestras entradas
EVENTS = {                          # evento -> matcher (None = sin matcher)
    "PreToolUse": "*",
    "PostToolUse": "Agent|Task",
    "SubagentStart": None,
    "SubagentStop": None,
    "UserPromptSubmit": None,
    "Stop": None,
}
# Versiones anteriores de la oficina (hook.js / hook.py en una carpeta del proyecto)
LEGACY = re.compile(r"[\\/](VirtualOffice|office)[\\/]hook\.(py|js)\b", re.I)


def hook_command(port: int) -> str:
    return (f"curl -s -m 1 --connect-timeout 0.2 -A {MARKER} -H \"Content-Type: application/json\" "
            f"--data-binary @- http://127.0.0.1:{port}/event")


def _is_ours(hook: dict) -> bool:
    cmd = str(hook.get("command", ""))
    return MARKER in cmd or bool(LEGACY.search(cmd))


def _load() -> dict:
    if not SETTINGS.exists():
        return {}
    text = SETTINGS.read_text(encoding="utf-8").strip()
    return json.loads(text) if text else {}


def _save(data: dict) -> None:
    SETTINGS.parent.mkdir(parents=True, exist_ok=True)
    if SETTINGS.exists() and not BACKUP.exists():
        shutil.copy2(SETTINGS, BACKUP)
    tmp = SETTINGS.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(SETTINGS)


def _strip(data: dict) -> int:
    """Quita nuestras entradas. Devuelve cuántos hooks se quitaron."""
    removed = 0
    hooks = data.get("hooks")
    if not isinstance(hooks, dict):
        return 0
    for event in list(hooks):
        groups = hooks[event] if isinstance(hooks[event], list) else []
        kept_groups = []
        for grp in groups:
            inner = grp.get("hooks", []) if isinstance(grp, dict) else []
            kept = [h for h in inner if not _is_ours(h)]
            removed += len(inner) - len(kept)
            if kept:
                kept_groups.append({**grp, "hooks": kept})
            elif not inner:
                kept_groups.append(grp)
        if kept_groups:
            hooks[event] = kept_groups
        else:
            del hooks[event]
    if not hooks:
        data.pop("hooks", None)
    return removed


def status(port: int) -> dict:
    try:
        data = _load()
    except (OSError, ValueError) as e:
        return {"installed": False, "current": False, "error": f"No se pudo leer {SETTINGS}: {e}", "settings": str(SETTINGS)}
    cmds = [h.get("command", "") for groups in (data.get("hooks") or {}).values() if isinstance(groups, list)
            for g in groups if isinstance(g, dict) for h in g.get("hooks", []) if _is_ours(h)]
    expected = hook_command(port)
    current = len(cmds) == len(EVENTS) and all(c == expected for c in cmds)
    return {"installed": bool(cmds), "current": current, "count": len(cmds), "port": port,
            "settings": str(SETTINGS), "legacy": any(LEGACY.search(c) for c in cmds)}


def install(port: int) -> dict:
    data = _load()
    _strip(data)
    hooks = data.setdefault("hooks", {})
    entry = {"type": "command", "command": hook_command(port), "timeout": 2}
    for event, matcher in EVENTS.items():
        grp = {"hooks": [entry]}
        if matcher:
            grp = {"matcher": matcher, **grp}
        hooks.setdefault(event, []).append(grp)
    _save(data)
    return status(port)


def uninstall(port: int) -> dict:
    data = _load()
    removed = _strip(data)
    if removed:
        _save(data)
    return {**status(port), "removed": removed}
