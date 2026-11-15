# Oficina Virtual

Aplicación de escritorio con una oficina en pixel art de 16 bits. Muestra a tus agentes de Claude Code (`~/.claude/agents`) trabajando en sus puestos en tiempo real. Funciona en cualquier equipo: cada uno ve sus propios agentes.

## Instalar en otro equipo

Requisito en todos los casos: Claude Code instalado en ese equipo.

### Opción A: el ejecutable (Windows, sin instalar nada más)

1. Descarga `OficinaVirtual.exe` de la página de [Releases](https://github.com/ocros-dev/ClaudeOficinaVirtual/releases/latest) (o copia `dist/OficinaVirtual.exe` si lo compilaste tú) y ponlo en cualquier carpeta.
2. Ábrelo.
3. Si aparece el aviso amarillo, pulsa **Conectar** (o **⚙ Claude Code → Conectar**).
4. Abre una sesión nueva de Claude Code: tus agentes aparecerán en la oficina.

El `.exe` no necesita Python. Usa WebView2, que ya viene con Windows 10/11. Al ser un ejecutable sin firmar, Windows SmartScreen puede pedir confirmación la primera vez: «Más información → Ejecutar de todas formas».

### Opción B: desde el código (Windows, macOS o Linux)

```bash
git clone https://github.com/ocros-dev/ClaudeOficinaVirtual.git
cd ClaudeOficinaVirtual
pip install -r requirements.txt
python app.py --install-hooks              # o el botón «Conectar» dentro de la app
python app.py
```

En Linux, pywebview necesita GTK o Qt (consulta la documentación de pywebview).

### Para generar el ejecutable

```bash
python build.py      # crea dist/OficinaVirtual.exe (~11 MB) con su icono
```

## Conexión con Claude Code (hooks)

La oficina se entera de lo que hacen los agentes mediante *hooks* de Claude Code. Cada hook es un comando `curl`, que viene incluido en Windows 10/11, macOS y Linux:

```
curl -s -m 1 --connect-timeout 0.2 -A oficina-virtual ... --data-binary @- http://127.0.0.1:3017/event
```

- No depende de Python ni de ninguna ruta del equipo, así que puedes mover la app de carpeta sin romper nada.
- Si la oficina está cerrada, falla en menos de 0,1 s sin molestar a Claude Code.
- Se registra en `PreToolUse` (todas las herramientas), `PostToolUse` (Agent|Task), `SubagentStart`, `SubagentStop`, `UserPromptSubmit` y `Stop`.

Formas de gestionarla:

| | Dentro de la app | Línea de comandos |
|---|---|---|
| Conectar | **⚙ Claude Code → Conectar** | `python app.py --install-hooks` |
| Desconectar | **⚙ Claude Code → Desconectar** | `python app.py --uninstall-hooks` |

Solo se tocan las entradas de la oficina en `~/.claude/settings.json` y se respeta el resto. La primera vez se guarda una copia en `settings.json.bak-oficina`. Al conectar también se limpian las conexiones de versiones anteriores (`hook.js` / `hook.py`).

**Otro puerto**: `python app.py --port 3020` (o `OficinaVirtual.exe --port 3020`) y después pulsa **Conectar** para que los hooks usen ese puerto.

## Escritorios

Cada equipo tiene sus propios agentes. Al abrir la oficina:

1. Los agentes con un puesto predefinido lo usan (frontend-expert en Desarrollo, postgres-dba en Datos…).
2. El resto ocupa los puestos libres por orden alfabético.
3. Si hay más de 11 agentes, los sobrantes trabajan como invitados.

Los agentes que no están en `~/.claude/agents` (Explore, general-purpose…) son invitados: entran por la puerta del edificio, usan los escritorios de invitados y se van al terminar.

Para cambiar los puestos predefinidos, edita `DESKS` en `public/js/map.js`.

## Editar el aspecto de un agente

Selecciona un agente (en la lista o haciendo clic sobre él en la oficina) y aparece el **editor** en la columna derecha:

- **Vista previa** animada: gírala con ◄ ▲ ▼ ► y elige quieto, caminando o tecleando.
- **Peinado**: corto, largo, coleta, rizado o calvo.
- **Colores** de pelo, piel, camisa, pantalón, zapatos y accesorio (paleta o cualquier otro color con el selector).
- **Accesorios**: gafas, auriculares, gorra, boina y corbata (solo un sombrero a la vez).
- **🎲 azar** para una combinación aleatoria y **↺ original** para volver al aspecto por defecto.

Los cambios se ven al momento en la oficina. **✓ guardar** los conserva y **descartar** los deshace. Se guardan en `~/.oficina-virtual/looks.json`, compartido por el `.exe` y por `python app.py`. Si hay dos agentes del mismo tipo a la vez (`backend-expert#2`), comparten el aspecto.

El aspecto por defecto de cada rol está en `LOOKS`, dentro de `public/js/main.js`.

## Funciones

- **Estados**:
  - *libre*: toma café ☕, agua 💧, va a la máquina 🍫, se sienta en el banco 📱, charla 💬 o descansa en su silla.
  - *trabajando*: camina a su escritorio y teclea; la pantalla y el globo cambian según la herramienta.
  - *terminó*: se gira en la silla con "✓ listo".
- **Varias instancias** del mismo agente a la vez: aparecen como `backend-expert#2`, en un escritorio de invitado.
- **Línea de tiempo** con ventanas de 2 min, 10 min, 30 min y 2 h.
- **Sonido** (apagado por defecto): efectos y música chiptune.
- **Repetir sesión**: reproduce las sesiones guardadas en `~/.claude/projects` a x5, x10, x30 o x60.

## Estructura

```
Claude Code ──hook curl──▶ oficina/server.py ──SSE──▶ ventana (pywebview) con public/
```

- **app.py**: punto de entrada y opciones de línea de comandos.
- **oficina/server.py**: servidor hecho solo con la biblioteca estándar: estado, eventos en vivo, sesiones y repeticiones.
- **oficina/hooks.py**: instala, desinstala y comprueba los hooks.
- **public/**: la oficina (HTML y JavaScript). Todo el arte está hecho en código. `js/editor.js` es el editor de aspecto.
- **demo.py**: simula un equipo trabajando (`python demo.py` con la app abierta).
- **build.py** y **tools/make_icon.py**: generan el ejecutable y su icono.

La fuente pixel (Press Start 2P) se carga de Google Fonts; sin internet se usa una monoespaciada.
Para depurar los eventos que llegan, arranca con `OFFICE_DEBUG=1` y se guardan en `events.log`.
