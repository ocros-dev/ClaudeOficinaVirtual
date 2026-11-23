# Arena del Rey Demonio: parties por razas contra un jefe gigante

Estado: especificación de producto (versión 1, sustituye a `docs/raid-spec.md`). No incluye código ni decisiones de implementación.

## Objetivo

**Problema.** El modo Raid anterior ponía un jefe en el camino central del mapa RPG y un héroe suelto por agente. Al usuario no le dio la sensación buscada: el jefe era pequeño, la pelea compartía espacio con aldea y salas, y un agente era "un personaje", no un equipo.

**Qué quiere el usuario.**
1. Una **escena dedicada de arena**, sin salas ni aldea, donde se libra la batalla.
2. Cada agente es una **party de 3 héroes** de una misma **raza** (humanos, elfos, enanos…).
3. Un **Rey Demonio gigante** que domina la escena, con **secuaces** pequeños y **demonios élite** que lo ayudan.
4. Las **transformaciones** se mantienen, tanto en las parties como en el rey.
5. Todo **original** y dibujado en código sobre canvas.

**Cómo se medirá el éxito** (la app es local y sin analítica; se verifica en demo y en uso propio):
- En la escena de arena, el Rey Demonio ocupa al menos el 35 % de la altura del lienzo en su forma base y al menos el 45 % en su forma final.
- Con `python demo.py` (4 agentes), las 4 parties están en la arena en menos de 3 s desde que cada agente empieza a trabajar.
- En una tarea de 5 minutos con 2 agentes se ve al menos una transformación de party y una del rey.
- Revisión de arte: 0 elementos de la lista «Evitar» (apartado Legal).
- 30 fps o más con 6 parties completas, rey, 10 secuaces y 2 élites.

## Alcance

- **MVP (Entrega 1):** tercer tema «arena» (la escena dedicada); Rey Demonio gigante (1 rey, forma base); parties de 3 héroes con 3 razas (humanos, elfos, enanos) en forma base; las parties entran y salen según el estado del agente; vida compartida; muerte del rey y nuevo rey si llega trabajo.
- **Después:** secuaces, transformaciones del rey, 8 razas completas, transformaciones de party, demonios élite, 4 reyes rotando, tercera forma del rey, golpe combinado, sonido, resumen de batalla.
- **Fuera de alcance:** derrotas o «game over» (la app muestra trabajo, no castiga); progreso persistente entre sesiones; multijugador; control manual de los héroes; imágenes o fuentes importadas; cambios en el servidor o en los hooks.

## Reutilización de lo ya construido (para el equipo técnico)

Resultado de leer `public/js/raid.js`, `heroes.js`, `bosses.js`, `fx.js`, `rpg.js` y `main.js`.

| Pieza existente | Uso en la arena |
|---|---|
| `raid.js`: ciclo de fases (aparición, combate, muerte, calma), vida compartida, `join`/`leave`, gracia de 5 s, golpe final, elección determinista de jefe sin repetir, HUD, banners | Se mantiene como motor de la batalla. Cambia la unidad: ya no es un héroe por agente, es una party de 3. |
| `heroes.js`: capas (`LAYERS`), etapas 1-3 con `stageLook`/`framesOf`, caché de fotogramas, asignación por rol | Se reutiliza el sistema de capas y etapas. Los 15 héroes individuales se sustituyen por 8 razas × 3 clases (ver abajo). |
| `bosses.js`: arquetipos (`humanoid`, `blob`, `dragon`), efectos (`TR`), formas base y final, caché y siluetas | Base de los reyes y los secuaces. Hay que añadir un tamaño gigante (ver Rey Demonio). |
| `fx.js`: aura, rayos, órbitas, clones, alas, llamas, barrera, nebulosa, glow, `prefers-reduced-motion` | Se usa para auras de raza y del rey. |
| `main.js`: tema guardado en `localStorage`, botón de tema, estado de agentes, eventos de herramienta, globos | Se amplía de 2 a 3 temas. Los eventos ya bastan: no hace falta tocar `server.py` ni `hooks.py`. |
| Modo «raid» dentro del tema RPG y selector de jefe | Se retira. El tema RPG vuelve a «campamentos» (un villano por agente), como antes del modo Raid. |

## Concepto de la escena

### Cómo se accede
- El botón de tema pasa de alternar 2 temas a **recorrer 3**: «🏢 oficina» → «⚔ mundo RPG» → «🏟 arena». La elección se guarda en `localStorage`, como hoy.
- La arena es un **tema aparte**, no un modo del mundo RPG. Así el mundo RPG y la oficina no cambian.
- Cambiar de tema con agentes trabajando reconstruye la escena en menos de 1 s. Los agentes que ya trabajan entran como parties con poder 0 y aparece un rey, sin saltos ni errores.

### Cómo se ve
- Escena de una sola pantalla, sin mapa, salas ni escritorios. Suelo de piedra circular con círculo mágico grande y gradas o ruinas al fondo.
- **Rey Demonio** arriba y al centro, enorme, mirando al frente. Su sombra cae sobre la arena.
- **Parties** en la mitad inferior, en abanico. La primera party ocupa el centro; las siguientes se alternan a izquierda y derecha. Cada party es un triángulo: el de vanguardia al frente, los otros dos detrás.
- **Secuaces** en el espacio entre el rey y las parties. **Élites** a los flancos del rey.
- Sobre cada party, una placa con el **nombre del agente**, un emblema de su raza y su etapa (1, 2 o 3 marcas).
- Barra de vida del rey arriba, con porcentaje en número y marcas en los umbrales de transformación.
- Arena sin batalla (ningún agente trabajando): trono vacío, antorchas y sin rey; el campamento muestra a los agentes en reposo y el texto es «Los héroes descansan…» (o «La arena espera…» si no hay ningún agente). Ver «Zona de descanso».

### Tamaños orientativos (lienzo lógico actual de 480 × 304 px)
- Héroe: unos 24-34 px de alto, como hoy.
- Secuaz: 12-20 px. Élite: 44-60 px.
- **Rey Demonio:** forma base unos 110 px; forma final unos 140 px (puede salirse por arriba del lienzo, con los cuernos recortados). Debe dominar la escena sin tapar a las parties.
- Decisión técnica pendiente: si el rey se dibuja a mayor detalle o ampliando los sprites actuales; el requisito de producto es que se vea gigante y conserve el estilo pixel art.

