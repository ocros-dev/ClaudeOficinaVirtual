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

---

# v1.2: escala 16 bits y combate dinámico

Estado: especificación de producto (sin código ni decisiones de implementación). Amplía la versión 1.1; lo que no se menciona aquí no cambia. Nota: la imagen de referencia del usuario no está disponible para quien escribe; los requisitos de arte parten de su descripción (~45×60 px, 4-5 tonos por color, contorno negro grueso, pelo con volumen, pliegues en la ropa, proporciones chibi-atlético). Conviene que `ux-designer` la tenga delante al dibujar.

## 1. Objetivo de la v1.2

**Problema.** Hoy los héroes (18-25 px) son iconos pequeños que casi no se mueven y los ataques son proyectiles diminutos: la batalla informa («hay trabajo») pero no entretiene. El usuario quiere ver una **pelea de sprites 16 bits**: personajes con detalle, golpes, embestidas, teletransportes, rayos enormes, y un rey y unos enemigos que también se muevan y reaccionen. Además quiere una **raza nueva de poder creciente** inspirada en el género, pero con identidad propia.

**Éxito (verificable en demo y uso propio):**
- Con `python demo.py` (4 agentes), en cualquier ventana de 10 s se ven al menos 6 acciones distintas (de la lista de «Coreografía») y ninguna party está más de 4 s sin moverse de forma visible.
- Cada herramienta usada produce una acción visible en menos de 300 ms; la barra del rey baja en ese plazo (regla actual).
- El rey se desplaza, esquiva o retrocede al menos una vez cada 5 s durante el combate.
- 30 fps o más con 4 parties completas + 4 vanguardias, rey forma final, 10 secuaces y 2 élites (medido en el equipo del usuario).
- Revisión de originalidad de la raza nueva firmada (lista «Evitar» ampliada, apartado 3.5).

## 2. Decisión de escala

### 2.1 Problema de espacio
Un personaje de 45×60 px ocupa unas 2 veces el área lineal de los actuales (~30 px). En 480×304 caben unos 10 personajes de ancho y no cabrían 3 héroes × varias parties + rey de ~220 px + campamento. Además, el combate dinámico necesita **sitio para moverse** (embestidas de 60-150 px, teletransportes).

### 2.2 Opciones

| Opción | Qué es | A favor | En contra |
|---|---|---|---|
| **A. Lienzo mayor, píxel nativo** | Lienzo lógico **960×608** (exactamente 2× el actual), sprites dibujados a su detalle real | Mantiene composición, puestos, campamento y proporciones de la spec actual (casi todo «×2»); un píxel es un píxel (sin escalado borroso); sitio para moverse | Más píxeles por fotograma (~4×); hay que redibujar todos los sprites con más detalle; hay que cuidar la caché |
| B. Menos héroes visibles | 1-2 héroes por party | Barato | Rompe «party de 3» (decisión de producto del usuario) |
| C. Solo el líder a escala completa | Vanguardia grande; los otros dos pequeños o ausentes | Barato en perfiles | Mezcla escalas de píxel (se ve mal) y pierde la identidad de las clases |
| D. Cámara con zoom a la acción | Lienzo igual, la cámara acerca/aleja | Efecto cinematográfico | Rompe la vista única arena + campamento; mezcla escalas de píxel; la acción simultánea de varias parties no cabe en un solo plano; más complejo |
| E. Mantener 480×304 y dibujar a 45×60 | Sprites grandes en el lienzo actual | Cero cambio de lienzo | No caben: el rey y las parties se tapan entre sí |

### 2.3 Recomendación: A (960×608) con límites de parties
- **Lienzo lógico 960×608 en el tema arena** (la oficina y el mundo RPG no cambian). Todas las coordenadas de la spec 1.1 (puestos, empalizada y y=248, rey a y=170, etc.) se multiplican por 2. Se escala a la ventana con **vecino más cercano** (sin suavizado) y, cuando la ventana lo permite, a múltiplos enteros.
- **Tamaños nuevos (alto):** héroe 44-66 px según raza (humanos 60, enanos 50, gnomos 44, orcos 66, draconios 64…; ancho de casilla 45-52 px). Secuaz 24-40 px. Élite 90-120 px. **Rey: base ≥ 214 px (35 %), final ≥ 274 px (45 %)**, mismos porcentajes de la spec 1.1.
- **Parties:** hasta **4 completas** (3 héroes, combate completo). De la 5.ª a la 8.ª, **solo el héroe de vanguardia** (escala completa, con su combate). Más de 8: insignia «+N parties». *Cambia el límite anterior (6 completas, 7.ª-10.ª con vanguardia): se recorta porque cada una cuesta más y necesita sitio para pelear; todas siguen contando para el daño.*
- **Sin cámara móvil.** Los golpes grandes dan un temblor corto de pantalla (se anula con movimiento reducido). Un «plano de acción» con zoom queda como *Could* futuro.
- **Campamento:** se mantiene tal cual, en la franja baja ×2 (y ≥ 496, unos 112 px), con 7 parties visibles y «+N descansando». Los héroes en reposo usan sus sprites 16 bits (poses de reposo, ver 4.4); el mobiliario y los objetos se redibujan a la nueva escala con el mismo contenido. Las 8 actividades se conservan.
- **Rendimiento (requisitos, no técnica):** 30 fps o más en el caso medido arriba; el primer dibujo de una raza nueva no provoca un parón visible mayor de 50 ms; memoria de sprites en caché ≤ 64 MB (se generan solo las razas, etapas y poses que se usan y se descartan las menos usadas). La técnica es decisión de `frontend-expert`.

