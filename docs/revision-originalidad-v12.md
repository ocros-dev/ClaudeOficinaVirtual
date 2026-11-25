# Revisión de originalidad del plantel (v1.2)

Alcance: hojas de `docs/estilo/` (Tempestarios, 8 razas, 4 reyes, secuaces, élites y capturas de combate), textos de `public/js/arena/races.js` y movimientos de `combat/moves/*.js` y `combat/kings/*.js`.
Referencia: lista «Evitar» de `docs/arena-spec.md` (apartados Legal y 3.5) y regla de CLAUDE.md.
Aviso: es una revisión de producto hecha a ojo sobre capturas, no asesoría legal. Las capturas son de tamaño reducido; conviene repasar los sprites a zoom 4x tras los cambios.

Veredictos: **OK** (publicable), **revisar** (riesgo bajo o medio, ajuste recomendado), **cambiar** (obligatorio antes de publicar).
Responsables: `ux-designer` para arte en `art/**` y hojas de estilo; `frontend-expert` para textos (`races.js`) y coreografía (`combat/**`).

## Hallazgo principal

Los Tempestarios no usan ningún elemento literal de Dragon Ball (no hay pelo dorado, aura amarilla, cola ni gi naranja), y eso está bien. Pero **la combinación** sí evoca a varias obras a la vez, y es lo que un fan notaría:

| Rasgo de los Tempestarios | Evoca a |
|---|---|
| Pelo blanco/plateado, expresión serena y párpados a medias en la etapa 4, con aura contenida | Ultra Instinto (Dragon Ball Super): pelo plateado, calma, ojos entrecerrados |
| Pelo blanco en punta con rayos eléctricos y velocidad extrema (teletransporte con imágenes residuales) | Killua en modo «Relámpago» (Hunter x Hunter) y Gojo (Jujutsu Kaisen) por el pelo blanco |
| Pelo plateado largo, abrigo azul oscuro y cinturón marrón | Sephiroth (Final Fantasy) y Trunks (Dragon Ball) por pelo claro más chaqueta azul |
| Pelo que se vuelve más claro y en punta al subir de etapa, con transformación por rayo | Escalera de Super Saiyan |
| Teletransporte con estela, combos de puños, patada voladora y rayo recto cargado con anillo | Teletransporte instantáneo de Dragon Ball, shunpo (Bleach), shunshin (Naruto) y Kamehameha |

Ningún rasgo aislado es protegible, pero **juntos** (pelo blanco, aura eléctrica, calma final, velocidad) forman la silueta de un personaje conocido. Hay que romper la combinación en al menos tres puntos, no solo uno.

## Tempestarios (raza 9)

