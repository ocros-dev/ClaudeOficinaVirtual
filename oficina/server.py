"""Servidor de la oficina virtual (solo biblioteca estándar).

    POST /event                  eventos de los hooks de Claude Code
    GET  /stream                 estado en vivo (Server-Sent Events)
    GET  /api/sessions           sesiones guardadas en ~/.claude/projects
    POST /api/replay?id=&speed=  reproduce una sesión guardada
    POST /api/replay/stop        detiene la repetición
"""
from __future__ import annotations

import json
import os
import queue
import re
import sys
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from . import hooks

CLAUDE_DIR = Path.home() / ".claude"
AGENTS_DIR = CLAUDE_DIR / "agents"
PROJECTS_DIR = CLAUDE_DIR / "projects"
BOSS = "claude"
HIST_MAX = 400
MAX_GAP_MS = 2500     # espera máxima entre eventos durante una repetición
DEBUG = bool(os.environ.get("OFFICE_DEBUG"))
PORT = 3017   # se fija en start()
DATA_DIR = Path.home() / ".oficina-virtual"
LOOKS_FILE = DATA_DIR / "looks.json"


# ---- Aspecto personalizado de los agentes ------------------------------------
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
LOOK_COLORS = ("shirt", "hair", "skin", "pants", "shoes", "accent", "iris")
HAIR_STYLES = {"corto", "largo", "coleta", "rizado", "calvo", "puntas", "coletas", "princesa"}
ACCESSORIES = {"glasses", "headset", "cap", "beret", "tie", "headband", "ribbon", "scarf"}
EYE_STYLES = {"normal", "anime"}
looks_lock = threading.Lock()


