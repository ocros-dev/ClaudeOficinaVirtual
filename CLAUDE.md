# Oficina Virtual

Aplicación de escritorio en pixel art que muestra a los agentes de Claude Code trabajando. Servidor en Python (solo biblioteca estándar) y una interfaz en HTML/JavaScript sin dependencias ni compilación. Todo el arte se dibuja en código. Los textos de la interfaz, los comentarios y los commits van en español.

## Uso de agentes

- Delega cada parte del trabajo en el agente del proyecto que corresponda a su especialidad. No hagas tú solo un trabajo que encaja con un agente disponible.
- **No uses `qa-engineer` ni `security-expert`** salvo que el usuario lo pida explícitamente en esa conversación.
- Si los agentes del proyecto no están disponibles en la sesión (no hay definiciones en `.claude/agents/` ni en `~/.claude/agents/`), avísalo al usuario **antes** de empezar, en lugar de hacer el trabajo sin ellos en silencio.

Reparto orientativo en este proyecto:

| Trabajo | Agente |
|---|---|
| Interfaz, canvas, sprites, editor, temas (`public/`) | `frontend-expert` |
| Servidor, hooks, eventos, repeticiones (`oficina/`, `app.py`) | `backend-expert` |
| Aspecto visual, pixel art, paletas, usabilidad | `ux-designer` |
| Diseño de funciones nuevas que tocan varias partes | `software-architect` |
| Alcance y prioridades de una idea nueva | `product-owner` |
| Ejecutable, `build.py`, publicación de versiones | `devops-engineer` |

## Comandos

```bash
pip install -r requirements.txt   # pywebview
python app.py                     # abre la oficina (puerto 3017)
python demo.py                    # con la app abierta: simula un equipo trabajando
python build.py                   # genera dist/OficinaVirtual.exe (Windows)
```

Sin entorno gráfico se puede arrancar solo el servidor (`from oficina import server; server.start(3017)`) y abrir `http://127.0.0.1:3017/` en un navegador. Las peticiones a `/api/*` necesitan la cabecera `X-Oficina: 1`.

## Estructura

- `oficina/server.py`: estado de los agentes, eventos de los hooks, SSE, sesiones, repeticiones y aspectos guardados (valida los campos en `clean_look`).
- `oficina/hooks.py`: instala y quita los hooks en `~/.claude/settings.json`.
- `public/js/main.js`: bucle principal, movimiento, dibujo y panel.
- `public/js/map.js`: mapa, salas, escritorios y dibujo de la oficina.
- `public/js/rpg.js`: tema «mundo RPG», villanos y batallas.
- `public/js/sprites.js` y `public/js/editor.js`: personajes y editor de aspecto.
- Los personajes y villanos deben ser diseños originales: no copies personajes con derechos de autor.
