// Metadatos de las 9 razas, los 4 reyes y los enemigos de la arena. Solo datos: nada de dibujo.
// (El arte de cada raza vive en art/races/<id>.js y los movimientos en combat/moves/<id>.js.)
// Las reglas (rules.js) usan estos datos sin importar nada de art/ ni de combat/.

export const ROLES = ['vanguardia', 'distancia o magia', 'apoyo'];

// stages: etapas de la raza con el poder necesario y el multiplicador de daño. Las 8 razas originales tienen 3 etapas y
// los Tempestarios 4 (umbrales más tempranos para que su crecimiento se note).
const S3 = names => names.map((n, i) => ({ n, power: [0, 10, 25][i], mult: [1, 1.5, 2][i] }));
const cls = (...list) => list.map(([n, kind, color]) => ({ n, hit: [kind, color] }));

// Las 8 originales mantienen su orden: hash(nombre) mod 8 indexa solo sobre ellas, así que no se reasigna a nadie.
export const RACES = [
  { id: 'humanos', name: 'Humanos', place: 'Reino del Alba', emblem: ['☀', '☼'], color: '#e8b830', roles: ['product-owner'],
    cls: cls(['Caballera', 'slash', '#ffe08a'], ['Hechicero', 'bolt', '#7ad8ff'], ['Sanadora', 'beam', '#fff2c0']),
    stages: S3(['Formación', 'Alba Encendida', 'Gloria del Mediodía']), shouts: ['¡Por el alba!', '¡Que el sol nos guíe!'] },
  { id: 'elfos', name: 'Elfos', place: 'Silvanos del Umbral Verde', emblem: ['🍃', '🌿'], color: '#2f8a5a', roles: ['frontend-expert', 'ux-designer'],
    cls: cls(['Danzante de hojas', 'slash', '#a0ffc0'], ['Arquera', 'arrow', '#e8e0c8'], ['Druida', 'beam', '#ffb0d8']),
    stages: S3(['Formación', 'Savia Despierta', 'Bosque Eterno']), shouts: ['¡El bosque despierta!', '¡Raíces y cielo, uníos!'] },
  { id: 'enanos', name: 'Enanos', place: 'Clanes de la Forja', emblem: ['⚒', '🔨'], color: '#c8602a', roles: ['backend-expert', 'devops-engineer'],
    cls: cls(['Martillador', 'slash', '#ffd0a0'], ['Artillero', 'shot', '#ffb02a'], ['Rúnico', 'beam', '#5ac8ff']),
    stages: S3(['Formación', 'Forja Encendida', 'Corazón de Volcán']), shouts: ['¡A golpe de yunque!', '¡Que arda la montaña!'] },
  { id: 'orcos', name: 'Orcos', place: 'Tribus del Colmillo', emblem: ['🦷', '🪓'], color: '#a8704a', roles: ['security-expert', 'qa-engineer'],
    cls: cls(['Berserker', 'slash', '#ffffff'], ['Cazador', 'jav', '#e8dcc0'], ['Chamán', 'beam', '#7ad8ff']),
    stages: S3(['Formación', 'Sangre Hirviente', 'Furia Ancestral']), shouts: ['¡Colmillos fuera!', '¡Los ancestros rugen!'] },
  { id: 'gnomos', name: 'Gnomos', place: 'Taller del Engranaje', emblem: ['⚙', '🔧'], color: '#2ab0b0', roles: ['data-engineer', 'postgres-dba'],
    cls: cls(['Piloto de mecha', 'slash', '#9ae8e8'], ['Artífice', 'shot', '#2ab0b0'], ['Alquimista', 'beam', '#ff7ab0']),
    stages: S3(['Formación', 'Engranaje Vivo', 'Maquinaria Maestra']), shouts: ['¡Ajustando piezas!', '¡Modo máquina total!'] },
  { id: 'bestiales', name: 'Bestiales', place: 'Manada de la Luna', emblem: ['🌙', '🐾'], color: '#5a9aff', roles: ['explore', 'mobile-developer'],
    cls: cls(['Oso guardián', 'slash', '#d8d8e0'], ['Zorra ilusionista', 'star', '#bca8ff'], ['Ciervo-sanador', 'beam', '#bcd8ff']),
    stages: S3(['Formación', 'Llamada de la Manada', 'Espíritu de Luna Llena']), shouts: ['¡La manada llama!', '¡Que aúlle la luna!'] },
  { id: 'draconios', name: 'Draconios', place: 'Linaje de Escamas', emblem: ['🐉', '🔥'], color: '#c8306e', roles: ['software-architect', 'plan'],
    cls: cls(['Lancero dracónico', 'slash', '#ffe08a'], ['Aliento-mago', 'breath', '#7ae8ff'], ['Sacerdotisa de escamas', 'beam', '#fff2c0']),
    stages: S3(['Formación', 'Escama Ardiente', 'Sangre de Dragón']), shouts: ['¡Arde, escama!', '¡Despierta, sangre antigua!'] },
  { id: 'astrales', name: 'Astrales', place: 'Hijos del Cielo Nocturno', emblem: ['★', '✦'], color: '#6a4ac8', roles: ['general-purpose'],
    cls: cls(['Guardián estelar', 'slash', '#fff2c0'], ['Astróloga', 'star', '#fff2c0'], ['Monje lunar', 'beam', '#bfe8ff']),
    stages: S3(['Formación', 'Constelación Naciente', 'Firmamento Pleno']), shouts: ['¡Las estrellas se alinean!', '¡Todo el cielo en nosotros!'] },
  // Raza 9: carga que crece en 4 etapas; la última es la más serena (spec 3.3)
  { id: 'tempestarios', name: 'Tempestarios', place: 'Cumbres del Estruendo', emblem: ['⚡', '🌩'], color: '#8a4aff', roles: ['claude'],
    cls: cls(['Relámpago', 'spark', '#d8c4ff'], ['Fulminador', 'bolt', '#b890ff'], ['Pararrayos', 'beam', '#e0d0ff']),
    stages: [{ n: 'Calma Previa', power: 0, mult: 1 }, { n: 'Chispa Viva', power: 8, mult: 1.5 },
             { n: 'Tormenta Desatada', power: 20, mult: 2 }, { n: 'Ojo de la Tormenta', power: 40, mult: 2.5 }],
    shouts: ['¡Se carga el cielo!', '¡Que truene el cielo entero!', 'Ya no hay tormenta… solo yo.'] },
];
export const HASH_RACES = RACES.slice(0, 8);        // la asignación por hash solo recorre las 8 originales
export const RACE_BY_ID = Object.fromEntries(RACES.map(r => [r.id, r]));
const ROLE_RACE = Object.fromEntries(RACES.flatMap(r => r.roles.map(role => [role, r.id])));
// Raza de un rol conocido (sin distinguir mayúsculas) o undefined
export const raceForRole = role => ROLE_RACE[String(role || '').toLowerCase()];