| Elemento | Veredicto | Motivo | Cambio propuesto | Archivo / agente |
|---|---|---|---|---|
| Nombre de la raza «Tempestarios», lugar «Cumbres del Estruendo» | OK | Inventado, sin parecido con obras conocidas. | Ninguno. | `races.js` / frontend-expert |
| Clases «Relámpago», «Fulminador», «Pararrayos» | OK | Términos genéricos de tormenta. | Ninguno. | `races.js` / frontend-expert |
| Nombres de etapas «Calma Previa», «Chispa Viva», «Tormenta Desatada», «Ojo de la Tormenta» | OK | No usan «Super», «Modo», «Instinto» ni «Bankai». | Ninguno. | `races.js` / frontend-expert |
| Gritos «¡Se carga el cielo!», «¡Que truene el cielo entero!», «Ya no hay tormenta… solo yo.» | OK | Frases propias, no son emblema de ninguna obra. La tercera es serena y no es un grito de carga. | Ninguno. | `races.js` / frontend-expert |
| Pelo etapas 3 y 4: blanco plata, largo, con mechones violeta | **cambiar** | Etapa 4 (serena, plateada, párpados a medias, aura contenida) es lo más cercano a Ultra Instinto de toda la plantilla. Etapas 2 y 3 (blanco en punta con electricidad) recuerdan a Killua y a Gojo. | Abandonar el blanco y el plateado como color final. Propuesta: el pelo **oscurece** al crecer. Etapa 1 pelo gris pizarra, etapa 2 índigo con puntas violeta, etapa 3 azul noche con mechones eléctricos violeta, etapa 4 negro azulado con flequillo luminoso lavanda. Así también se invierte la lógica «más claro igual a más fuerte» de Super Saiyan. | `art/races/tempestarios.js`, `docs/estilo/tempestarios-clases-final.png`, `relampago-*.png` / ux-designer |
| Etapa 4: ojos y expresión | **cambiar** | «Párpados a medias, blanco-lavanda» más pelo plateado y aura contenida es la firma de Ultra Instinto. | Ojos abiertos y atentos, iris lavanda con pupila visible; mirada al frente, sin entrecerrar. La serenidad se expresa con la pose (hombros bajos, manos abiertas) y la corona de arcos, no con párpados caídos. | `art/races/tempestarios.js` / ux-designer |
| Pelo en punta sobre la coronilla (etapas 2 y 3, se ve en `relampago-transformacion.png` y en las capturas de combate) | **cambiar** | Los picos hacia arriba en la coronilla acercan la silueta al pelo erizado de Super Saiyan y de Killua. La spec 3.5 pide «pelo largo caído». | Sin picos hacia arriba: el pelo nace hacia atrás y cae. El volumen se logra con longitud, no con puntas verticales. Añadir **banda frontal** (la spec 3.5 la menciona y no se ve en el arte). | `art/races/tempestarios.js` / ux-designer |
| Atuendo: chaqueta y pantalón azul oscuro con cinturón marrón y botas | revisar | Con pelo claro recuerda a Trunks y a Sephiroth. Con el pelo oscuro el riesgo baja, pero conviene diferenciarlo. | Cambiar a túnica larga de dos colores (carbón y ocre apagado) con hombrera asimétrica de una sola pieza y brazaletes metálicos visibles (la spec 3.5 los menciona). Evitar el azul marino liso. | `art/races/tempestarios.js` / ux-designer |
| Cicatriz-rayo en el rostro y marcas luminosas | OK | Genérico. Verificar que no se acerque a la cicatriz de Harry Potter (frente, en zigzag). | Colocarla en la mejilla o el cuello, no en la frente. Las marcas luminosas de la etapa 4 «cubren la frente»: pasarlas a sienes y antebrazos. | `art/races/tempestarios.js` / ux-designer |
| Aura de rayos ramificados violeta | OK | Angulosa, no de llamas ni amarilla. | Ninguno. | `art/races/tempestarios.js` |
| Clase Fulminador: brazo con guantelete y esfera violeta en la palma | revisar | Pose con esfera de energía en la mano extendida recuerda a Kamehameha y al Rasengan. | Que la esfera orbite sobre el guantelete en lugar de sostenerse en la palma, o sustituirla por una descarga que sale del propio guantelete. | `art/races/tempestarios.js` / ux-designer |
| Clase Pararrayos: bastón largo con remate de varilla | OK | Genérico. | Ninguno. | — |
| Coreografía: teletransporte con imágenes residuales, combo de puños y patada voladora | revisar | El conjunto «aparece detrás, combo, patada voladora» es el esquema clásico de Dragon Ball. No hay nombres ni gritos, así que el riesgo es bajo. | Variar en etapa 3: sustituir un teletransporte por un **arco de rayo que recorre el suelo** y el combo por golpes con el antebrazo y rodillazos. En etapa 4, evitar la secuencia «aparece detrás, un golpe, trueno»: usar un solo paso adelante y un golpe palma abierta. | `combat/moves/tempestarios.js` / frontend-expert |
| Rayo grande: carga de 0,6 s con anillo y haz recto | revisar | Parecido genérico a Kamehameha. Mantener sin gesto de manos juntas a la cadera ni grito. | Confirmar que la pose de carga no sea «manos a la cadera». Cargar con el bastón o con los brazos abiertos. Mantener sin voz. | `combat/moves/tempestarios.js`, `art/races/tempestarios.js` / frontend-expert y ux-designer |
| Spec 3.5: «el pelo plateado/blanco largo… son rasgos genéricos» | **cambiar** (documento) | Esa frase da por bueno justo lo que genera el parecido. | Reescribir 3.5 para prohibir pelo plateado/blanco en cualquier etapa y pelo más claro al subir de nivel, y añadir Ultra Instinto, Killua y Sephiroth como referencias a evitar. | `docs/arena-spec.md` / product-owner |

## Otras razas

