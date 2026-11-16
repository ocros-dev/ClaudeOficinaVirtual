# Oficina Virtual: instrucciones para Claude Code

## Delegación a agentes

- Cada instrucción del usuario se delega al subagente que corresponda (`Agent` con su `subagent_type`). Claude actúa como coordinador: reparte el trabajo, revisa lo que devuelve cada agente y le informa al usuario.
- Guía de reparto para este proyecto:
  - `frontend-expert`: la oficina en `public/` (HTML, CSS, JavaScript, sprites, mapa, editor, línea de tiempo, sonido).
  - `backend-expert`: el servidor `oficina/server.py`, los hooks `oficina/hooks.py`, `app.py` y `demo.py`.
  - `devops-engineer`: empaquetado (`build.py`, PyInstaller, el `.exe`), releases, CI y despliegue.
  - `ux-designer`: diseño visual, pixel art, flujos y usabilidad.
  - `software-architect`: decisiones de arquitectura o refactorizaciones grandes.
  - `product-owner`: definir requisitos o alcance antes de una funcionalidad nueva.
  - Otros (`data-engineer`, `postgres-dba`, `mobile-developer`), solo cuando el trabajo sea de su área.
  - Si una tarea toca varias áreas, se divide entre los agentes que correspondan.
- Las tareas triviales (responder una pregunta, ejecutar la app o un comando, hacer un commit) las hace Claude directamente.
- **No usar `qa-engineer` ni `security-expert`** salvo que el usuario lo pida explícitamente.