## Zona de descanso (campamento)

Ampliación de la versión 1. Los héroes que no están en batalla no desaparecen: descansan en un campamento al pie de la escena y vuelven a él al terminar.

### Dónde va y cómo se ve
- **Composición** (lienzo lógico de 480 × 304 px, una sola pantalla): la arena ocupa de arriba hasta y = 248; por debajo hay una franja de campamento (suelo de tierra y hierba, barriles y cajas en los rincones) separada de la arena por una **empalizada de troncos con una puerta central** de dos postes con farolillos y estandartes. La puerta sustituye al antiguo portal lateral: por ella salen las parties a combatir y vuelven a descansar.
- La arena se reajusta para no competir con el rey: el suelo de piedra y el círculo mágico se aplanan y suben (el círculo queda entero sobre la empalizada), el rey sube a y = 170 de «pies» (forma base ≈ 110 px; forma final ≈ 140 px) y los puestos de combate pasan a dos filas (y = 230 y 206; la décima, a y = 190). El rey sigue dominando la escena; el campamento es una franja baja, oscura y cálida, de menor contraste que la arena.
- El banner y el resumen de batalla suben a la parte alta de la escena para no tapar el campamento.

### Quién descansa
- Todo agente conocido (los que se ven en la lista del panel) que **no está trabajando** es una party en reposo: 3 héroes de su raza y variante (A o B; se conserva al pasar de reposo a batalla y al volver).
- **Hasta 7 parties visibles** (4 atrás y 3 delante, de la puerta hacia fuera). Las demás cuentan en una insignia **«+N descansando»**. Si vuelve una party del combate y no queda puesto, el grupo del último puesto sale por la puerta y le cede el sitio; cuando se libera un puesto, un grupo de la insignia entra por la puerta.
- Texto de la arena: sin ninguna party (ni en descanso ni en batalla) se mantiene el trono con «La arena espera…»; con héroes en reposo y nadie luchando no hay rey y el texto es «Los héroes descansan…».

### Actividades
Cada party elige una actividad al azar (ponderada por raza, sin repetir la anterior) que dura entre 10 y 18 s; al cambiar, los héroes caminan a sus nuevos sitios y los objetos aparecen y se desvanecen en 0,5 s.

| Actividad | Qué se ve |
|---|---|
| Fogata y olla (comer) | fuego con olla humeante; dos héroes sentados comiendo y otro bebiendo |
| Banquete con jarras | mesa con asado, pan, jarras y cántaro; brindan y comen |
| Conversar | en triángulo; globos con frases cortas o iconos (💬, 😄…) y saltito del que habla |
| Muñeco de práctica | el de vanguardia golpea el muñeco (tajo, chispas, el muñeco se bambolea); los otros miran y celebran |
| Diana | el de distancia dispara (flecha o bala de luz de su raza); las flechas quedan clavadas |
| Meditar | sentados con aura en el suelo y orbes en órbita |
| Hechizos de práctica | los dos lanzadores sueltan orbes de su color; un orbe flota entre ellos |
| Dormir | un héroe tumbado en un petate y dos cabeceando junto a unas brasas, con «Zzz» |

Actividades propias de raza (sustituyen al peso común o lo aumentan):
- **Enanos**: forja (yunque con lingote al rojo, chispas al golpear y horno) y más banquetes con jarras.
- **Elfos**: lectura bajo un farol (libro y pasar de página) y práctica de arco.
- **Orcos**: levantar pesas (barra sobre la cabeza), muñeco de práctica y banquetes.
- **Gnomos**: banco de trabajo con engranajes girando y chispas turquesa; algo de juego.
- **Astrales**: meditación con una constelación entre los tres héroes y hechizos de práctica.
- **Draconios**: fogata en la que el de distancia aviva el fuego con su aliento, y hechizos.
- **Humanos**: combates de práctica entre vanguardia y distancia con chispa al chocar.
- **Bestiales**: pilla (corretean en círculo) y siestas.

Frases (todas cortas, en español, según la actividad): «¡Ñam, ñam!», «¡Salud!», «¿Viste al rey?», «¡Toma!», «¡En el blanco!», «Om…», «¡Chispa!», «Zzz…», «¡Clang!», «Shh…», «¡Uno más!», «¡Ajustando!», «¡Te pillé!»… Hay como mucho **2 globos de conversación a la vez** en todo el campamento.

### Entre el campamento y la batalla
| Evento | Qué pasa |
|---|---|
| El agente pasa a *trabajando* | su party sale de la actividad, se ordena en formación, camina a la puerta, la cruza y llega a su puesto de combate (menos de 2,5 s). Si todavía no hay rey, espera en el campamento (mirando a la puerta) y entra cuando aparece. |
| El agente termina | celebra 2 s («🏆 ¡victoria!») y vuelve caminando por la puerta a un puesto libre del campamento (a ritmo más tranquilo, menos de 2,8 s). |
| Vuelve a trabajar en menos de 5 s | conserva etapa y poder y camina de nuevo a la batalla desde donde esté (en la arena, en la puerta o ya en el campamento). |
| Pasan 5 s sin trabajar | pierde etapa y poder y pasa a ser un grupo en reposo que retoma actividades en el sitio donde llegó. |

- Mientras una party vuelve o espera en el campamento se dibuja en su forma base y sin anillos de poder.
- Seleccionar un agente (en la lista, la línea de tiempo o con un clic en sus héroes) resalta su party (anillo, flecha y placa) esté en el campamento o en la arena; el panel indica la actividad si descansa.
- Cada party en reposo lleva una placa con el emblema de su raza y el nombre del agente.

### Rendimiento y accesibilidad
- Los objetos estáticos (mesa, yunque, diana, banco...) se hornean una vez; lo animado (llamas, chispas, flechas, orbes, engranajes) se calcula a partir del reloj, sin partículas con estado. 60 fps en la prueba con 6 parties luchando y 7 descansando.
- Con `prefers-reduced-motion`: los héroes no cambian de sitio caminando (se colocan directamente), no hay saltitos ni partículas, la llama es de un solo fotograma, «Zzz» es una marca fija y se evita la actividad de pilla.
- Todo texto visible en español; sin cambios en servidor ni hooks.