### 2.4 Estilo 16 bits (requisitos de arte)
- **Contorno** exterior negro-azulado `#0a0810` de 1 px nativo (grueso a esta escala), más líneas internas de 1 px solo para separar volúmenes.
- **4-5 tonos por color** (sombra profunda, sombra, base, luz, brillo) con luz fija desde arriba a la izquierda; sin degradados suaves ni antialiasing.
- **Pelo con volumen:** al menos 3 mechones o masas con su propia luz y sombra; se mueve en el ciclo de idle y de carrera.
- **Ropa con pliegues:** al menos 2 líneas de pliegue visibles en torso o capa/falda y en cada manga.
- **Proporciones:** cabeza ≈ 1/4,5 de la altura, hombros marcados, piernas largas (chibi-atlético); ojos de 2-3 px con brillo.
- **Poses por héroe (mínimo):** reposo (4 fotogramas), caminar (6), correr/embestida (4), golpes cuerpo a cuerpo (3 golpes × 3 fotogramas), disparo/lanzamiento (carga 3 + disparo 2), apoyo/hechizo (4), golpeado (2), bloqueo (1), lanzado por los aires (2), victoria (3), transformación (3), y de campamento: sentado (2), dormir (2), comer/beber (2). Se miran a izquierda o derecha reflejando el sprite.
- Los 3 héroes de una party se distinguen por silueta y color de la ropa, no solo por el arma.
- **Compatibilidad durante la migración:** una raza aún no redibujada se muestra con su sprite antiguo ampliado ×2 (sin suavizado) y se mueve solo con las acciones genéricas; la app siempre queda utilizable.

## 3. Raza nueva: **Tempestarios**

### 3.1 Identidad
- **Nombre:** Tempestarios · **Lugar:** Cumbres del Estruendo. Es la raza 9; en su emblema, un rayo ramificado (⚡ y 🌩).
- **Lore breve:** nacen en cumbres donde cae el rayo sin descanso. Su cuerpo guarda **carga**: cuanto más combaten, más carga acumulan, y la carga les cambia el pelo, los ojos y la piel. Los jóvenes la descargan con furia; los maestros la **contienen**, y por eso su forma final es la más serena y la más peligrosa. Su lema: «La tormenta más fuerte es la que no hace ruido».
- **Silueta propia (para distinguirlos a 60 px):** pelo **largo y caído hacia atrás y a los lados** que en las etapas altas **flota** con mechones angulosos (no erizado hacia arriba); banda metálica en la frente; **brazaletes pararrayos** plateados; una **cicatriz ramificada de rayo** (figura de Lichtenberg) desde el hombro, tenue desde la etapa 1; túnica larga azul noche con faldones a los lados y faja de cuero.
- **Clases:** vanguardia **Relámpago** (puños y patadas con guanteletes), distancia **Fulminador** (rayos y esferas de energía), apoyo **Pararrayos** (varilla-bastón que absorbe la carga y la reparte: escudo, curación, potenciación).

### 3.2 Paleta (5 tonos de sombra a brillo)
| Elemento | Tonos |
|---|---|
| Contorno | `#0a0810` |
| Piel A (bronce frío) | `#5a3a2e` `#86573f` `#b3805a` `#d4a37a` `#ecc8a0` |
| Túnica A (azul noche) | `#0c1426` `#16223e` `#22345c` `#34508a` `#5a7ac0` |
| Ribetes y brazaletes (plata) | `#6a7488` `#98a2b8` `#c8d0e0` `#eef2fa` |
| Cuero (faja, correas) | `#3a2a20` `#5a4030` `#7a5a40` |
| Pelo etapa 1 (gris tormenta) | `#1c2230` `#2e3a50` `#46566f` `#6a7c96` `#9aaac2` |
| Pelo etapas 2-4 (plata y blanco) | `#8a90b0` `#bcc2dc` `#e4e8f6` `#f8faff` `#ffffff` |
| Mechones eléctricos y marcas | `#5a24c8` `#8a4aff` `#b890ff` `#d8c4ff` y núcleo `#ffffff` |
| Aura (capas) | exterior `#5a24c8` (35 %), media `#8a4aff`, núcleo `#e0d0ff` |
| Ojos | etapa 1 gris-azul `#8ab0d8`; 2 violeta `#a070ff`; 3 blanco con iris `#b890ff`; 4 blanco-lavanda `#efe6ff` |
| **Variante B** | piel pálida `#e8c8b0`; túnica verde pino `#0c1e1a` `#16302a` `#22483c` `#346a58` `#5a9a84`; mechones y aura índigo `#3a4aff` `#6a7aff` `#a8b4ff` |

Diferenciación frente a los **Astrales** (violeta y estrellas): los Tempestarios usan violeta solo en **rayos angulosos** y marcas, con pelo blanco-plata y túnica azul oscuro; los Astrales llevan estrellas y órbitas suaves. Revisar juntos en pantalla.

### 3.3 Etapas (4)
El poder se calcula igual que en el resto (herramientas + segundos ÷ 12). Los Tempestarios tienen **4 etapas** con umbrales más tempranos para que su crecimiento se note.