// ---- Reyes Demonio ------------------------------------------------------------------------------------
// color: color del rey; glow: color con el que se tiñen secuaces, élites y efectos; appear: de dónde surge.
export const KINGS = [
  { id: 'kazgorath', name: 'Kazgorath', title: 'Rey Demonio de las Brasas', color: '#ff6a1a', glow: '#ff6a1a', appear: 'rise',
    shouts: ['¡El fuego es mi aliento!', '¡Arded todos en mi trono!'] },
  { id: 'vhel', name: 'Vhel-Morkai', title: 'Rey Demonio del Abismo', color: '#2ab0d0', glow: '#7affe0', appear: 'rise',
    shouts: ['¡Las profundidades os reclaman!', '¡Ahogaos en la marea negra!'] },
  { id: 'ysgrim', name: 'Ysgrim', title: 'Rey Demonio de la Escarcha Negra', color: '#9ab0ff', glow: '#9ab0ff', appear: 'descend',
    shouts: ['¡Que el invierno os congele el alma!', '¡Noche eterna, cae!'] },
  { id: 'tzar', name: 'Tzar-Nuul', title: 'Rey Demonio de la Plaga', color: '#b8c83a', glow: '#d8e060', appear: 'rise',
    shouts: ['¡Mi enjambre es infinito!', '¡Pudríos bajo mi reinado!'] },
];
export const KING_BY_ID = Object.fromEntries(KINGS.map(k => [k.id, k]));

// ---- Enemigos ---------------------------------------------------------------------------------------------
export const MINIONS = [
  { id: 'diablillo', name: 'Diablillo' }, { id: 'murcielago', name: 'Murciélago infernal' },
  { id: 'sombra', name: 'Sombra rastrera' }, { id: 'ojo', name: 'Ojo flotante' },
];
export const ELITES = [
  { id: 'verdugo', name: 'Verdugo' }, { id: 'brujo', name: 'Brujo infernal' },
  { id: 'cancerbero', name: 'Cancerbero' }, { id: 'heraldo', name: 'Heraldo alado' },
];