### Criterios de aceptación
- Dado un agente conocido sin trabajo, Entonces su party aparece en el campamento (o en la insignia «+N descansando» si no cabe).
- Dado que el agente empieza a trabajar, Entonces su party cruza la puerta y llega al combate sin saltos.
- Dado que termina, Entonces tras celebrar vuelve al campamento y retoma actividades; si reanuda en menos de 5 s, conserva su poder.
- Dados 12 agentes en reposo, Entonces hay 7 parties en el campamento y «+5 descansando».
- Dado que nadie trabaja, Entonces no hay rey y el texto es «Los héroes descansan…»; sin ningún agente, «La arena espera…».
- Dada una party seleccionada, Entonces se resalta esté donde esté.

## Razas (8)

Cada raza es un tema visual propio. Una party son 3 héroes con **3 clases fijas por función**: **vanguardia** (resiste y golpea de cerca), **distancia o magia** (daño a distancia) y **apoyo** (cura y protege, con efectos de luz). Los nombres de raza y de formas son originales; los arquetipos (elfo, enano, orco) son folclore general, no propiedad de nadie.

| # | Raza y lugar | Paleta principal | Vanguardia | Distancia o magia | Apoyo |
|---|---|---|---|---|---|
| 1 | **Humanos** · Reino del Alba | azul real `#2e4a8a`, oro `#e8b830`, blanco | Caballera (espada y escudo) | Hechicero (bastón de cristal) | Sanadora (báculo con halo) |
| 2 | **Elfos** · Silvanos del Umbral Verde | verde bosque `#2f8a5a`, plata `#c8d0dc`, madera `#7a5230` | Danzante de hojas (dos espadas curvas) | Arquera (arco largo) | Druida (savia y flores) |
| 3 | **Enanos** · Clanes de la Forja | rojo brasa `#c8602a`, hierro `#6a6f7a`, barbas trenzadas | Martillador (martillo y coraza) | Artillero (cañón de mano) | Rúnico (runas azules `#5ac8ff`) |
| 4 | **Orcos** · Tribus del Colmillo | piel pardo-rojiza `#a8704a` (no verde), rojo sangre `#8a2a1a`, hueso `#e8dcc0` | Berserker (dos hachas) | Cazador (jabalinas) | Chamán (tótem y trueno) |
| 5 | **Gnomos** · Taller del Engranaje | cobre `#b8703a`, turquesa `#2ab0b0`, gafas grandes | Piloto de mecha pequeño | Artífice (torreta y drones) | Alquimista (pociones) |
| 6 | **Bestiales** · Manada de la Luna | pardo `#8a7a6a`, azul lunar `#5a9aff`, orejas y colas | Oso guardián | Zorra ilusionista | Ciervo-sanador (astas con luz) |
| 7 | **Draconios** · Linaje de Escamas | carmín `#c8306e`, oro `#d8a82a`, cuernos y cola | Lancero dracónico | Aliento-mago (chorro de fuego frío) | Sacerdotisa de escamas |
| 8 | **Astrales** · Hijos del Cielo Nocturno | violeta `#6a4ac8`, azul noche, estrellas `#fff2c0` | Guardián estelar | Astróloga (constelaciones) | Monje lunar (anillos de luz) |

**Colores de raza frente a colores de rey:** los reyes usan rojos, negros y violetas apagados; las razas con rojo o violeta (enanos, orcos, astrales) llevan siempre un borde claro para no confundirse con los demonios.

### Asignación de razas a agentes

| Raza | Agentes (rol) |
|---|---|
| Humanos | claude, product-owner |
| Elfos | frontend-expert, ux-designer |
| Enanos | backend-expert, devops-engineer |
| Orcos | security-expert, qa-engineer |
| Gnomos | data-engineer, postgres-dba |
| Bestiales | Explore, mobile-developer |
| Draconios | software-architect, Plan |
| Astrales | general-purpose |

- **Agentes desconocidos:** raza = `hash(nombre) mod 8` (la misma función que ya usa `main.js`). La asignación no cambia durante la batalla.
- **Dos agentes de la misma raza a la vez:** el segundo usa la **variante B** (mismas clases con paleta alternativa y otro emblema), para distinguirlos a simple vista. Varias instancias del mismo agente (`backend-expert#2`) comparten raza y variante, como ya comparten aspecto.
- Con 3 o más parties de la misma raza, la tercera repite la variante A y se distingue por la placa con el nombre.
- *Después:* elegir la raza de un agente desde el editor (ver preguntas).

### Transformaciones de la party (3 etapas)

El poder de una party es `herramientas del agente + segundos trabajados ÷ 12`. Las etapas afectan a **los 3 héroes a la vez**, con transición de 0,9 s (parpadeo entre formas, onda expansiva y grito de la party en un globo de 2,2 s).

| Etapa | Umbral de poder | Multiplicador de daño |
|---|---|---|
| 1 · Formación | 0 | ×1 |
| 2 · Despertar de raza | 10 | ×1,5 |
| 3 · Ascensión | 25 | ×2 |