def load_looks() -> dict:
    try:
        data = json.loads(LOOKS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def clean_look(look: dict) -> dict:
    """Valida un aspecto recibido del editor: solo colores hex y opciones conocidas."""
    out = {k: look[k] for k in LOOK_COLORS if isinstance(look.get(k), str) and HEX.match(look[k])}
    if look.get("hairStyle") in HAIR_STYLES:
        out["hairStyle"] = look["hairStyle"]
    if look.get("eyes") in EYE_STYLES:
        out["eyes"] = look["eyes"]
    acc = look.get("accessory")
    if isinstance(acc, list):
        out["accessory"] = [a for a in dict.fromkeys(acc) if a in ACCESSORIES]
    return out


def save_look(name: str, look: dict | None) -> dict:
    if not isinstance(name, str) or not 0 < len(name) <= 100:
        raise ValueError("nombre de agente inválido")
    with looks_lock:
        data = load_looks()
        if look is None:
            data.pop(name, None)
        else:
            data[name] = clean_look(look)
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        tmp = LOOKS_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(LOOKS_FILE)
    broadcast({"type": "looks", "looks": data})
    return data


def resource_dir() -> Path:
    """Carpeta con los archivos de la web (también dentro del .exe de PyInstaller)."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    return base / "public"


def now_ms() -> int:
    return int(time.time() * 1000)


# ---- Estado ----------------------------------------------------------------
lock = threading.RLock()
agents: dict[str, dict] = {}
id_to_name: dict[str, str] = {}
pending_tasks: dict[str, list[str]] = {}
roster: list[str] = []
clients: set[queue.Queue] = set()
clients_lock = threading.Lock()


def load_roster() -> None:
    roster.clear()
    try:
        for f in sorted(AGENTS_DIR.glob("*.md")):
            m = re.search(r"^name:\s*(.+)$", f.read_text(encoding="utf-8"), re.M)
            roster.append((m.group(1) if m else f.stem).strip())
    except OSError as e:
        print("No se pudo leer", AGENTS_DIR, e)


def ensure_agent(name: str, type_: str | None = None) -> dict:
    if name not in agents:
        agents[name] = {"name": name, "type": type_ or name.split("#")[0], "state": "idle", "tool": None,
                        "task": None, "updatedAt": now_ms(), "log": [], "hist": []}
    return agents[name]


def reset_state() -> None:
    with lock:
        agents.clear(); id_to_name.clear(); pending_tasks.clear()
        for n in [BOSS, *roster]:
            ensure_agent(n)


def public_agent(a: dict) -> dict:
    return {k: v for k, v in a.items() if k != "hist"}


def set_state(name: str, log_line: str | None = None, **patch) -> None:
    a = ensure_agent(name)
    a.update(patch)
    a["updatedAt"] = now_ms()
    if log_line:
        a["log"].insert(0, {"t": a["updatedAt"], "text": log_line})
        del a["log"][30:]
    a["hist"].append({"t": a["updatedAt"], "state": a["state"], "tool": a["tool"]})
    del a["hist"][:-HIST_MAX]
    broadcast({"type": "agent", "agent": public_agent(a)})


def remove_agent(name: str) -> None:
    agents.pop(name, None)
    for k in [k for k, v in id_to_name.items() if v == name]:
        del id_to_name[k]
    broadcast({"type": "remove", "name": name})


# ---- Interpretación de los hooks ------------------------------------------
def short_input(inp: dict) -> str:
    v = next((inp.get(k) for k in ("file_path", "path", "pattern", "command", "url", "query", "description") if inp.get(k)), "")
    s = re.sub(r"\s+", " ", str(v))
    return s if len(s) <= 60 else s[:57] + "…"


def instance_for(agent_id: str, type_: str) -> str:
    """Nombre de la instancia de este agent_id ('tipo' o 'tipo#N' si el tipo ya está ocupado)."""
    if agent_id in id_to_name:
        return id_to_name[agent_id]
    busy = lambda n: any(v == n and k != agent_id for k, v in id_to_name.items())
    name, n = type_, 1
    while busy(name):
        n += 1
        name = f"{type_}#{n}"
    id_to_name[agent_id] = name
    ensure_agent(name, type_)
    return name


def handle_hook(ev: dict) -> None:
    with lock:
        kind = ev.get("hook_event_name")
        tool = ev.get("tool_name")
        inp = ev.get("tool_input") or {}
        if not isinstance(inp, dict):
            inp = {}
        who = instance_for(ev["agent_id"], ev.get("agent_type") or "agente") if ev.get("agent_id") else (ev.get("agent_type") or BOSS)
        delegation = tool in ("Agent", "Task")

        if kind == "PreToolUse":
            if delegation:
                target = inp.get("subagent_type") or "general-purpose"
                task = inp.get("description") or ""
                pending_tasks.setdefault(target, []).append(task)
                set_state(who, f"Delega a {target}: {task}", state="working", tool="Delegar")
                if ensure_agent(target)["state"] != "working":
                    set_state(target, f"Nueva tarea: {task}", state="working", tool="Empezando", task=task)
            else:
                set_state(who, f"{tool} {short_input(inp)}".strip(), state="working", tool=tool)

        elif kind == "PostToolUse":
            # En segundo plano responde al instante: su fin lo marca SubagentStop.
            resp = ev.get("tool_response") if isinstance(ev.get("tool_response"), dict) else {}
            is_async = resp.get("isAsync") or resp.get("status") == "async_launched"
            target = inp.get("subagent_type") or "general-purpose"
            tracked = any(agents.get(n, {}).get("type") == target for n in id_to_name.values())
            if delegation and not is_async and not tracked:
                set_state(target, "Tarea terminada ✓", state="done", tool=None)

        elif kind == "SubagentStart":
            type_ = ev.get("agent_type") or "agente"
            queued = pending_tasks.get(type_) or []
            task = queued.pop(0) if queued else agents[who].get("task")
            set_state(who, "Arranca" + (f": {task}" if task else ""), state="working", tool="Empezando", task=task)

        elif kind == "SubagentStop":
            if who != BOSS:
                set_state(who, "Tarea terminada ✓", state="done", tool=None)
                id_to_name.pop(ev.get("agent_id"), None)

        elif kind == "UserPromptSubmit":
            set_state(BOSS, "Nuevo pedido del usuario", state="working", tool="Pensando", task=str(ev.get("prompt") or "")[:80])

        elif kind == "Stop":
            set_state(BOSS, "Turno terminado", state="idle", tool=None)


def ticker(stop: threading.Event) -> None:
    """Paso del tiempo: done -> idle, trabajo sin noticias -> idle, instancias extra -> se van."""
    while not stop.wait(2):
        with lock:
            t = now_ms()
            for a in list(agents.values()):
                age = t - a["updatedAt"]
                if a["state"] == "done" and age > 8000:
                    set_state(a["name"], state="idle", task=None)
                elif a["state"] == "working" and age > 90000:
                    set_state(a["name"], state="idle", tool=None)
                elif a["state"] == "idle" and "#" in a["name"] and age > 30000:
                    remove_agent(a["name"])


# ---- Sesiones guardadas ------------------------------------------------------
def read_jsonl(path: Path, limit_bytes: int | None = None) -> list[dict]:
    out = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read(limit_bytes) if limit_bytes else f.read()
    except OSError:
        return out
    for line in text.splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def prompt_text(msg) -> str | None:
    c = (msg or {}).get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list) and c and all(b.get("type") == "text" for b in c):
        return " ".join(b.get("text", "") for b in c)
    return None


def is_real_prompt(e: dict) -> bool:
    if e.get("type") != "user" or e.get("isMeta") or e.get("isSidechain"):
        return False
    p = prompt_text(e.get("message"))
    return bool(p) and not re.match(r"^\s*<(command-|local-command|system-reminder|task-notification)", p)


def ts(e: dict) -> int:
    try:
        return int(datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00")).timestamp() * 1000)
    except (KeyError, ValueError, AttributeError):
        return 0


def tool_uses(e: dict) -> list[dict]:
    c = (e.get("message") or {}).get("content") if e.get("type") == "assistant" else None
    return [b for b in c if b.get("type") == "tool_use"] if isinstance(c, list) else []


def list_sessions() -> list[dict]:
    out = []
    if not PROJECTS_DIR.is_dir():
        return out
    for proj in PROJECTS_DIR.iterdir():
        if not proj.is_dir():
            continue
        for f in proj.glob("*.jsonl"):
            sid = f.stem
            title = None
            try:
                title = json.loads((proj / sid / "custom-title.json").read_text(encoding="utf-8")).get("title")
            except (OSError, ValueError):
                pass
            head = read_jsonl(f, 256 * 1024)
            if not title:
                title = next((prompt_text(e["message"]) for e in head if is_real_prompt(e)), None)
            cwd = next((e["cwd"] for e in head if isinstance(e.get("cwd"), str) and e["cwd"]), None)
            subdir = proj / sid / "subagents"
            subagents = len(list(subdir.glob("*.meta.json"))) if subdir.is_dir() else 0
            st = f.stat()
            out.append({
                "id": f"{proj.name}/{sid}",
                # Nombre de la carpeta donde se trabajó (el nombre del directorio de ~/.claude/projects es ambiguo)
                "project": re.split(r"[\\/]", cwd.rstrip("\\/"))[-1] if cwd else proj.name,
                "title": re.sub(r"\s+", " ", title or "(sin título)")[:90],
                "updated": int(st.st_mtime * 1000), "sizeKb": round(st.st_size / 1024), "subagents": subagents,
            })
    return sorted(out, key=lambda s: -s["updated"])


def session_events(session_id: str) -> list[tuple[int, dict]]:
    """Convierte una sesión guardada en la misma secuencia de eventos que mandan los hooks."""
    proj, _, sid = session_id.partition("/")
    if not proj or not sid or re.search(r"[\\/]|\.\.", proj + sid):
        raise ValueError("id inválido")
    d = PROJECTS_DIR / proj
    evs: list[tuple[int, dict]] = []

    in_turn, last_t = False, 0
    for e in read_jsonl(d / f"{sid}.jsonl"):
        if e.get("isSidechain"):
            continue
        t = ts(e)
        if not t:
            continue
        if is_real_prompt(e):
            if in_turn:
                evs.append((last_t + 1, {"hook_event_name": "Stop"}))
            evs.append((t, {"hook_event_name": "UserPromptSubmit", "prompt": prompt_text(e["message"])}))
            in_turn = True
        for b in tool_uses(e):
            evs.append((t, {"hook_event_name": "PreToolUse", "tool_name": b.get("name"), "tool_input": b.get("input")}))
        if e.get("type") == "assistant":
            last_t = t
    if in_turn:
        evs.append((last_t + 1, {"hook_event_name": "Stop"}))

    subdir = d / sid / "subagents"
    for f in (subdir.glob("agent-*.jsonl") if subdir.is_dir() else []):
        agent_id = f.stem[len("agent-"):]
        try:
            meta = json.loads((subdir / f"agent-{agent_id}.meta.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            meta = {}
        base = {"agent_id": agent_id, "agent_type": meta.get("agentType") or "general-purpose"}
        lines = [e for e in read_jsonl(f) if ts(e)]
        if not lines:
            continue
        evs.append((ts(lines[0]), {**base, "hook_event_name": "SubagentStart"}))
        for e in lines:
            for b in tool_uses(e):
                evs.append((ts(e), {**base, "hook_event_name": "PreToolUse", "tool_name": b.get("name"), "tool_input": b.get("input")}))
        evs.append((ts(lines[-1]) + 1, {**base, "hook_event_name": "SubagentStop"}))
    evs.sort(key=lambda x: x[0])
    return evs


# ---- Repetición --------------------------------------------------------------
replay: dict | None = None


def replay_info(finished: bool = False) -> dict | None:
    r = replay
    return r and {"id": r["id"], "title": r["title"], "speed": r["speed"], "i": r["i"], "total": r["total"], "finished": finished}


def snapshot() -> dict:
    with lock:
        return {"roster": [BOSS, *roster], "looks": load_looks(), "agents": [public_agent(a) for a in agents.values()],
                "hist": {a["name"]: a["hist"] for a in agents.values()}}


def stop_replay() -> None:
    global replay
    if replay:
        replay["stop"].set()
    replay = None
    reset_state()
    broadcast({"type": "snapshot", **snapshot()})
    broadcast({"type": "replay", "replay": None})


def start_replay(session_id: str, speed: float) -> int:
    global replay
    events = session_events(session_id)
    if replay:
        replay["stop"].set()
    reset_state()
    info = next((s for s in list_sessions() if s["id"] == session_id), None)
    r = replay = {"id": session_id, "title": info["title"] if info else session_id, "speed": speed,
                  "i": 0, "total": len(events), "stop": threading.Event()}
    broadcast({"type": "snapshot", **snapshot()})
    broadcast({"type": "replay", "replay": replay_info()})

    def run() -> None:
        global replay
        if r["stop"].wait(0.6):
            return
        for i, (t, ev) in enumerate(events):
            if r["stop"].is_set():
                return
            handle_hook(ev)
            r["i"] = i + 1
            if r["i"] % 5 == 0 or r["i"] == len(events):
                broadcast({"type": "replay", "replay": replay_info()})
            if i + 1 < len(events):
                gap = min(MAX_GAP_MS, (events[i + 1][0] - t) / speed)
                if r["stop"].wait(max(0.04, gap / 1000)):
                    return
        if replay is r:
            broadcast({"type": "replay", "replay": replay_info(finished=True)})
            replay = None

    threading.Thread(target=run, daemon=True).start()
    return len(events)


# ---- SSE ---------------------------------------------------------------------
def broadcast(msg: dict) -> None:
    data = json.dumps(msg, ensure_ascii=False)
    with clients_lock:
        for q in list(clients):
            q.put(data)


# ---- HTTP --------------------------------------------------------------------
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css",
        ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon"}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # silencio
        pass

    def send_json(self, code: int, obj) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        url = urlparse(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(min(length, 1_000_000)) if length else b""
        if url.path == "/event":
            if DEBUG:
                with open(Path.cwd() / "events.log", "ab") as f:
                    f.write(body.replace(b"\n", b" ") + b"\n")
            if not replay:   # durante una repetición se ignoran los eventos en vivo
                try:
                    handle_hook(json.loads(body or b"{}"))
                except (ValueError, KeyError, TypeError) as e:
                    print("Evento inválido:", e)
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
        elif url.path.startswith("/api/") and self.headers.get("X-Oficina") != "1":
            # Las acciones exigen una cabecera propia: el navegador no deja que otras webs la envíen
            # sin un preflight CORS que este servidor no acepta.
            self.send_json(403, {"error": "petición no permitida"})
        elif url.path == "/api/looks":
            try:
                req = json.loads(body or b"{}")
                look = req.get("look")
                self.send_json(200, save_look(req.get("name"), look if isinstance(look, dict) else None))
            except (ValueError, AttributeError, OSError) as e:
                self.send_json(400, {"error": str(e)})
        elif url.path in ("/api/hooks/install", "/api/hooks/uninstall"):
            try:
                fn = hooks.uninstall if url.path.endswith("/uninstall") else hooks.install
                self.send_json(200, fn(PORT))
            except (OSError, ValueError) as e:
                self.send_json(500, {"error": f"No se pudo modificar {hooks.SETTINGS}: {e}"})
        elif url.path == "/api/replay":
            q = parse_qs(url.query)
            try:
                speed = min(100.0, max(1.0, float((q.get("speed") or ["10"])[0])))
                self.send_json(200, {"events": start_replay((q.get("id") or [""])[0], speed)})
            except (ValueError, OSError) as e:
                self.send_json(400, {"error": str(e)})
        elif url.path == "/api/replay/stop":
            stop_replay()
            self.send_json(200, {"ok": True})
        else:
            self.send_json(404, {"error": "no encontrado"})

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/hooks":
            self.send_json(200, hooks.status(PORT))
        elif url.path == "/api/sessions":
            try:
                self.send_json(200, list_sessions()[:100])
            except OSError as e:
                self.send_json(500, {"error": str(e)})
        elif url.path == "/stream":
            self.stream()
        else:
            self.static(url.path)

    def stream(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        q: queue.Queue = queue.Queue()
        q.put(json.dumps({"type": "snapshot", **snapshot()}, ensure_ascii=False))
        q.put(json.dumps({"type": "replay", "replay": replay_info()}, ensure_ascii=False))
        with clients_lock:
            clients.add(q)
        try:
            while True:
                try:
                    chunk = f"data: {q.get(timeout=25)}\n\n"
                except queue.Empty:
                    chunk = ": ping\n\n"
                self.wfile.write(chunk.encode("utf-8"))
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with clients_lock:
                clients.discard(q)
            self.close_connection = True

    def static(self, path: str) -> None:
        root = resource_dir().resolve()
        target = (root / ("index.html" if path in ("", "/") else path.lstrip("/"))).resolve()
        if root not in target.parents and target != root or not target.is_file():
            self.send_response(404)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(target.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False


def start(port: int = 3017) -> tuple[Server, threading.Event]:
    """Arranca el servidor en segundo plano. Lanza OSError si el puerto está ocupado."""
    global PORT
    PORT = port
    load_roster()
    reset_state()
    httpd = Server(("127.0.0.1", port), Handler)
    stop = threading.Event()
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    threading.Thread(target=ticker, args=(stop,), daemon=True).start()
    return httpd, stop


if __name__ == "__main__":
    port = int(os.environ.get("OFFICE_PORT", 3017))
    start(port)
    print(f"Oficina virtual en http://localhost:{port}  ({len(roster)} agentes)")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        pass