| Etapa | Umbral de poder | Daño | Pelo | Ojos | Aura y cuerpo | Grito (globo 2,2 s) |
|---|---|---|---|---|---|---|
| 1 · **Calma Previa** | 0 | ×1 | gris tormenta, liso, hasta los hombros | gris-azul | sin aura; cicatriz-rayo tenue; alguna chispa suelta al golpear | (entrada) «Aún no ha tronado.» |
| 2 · **Chispa Viva** | 8 | ×1,5 | plata con 3 mechones violeta; empieza a moverse | violeta | chispas violeta orbitando, un arco de rayo corto cada ~1 s en los brazos | «¡Se carga el cielo!» |
| 3 · **Tormenta Desatada** | 20 | ×2 | blanco plata, largo y flotante, 5 mechones eléctricos | blancos con iris violeta | aura de **rayos ramificados** violeta, marcas luminosas en brazos y cuello, sombra con relámpagos, suelo con grietas de luz; ropa ondeando | «¡Que truene el cielo entero!» |
| 4 · **Ojo de la Tormenta** (forma serena) | 40 | ×2,5 | blanco brillante, muy largo, flota quieto y ordenado; mechones recogidos en una **corona de arcos** | blanco-lavanda, párpados a medias | el aura **se contiene**: casi sin rayos externos, un contorno fino de luz `#e0d0ff` y **anillos de rayo** orbitando despacio; marcas luminosas cubren brazos, cuello y frente; ×1,1 de tamaño; en el suelo un círculo de luz | «Ya no hay tormenta… solo yo.» |

- **Transformación:** el cielo del tema se oscurece 0,5 s sobre la party, cae **un rayo** sobre el héroe de vanguardia y los otros dos se cargan por arco; el pelo cambia a mitad del destello. Total 0,9 s (etapas 1→3) y 1,4 s (3→4, más lenta y silenciosa; sin flash blanco a pantalla completa).
- **Mecánica propia «Carga» (visual):** entre etapas, una barra fina de chispas alrededor del héroe vanguardia indica cuánto falta para la siguiente (0-100 %). No cambia reglas.
- **Acentos de reglas:** las etapas, el refuerzo tardío (llega con poder 5 → etapa 1; con rey en forma 3 llega a etapa 2) y la pérdida al salir son las de la spec 1.1.
- **Asignación:** Tempestarios para `claude` (el agente principal, el que más se ve). `product-owner` sigue con Humanos. La función `hash mod 8` de agentes desconocidos **no cambia** (no se reasigna a nadie): los Tempestarios solo se asignan por tabla o, más adelante, desde el editor.
- **Etapa visible extra para las demás razas:** no. Las 8 razas siguen con 3 etapas.

### 3.4 Movimiento y ataques de los Tempestarios
Ver tabla de coreografía (4.3, fila 9). Sello de la raza: **teletransporte relámpago** (desaparecen en un arco de luz y reaparecen detrás del objetivo), **combos de puños con chispa** y **rayo grande** que carga en 0,6 s con un anillo de arcos y se dispara en haz recto.

### 3.5 Originalidad (ampliación de «Evitar» para esta raza)
No se usarán, bajo ningún concepto: el nombre ni derivados de «saiyajin»/«Super…», pelo dorado o amarillo ni en punta vertical, aura amarilla de llamas ascendentes, ojos turquesa o verdes, cola de mono, gi naranja o azul con cinturón, gritos largos de carga reconocibles, nombres de técnicas ya publicadas (Kamehameha, Kaioken…), ni poses idénticas a las de obras conocidas. El pelo plateado/blanco largo, el violeta y los rayos son rasgos genéricos del género; la **identidad** se asegura con el nombre, la silueta (pelo largo caído, banda frontal, brazaletes, cicatriz de rayo), el aura de rayos angulosos (no de llamas) y la etapa final serena. Revisión visual por el Product Owner antes de publicar (esto es guía de producto, no asesoría legal).

## 4. Coreografía de combate

### 4.1 Principios
- **Cada evento de herramienta dispara una acción visible**; la barra del rey baja en ≤ 300 ms (la animación puede durar más; el golpe visual conecta a ≤ 250 ms desde el evento).
- **Entre acciones, nunca estáticos:** los héroes están «en guardia» (balanceo, pasos de reposicionamiento, mirar al objetivo); cada 4-6 s con el agente trabajando hacen un cruce de golpes visual con un secuaz o con el rey (sin daño).
- **Nunca hay derrota ni muerte de héroes.** Los enemigos pueden golpear a los héroes **solo visualmente** (retroceso de 6-10 px, pose «golpeado» 0,3 s, o bloqueo/esquiva); se recuperan solos.
- **Cada raza se mueve distinto** (4.3) y **cada clase ataca distinto**.
- **Contener el caos:** una party ejecuta **1 acción a la vez**; las herramientas que llegan mientras tanto se encolan (máx. 3) y si hay más se funden en una **ráfaga** (combo rápido de 0,5 s) que cuenta todos los golpes. A la vez en toda la escena: máx. **3 acciones grandes** (rayo cargado, teletransporte de equipo, choque) y máx. 4 imágenes residuales por héroe.
- Con `prefers-reduced-motion`: sin desplazamientos largos ni teletransportes (el héroe se queda y pasa a la pose de golpe con un destello fijo de 0,15 s), sin temblor, sin imágenes residuales; los rayos se dibujan completos sin carga animada.

