"""Simula eventos de hooks para probar la oficina sin lanzar agentes reales.

Uso: python demo.py         (con la app abierta) equipo de desarrollo
     python demo.py arena   9 agentes, uno por raza del tema arena (parties, etapas, formas del rey)
"""
from __future__ import annotations

import json
import os
import random
import sys
import threading
import time
import urllib.request

for _s in (sys.stdout, sys.stderr):   # la consola de Windows no suele ser UTF-8
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

PORT = int(os.environ.get("OFFICE_PORT", 3017))
TOOLS = ["Read", "Grep", "Edit", "Write", "Bash", "Glob", "WebSearch", "mcp__Claude_Browser__navigate"]


def send(ev: dict) -> None:
    req = urllib.request.Request(f"http://127.0.0.1:{PORT}/event", data=json.dumps(ev).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        urllib.request.urlopen(req, timeout=2).close()
    except OSError:
        print("¿Está abierta la oficina? (python app.py)")


def run_agent(type_: str, task: str) -> None:
    aid = f"{type_}-{time.time_ns()}"
    send({"hook_event_name": "PreToolUse", "tool_name": "Agent", "tool_input": {"subagent_type": type_, "description": task}})
    send({"hook_event_name": "SubagentStart", "agent_id": aid, "agent_type": type_})
    for _ in range(random.randint(4, 8)):
        time.sleep(random.uniform(1.5, 4))
        send({"hook_event_name": "PreToolUse", "agent_id": aid, "agent_type": type_,
              "tool_name": random.choice(TOOLS), "tool_input": {"file_path": "src/app.ts"}})
    time.sleep(1.5)
    send({"hook_event_name": "SubagentStop", "agent_id": aid, "agent_type": type_})


def parallel(*jobs) -> None:
    threads = [threading.Thread(target=run_agent, args=j) for j in jobs]
    for t in threads:
        t.start()
    for t in threads:
        t.join()


# ---- Escenario «arena»: una party por raza ----------------------------------------------------------
# Rol -> raza según public/js/arena/races.js (claude = Tempestarios, el jefe sin agent_id).
ARENA_TEAM = [  # (agente, raza, tarea, herramientas favoritas)
    ("product-owner", "Humanos", "Priorizar historias", ["Read", "TodoWrite", "Grep", "WebFetch"]),
    ("frontend-expert", "Elfos", "Pantalla de reservas", ["Edit", "Write", "Read", "Glob"]),
    ("backend-expert", "Enanos", "API de reservas", ["Edit", "Bash", "Write", "Grep"]),
    ("security-expert", "Orcos", "Auditoría OWASP", ["Grep", "Read", "Bash", "WebFetch"]),
    ("data-engineer", "Gnomos", "Pipeline de datos", ["Bash", "Write", "Read", "Edit"]),
    ("explore", "Bestiales", "Explorar el repositorio", ["Glob", "Grep", "Read", "Read"]),
    ("software-architect", "Draconios", "Diseñar arquitectura", ["Read", "Write", "TodoWrite", "Grep"]),
    ("general-purpose", "Astrales", "Tareas sueltas", ["Bash", "WebFetch", "Edit", "Grep"]),
]
ALL_TOOLS = ["Read", "Grep", "Edit", "Write", "Bash", "WebFetch", "TodoWrite", "Agent"]
FILES = ["src/app.ts", "api/reservas.py", "db/schema.sql", "README.md", "web/ui.js", "ci/pipeline.yml"]


def tool_event(tool: str, aid: str | None = None, type_: str | None = None) -> dict:
    inp = {"file_path": random.choice(FILES)}
    if tool == "Bash":
        inp = {"command": "npm test"}
    elif tool == "WebFetch":
        inp = {"url": "https://example.com/docs"}
    elif tool == "Grep":
        inp = {"pattern": "TODO"}
    elif tool == "TodoWrite":
        inp = {}
    elif tool == "Agent":   # el agente que delega, no un hijo nuevo: se reutiliza un tipo ya en marcha
        inp = {"subagent_type": "general-purpose", "description": "Consulta rápida"}
    ev = {"hook_event_name": "PreToolUse", "tool_name": tool, "tool_input": inp}
    if aid:
        ev.update(agent_id=aid, agent_type=type_)
    return ev


def arena_worker(type_: str, task: str, tools: list[str], count: int, pace: float, start_delay: float) -> None:
    time.sleep(start_delay)
    aid = f"{type_}-{time.time_ns()}"
    send({"hook_event_name": "PreToolUse", "tool_name": "Agent", "tool_input": {"subagent_type": type_, "description": task}})
    send({"hook_event_name": "SubagentStart", "agent_id": aid, "agent_type": type_})
    for i in range(count):
        time.sleep(random.uniform(0.5, 1.4) * pace)
        # Ráfagas: cada pocas acciones, una herramienta distinta del repertorio completo (sin Agent: no ensucia el reparto).
        pool = tools if i % 4 else [t for t in ALL_TOOLS if t != "Agent"]
        send(tool_event(random.choice(pool), aid, type_))
    time.sleep(1.5)
    send({"hook_event_name": "SubagentStop", "agent_id": aid, "agent_type": type_})


def run_arena() -> None:
    print(f"Demo arena en http://localhost:{PORT}  (unos 3 minutos)")
    send({"hook_event_name": "UserPromptSubmit", "prompt": "Construye una app de reservas"})
    time.sleep(2)
    # Los 9 agentes entran escalonados: se ven las parties uniéndose. Cada uno trabaja una ráfaga distinta;
    # con más acciones suben de etapa y el rey cambia de forma. Terminan en momentos distintos y vuelven al campamento.
    threads = []
    for n, (type_, _race, task, tools) in enumerate(ARENA_TEAM):
        count = 30 + 8 * n                   # 30..94 acciones: unos terminan mucho antes que otros
        t = threading.Thread(target=arena_worker, args=(type_, task, tools, count, 1.5, n * 3.0))
        t.start()
        threads.append(t)
    # El jefe (Tempestarios) trabaja con todas las herramientas a lo largo de toda la batalla; su carga crece despacio.
    send({"hook_event_name": "PreToolUse", "tool_name": "TodoWrite", "tool_input": {}})
    for i in range(70):
        time.sleep(random.uniform(1.0, 2.5))
        # Solo delega al principio: general-purpose sigue activo y no queda un agente «Empezando» colgado al final.
        tool = ALL_TOOLS[i % len(ALL_TOOLS)]
        send(tool_event("Read" if tool == "Agent" and i > 25 else tool))
        if i % 25 == 24:
            send({"hook_event_name": "UserPromptSubmit", "prompt": "Sigue con la siguiente fase"})
    for t in threads:
        t.join()
    time.sleep(3)
    send({"hook_event_name": "Stop"})
    print("Demo arena terminada.")


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "arena":
    run_arena()
elif __name__ == "__main__":
    print(f"Demo en marcha en http://localhost:{PORT}")
    send({"hook_event_name": "UserPromptSubmit", "prompt": "Construye una app de reservas"})
    time.sleep(2)
    run_agent("product-owner", "Historias de usuario")
    run_agent("software-architect", "Diseñar arquitectura")
    parallel(("frontend-expert", "Pantalla de reservas"), ("backend-expert", "API de reservas"),
             ("postgres-dba", "Esquema y migraciones"), ("ux-designer", "Wireframes"))
    parallel(("qa-engineer", "Pruebas E2E"), ("security-expert", "Auditoría OWASP"))
    run_agent("devops-engineer", "Pipeline CI/CD")
    send({"hook_event_name": "Stop"})
    print("Demo terminada.")
