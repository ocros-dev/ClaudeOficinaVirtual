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
- **Estilo anime**: 8 estilos listos con un clic (héroe, ninja, samurái, estudiante, maga, idol, rival y piloto). Son arquetipos originales; después puedes retocar cualquier detalle.
- **Peinado**: corto, largo, coleta, rizado, calvo y los de estilo anime: puntas, coletas y princesa.
- **Ojos**: normales o anime (grandes, con brillo y el color de iris que elijas).
- **Colores** de pelo, piel, camisa, pantalón, zapatos y accesorio (paleta o cualquier otro color con el selector).
- **Accesorios**: gafas, auriculares, gorra, boina, corbata, cinta, lazo y bufanda (solo uno a la vez entre gorra, boina y cinta).
- **🎲 azar** para una combinación aleatoria y **↺ original** para volver al aspecto por defecto.

Los cambios se ven al momento en la oficina. **✓ guardar** los conserva y **descartar** los deshace. Se guardan en `~/.oficina-virtual/looks.json`, compartido por el `.exe` y por `python app.py`. Si hay dos agentes del mismo tipo a la vez (`backend-expert#2`), comparten el aspecto.

Por defecto cada agente lleva un estilo anime según su rol (`ROLE_ANIME` en `public/js/main.js`); los agentes sin rol conocido reciben uno según su nombre. Los colores base están en `LOOKS`.

## Tema «arena»

El botón **🏢 oficina / ⚔ arena** de la cabecera cambia el tema (se recuerda para la próxima vez; quien tenía guardado el antiguo tema «mundo RPG» abre la arena). Se puede cambiar con agentes trabajando, sin recargar: las parties que ya trabajan aparecen de inmediato y surge un Rey Demonio.

La arena es una escena de una sola pantalla: en la parte de arriba, el suelo de piedra circular con círculo mágico, las gradas en ruinas y un trono; al pie de la escena, el **campamento de descanso**, separado de la arena por una empalizada con una puerta. Sin ninguna party se ve la arena vacía con el trono y «La arena espera…»; si hay héroes descansando pero nadie lucha, no hay rey y el texto pasa a «Los héroes descansan…». El panel de agentes, la línea de tiempo, el editor y las repeticiones funcionan igual; al seleccionar un agente (en la lista o con un clic en su party) se resalta su party con un anillo, una flecha y su placa.

- **Parties**: cada agente que trabaja es una party de 3 héroes de una **raza** (vanguardia, distancia o magia, y apoyo). Sale del campamento, cruza la puerta y camina hasta su puesto (menos de 2,5 s); ocupa un puesto en abanico (el primero al centro; los demás alternan a izquierda y derecha y no cambian de sitio mientras trabajen). Sobre cada party hay una placa con el emblema de su raza, el nombre del agente y su etapa (◆◆◇). Al terminar, celebra 2 s («🏆 ¡victoria!») y vuelve caminando al campamento por la puerta; si el agente vuelve a trabajar en menos de 5 s, conserva su poder (y desde donde esté camina de nuevo a la batalla).
- **Zona de descanso**: cada agente conocido que no trabaja (los de la lista del panel) es una party de 3 héroes de su raza que descansa en el campamento: hasta 7 puestos (4 atrás y 3 delante); el resto aparece en una insignia «+N descansando» abajo a la derecha (si vuelve una party del combate y no queda sitio, cede el puesto el grupo del último). Las actividades cambian cada 10-18 s y los héroes caminan de una a otra: comer en la fogata con su olla, banquete con jarras, conversar (globos con frases cortas o iconos; como mucho 2 a la vez), golpear un muñeco de práctica, practicar puntería con una diana, meditar, practicar hechizos y dormir (con «Zzz»). Cada raza añade las suyas: los enanos trabajan en la forja con yunque y brindan con jarras, los elfos leen a la luz de un farol y tiran con arco, los orcos levantan pesas, los gnomos ajustan engranajes en su banco, los astrales meditan con una constelación sobre ellos, los draconios avivan la hoguera con su aliento, los humanos hacen combates de práctica y los bestiales juegan a la pilla. Seleccionar un agente resalta su party esté donde esté (campamento o arena) y el panel muestra su actividad. Con `prefers-reduced-motion` los héroes no se mueven en bucle ni hay partículas.
- **Razas** (2 roles de agente por raza; los roles desconocidos reciben una según su nombre, siempre la misma). Dos agentes de la misma raza a la vez usan la paleta A y la B:

  | Raza | Roles | Clases (vanguardia · distancia o magia · apoyo) |
  |---|---|---|
  | Humanos (Reino del Alba) | claude, product-owner | Caballera · Hechicero · Sanadora |
  | Elfos (Silvanos del Umbral Verde) | frontend-expert, ux-designer | Danzante de hojas · Arquera · Druida |
  | Enanos (Clanes de la Forja) | backend-expert, devops-engineer | Martillador · Artillero · Rúnico |
  | Orcos (Tribus del Colmillo) | security-expert, qa-engineer | Berserker · Cazador · Chamán |
  | Gnomos (Taller del Engranaje) | data-engineer, postgres-dba | Piloto de mecha · Artífice · Alquimista |
  | Bestiales (Manada de la Luna) | Explore, mobile-developer | Oso guardián · Zorra ilusionista · Ciervo-sanador |
  | Draconios (Linaje de Escamas) | software-architect, Plan | Lancero dracónico · Aliento-mago · Sacerdotisa de escamas |
  | Astrales (Hijos del Cielo Nocturno) | general-purpose | Guardián estelar · Astróloga · Monje lunar |