### 4.2 Eventos de herramienta a acciones
| Evento / herramienta del agente | Quién actúa | Acción (duración) | Efecto en el rey |
|---|---|---|---|
| Comienza a trabajar (estado) | los 3 | **Entrada de combate**: carrera por la puerta, derrape y pose de guardia (≤ 2,5 s) | — |
| `Read`, `Grep`, `Glob`, `LS` (explorar) | vanguardia | **Tanteo**: paso lateral, finta y golpe rápido (0,4 s) | −1 × mult., parpadeo del rey |
| `Edit`, `Write`, `NotebookEdit` (modificar) | vanguardia | **Combo**: embestida + 3 golpes + remate que **lanza** al objetivo (0,9 s) | −1 × mult., el rey retrocede y vuelve |
| `Bash` (ejecutar) | distancia | **Rayo cargado**: carga 0,4-0,6 s y disparo de haz o esfera grande (0,9 s) | −1 × mult., impacto con onda |
| `WebFetch`, `WebSearch` (buscar fuera) | distancia | **Disparo largo**: salto atrás y proyectil que cruza la pantalla (0,8 s) | −1 × mult. |
| `TodoWrite` y planificación | apoyo | **Potenciación**: halo y aura sobre los otros dos, que brillan 1 s (0,8 s) | −1 × mult. (haz de luz) |
| `Task` / subagente | los 3 | **Técnica de equipo**: los 3 se teletransportan alrededor del objetivo y golpean a la vez (1,6 s); mínimo 8 s entre dos | −1 × mult. |
| Otra herramienta desconocida | vanguardia | **Tanteo** | −1 × mult. |
| Herramienta cuando hay secuaces / élite | el actor elige objetivo según la regla actual | el secuaz sale **despedido** en arco y rebota; al élite se le ve **retroceder** | según reglas 1.1 |
| Cambio de etapa | los 3 | **Transformación** (3.3) | — |
| Terminó (estado) | los 3 | **Victoria**: pose, destello y vuelta caminando por la puerta | — |
| Daño pasivo (cada 10 s) | el más cercano | cruce de golpes visual | −1 por cada 10 s |
| Error de herramienta | vanguardia | el golpe es **esquivado** y contraataca con Tanteo; el daño cuenta igual (la barra no depende del acierto) | −1 × mult. |

*Supuesto a confirmar con `backend-expert`:* el navegador recibe el tipo de herramienta (`PreToolUse`) y, si no llega el resultado, «error de herramienta» se omite. El tipo de herramienta se obtiene del evento ya existente, sin cambiar `server.py` ni `hooks.py`; si no estuviera disponible, todas las herramientas usan el reparto cíclico Tanteo → Combo → Rayo.

Los **combos largos** se encadenan por etapa: etapa 1 usa el combo de 3 golpes; etapa 2 añade un golpe y teletransporte; etapa 3, remate con onda; etapa 4 (Tempestarios), un movimiento sin gritos (silencio, un solo golpe enorme con trueno retardado).

### 4.3 Estilo de movimiento y ataques por raza y clase

| # | Raza | Cómo se mueve | Vanguardia (cuerpo a cuerpo) | Distancia o magia | Apoyo | Técnica de equipo (etapa 3+) |
|---|---|---|---|---|---|---|
| 1 | Humanos | pasos firmes, esgrima, retroceso con escudo | Caballera: estocada, corte ascendente y tajo cruzado; empuja con el escudo y lanza | Hechicero: esfera de cristal que estalla en 3 | Sanadora: halo que cura y barrera | **Carga del Alba**: formación en V, estocada de luz que cruza la arena |
| 2 | Elfos | saltos ágiles, volteretas, esquivan con un paso fantasma | Danzante: remolino de dos espadas, salto y corte | Arquera: lluvia de 3 flechas, flecha cargada que atraviesa | Druida: raíces que sujetan al objetivo, flores que curan | **Lluvia de hojas**: los 3 saltan y descargan un aguacero de flechas y cuchillas |
| 3 | Enanos | pesados, avance con el hombro, aterrizajes que agrietan el suelo | Martillador: martillazo al suelo con onda y golpe que lanza | Artillero: cañonazo con retroceso que lo empuja atrás | Rúnico: runa azul que protege y estalla | **Yunque de Fuego**: el martillo cae como un meteoro y rebota en cadena |
| 4 | Orcos | arrancan a correr con un rugido, embestidas directas | Berserker: dos hachas en torbellino, embestida y salto | Cazador: lanza de jabalina con el cuerpo entero | Chamán: tótem que golpea con trueno y cura | **Estampida de Colmillos**: los 3 corren en línea y arrasan |
| 5 | Gnomos | trotes cortos, saltos con propulsores, giran sobre sí | Piloto de mecha: puñetazo de mecha con cohete y taladro | Artífice: torreta y 2 drones que disparan | Alquimista: lanza pociones de colores (curar, ralentizar) | **Mecha Colosal**: los 3 se ensamblan un instante en un mecha que golpea |
| 6 | Bestiales | a cuatro patas o a saltos, zarpazos laterales, muy veloces | Oso: zarpazo doble y abrazo que lanza | Zorra: señuelos de ilusión, 3 clones disparan | Ciervo: astas que curan, pulso de luz | **Aullido Lunar**: 3 siluetas espectrales cruzan la pantalla |
| 7 | Draconios | desfile altivo, cola que azota, planeo corto | Lancero: lanzazo con carrera y cola | Aliento-mago: chorro de fuego frío continuo | Sacerdotisa: escamas de luz que escudan | **Aliento Triple**: tres chorros que se funden en uno |
| 8 | Astrales | flotan, deslizan, aparecen con destellos | Guardián: golpes de luz, escudo estelar | Astróloga: constelación que se une y cae | Monje: anillos que ralentizan al objetivo | **Alineación**: una constelación gigante cae del cielo |
| 9 | **Tempestarios** | **teletransporte relámpago** (desaparecer y reaparecer tras el objetivo con imagen residual), carreras en línea recta con estela | Relámpago: combo de puños y patadas con chispa, embestida, patada voladora que **lanza**; golpes más rápidos en etapas altas | Fulminador: rayo cargado (anillo de arcos) y haz recto grande, esferas de energía, **choque de rayos** | Pararrayos: absorbe una descarga y la redistribuye (escudo y pulso), varilla que atrae rayos del cielo | **Tormenta de Cumbre**: los 3 se separan en 3 teletransportes, golpean y juntan un único rayo desde el cielo |