| Raza | Etapa 2 | Etapa 3 | Grito |
|---|---|---|---|
| Humanos | **Alba Encendida**: aura dorada, capas ondeantes | **Gloria del Mediodía**: alas de luz, halos, armaduras doradas | «¡Por el alba!» / «¡Que el sol nos guíe!» |
| Elfos | **Savia Despierta**: hojas en órbita, brillo verde | **Bosque Eterno**: alas de ramas, flores, pelo flotante | «¡El bosque despierta!» / «¡Raíces y cielo, uníos!» |
| Enanos | **Forja Encendida**: armaduras al rojo, chispas | **Corazón de Volcán**: magma en la coraza, martillos de fuego, +4 px | «¡A golpe de yunque!» / «¡Que arda la montaña!» |
| Orcos | **Sangre Hirviente**: marcas de guerra rojas, vapor | **Furia Ancestral**: ×1,15 de tamaño, tótems espectrales, ojos blancos | «¡Colmillos fuera!» / «¡Los ancestros rugen!» |
| Gnomos | **Engranaje Vivo**: engranajes girando, chispas turquesa | **Maquinaria Maestra**: exoesqueletos, drones en órbita | «¡Ajustando piezas!» / «¡Modo máquina total!» |
| Bestiales | **Llamada de la Manada**: ojos brillantes, bestia espectral tenue | **Espíritu de Luna Llena**: luna enorme y bestia espectral detrás | «¡La manada llama!» / «¡Que aúlle la luna!» |
| Draconios | **Escama Ardiente**: escamas brillantes, humo | **Sangre de Dragón**: alas, dragón espectral detrás | «¡Arde, escama!» / «¡Despierta, sangre antigua!» |
| Astrales | **Constelación Naciente**: estrellas en órbita | **Firmamento Pleno**: galaxia a la espalda, anillos de luz | «¡Las estrellas se alinean!» / «¡Todo el cielo en nosotros!» |

- Las etapas no retroceden dentro de la misma batalla. Al salir de la arena se pierden.
- Una party que entra con el rey ya en su forma 2 o 3 llega con poder 5 («refuerzo»).
- **Golpe combinado (etapa 3):** cada 30 s una party en etapa 3 hace un ataque conjunto de sus 3 héroes (+5 puntos de daño, visual propio de la raza). *Could.*
- Las etapas se definen como **capas añadidas** sobre el sprite base, no como sprites nuevos, para contener el trabajo de arte.

## Enemigos

### El Rey Demonio

- Hay **4 reyes** que rotan; solo uno por batalla. No se repite ninguno de los 2 últimos. Elección determinista (hora de inicio y nombre del primer agente) para que repetir una sesión guardada muestre el mismo rey.
- Todos se presentan como «Rey Demonio de …», con silueta propia para que no parezcan el mismo recoloreado.

| Rey | Tema | Colores | Rasgo de silueta |
|---|---|---|---|
| **Kazgorath, Rey Demonio de las Brasas** | fuego | piel rojo ladrillo `#a02a1a`, cuernos negros, magma `#ff6a1a` | corona de cuernos y alas de ceniza |
| **Vhel-Morkai, Rey Demonio del Abismo** | mar profundo y tentáculos | piel azul pizarra `#2a3a6a`, ojos `#7affe0`, perlas | cuerpo con tentáculos y cuernos de coral |
| **Ysgrim, Rey Demonio de la Escarcha Negra** | hielo oscuro | piel gris violeta `#4a4a6a`, hielo negro, aura `#9ab0ff` | armadura de cristal y cuernos de carámbano |
| **Tzar-Nuul, Rey Demonio de la Plaga** | enjambre y podredumbre | verde oliva `#6a7a2a`, óxido, moscas | cuerpo hinchado con alas de insecto |

- **Formas.** Tres: **forma 1** (base), **forma 2** (cuando su vida llega a ≤ 60 % o pasan 3 min) y **forma 3** (≤ 25 % o 7 min). Cada transformación dura 1,2 s con flash, onda, temblor (ver accesibilidad) y su frase en un globo de 2,5 s; el rey crece y gana más detalles. Cada transformación ocurre una sola vez por batalla.
- **Frases (formas 2 y 3):** Kazgorath «¡El fuego es mi aliento!» / «¡Arded todos en mi trono!»; Vhel-Morkai «¡Las profundidades os reclaman!» / «¡Ahogaos en la marea negra!»; Ysgrim «¡Que el invierno os congele el alma!» / «¡Noche eterna, cae!»; Tzar-Nuul «¡Mi enjambre es infinito!» / «¡Pudríos bajo mi reinado!».
- **Entrega 1 y 2:** el MVP lleva solo 1 rey con forma 1; la entrega 2 añade la forma 2; la entrega 4 añade los otros reyes y la forma 3.
- **Aparición:** el rey surge del suelo o desciende del cielo (según el rey) en 2 s, con banner «¡Aparece <nombre>!».

### Secuaces (menores)

| Tipo | Aspecto | Comportamiento |
|---|---|---|
| Diablillo | 14 px, cuernitos, tridente | camina hacia la party más cercana y la «ataca» (visual) |
| Murciélago infernal | 12 px, vuela | revolotea sobre las parties |
| Sombra rastrera | 14 px, mancha con ojos | se arrastra por el suelo |
| Ojo flotante | 16 px, un ojo con aura | dispara bolitas visuales hacia las parties |

- Se tiñen con los colores del rey de la batalla.
- **Cuándo aparecen:** al terminar la aparición del rey salen 2; después, 2 más cada 15 s durante el combate.
- **Cuántos:** máximo `min(10, 2 + 2 × n)` con `n` = parties presentes.
- **Cómo mueren:** cada herramienta usada elimina visualmente un secuaz (el más cercano a la party que golpea) con un destello; si no hay secuaces, el golpe va directo al rey. Los secuaces **no alteran la vida del rey**: son vistosos, no estratégicos.
- En la muerte del rey, todos los secuaces explotan en cadena.

### Demonios élite (ayudantes)

| Tipo | Aspecto | Qué hace |
|---|---|---|
| Verdugo | 50 px, hacha enorme | protege al rey con el escudo de sombra |
| Brujo infernal | 48 px, túnica y cráneo | lanza hechizos y vuela entre los secuaces |
| Cancerbero | 56 px, perro de dos cabezas | corre por los flancos |
| Heraldo alado | 52 px, alas y trompeta | llama a más secuaces (adelanta la próxima oleada) |

- **Cuándo aparecen:** cuando el rey cruza el 75 % de vida, al transformarse el rey y cuando hay 3 o más parties (se invoca 1 al llegar la tercera). Máximo **2 vivos a la vez** (1 si hay menos de 3 parties). Tipo elegido al azar determinista.
- **Qué hacen en el juego:** **protegen al rey**. Mientras hay un élite vivo, los golpes van al élite primero. Vida del élite: `12 + 4 × n` puntos. Al caer, explota y todas las parties presentes ganan **+3 de poder** (la tensión las eleva).
- Un élite no se invoca si el rey está en los últimos 10 % de vida (el final no se alarga).
- En la muerte del rey, los élites se desintegran con él.