| Elemento | Veredicto | Motivo | Cambio propuesto | Archivo / agente |
|---|---|---|---|---|
| Humanos: nombres, clases, etapas, gritos («¡Por el alba!», «¡Que el sol nos guíe!») | OK | Genéricos. | Ninguno. | `races.js` |
| Humanos etapa 3: armadura dorada y ráfaga radial dorada detrás de la cabeza, más aro sobre la cabeza | revisar | El aro sobre la cabeza es el signo de «muerto» en Dragon Ball y de santo en otras obras. La ráfaga dorada radial acerca a aura dorada. | Sustituir el aro por una corona o diadema sólida; la ráfaga dorada, por rayos de luz más largos y finos, en blanco cálido. | `art/races/humanos.js` / ux-designer |
| Humanos: caballera con coleta, hechicero de túnica azul con cristal, sanadora blanca con báculo | OK | Arquetipos genéricos de rol. | Ninguno. | — |
| Elfos: nombres, clases, gritos («¡El bosque despierta!») | OK | Genéricos. | Ninguno. | `races.js` |
| Elfos: orejas, arco, capa verde, pelo rubio largo | revisar | Rubio largo con arco y verde tira a Legolas. La spec ya pide orejas no idénticas a las de sagas famosas. | Orejas más cortas y hacia abajo, o con una muesca ornamental. Cambiar el rubio de la variante A por castaño cobrizo o ceniza oscura. | `art/races/elfos.js` / ux-designer |
| Elfos variante B: pelo blanco plateado con ropa azul-verdosa | revisar | Pelo blanco más aura de rama evoca a Sephiroth o a Legolas, según el ángulo. Es de bajo riesgo. | Pelo gris azulado oscuro o malva en la variante B. | `art/races/elfos.js` / ux-designer |
| Enanos: martillo, barbas, tonos naranja y gris | OK | Arquetipo de fantasía muy general, sin rasgos de marca. | Ninguno. | — |
| Orcos: piel pardo-rojiza, colmillos, cresta roja, huesos | OK | La spec pedía evitar piel verde y colmillos de franquicias de rol. Aquí la piel es parda y el estilo es propio. Los hocicos con aire de jabalí diferencian. | Ninguno. | — |
| Orcos: clases «Berserker», «Cazador», «Chamán» | OK | Términos genéricos de rol. | Ninguno. | `races.js` |
| Gnomos: gafas de aviador, mochila, mechas, tonos turquesa y bronce | OK | Estética steampunk genérica. | Ninguno. | — |
| Bestiales: oso guardián, zorra de cola mullida, ciervo sanador con aro y cornamenta | revisar | Zorra con cola mullida es un tropo común. Riesgo si se añaden más colas por etapa (Naruto). El ciervo con aro recuerda al Dios Ciervo de Mononoke. | Mantener **una sola cola** en todas las etapas, sin ojos rasgados rojos ni manto de energía. Cambiar el aro del ciervo por una luna creciente. | `art/races/bestiales.js` / ux-designer |
| Draconios: lagartos rosa y azul, cuernos, cola larga, alas por etapa | OK | Diseño propio; rosa y azul alejan de dragones conocidos. | Ninguno. | — |
| Astrales: monjes de ropa índigo con aros dorados orbitando | OK | Diseño propio. Los halos finos son aros orbitales, no un aro sobre la cabeza. | Ninguno. | — |
| Astrales, humanos y demás: gritos y nombres de etapa («Constelación Naciente», «Corazón de Volcán», «Furia Ancestral», «Sangre de Dragón») | OK | Todos son frases propias. No coinciden con nombres de transformaciones de las series. «Furia Ancestral» y «Sangre de Dragón» son genéricos. | Ninguno. | `races.js` |
| Gnomos: grito «¡Modo máquina total!» | revisar | La palabra «modo» más intensificador recuerda a «modo sabio» o «modo Kyubi». Riesgo muy bajo. | «¡Engranajes a tope!» | `races.js` / frontend-expert |

## Reyes Demonio, secuaces y élites