Cada técnica de equipo sale en el golpe combinado de etapa 3 (spec 1.1, *Could*) y, en esta versión, también como respuesta a `Task` cuando la party es etapa ≥ 3.

### 4.4 Rey Demonio, secuaces y élites

**Acciones del rey (todas visuales, se encadenan sin daño a héroes):**
| Acción | Cuándo | Qué se ve |
|---|---|---|
| Respiración y mirada | siempre | movimiento suave del torso, ojos que siguen a la party que ataca |
| **Recibir golpe** | cada herramienta | destello blanco, retroceso de 4-8 px y regreso (16 px si el golpe «lanza») |
| **Esquiva** | cada 8-12 s o cuando llega un rayo | desplazamiento lateral rápido de 20-40 px con imagen residual; el proyectil pasa de largo |
| **Zarpazo / barrido** | cada 6-9 s | amago y golpe sobre una party; los héroes bloquean o saltan, se ven ondas |
| **Embestida** | cada 20-30 s | avanza 40-60 px hacia las parties y vuelve |
| **Rugido** | transformaciones y cada 40 s | temblor corto, onda y secuaces que se encogen |
| **Rayo del rey** | cada 25-35 s | carga 1,2 s con aviso (círculo en el suelo) y haz grande; si hay party etapa ≥ 3, **choque de rayos** (ver 4.5) |
| **Teletransporte de sombra** | forma 2 y 3 | se esfuma y reaparece unos 80 px a un lado |

**Ataque firma por rey:** Kazgorath, **Cometa de Brasas** (lluvia de bolas de fuego); Vhel-Morkai, **Marea Negra** (tentáculos que barren el suelo); Ysgrim, **Lanza de Escarcha** (carámbanos que caen en fila); Tzar-Nuul, **Nube de Plaga** (enjambre que cruza la pantalla).

**Secuaces:** patrullan en zigzag, **embisten** a una party y rebotan; los que mueren salen **despedidos en arco** con rebote y estallido; el Ojo flotante carga un láser fino; el murciélago pica en picado y vuelve. Tardan 0,6-1 s en cada acción.

**Élites:** Verdugo — avanza, tajo enorme (se ven las ondas) y escudo de sombra al retroceder; Brujo infernal — teletransporte corto y bola de sombra; Cancerbero — carrera por el flanco y mordisco doble, esquiva a saltos; Heraldo alado — pica en picado, toca la trompeta (onda) y vuelve a volar. Al ser golpeados, **retroceden** y se recuperan.

### 4.5 Choque de rayos
- Lo inicia el **Rayo del rey** cuando hay una party etapa ≥ 3 (o, en sentido contrario, el Rayo cargado de esa party si el rey está cargando).
- Duración 1,5 s: los dos haces se encuentran en un punto con onda y chispas; el punto de choque se mueve como máximo 40 px y acaba **siempre a favor de la party**, empujando al rey (retroceso grande y destello).
- Máx. 1 choque a la vez y mínimo 20 s entre dos. Sin flash a pantalla completa; destello limitado a la zona del choque.

### 4.6 Reglas generales de combate dinámico
- Los movimientos de las parties quedan dentro de su **carril** (unos ±120 px a cada lado de su puesto); con 3-4 parties completas el carril se reduce a ±80 px para no taparse.
- Ningún movimiento hace que un héroe quede por encima del rey (los pies siempre por debajo de y = 340 de la nueva escala) ni cruce la empalizada.
- El rey no se desplaza más de 80 px de su posición y siempre vuelve.
- La dirección del sprite refleja el lado del objetivo.

## 5. Historias de usuario (v1.2)

### HU-15 · Lienzo grande y escala 16 bits en la arena · Prioridad: Must
Como usuario, quiero que la arena se vea a una escala de juego de pelea 16 bits, para disfrutar de los personajes con detalle.

**Criterios de aceptación**
- Escenario: lienzo
  Dado el tema arena, Entonces el lienzo lógico es de 960×608 y los temas oficina y mundo RPG siguen con su tamaño actual.
- Escenario: tamaños
  Entonces un héroe mide entre 44 y 66 px de alto, el rey en forma base al menos 214 px y en forma final al menos 274 px.
- Escenario: nitidez
  Entonces no se ve suavizado: cada píxel del sprite es un cuadrado nítido a cualquier tamaño de ventana.
- Escenario: encaje
  Dado 4 parties completas + rey + campamento, Entonces ningún héroe se solapa con la placa ni con el pie de otro, y el rey no tapa a ninguna party.
- Escenario: límites
  Dado 9 agentes trabajando, Entonces hay 4 parties completas, 4 con solo vanguardia y la insignia «+1 parties».
- Escenario: cambio de tema
  Dado que cambio de tema, Entonces el lienzo se adapta en menos de 1 s sin recargar.

**Casos borde:** ventana muy pequeña (se reduce proporcionalmente, sin cortar la escena); ventana en pantalla completa (se amplía manteniendo proporción).
**Requisitos no funcionales:** 30 fps o más en el caso medido; memoria de sprites ≤ 64 MB.