## Reglas de combate

### Qué ve cada evento
| Evento del agente | En la arena |
|---|---|
| Pasa a *trabajando* (nuevo) | su party sale del campamento, cruza la puerta y camina hasta su puesto en menos de 2,5 s, con destello |
| Usa una herramienta | un héroe de la party (por turnos) hace su ataque y el golpe cuenta como daño |
| Pasa a *terminó* o *libre* | su party celebra 2 s («🏆 ¡victoria!») y vuelve caminando al campamento por la puerta; su poder se pierde pasados 5 s |
| Vuelve a trabajar en menos de 5 s | la party se queda y conserva el poder (gracia contra parpadeos) |

### Daño y vida
- Vida máxima del rey: `100 + 40 × n` puntos, con `n` = parties presentes. Cuando entra una party, la vida máxima y la actual suben 40 (destello en la barra). Si una party sale, no se resta nada.
- Cada herramienta = **1 golpe** de `1 × multiplicador de etapa` puntos. Cada party trabajando suma además **1 punto cada 10 s** (daño pasivo).
- Daño directo al rey solo si no hay élites vivos (ver arriba). Las cifras flotantes son solo visuales (`puntos × número aleatorio de 8 a 38`).
- **Quién ataca a quién:** el héroe de **vanguardia** golpea de cerca, el de **distancia o magia** lanza proyectiles y el de **apoyo** lanza un haz de luz que ilumina a los otros dos. Los ataques apuntan al élite si lo hay, si no a un secuaz cercano y, si no hay, al rey. Los demonios atacan solo de forma visual; no hay daño a los héroes ni derrotas.

### Cómo termina
1. **Vida del rey a 0 con agentes trabajando:** el rey explota 2 s con banner «¡<nombre> derrotado!» y sonido de victoria; secuaces y élites estallan con él. Las parties que siguen trabajando celebran y, tras 4 s de calma, aparece otro rey y siguen conservando su poder.
2. **Todos terminan con el rey vivo:** **golpe final** conjunto de todas las parties; el rey muere en 2 s. Terminar el trabajo siempre es victoria.
3. **Llega trabajo con el rey muerto (muerte o calma):** las nuevas parties esperan en el campamento y entran cuando aparece el siguiente rey.
4. **Llega trabajo con la arena vacía:** aparece un rey nuevo y la party entra.
5. **Nunca hay derrota.** No hay mensajes de «has perdido» ni rey vivo sin parties tras la calma.

### Equilibrio de referencia
- Una party en una tarea de 5 minutos con 30 herramientas ≈ 30 + 25 = 55 de poder. Vida del rey 140: llega a ≈ 60 % de vida y se transforma a la forma 2 en la mayoría de los casos (transformación por vida o por 3 minutos). Los umbrales se ajustan tras ver la Entrega 1 en uso real.

## Límites de rendimiento y legibilidad

- **Parties visibles completas (3 héroes): hasta 6.** De la 7.ª a la 10.ª se muestra un solo héroe (el de vanguardia) con su placa. Más de 10: insignia «+N parties»; siguen contando para el daño.
- Máximo 10 secuaces y 2 élites a la vez.
- Efectos de aura de las parties 4.ª en adelante en versión reducida.
- Sprites generados una sola vez por raza, clase, etapa y variante (8 × 3 × 3 × 2 = 144 como máximo) y reutilizados; carga diferida de lo que se necesita.
- Mínimo 30 fps con 6 parties completas, rey en forma final, 10 secuaces y 2 élites.

## Legal: originalidad

**Principio.** Los arquetipos (elfo, enano, orco, caballero, mago, dragón, demonio) son folclore general. Lo protegido son los personajes, nombres, mundos y transformaciones concretos de obras existentes.

**Evitar (lista de revisión del arte; ninguna pieza debe contenerlos):**
- Nombres de personajes, razas con lore, lugares, técnicas o transformaciones de cualquier obra (no usar, por ejemplo, Saiyan, Bankai, Gear, Instinto, Nen, Mordor, Hobbit y similares).
- Rasgos de marca: orcos de piel verde con colmillos del estilo de juegos de rol conocidos, elfos de orejas idénticas a las de sagas famosas, cascos de Darth o similares, ojos con tomoe, pelo dorado erizado con aura amarilla, armadura-y-capa de héroes de cómic.
- Frases emblema ya conocidas.

**Qué se hizo para diferenciar:** orcos pardo-rojizos, gnomos con mechas, bestiales, draconios y astrales con temática propia; nombres de formas y de reyes inventados; cada raza se diferencia por silueta y paleta.

**Pendiente:** esto es una guía de producto, no asesoría legal. Antes de publicar un release público conviene una revisión visual de cada sprite frente a la lista anterior.

## Historias de usuario

### HU-1 · Tema «arena» · Prioridad: Must
Como usuario, quiero un tercer tema con una escena de arena dedicada, para ver la batalla sin el mapa de oficina ni la aldea.

**Criterios de aceptación**
- Escenario: botón de tema
  Dado el tema oficina, Cuando pulso el botón de tema, Entonces pasa a «⚔ mundo RPG»; Cuando lo pulso otra vez, Entonces pasa a «🏟 arena»; Cuando lo pulso otra vez, Entonces vuelve a «🏢 oficina».
- Escenario: escena dedicada
  Dado el tema arena, Entonces no se ven salas, escritorios ni campamentos; solo la arena.
- Escenario: recordar
  Dado que elijo arena, Cuando reabro la app, Entonces sigue en arena.
- Escenario: cambiar con agentes trabajando
  Dado 2 agentes trabajando en oficina, Cuando cambio a arena, Entonces en menos de 1 s veo 1 rey y 2 parties.
- Escenario: otros temas intactos
  Dado el tema RPG, Entonces el comportamiento es el de campamentos (un villano por agente), sin selector de raid.
- Escenario: arena vacía
  Dado que ningún agente trabaja, Entonces veo el trono vacío y el texto «La arena espera…».