| Elemento | Veredicto | Motivo | Cambio propuesto | Archivo / agente |
|---|---|---|---|---|
| Kazgorath (arte): demonio rojo, cuernos, alas de murciélago, hombreras con pinchos, orbe en el cinturón | OK | Arquetipo de demonio. La forma 3 con corona de pinchos naranjas es propia. Evitar que la tripa/cinturón con orbe se acerque a un villano concreto. | Ninguno. | — |
| Kazgorath (nombre y título) | revisar | Suena como nombres de demonios de varios juegos (Kazzak de WoW, entre otros). Hay que buscarlo antes de publicar. | Búsqueda en tiendas de apps y en bases de datos de marcas. Alternativa: «Kharuun». | `races.js` / frontend-expert |
| Vhel-Morkai (arte): cuerpo azul con tentáculos, corona coral, ojos turquesa, mandíbula con dientes | OK | Diseño propio. | Ninguno. | — |
| Vhel-Morkai (nombre) | revisar | «Morkai» es el nombre de un personaje de Warhammer 40.000 (Space Wolves). El guion y el apellido lo separan, pero es preferible evitarlo. | Cambiar a «Vhel-Moruun» o «Vhel-Orkai». | `races.js` / frontend-expert |
| Ysgrim (arte): encapuchado esquelético con ojos blancos y cristales de hielo | OK | Diseño propio. | Ninguno. | — |
| Ysgrim (nombre) | revisar | Se parece a «Ysgramor», héroe de Skyrim (Elder Scrolls). | Cambiar a «Ysgrath» o «Ysmerim». | `races.js` / frontend-expert |
| Tzar-Nuul (arte): mosca gigante verde con panza hinchada y ojos rojos | OK | Diseño propio. Recuerda de lejos a Nurgle y a Belcebú, ambos géneros. | Ninguno. | — |
| Tzar-Nuul (nombre) | OK | «Tzar» es un título histórico; «Nuul» no coincide con un personaje conocido. | Ninguno. | — |
| Títulos «Rey Demonio de las Brasas / del Abismo / de la Escarcha Negra / de la Plaga» | OK | «Rey Demonio» es un término genérico del género. | Ninguno. | `races.js` |
| Gritos de los reyes («¡El fuego es mi aliento!», «¡Las profundidades os reclaman!», «¡Mi enjambre es infinito!», etc.) | OK | Frases propias. | Ninguno. | `races.js` |
| Secuaces: diablillo con tridente, murciélago, sombra rastrera, ojo flotante | OK | Arquetipos genéricos. El ojo con tentáculos y alas se parece a un «contemplador» de D&D; bajo riesgo. | Opcional: quitar los tentáculos del ojo para alejarlo del beholder. | `art/enemies/minions.js` / ux-designer |
| Élites: Verdugo (minotauro con hacha), Brujo infernal (esqueleto con capa y báculo), Cancerbero (perro de tres cabezas), Heraldo alado (cuerno y capa) | OK | Arquetipos de mitología y fantasía de dominio público. | Ninguno. | `art/enemies/elites.js` |

## Textos de combate y campamento

| Elemento | Veredicto | Motivo | Cambio propuesto | Archivo / agente |
|---|---|---|---|---|
| Nombres de técnicas en `combat/moves/*.js` y `combat/kings/*.js` | OK | No hay nombres de técnica: el código solo usa claves técnicas (`probe`, `combo`, `beam`, `finisher`, `team`). El comentario «Tormenta de Cumbre» (equipo Tempestarios) es propio. | Si se muestra el nombre de la técnica en pantalla, que sean nombres propios como este. Prohibidos: Kamehameha, Rasengan, Cero, Chidori, Gear, etc. | `combat/moves/*.js` / frontend-expert |
| Frases del campamento («¡Muy lento!», «¡Ni lo vi!», «¡Zas!», «Om…») | OK | Genéricas. | Ninguno. | `camp/acts.js` |
| Equivalentes de «Nen», «Bankai», «Gear», «Instinto», «Saiyan» en cualquier texto | OK | Búsqueda sin coincidencias en `races.js` y en `combat/**`. | Repetir la búsqueda en CI o antes de cada versión. | — |

## Qué hay que cambiar sí o sí

1. **Tempestarios, pelo y etapa 4** (ux-designer): abandonar el pelo blanco/plateado; que el pelo oscurezca al subir de etapa; quitar los picos hacia arriba; ojos abiertos en la etapa final.
2. **Tempestarios, atuendo y marcas** (ux-designer): salir del azul marino con cinturón marrón; añadir la banda frontal y los brazaletes de la spec; cicatriz y marcas fuera de la frente.
3. **Spec 3.5** (product-owner): reescribir para prohibir pelo plateado/blanco y la lógica «más claro igual a más fuerte».
4. **Nombres de reyes** (frontend-expert, con mi visto bueno): cambiar «Vhel-Morkai» (Warhammer) y «Ysgrim» (Skyrim); buscar «Kazgorath» antes de publicar.

Recomendado, no bloqueante: aro de la etapa 3 de los humanos, esfera en la palma del Fulminador, orejas y rubio de los elfos, una sola cola en la zorra, y variar la coreografía de los Tempestarios.

## Pendiente tras los cambios

- Regenerar las hojas de `docs/estilo/` y repasarlas a zoom 4x.
- Revisar de nuevo las capturas de combate `mv1-tempestarios-*` (junto al pelo, la silueta entera en movimiento).
- Firma del product-owner en la HU-9 solo cuando los puntos 1 a 4 estén resueltos.