### HU-16 · Sprites de héroes en estilo 16 bits (piloto: Tempestarios etapas 1-2) · Prioridad: Must
Como usuario, quiero héroes con contorno grueso, sombreado en 5 tonos, pelo con volumen y ropa con pliegues, para que se parezcan a los sprites de los juegos de pelea.

**Criterios de aceptación**
- Escenario: estilo
  Entonces cada color usa 4 o 5 tonos, el contorno exterior es de 1 px nativo `#0a0810`, el pelo tiene al menos 3 masas con luz y sombra y la ropa tiene al menos 2 pliegues visibles por prenda principal.
- Escenario: poses
  Entonces existen todas las poses del apartado 2.4 para los 3 héroes de la raza piloto.
- Escenario: distinguir clases
  Entonces vanguardia, distancia y apoyo se distinguen por silueta y color a tamaño normal.
- Escenario: compatibilidad
  Dado una raza aún no migrada, Entonces se ve con su sprite antiguo ampliado ×2 sin errores.
- Escenario: revisión de arte
  Entonces `ux-designer` aprueba por escrito la comparación con la imagen de referencia del usuario.

### HU-17 · Combate dinámico de la party · Prioridad: Must
Como usuario, quiero que cada herramienta usada se vea como un ataque con movimiento, para disfrutar mirando la pelea.

**Criterios de aceptación**
- Escenario: reacción rápida
  Dado una party trabajando, Cuando su agente usa `Edit`, Entonces en menos de 300 ms el héroe de vanguardia inicia el **Combo** y la barra del rey baja.
- Escenario: tipos distintos
  Dado el uso de `Read`, `Edit`, `Bash` y `Task`, Entonces se ven 4 acciones distintas (Tanteo, Combo, Rayo cargado, Técnica de equipo).
- Escenario: cola
  Dado 6 herramientas en 1 s, Entonces la party no ejecuta más de 1 acción a la vez, encola 3 como máximo y el resto se funde en una ráfaga; el daño contado es el de las 6.
- Escenario: nunca estáticos
  Dado una party trabajando 10 s sin herramientas, Entonces los héroes se mueven (guardia o cruce de golpes) al menos cada 4 s.
- Escenario: sin muertes
  Entonces ningún héroe cae ni se muestra derrota.
- Escenario: movimiento reducido
  Dado `prefers-reduced-motion`, Entonces las acciones no desplazan al héroe ni dejan imágenes residuales y los golpes se ven como pose + destello fijo.

**Casos borde:** herramienta de un agente que acaba de salir (se ignora); 30 herramientas en 1 s (sin colgar el navegador; se aplica daño de todas y se dibujan como mucho 6 cifras); herramienta durante la transformación (se encola hasta que termine).

### HU-18 · El rey y los enemigos se mueven y reaccionan · Prioridad: Must (rey) / Should (secuaces y élites)
Como usuario, quiero que el rey y sus ayudantes esquiven, ataquen y reciban golpes, para que la pelea parezca de dos bandos.

**Criterios de aceptación**
- Escenario: retroceso
  Dado un golpe de **Combo**, Entonces el rey retrocede entre 4 y 16 px y vuelve a su sitio en menos de 0,6 s.
- Escenario: ritmo
  Dado un combate de 30 s con 1 party, Entonces el rey hace al menos 3 acciones propias (esquiva, zarpazo, embestida, rayo, teletransporte o rugido).
- Escenario: ataque firma
  Entonces cada rey tiene su ataque firma (4.4) y se ve al menos 1 vez por minuto.
- Escenario: sin daño a héroes
  Entonces los ataques enemigos solo provocan pose «golpeado»/bloqueo y nunca cambian puntos ni etapas.
- Escenario: secuaces
  Dado secuaces vivos, Entonces embisten a una party y, al morir, salen despedidos en arco con destello.
- Escenario: élites (Should)
  Entonces cada élite tiene su ataque (4.4) y retrocede al ser golpeado.
- Escenario: posición
  Entonces el rey nunca se aleja más de 80 px de su puesto y siempre vuelve.

### HU-19 · Raza Tempestarios con 4 etapas · Prioridad: Must (decisión del usuario)
Como usuario fan del género, quiero una raza que se transforma por etapas con pelo, ojos y aura que cambian, para ver crecer a mi agente principal.

**Criterios de aceptación**
- Escenario: etapas
  Dado un agente Tempestario con poder 7, 8, 20 y 40, Entonces se dibujan respectivamente las etapas 1, 2, 3 y 4 (cada cambio con su transformación de 0,9 s o 1,4 s y su grito en globo de 2,2 s).
- Escenario: distinguibles
  Entonces las 4 etapas se distinguen a tamaño normal por pelo, ojos y aura (color y forma, no solo brillo).
- Escenario: etapa serena
  Dado la etapa 4, Entonces el aura es contenida (contorno fino y anillos orbitando), no tiene rayos externos grandes y el pelo flota sin parpadear.
- Escenario: daño
  Dado etapas 1 a 4, Entonces la barra baja 1, 1,5, 2 y 2,5 puntos por herramienta.
- Escenario: asignación
  Dado `claude` trabajando, Entonces su party es de Tempestarios; las asignaciones de las otras 15 razas/roles no cambian.
- Escenario: pérdida
  Dado una party etapa 4 que acaba y deja pasar 5 s, Entonces vuelve a etapa 1.
- Escenario: originalidad
  Entonces cumple 3.5 y no contiene ningún elemento de la lista «Evitar».