**Casos borde:** `localStorage` no disponible (tema por defecto, sin error); cambiar de tema dos veces en menos de 1 s.
**Requisitos no funcionales:** sin recargar la página; sin errores en consola; sin cambios en servidor ni hooks.

### HU-2 · Rey Demonio gigante · Prioridad: Must
Como usuario, quiero un Rey Demonio enorme que domine la escena, para sentir que mis agentes se enfrentan a algo grande.

**Criterios de aceptación**
- Escenario: tamaño
  Dado el rey en forma base, Entonces ocupa al menos el 35 % de la altura del lienzo; en forma final, al menos el 45 %.
- Escenario: aparición
  Dado que no hay batalla, Cuando un agente pasa a trabajando, Entonces en menos de 1 s empieza la aparición del rey (2 s) con banner «¡Aparece <nombre>!».
- Escenario: un solo rey
  Dado 3 agentes que empiezan en el mismo segundo, Entonces hay exactamente 1 rey.
- Escenario: no solapa
  Entonces el rey no tapa a ninguna party ni su placa.
- Escenario: no repetir
  Dado que los 2 últimos reyes fueron A y B, Entonces el siguiente no es A ni B.

**Casos borde:** agente que empieza y termina en menos de 1 s (se ve aparecer y morir sin errores); abrir la app con agentes ya trabajando (el rey aparece sin sonido de golpe ni daño inicial).

### HU-3 · Una party de 3 héroes por agente · Prioridad: Must
Como usuario, quiero que cada agente que trabaja se vea como una party de 3 héroes de una raza, para reconocer a mis agentes de un vistazo.

**Criterios de aceptación**
- Escenario: entrar
  Dado una batalla en curso, Cuando un agente pasa a trabajando, Entonces su party (3 héroes) sale del campamento, cruza la puerta y llega a su puesto en menos de 2,5 s.
- Escenario: tres clases
  Entonces cada party muestra 1 vanguardia, 1 distancia o magia y 1 apoyo.
- Escenario: placa
  Entonces cada party muestra el nombre del agente.
- Escenario: salir
  Dado una party en la arena, Cuando su agente pasa a terminó, Entonces celebra 2 s y vuelve al campamento por la puerta.
- Escenario: gracia
  Dado un agente que terminó hace 3 s, Cuando vuelve a trabajar, Entonces su party sigue en la arena y no pierde poder.
- Escenario: raza por rol
  Dado un agente `backend-expert`, Entonces su party es de enanos.
- Escenario: dos de la misma raza
  Dado `backend-expert` y `devops-engineer` trabajando, Entonces ambas parties son de enanos con paletas A y B distintas.
- Escenario: desconocido
  Dado `agente-nuevo`, Entonces su raza es siempre la misma en todas las sesiones.

**Reglas de negocio:** `Explore` y `explore` son el mismo rol; nombre vacío usa la raza por hash; instancias del mismo agente comparten raza.
**Casos borde:** agente invitado (entra por la puerta igual); agente que llega durante la muerte o la calma (espera en el campamento hasta el siguiente rey).
**Entrega 1:** solo 3 razas (humanos, elfos, enanos); el resto se asigna por hash a esas 3 hasta la Entrega 3.

### HU-4 · Vida compartida y daño por herramienta · Prioridad: Must
Como usuario, quiero que cada herramienta usada sea un golpe sobre la vida del rey, para ver el progreso del equipo.

**Criterios de aceptación**
- Escenario: golpe
  Dado una party en etapa 1, Cuando su agente usa una herramienta, Entonces en menos de 300 ms un héroe ataca, el rey parpadea en blanco, sale una cifra de daño y la barra baja 1 punto.
- Escenario: multiplicador
  Dado una party en etapa 3, Cuando su agente usa una herramienta, Entonces la barra baja 2 puntos.
- Escenario: pasivo
  Dado 1 party trabajando 20 s sin herramientas, Entonces la barra baja 2 puntos.
- Escenario: refuerzo
  Dado un rey con vida máxima 140 y 1 party, Cuando entra otra, Entonces la vida máxima pasa a 180, la actual sube 40 y la barra destella.
- Escenario: salida
  Dado una party que sale, Entonces la vida actual no cambia.
- Escenario: número visible
  Entonces la barra muestra el porcentaje en número.

**Casos borde:** muchos golpes en un fotograma (se aplican todos; se dibujan como máximo 6 cifras); herramienta de un agente que ya salió (se ignora).
**Requisitos no funcionales:** 30 fps o más con 6 parties y el rey.

### HU-5 · Muerte del rey y trabajo nuevo · Prioridad: Must
Como usuario, quiero que el rey muera con un cierre claro y que otro rey aparezca si llega más trabajo, para que la app sirva con uso continuo.

**Criterios de aceptación**
- Escenario: vida a 0
  Dado un rey con 3 puntos de vida, Cuando recibe 3, Entonces explota 2 s con banner «¡<nombre> derrotado!» y sonido de victoria.
- Escenario: todos terminan
  Dado un rey con 40 % de vida, Cuando el último agente pasa a terminó, Entonces las parties hacen un golpe final conjunto y el rey muere en menos de 2,5 s.
- Escenario: sin derrota
  Entonces nunca aparece un mensaje de derrota ni queda un rey vivo sin parties.
- Escenario: trabajo en la calma
  Dado el rey muriendo, Cuando un agente pasa a trabajando, Entonces su party espera en el campamento y, al terminar la calma (4 s), aparece otro rey y entra.
- Escenario: parties que seguían
  Dado que el rey muere por vida 0 con 2 parties trabajando, Entonces tras la calma aparece otro rey y ambas siguen con su poder.
- Escenario: arena vacía
  Dado que todo terminó, Entonces tras la calma queda la arena vacía con el trono.

**Casos borde:** 5 trabajos nuevos durante la calma (un solo rey); el último agente termina justo al morir el rey (una sola muerte); el nuevo rey no es el que acaba de morir.

### HU-6 · Secuaces · Prioridad: Should
Como usuario, quiero que el rey tenga secuaces pequeños, para que la escena parezca una batalla y no un duelo.

