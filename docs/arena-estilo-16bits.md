# Arena v1.2: guía de estilo 16 bits

Para todos los paquetes de arte (A-*, K-*, E-*). Referencia viva: `public/js/arena/art/races/tempestarios.js` (clase Relámpago, 4 etapas) y `art/kings/kazgorath.js` (forma 1). Capturas en `docs/estilo/`. Del sprite de referencia del usuario se toma solo el **nivel** (escala, rampas, contorno, volumen, pliegues, pose); ningún rasgo de su diseño.

## 1. Escala y proporciones

| Tipo de cuerpo (`build.body`) | Altura `build.height` | Cabeza | Notas |
|---|---|---|---|
| `atleta` (humanos, elfos, tempestarios, astrales) | 58-62 | `headScale` 1,1-1,15 (≈ 1/4,5 de la altura, con pelo ≈ 1/4) | hombros marcados (`shoulder` 1,05-1,1), piernas largas |
| `robusto` (enanos, orcos) | 50-66 | 1,0 | torso y brazos anchos; el kit ya los ensancha |
| `menudo` (gnomos) | 44 | 1,0 (ya es grande) | cabeza ≈ 1/3 |
| `fiera`, `draco` | 58-64 | 1,0 | cola de 3 tramos del rig |
| `etereo` | 60 | 1,1 | flotan, pies a z > 0 |

- Casilla horneada típica de un héroe: **44-50 × 58-70 px** (el Relámpago: 44×60 en reposo, 48×67 en etapa 4 con ×1,1). Con arma o pelo flotante puede crecer hasta ~76 px de ancho.
- Secuaz 24-40 px, élite 90-120 px. **Rey: forma 1 ≥ 214 px, forma 3 ≥ 274 px** (Kazgorath forma 1 mide 294 px con cuernos y la celda es 330×294).
- Los pies están en (0,0) y «arriba» es y negativo. Todo número de tamaño absoluto se multiplica por `s = L.H / 60` para que la etapa 4 (×1,1) escale bien.

## 2. Luz, tonos y contorno

- **Luz arriba-izquierda, fija.** El kit sombrea cada primitiva (`vol`, `cyl`, `sphere`); no pintes degradados ni negro.
- **5 tonos por material** `[sombra profunda, sombra, base, luz, brillo]`. Usa los hex de la spec; si no hay, `ramp5('#base')` desplaza el tono (sombras a azul-violeta, luces a cálido). Una rampa solo de 3 tonos se ve plana: completa a 5.
- **Contorno `#0a0810` de 1 px**, lo pone el kit. Rey y jefes con 8 vecinos (más grueso, `outline8`).
- **Líneas internas** (`line:true`): la parte delantera toma su tono 0 en el borde con lo que tapa. Por defecto en capas `near` y `top`. Úsalas en: brazo cercano sobre torso, pelo sobre cara, hombrera, faja, solapa, faldón sobre pierna. No en piezas del mismo material que se funden.
- Capa `far` baja un tono automáticamente (brazo, pierna y cola lejanos).
- Rampas de **variante B** y de **etapa** se cambian solo en `ramps(variante, etapa)`; la geometría no cambia salvo `geomStage`.
- Detalle puntual: 1 px de brillo de tono 4 o blanco en puño, nariz y hebras; emisivo (`P.emit`) solo para energía, runas y ojos brillantes.

## 3. Cómo se dibuja una pieza (receta)

Orden de llamadas = orden de pintado: **lejano → tronco → pierna cercana → cabeza → pelo trasero → pelo superior → ojo → brazo cercano con arma** (`dibujar()` en `tempestarios.js`).

- **Pelo (mínimo 3 masas con luz propia).** `peloAtras` / `peloArriba`: (1) masa sobre la nuca, (2) tres mechones largos superpuestos, el de abajo más corto y oscuro (`dt: -1`), (3) cúpula que llega a la banda, (4) mechón lateral que cae por delante de la oreja, (5) mechones sueltos que caen hacia atrás (nunca pinchos hacia delante). Luego `hebra()`: líneas de 1 px de luz (tono 4) y de sombra (tono 0) que parten las masas. `ctx.phase` + `wind` mueven las puntas; pasa `n: 4` a `P.lock` para no pasarte de coste.
- **Cabeza de perfil.** Cráneo en tono fijo (lo tapa el pelo), rostro con `shade:'flat'` tono 3, sombra de mandíbula tono 2, luz de pómulo tono 4. No sombrees la cara por volumen: queda con medio rostro oscuro. Ojo `P.eye` de 2-3 px con brillo; ceja oblicua de 3 px (mirada decidida); nariz de 1 px; boca de 2 px.
- **Pliegues (mínimo 2 por pieza grande).** `P.fold` en pecho, espalda, faldón, cada manga y cada rodilla; siguen la tensión (nacen en una articulación y se abren). Las prendas largas (faldón, colas de faja) cuelgan por gravedad y se echan atrás con `wind` (carrera, golpes) y hacia delante si te golpean.
- **Manos.** Puño = esfera `sphere` de 5-6 px con placa de nudillos (`banda`), nunca un círculo liso. El kit mueve la mano; tú orientas la placa con `P.dir('armN.lower')`.
- **Bandas y puños de ropa** con `banda()` (polígono rígido), **no** con `P.cap`: una cápsula corta se infla a círculo.
- **Armas.** Largas (varas, bastones): 22-30 px, anclada con `P.anchor('muzzle'|'rod', punta)` para los efectos. Cortas (guanteletes, dagas): 4-8 px. Se leen por silueta a ×1: que sobresalgan del cuerpo.
- **Silueta por clase** a ×1: vanguardia = masa y puños; distancia = una mano con esfera o arma de proyectil; apoyo = vara alta. Distintas por forma, no solo por color.
- **Vida (contra el aspecto de marioneta):** cada fotograma cambia más que el ángulo de los miembros. Poses propias en `POSE` (guardia baja con cambio de peso, torso que respira, puño que oscila, golpes con armado → impacto → recogida), faldón y pelo que reaccionan a la animación, chispas en el fotograma de impacto, cejas distintas al ser golpeado.