- Escenario: movimiento reducido
  Entonces la transformación es un fundido directo de 0,3 s sin rayo cayendo.

**Casos borde:** dos Tempestarios a la vez (el segundo usa variante B con mechones índigo); entrada en refuerzo con rey en forma 3 (llega a etapa 2); transformación justo cuando el rey se transforma (se muestran ambas sin taparse: gritos en globos separados).
**Requisitos no funcionales:** sin parpadeos mayores de 3 por segundo en un área grande; las marcas luminosas no se animan más de 2 Hz.

### HU-20 · Ataques y movimientos propios de cada raza · Prioridad: Should
Como usuario, quiero que cada raza y clase pelee distinto, para reconocerlas por cómo se mueven.

**Criterios de aceptación**
- Escenario: cobertura
  Entonces las 9 razas tienen los movimientos de la tabla 4.3 (3 clases + técnica de equipo).
- Escenario: distinguibles
  Dado dos parties de razas distintas haciendo `Edit`, Entonces los movimientos se distinguen en un vídeo mudo (silueta del ataque y trayectoria distintas).
- Escenario: técnica de equipo
  Dado una party etapa ≥ 3 que usa `Task`, Entonces ejecuta su técnica de equipo y mínimo hay 8 s entre dos.
- Escenario: límites
  Entonces nunca hay más de 3 acciones grandes a la vez en la escena.

### HU-21 · Choque de rayos y teletransportes · Prioridad: Should
Como usuario, quiero choques de rayos entre el rey y mi party y teletransportes con imágenes residuales, para tener momentos espectaculares.

**Criterios de aceptación**
- Escenario: choque
  Dado una party etapa ≥ 3 y un Rayo del rey, Entonces durante 1,5 s los haces se encuentran en un punto y el choque termina a favor de la party con retroceso del rey.
- Escenario: frecuencia
  Entonces hay a lo sumo 1 choque a la vez y 20 s entre dos.
- Escenario: seguridad visual
  Entonces el choque no genera flash a pantalla completa ni parpadeos de más de 3 por segundo.
- Escenario: teletransporte
  Dado un Tempestario con **Combo** etapa ≥ 2, Entonces desaparece y reaparece tras el objetivo en menos de 0,3 s dejando 2-4 imágenes residuales.
- Escenario: movimiento reducido
  Entonces no hay choque animado: solo el destello fijo.

### HU-22 · Campamento a la nueva escala · Prioridad: Must
Como usuario, quiero conservar el campamento de descanso con los héroes a la nueva escala, para no perder lo que ya me gusta.

**Criterios de aceptación**
- Escenario: composición
  Entonces el campamento ocupa la franja inferior (unos 112 px), con empalizada y puerta, y se ven hasta 7 parties y «+N descansando».
- Escenario: actividades
  Entonces las 8 actividades comunes y las de raza siguen apareciendo, con las poses de sentado, dormir y comer.
- Escenario: transiciones
  Entonces entrar y salir por la puerta funciona como en 1.1 (≤ 2,5 s y ≤ 2,8 s).
- Escenario: legibilidad
  Entonces los héroes en reposo no tapan la puerta ni las placas.
- Escenario: temporal
  Dado una raza no migrada, Entonces descansa con su sprite antiguo ampliado ×2.

### HU-23 · Rendimiento del combate dinámico · Prioridad: Must
Como usuario, quiero que la pelea vaya fluida, para poder tener la app abierta todo el día.

**Criterios de aceptación**
- Escenario: fluidez
  Dado 4 parties completas + 4 vanguardias, rey forma final, 10 secuaces, 2 élites y un choque de rayos, Entonces 30 fps o más.
- Escenario: efectos reducidos
  Entonces los efectos de las parties 3.ª en adelante usan una versión reducida (menos chispas, sin imágenes residuales).
- Escenario: primer dibujo
  Dado una raza que aparece por primera vez, Entonces no hay un parón mayor de 50 ms.
- Escenario: pestaña oculta
  Dado la ventana minimizada, Entonces la animación se pausa y no se acumulan acciones en la cola.

### HU-24 · Migración del resto de razas a 16 bits · Prioridad: Should
Como usuario, quiero que las 8 razas anteriores tengan el mismo nivel de detalle, para que no haya razas «antiguas».

**Criterios de aceptación**
- Escenario: completitud
  Entonces las 8 razas × 3 clases × 3 etapas × paletas A y B cumplen el estilo de 2.4 y tienen su fila de 4.3.
- Escenario: orden
  Entonces se migran por pares, por orden de uso en la tabla de asignación.
- Escenario: sin regresión
  Entonces mientras se migra no cambian las asignaciones ni las etapas.

## 6. Orden de entrega (v1.2)

1. **Entrega A (MVP v1.2): HU-15, HU-16 (piloto), HU-17 (acciones básicas: Tanteo, Combo, Rayo cargado), HU-18 (solo el rey), HU-22, HU-23.** Lienzo 960×608; Tempestarios etapas 1-2 y Kazgorath redibujados a 16 bits; el campamento a la nueva escala; las demás razas ampliadas ×2. Valida **escala, estilo y sensación de pelea** antes de invertir más arte.
2. **Entrega B: HU-19 completa.** Tempestarios etapas 3 y 4, transformaciones, gritos, variante B y teletransporte.
3. **Entrega C: HU-20 (Humanos, Elfos y Enanos) + HU-24 (esos tres).** Las razas del MVP original con su estilo propio.
4. **Entrega D: HU-18 (secuaces y élites), HU-21.** Enemigos que se mueven, choque de rayos, ataques firma de los otros reyes.
5. **Entrega E: HU-20 y HU-24 (resto de razas).**