**Criterios de aceptación**
- Escenario: oleada inicial
  Dado que el rey terminó de aparecer, Entonces salen 2 secuaces en menos de 1 s.
- Escenario: oleadas
  Dado el combate, Entonces salen 2 secuaces cada 15 s hasta el máximo `min(10, 2 + 2 × parties)`.
- Escenario: mueren con los golpes
  Dado secuaces vivos, Cuando un agente usa una herramienta, Entonces un secuaz muere con destello y la vida del rey baja igual.
- Escenario: 4 tipos
  Entonces se ven los 4 tipos con los colores del rey.
- Escenario: muerte del rey
  Entonces todos los secuaces explotan en cadena en menos de 2 s.

**Casos borde:** 0 parties entrando durante la calma (no salen secuaces); el máximo nunca se supera.

### HU-7 · Transformaciones del rey · Prioridad: Should
Como usuario, quiero que el rey cambie de forma durante la batalla, para sentir un giro dramático.

**Criterios de aceptación**
- Escenario: forma 2
  Dado un rey en forma 1, Cuando su vida llega a ≤ 60 %, Entonces en 1,2 s se transforma con flash, onda y su frase, y es más grande.
- Escenario: por tiempo
  Dado un rey que lleva 3 min en forma 1, Entonces se transforma aunque su vida sea mayor al 60 %.
- Escenario: una vez
  Entonces cada transformación ocurre una sola vez por batalla.
- Escenario: marcas
  Entonces la barra muestra marcas en los umbrales no superados.
- Escenario: golpe final en forma base
  Dado un rey en forma 1 y todos los agentes terminan, Entonces muere sin transformarse.
- Escenario: forma 3 (entrega 4)
  Dado un rey en forma 2, Cuando su vida llega a ≤ 25 % o pasan 7 min, Entonces pasa a la forma 3.

**Reglas de negocio:** un golpe que dejaría la vida bajo el umbral en una forma se aplica con la vida clavada en el umbral y se transforma en ese momento.
**Casos borde:** transformación justo cuando entra una party (se aplican ambas); sprite más ancho que su hueco (no solapa a las parties).

### HU-8 · Transformaciones de la party · Prioridad: Should
Como usuario, quiero que mi party cambie de forma al avanzar el trabajo, para ver crecer su poder.

**Criterios de aceptación**
- Escenario: despertar
  Dado una party con poder 9, Cuando llega a 10, Entonces en 0,9 s los 3 héroes parpadean entre formas con onda, se muestra su grito 2,2 s y desde entonces se dibuja la etapa 2.
- Escenario: ascensión
  Dado poder 25, Entonces ocurre lo mismo con la etapa 3.
- Escenario: no retroceder
  Entonces una etapa nunca baja en la misma batalla; al salir de la arena se reinicia.
- Escenario: refuerzo tardío
  Dado un rey en forma 2 o 3, Cuando entra una party, Entonces llega con poder 5.
- Escenario: distinguibles
  Entonces las 3 etapas de una party se distinguen a tamaño normal, sin zoom.
- Escenario: dos parties a la vez
  Dado dos parties que cambian de etapa a la vez, Entonces sus gritos aparecen en globos separados sin taparse.

**Reglas de negocio:** el poder se calcula con las herramientas y el tiempo del agente; las etapas se aplican en orden (no se salta de 1 a 3).

### HU-9 · Las 8 razas completas · Prioridad: Should
Como usuario, quiero 8 razas con su propio estilo y sus 3 clases, para que cada agente tenga identidad.

**Criterios de aceptación**
- Escenario: completitud
  Entonces existen 8 razas × 3 clases × 3 etapas × paleta A y B, con nombre, paleta y grito según esta especificación.
- Escenario: roles
  Dado un agente por cada uno de los 15 roles, Entonces cada uno aparece con la raza de la tabla.
- Escenario: legibilidad
  Entonces cada raza se identifica por su silueta y paleta, sobre el suelo de la arena.
- Escenario: originalidad
  Entonces ningún sprite incumple la lista «Evitar» (revisión firmada por el Product Owner).
- Escenario: sin dependencias
  Entonces todo se dibuja en código sobre canvas, sin imágenes ni librerías.

**Requisitos no funcionales:** sprites generados una vez y reutilizados.

### HU-10 · Demonios élite · Prioridad: Should
Como usuario, quiero demonios élite que ayuden al rey, para que la batalla tenga momentos de tensión.

**Criterios de aceptación**
- Escenario: aparición por vida
  Dado el rey al 75 %, Entonces aparece 1 élite en un flanco con banner corto «¡Llega <nombre>!».
- Escenario: aparición por transformación
  Cuando el rey se transforma, Entonces aparece 1 élite.
- Escenario: aparición por multitud
  Dado que entra la tercera party, Entonces se invoca 1 élite.
- Escenario: límite
  Entonces nunca hay más de 2 élites vivos (1 con menos de 3 parties).
- Escenario: protección
  Dado un élite vivo, Cuando un agente usa una herramienta, Entonces el golpe baja la vida del élite y no la del rey.
- Escenario: caída
  Dado un élite con 0 de vida, Entonces explota y todas las parties ganan +3 de poder.
- Escenario: final
  Dado el rey por debajo del 10 % de vida, Entonces no se invocan élites.

**Casos borde:** élites vivos cuando el rey muere (se desintegran con él); el último agente termina con un élite vivo (golpe final los incluye).

### HU-11 · Cuatro reyes rotando · Prioridad: Should
Como usuario, quiero que el rey cambie de una batalla a otra, para que la escena no se repita.

**Criterios de aceptación**
- Escenario: 4 reyes
  Entonces existen Kazgorath, Vhel-Morkai, Ysgrim y Tzar-Nuul, cada uno con silueta propia, sus 2-3 formas y sus frases.
- Escenario: no repetir
  Entonces no se repite ninguno de los 2 últimos reyes (se guardan en `localStorage`).
- Escenario: reproducible
  Dada una sesión guardada, Entonces el rey elegido es el mismo en cada repetición.

**Casos borde:** `localStorage` no disponible (sin error); reyes agotados por recientes (menos de 3 disponibles, se ignora la regla).