## 4. Etapas

Una etapa cambia, en este orden de importancia: **pelo** (largo, color, mechones), **marcas** (cicatriz → líneas luminosas), **ojos** (`IRIS[etapa]`), **ropa** (ondeo) y **escala** (`stageScale`). Ejemplo Tempestarios: 1 gris liso hasta los hombros y cicatriz tenue; 2 plata con 3 mechones violeta y chispas; 3 blanco largo, 5 mechones angulosos y marcas; 4 serena, pelo muy largo en flote ordenado, corona de arcos, párpado a medias, ×1,1. Las etapas altas **añaden** capas de forma (alas, hombreras, corona) en vez de repintar todo. Efectos vivos (`fx.back/front`, `transformFx`): son píxeles sueltos en pantalla, ≤ 2 Hz, sin destello de pantalla completa, y con `c.lite` solo la versión simple.

## 5. Reyes

- Vista frontal y simétrica, pose por parámetros `ctx.kp` (`lean`, `armN/F`, `mouth`, `wing`, `breathe`, `tail`, `glow`, `dx`, `dy`): las 21 animaciones salen del mismo `draw`.
- Siluetas distintas por rey (Kazgorath: cuernos en corona, alas de ceniza, hombreras con pinchos). Las grietas de magma y el color emisivo laten con `kp.glow` (≤ 2 Hz).
- Cuerpo con 4-6 masas grandes con luz (pectorales, hombreras), no un solo bulto; pliegues largos en abdomen y rodillas.
- Coste: ≤ 12 ms por fotograma (Kazgorath ≈ 9 ms). Evita `smooth:true` en tiras largas.

## 6. Qué evitar

- Lo de la spec («Evitar» y 3.5): sin pelo dorado ni erizado en punta, aura de llamas amarillas, ojos turquesa, chaleco o gi con cinturón, cola de mono, nombres de técnicas ajenas. El Relámpago usa **túnica larga con faldones, faja de cuero, solapa de plata, banda frontal, brazaletes con varilla pararrayos y cicatriz ramificada**.
- Mechones que apuntan hacia delante o hacia arriba como pinchos; el pelo de los Tempestarios cae y flota hacia atrás.
- Negro puro o degradados dentro del personaje; más de 5 tonos por material; antialiasing; píxeles sueltos de ruido.
- `Math.random` (usa `ctx.rng`), `document`/`window`, importar algo que no sea `../kit16/*`.
- Cápsulas cortas para bandas, círculos como puños, boca y ojos del mismo tono que la piel.
- Aura de rayos violeta sin ángulos (confunde con Astrales: ellos llevan estrellas y órbitas suaves).

## 7. Comprobación

Visor `http://127.0.0.1:<puerto>/dev/arte16.html` (raza, clase, etapa, variante, animación, zoom, «Comprobar este juego») y `?auto=1` para todo. Criterios: 49 fotogramas + extras, borde con contorno, altura 85-130 % de `build.height × escala`, ≤ 2 ms por fotograma de héroe (Relámpago etapa 4 ≈ 1,6 ms), ≤ 1,6 MB por juego, `python tools/check_arena.py`.

## 8. Decisiones que el usuario debe aprobar

1. Tamaño ≈ 44×60 px (cabeza grande tipo anime atlético) y contorno de 1 px.
2. Diseño del Relámpago: túnica larga con faldones, faja con nudo, puños con guantelete y brazaletes con varilla, pelo gris que pasa a plata y blanco.
3. Pelo hacia atrás y flotante, sin pinchos hacia delante (lo más fácil de confundir con la obra de referencia).
4. Kazgorath frontal, simétrico, ~294 px, alas de ceniza y cuernos en corona.
5. Fulminador y Pararrayos están en primer paso (misma base, esfera de energía y varilla) y se afinan en A-TEM.