- **Transformaciones de party** (3 etapas): el poder es herramientas + segundos ÷ 12; a los 10 y 25 puntos los 3 héroes cambian a la vez (parpadeo, onda expansiva y un grito de raza en un globo de 2,2 s; como mucho 3 globos a la vez). Cada raza tiene sus formas (p. ej. Humanos: Alba Encendida y Gloria del Mediodía; Enanos: Forja Encendida y Corazón de Volcán). Las etapas se indican con aura, anillos en el suelo y marcas, no solo con color. Una party con etapa 3 hace un golpe combinado cada 30 s (+5).
- **Rey Demonio gigante**: 4 reyes rotando (Kazgorath, de las Brasas; Vhel-Morkai, del Abismo; Ysgrim, de la Escarcha Negra; Tzar-Nuul, de la Plaga), cada uno con silueta propia y 3 formas (mide entre el 39 % y el 50 % del alto de la escena). Se dibujan a resolución nativa con sombreado por celdas, no ampliando sprites pequeños. Se elige de forma determinista (hora de inicio + nombre del primer agente; en una repetición, el id de la sesión) y no repite los 2 últimos (se guardan en `localStorage`). Se transforma al 60 % y al 25 % de vida o a los 3 y 7 minutos, con destello, onda, temblor de pantalla y una frase.
- **Vida compartida**: vida máxima = 100 + 40 × parties (sube 40 cuando entra una). Cada herramienta es un golpe de ×1, ×1,5 o ×2 según la etapa de la party, y cada party suma 1 punto más cada 10 s. La barra de arriba muestra el número (%), la forma (◆◇◇) y marcas en los umbrales de transformación aún no superados. Más de 6 parties: de la 7.ª a la 10.ª se muestra solo el héroe de vanguardia, y a partir de la 11.ª una insignia «+N parties» (siguen contando para el daño).
- **Secuaces** (diablillo, murciélago infernal, sombra rastrera y ojo flotante, teñidos con los colores del rey): salen 2 al terminar la aparición y 2 más cada 15 s, hasta `min(10, 2 + 2 × parties)`. Son decorativos: cada herramienta elimina uno con un destello y explotan en cadena al morir el rey.
- **Demonios élite** (Verdugo, Brujo infernal, Cancerbero y Heraldo alado): aparecen al 75 % de vida, al transformarse el rey y al llegar la tercera party (máximo 2 a la vez, 1 con menos de 3 parties; ninguno en el último 10 %). **Protegen al rey**: mientras hay uno vivo, los golpes van a él (vida 12 + 4 × parties) y, al caer, todas las parties ganan +3 de poder.
- **Final**: si la vida llega a 0, el rey explota; si todos los agentes terminan antes, lo remata un golpe final conjunto (nunca hay derrota). Tras una calma de 4 s, si hay trabajo (las parties que llegan durante la calma esperan en el campamento, junto a la puerta), aparece otro rey; si no, la arena queda vacía. Tras una batalla de más de 5 s se muestra un resumen de 6 s (rey, duración, golpes y party MVP; se oculta al pulsarlo).
- **Accesibilidad**: con `prefers-reduced-motion` no hay temblor y las transformaciones son un fundido; ningún destello grande supera los 3 por segundo; la vida y las etapas llevan número o marcas; el banner (`role="status"`) y el lienzo (`aria-label`) describen la batalla.
- **Rendimiento**: los sprites se hornean una vez por raza, clase, etapa y paleta; de la 4.ª party en adelante los efectos van reducidos.

Todos los umbrales y tiempos están en el objeto `CFG` al inicio de `public/js/arena.js`. La especificación completa, con los criterios de aceptación, está en `docs/arena-spec.md`. Todo el arte (razas, reyes, secuaces, élites, escenario) es original y está dibujado en código.

Arquitectura (sin dependencias ni compilación):

- `public/js/arena.js`: estado y lógica de la batalla (parties, rey, secuaces, élites, fases), recorridos entre el campamento y la arena, dibujo del escenario y de los combatientes, y la barra/placas/banners HTML.
- `public/js/camp.js`: el campamento de descanso (empalizada, puerta, suelo), los puestos, las actividades de los héroes en reposo (comer, conversar, entrenar, dormir y las de cada raza) y sus frases.
- `public/js/heroes.js`: las 8 razas (paletas A y B, 3 clases, 3 etapas) y el sistema de capas (peinado, capa, alas, arma…) que se hornean sobre el sprite de agente.
- `public/js/bosses.js`: los 4 reyes (vectoriales a resolución nativa), los 4 secuaces y los 4 élites.
- `public/js/fx.js`: efectos compartidos (aura, rayos, órbitas, espíritus, partículas, fondos).

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