Cada entrega se puede usar sola y la app nunca queda a medias (razas sin migrar se ven ×2).

## 7. Riesgos de producto (v1.2)
- **Volumen de arte:** ~40 fotogramas por héroe × 27 héroes × etapas × 2 paletas. Se mitiga con piloto primero, capas por etapa y migración por pares.
- **Rendimiento:** lienzo 4× mayor + más efectos; se mide en la Entrega A antes de seguir.
- **Saturación visual:** muchas acciones a la vez; cola, límite de 3 acciones grandes y de 4 parties completas.
- **Fotosensibilidad:** rayos, choques y transformaciones; sin flashes a pantalla completa y máximo 3 parpadeos/s.
- **Originalidad (alto):** la raza nueva se parece mucho al género de referencia; lista ampliada y revisión visual antes de publicar.
- **Dependencia de evento:** el reparto por tipo de herramienta depende de que el navegador ya reciba ese dato; hay alternativa cíclica.
- **Colisión de color con Astrales:** violeta compartido; se resuelve por forma (rayos angulosos frente a órbitas) y se revisa en pantalla.

## 8. Preguntas abiertas para el usuario (propuesta por defecto)
1. **Escala:** ¿lienzo 960×608 con 4 parties completas (5.ª-8.ª solo vanguardia) y sin cámara móvil? *Propuesta: sí; es la única opción que mantiene la party de 3, el campamento y el rey gigante en una pantalla.*
2. **Raza nueva:** ¿te gustan el nombre **Tempestarios**, las 4 etapas (Calma Previa, Chispa Viva, Tormenta Desatada, Ojo de la Tormenta) y que sea la raza de `claude`? *Propuesta: sí; la forma final es la serena, con el pelo blanco plata y violeta eléctrico.*
3. **Primera entrega:** ¿empezamos por Tempestarios (etapas 1-2) y Kazgorath como piloto de estilo, con las demás razas ampliadas ×2 hasta migrarlas? *Propuesta: sí, para validar el estilo con tu raza favorita antes de rehacer las 8.*
4. **Enemigos golpeando:** ¿quieres que los héroes se vean golpeados (retroceso, bloqueo) aunque nunca pierdan ni caigan? *Propuesta: sí, solo visual, sin derrotas.*

---

# Adendas de contrato (cierre de la v1.2, 2026-11-25)

Cambios respecto a lo escrito en `docs/arena-v12-arquitectura.md` (4.2, 4.3 y 4.11) que el código ya cumple:

- **Evento `reset`** (`rules.reset()`): sin campos. Avisa a `combat/` de que suelte rey, élites, secuaces, parties y efectos. Va después de los `partyToCamp` de cada party retirada.
- **`enemy` en lugar de `type`**: `minionSpawn` y `eliteSpawn` llevan `enemy` (`'diablillo'`, `'verdugo'`…). Los registros de reglas conservan `type` internamente, pero `combat/` lee `ev.enemy` (con `ev.type` solo como respaldo). El campo `type` de un evento es siempre el nombre del evento.
- **`stage` en `partyJoin` y `partyEnter`**: etapa de la party en ese momento (1 al entrar por la puerta; la que lleva si vuelve a salir). Sirve para prehornear las tiras de esa etapa. `partyJoin` solo se emite cuando la party empieza a salir, no mientras el grupo se levanta (ver abajo).
- **`combat.heroViews()`**: lista de héroes visibles `{ name, idx, race, variant, stage, x, y, z, face, w, h, alpha, lite, charge }`. `charge` es el progreso 0..1 de la carga de la acción en curso (0 si no carga). La lista se reutiliza entre llamadas: no se debe guardar.
- **Contexto de `fx` de raza** (`art/races/<id>.js`, `fx.back(g, c, stage)`, `fx.front(g, c, stage)` y `transformFx(g, c, k, from, to)`): `c = { x, y, w, h, t, lite, face, alpha, idx, variant, charge }`. `x, y` son los pies del héroe (con la altura `z` ya restada); `charge` es el de `heroViews()`.
- **Geometría final (`config.js`)**: `KING_Y = 408` (los reyes miden hasta 370-380 px y la barra de vida llega a y ≈ 28), `MIN_FEET_Y = 414`, puestos de solo vanguardia `(365,424) (595,424) (170,422) (800,422)`, `FLOOR_CY = 404`, `CIRCLE_CY = 392`. `CAMP_SLOTS[2] = (480, 586)`. `CAMP_SLOTS` es la única tabla de puestos del campamento (`camp/camp.js` y `camp/props.js` la leen).
- **Del campamento a la batalla**: si el agente tenía un grupo en reposo con puesto, `rules.js` crea la party en estado `wait` con `p.rise` apuntando al grupo, que sigue en `S.camp` mientras `camp.beginRise()` reproduce una pose corta (≈ 0,46 s: se echan hacia delante, se incorporan con un saltito, escalonados 100 ms). Los golpes de esa ventana restan vida a la vez (sin acción visual). Al terminar (`c.rise.end`), el grupo se retira, se emite `partyJoin` con `from: 'camp'` y `heroes`, y después `partyEnter`: los héroes salen andando desde donde estaban hasta la puerta. Con movimiento reducido no hay pose (sale directamente). Si el agente deja de trabajar durante la pose, `camp.endRise()` devuelve al grupo a su actividad y no se emite nada.