### HU-12 · Rendimiento y legibilidad con muchas parties · Prioridad: Should
Como usuario, quiero que la escena siga fluida con muchos agentes, para tenerla abierta todo el día.

**Criterios de aceptación**
- Escenario: fluidez
  Dado 6 parties, rey en forma 2, 10 secuaces y 2 élites, Entonces la escena va a 30 fps o más.
- Escenario: compresión
  Dado 9 agentes, Entonces hay 6 parties completas y 3 con solo el héroe de vanguardia.
- Escenario: insignia
  Dado 12 agentes, Entonces se ve la insignia «+2 parties» y siguen contando para el daño.
- Escenario: orden
  Entonces las parties conservan su puesto mientras trabajen (no se recolocan al entrar otra).

### HU-13 · Sonido y accesibilidad · Prioridad: Should
Como usuario, quiero efectos que no me molesten ni me hagan daño, para poder tenerla abierta horas.

**Criterios de aceptación**
- Escenario: sonido
  Dado el sonido activado, Entonces hay efectos para aparición del rey, transformación y victoria; con el sonido apagado no suena nada.
- Escenario: parpadeos
  Entonces ningún efecto parpadea más de 3 veces por segundo en un área grande.
- Escenario: movimiento reducido
  Dado `prefers-reduced-motion`, Entonces no hay temblor de pantalla y las transformaciones son un fundido directo.
- Escenario: no solo color
  Entonces la vida tiene número y las etapas tienen marcas, no solo color.

### HU-14 · Resumen de la batalla · Prioridad: Could
Como usuario, quiero un resumen corto al ganar, para ver cuánto trabajó el equipo.

**Criterios de aceptación**
- Escenario: contenido
  Dado un rey derrotado, Entonces durante 6 s se muestra: nombre del rey, duración, golpes totales y la party con más golpes (MVP).
- Escenario: cierre
  Entonces se oculta solo, al pulsar o al empezar otra batalla.

**Casos borde:** batalla de menos de 5 s (no se muestra); empate de MVP (la primera en entrar).

## Requisitos no funcionales transversales
- **Sin dependencias:** todo el arte, animación y efectos se dibujan en código sobre canvas (`public/`).
- **Estado:** la batalla se deduce de los eventos de los agentes que ya llegan al navegador (estados y herramientas); sin cambios en `server.py`, `hooks.py`, `app.py` ni `demo.py`.
- **Privacidad:** no se envía nada fuera del equipo. Solo se guardan en `localStorage` el tema y los 2 últimos reyes.
- **Compatibilidad:** funciona en el `.exe` (WebView2) y con `python app.py`.
- **Repetición de sesiones (x5–x60):** la batalla funciona; las transformaciones por tiempo se calculan con el reloj de la repetición (a confirmar).
- **Idioma:** todo texto visible en español.

## Orden de entrega
1. **Entrega 1 (MVP): HU-1, HU-2, HU-3, HU-4, HU-5.** El usuario pasa al tema arena, ve un Rey Demonio gigante (1 rey, forma 1), parties de 3 héroes (3 razas) que entran y salen, vida compartida y cierre de batalla. Valida la escala y la mecánica antes de invertir en arte.
2. **Entrega 2: HU-6, HU-7 (forma 2).** Secuaces y primera transformación del rey.
3. **Entrega 3: HU-9, HU-8.** Las 8 razas completas y las transformaciones de party por raza.
4. **Entrega 4: HU-10, HU-11, forma 3 del rey.** Élites, 4 reyes rotando y tercera forma.
5. **Entrega 5: HU-12, HU-13, HU-14.** Rendimiento con muchas parties, sonido y accesibilidad, resumen.

Recomendación: no dibujar las 8 razas antes de validar la Entrega 1; la escala del rey, los umbrales (10, 25, 60 %, 3 min) y el número de parties visibles pueden cambiar al verlos en pantalla.

## Riesgos de producto
- **Alcance de arte:** 8 razas × 3 clases × 3 etapas × 2 paletas, más 4 reyes con 3 formas, 4 secuaces y 4 élites. Por eso va por entregas y las etapas son capas.
- **Legibilidad:** con 18 héroes, 10 secuaces y 2 élites la escena puede saturarse; límite de 6 parties completas y efectos reducidos a partir de la 4.ª.
- **Rey gigante:** ampliar los sprites actuales puede verse tosco; decisión técnica pendiente.
- **Legal:** parecidos involuntarios; lista «Evitar» y revisión antes de publicar.
- **Fotosensibilidad:** flashes y temblores (HU-13).

## Supuestos y preguntas abiertas
Supuestos: el rey siempre es hostil visualmente pero nunca hay daño a los héroes; los secuaces son decorativos y los élites protegen al rey; el tema RPG vuelve a campamentos; los 15 héroes de la spec anterior quedan retirados.

Preguntas para el usuario (con propuesta por defecto):
1. **Acceso:** ¿la arena es un tercer tema (oficina / mundo RPG / arena) y el mundo RPG vuelve a campamentos sin modo raid? *Propuesta: sí.*
2. **Arena sin trabajo:** ¿qué debe verse cuando ningún agente trabaja? *Decisión: arena sin rey, con el trono; los agentes conocidos descansan en el campamento («Los héroes descansan…») y, sin ningún agente, «La arena espera…» (ver «Zona de descanso»).*
3. **Secuaces y élites:** ¿afectan a la vida o son decorativos? *Propuesta: los secuaces son decorativos (mueren a golpes); los élites protegen al rey (los golpes van primero a ellos) y al caer dan +3 de poder a las parties.*
4. **Reyes:** ¿un rey único o varios rotando, y cuántas formas? *Propuesta: 4 reyes rotando (Kazgorath, Vhel-Morkai, Ysgrim, Tzar-Nuul) con 3 formas; el MVP empieza con 1 rey y 1 forma.*
5. **Razas y asignación:** ¿están bien las 8 razas (humanos, elfos, enanos, orcos, gnomos, bestiales, draconios, astrales) con 2 agentes por raza, y quieres poder elegir la raza de un agente desde el editor? *Propuesta: sí a las 8 razas con la asignación de la tabla; elegir raza en el editor queda para después.*
