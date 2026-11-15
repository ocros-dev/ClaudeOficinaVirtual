"""Simula eventos de hooks para probar la oficina sin lanzar agentes reales.

Uso: python demo.py   (con la app abierta)
"""
import json
import os
import random
import threading
import time
import urllib.request

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


if __name__ == "__main__":
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
