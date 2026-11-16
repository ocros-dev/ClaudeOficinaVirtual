// Personajes en pixel art dibujados en código: sin assets externos.
// La base mide 12×18 (cada fila es una cadena de 12 caracteres; cada carácter es una clave
// de la paleta). El lienzo final mide 16×21: deja 2 px a cada lado y 3 arriba para peinados
// en punta, sombreros y espadas. Los "extras" usan coordenadas de la base (x -2..13, y -3..17).
//   .  transparente   o  contorno   e  ojos     h  pelo     s  piel
//   c  camisa         C  sombra     p  pantalón k  zapatos  w  blanco
//   g  gafas          m  auriculares/máscara    a  accesorio A  sombra del accesorio
//   b  accesorio 2    B  sombra del accesorio 2 n  metal     N  metal oscuro   y  dorado

export const PAD_X = 2, PAD_Y = 3, SPRITE_W = 16, SPRITE_H = 21;

const HEAD = {
  down: [
    '...oooooo...',
    '..ohhhhhho..',
    '.ohhhhhhhho.',
    '.ohssssssho.',
    '.ossessesso.',
    '.osssssssso.',
    '..osssssso..',
    '...oooooo...',
  ],
  up: [
    '...oooooo...',
    '..ohhhhhho..',
    '.ohhhhhhhho.',
    '.ohhhhhhhho.',
    '.ohhhhhhhho.',
    '.oshhhhhhso.',
    '..ohhhhhho..',
    '...oooooo...',
  ],
  right: [
    '...oooooo...',
    '..ohhhhhho..',
    '.ohhhhhhhho.',
    '.ohhhhsssso.',
    '.ohhhssseso.',
    '.ohhsssssso.',
    '..ohsssssso.',
    '...ooooooo..',
  ],
};

const BODY = {
  down: [
    '..occcccco..',
    '.occcccccCo.',
    '.occcccccCo.',
    '.occcccccCo.',
    '.osccccccso.',
  ],
  right: [
    '...occcco...',
    '..occcccCo..',
    '..occcccCo..',
    '..occsccCo..',
    '..occcccCo..',
  ],
};
BODY.up = BODY.down;

// Brazos tecleando (de frente y de espaldas)
const TYPE_DOWN = [
  ['..occcccco..', '.occcccccCo.', '.occcccccCo.', '.osccccccCo.', '.occcccccso.'],
  ['..occcccco..', '.occcccccCo.', '.occcccccCo.', '.occccccsCo.', '.osccccccCo.'],
];
const TYPE_UP = [
  ['..occcccco..', '.occcccccCo.', 'socccccccCo.', '.occcccccCo.', '.occcccccCo.'],
  ['..occcccco..', '.occcccccCo.', '.occcccccCos', '.occcccccCo.', '.occcccccCo.'],
];

const LEGS = {
  down: {
    stand: ['..oppppppo..', '..oppppppo..', '..oppooppo..', '..opo..opo..', '..oko..oko..'],
    a:     ['..oppppppo..', '..oppooppo..', '..opo..opo..', '..opo..oko..', '..oko.......'],
    b:     ['..oppppppo..', '..oppooppo..', '..opo..opo..', '..oko..opo..', '.......oko..'],
  },
  right: {
    stand: ['...oppppo...', '...oppppo...', '....oppo....', '....oppo....', '....okkko...'],
    a:     ['...oppppo...', '...oppppo...', '..opo.opo...', '..opo..opo..', '.oko....okko'],
  },
};
LEGS.right.b = LEGS.right.stand;
LEGS.up = LEGS.down;

// ---- Utilidades para listas de píxeles [x, y, clave] -----------------------
function band(y, x0, x1, k) { const r = []; for (let x = x0; x <= x1; x++) r.push([x, y, k]); return r; }
function px(list, xs, ys, k) { for (const x of xs) for (const y of ys) list.push([x, y, k]); return list; }
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const pts = (k, ...xy) => { const r = []; for (let i = 0; i < xy.length; i += 2) r.push([xy[i], xy[i + 1], k]); return r; };
const same3 = list => ({ down: list, up: list, right: list });

// ---- Accesorios ------------------------------------------------------------
const SWORD_FRONT = [...pts('a', 12, -2, 12, -1, 12, 0), ...band(1, 11, 13, 'k'),
  ...px([], [12], range(2, 14), 'n'), ...px([], [13], range(2, 13), 'N')];
const SWORD_SIDE = [...pts('a', 0, -2, 0, -1, 0, 0), ...band(1, -1, 1, 'k'),
  ...px([], [-1], range(2, 14), 'n'), ...px([], [-2], range(2, 13), 'N')];

const ACCESSORIES = {
  glasses: {
    down:  [[3, 4, 'g'], [5, 4, 'g'], [6, 4, 'g'], [8, 4, 'g']],
    right: [[5, 4, 'g'], [6, 4, 'g'], [7, 4, 'g'], [9, 4, 'g']],
    up: [],
  },
  headset: {
    down:  [...band(0, 3, 8, 'm'), [1, 3, 'm'], [1, 4, 'm'], [10, 3, 'm'], [10, 4, 'm'], [2, 6, 'm'], [3, 6, 'm']],
    right: [...band(0, 3, 8, 'm'), [4, 3, 'm'], [4, 4, 'm'], [5, 4, 'm'], [6, 6, 'm'], [7, 6, 'm']],
    up:    [...band(0, 3, 8, 'm'), [1, 3, 'm'], [1, 4, 'm'], [10, 3, 'm'], [10, 4, 'm']],
  },
  cap: {
    down:  [...band(1, 2, 9, 'a'), ...band(2, 1, 10, 'a'), ...band(3, 1, 10, 'A')],
    right: [...band(1, 2, 9, 'a'), ...band(2, 1, 10, 'a'), ...band(3, 6, 11, 'A')],
    up:    [...band(1, 2, 9, 'a'), ...band(2, 1, 10, 'a'), ...band(3, 1, 10, 'a')],
  },
  beret: {
    down:  [...band(0, 2, 9, 'a'), ...band(1, 1, 10, 'a'), [9, 2, 'A'], [10, 2, 'A']],
    right: [...band(0, 2, 9, 'a'), ...band(1, 1, 10, 'a'), [2, 2, 'A'], [1, 2, 'A']],
    up:    [...band(0, 2, 9, 'a'), ...band(1, 1, 10, 'a')],
  },
  tie: {
    down:  [[5, 8, 'w'], [6, 8, 'w'], [5, 9, 'a'], [6, 9, 'a'], [5, 10, 'a'], [6, 10, 'a'], [5, 11, 'A']],
    right: [], up: [],
  },
  // Bandana ninja: tela (color 2) con placa de metal en la frente
  bandana: {
    down:  [...band(2, 1, 10, 'b'), ...band(2, 4, 7, 'n'), [4, 2, 'N'], [7, 2, 'N']],
    right: [...band(2, 1, 10, 'b'), ...band(2, 6, 9, 'n'), [9, 2, 'N'], [0, 2, 'b'], [-1, 3, 'b'], [-1, 4, 'B']],
    up:    [...band(2, 1, 10, 'b'), [5, 3, 'B'], [6, 3, 'B'], [4, 4, 'b'], [7, 4, 'b'], [4, 5, 'B'], [7, 5, 'B']],
  },
  // Máscara que tapa la boca y la nariz
  mask: {
    down:  [...band(5, 2, 9, 'm'), ...band(6, 3, 8, 'm')],
    right: [...band(5, 4, 10, 'm'), ...band(6, 4, 10, 'm')],
    up: [],
  },
  // Espadón a la espalda (empuñadura del color del accesorio)
  sword: { down: SWORD_FRONT, up: SWORD_FRONT, right: SWORD_SIDE },
  // Sombrero de paja con cinta (color 2)
  strawhat: {
    down:  [...band(-2, 3, 8, 'a'), ...band(-1, 2, 9, 'a'), ...band(0, 2, 9, 'b'), ...band(1, -1, 12, 'a'), [0, 2, 'A'], [11, 2, 'A']],
    right: [...band(-2, 3, 8, 'a'), ...band(-1, 2, 9, 'a'), ...band(0, 2, 9, 'b'), ...band(1, -1, 12, 'a'), [12, 2, 'A']],
    up:    [...band(-2, 3, 8, 'a'), ...band(-1, 2, 9, 'a'), ...band(0, 2, 9, 'b'), ...band(1, -1, 12, 'a')],
  },
  // Gorro puntiagudo de aventurero que cae hacia atrás
  elfcap: {
    down:  [...band(-1, 3, 8, 'a'), ...band(0, 2, 9, 'a'), ...band(1, 2, 9, 'A')],
    right: [...band(-1, 3, 8, 'a'), ...band(0, 2, 9, 'a'), ...band(1, 2, 9, 'A'),
            ...pts('a', 1, 1, 0, 2, -1, 3, -1, 4), ...pts('A', 0, 3, -2, 5)],
    up:    [...band(-1, 3, 8, 'a'), ...band(0, 2, 9, 'a'), ...band(1, 2, 9, 'a'),
            ...px([], [5, 6], range(2, 6), 'A'), [5, 7, 'A']],
  },
  mustache: {
    down:  [...band(5, 3, 8, 'h'), [3, 6, 'h'], [8, 6, 'h']],
    right: [...band(5, 7, 10, 'h'), [10, 6, 'h']],
    up: [],
  },
  // Peto con tirantes del color del pantalón y botones dorados
  overalls: {
    down:  [...pts('p', 3, 8, 8, 8, 3, 9, 8, 9), ...px([], range(3, 8), [10, 11, 12], 'p'), [3, 10, 'y'], [8, 10, 'y']],
    right: [[5, 8, 'p'], [5, 9, 'p'], ...px([], range(4, 7), [10, 11, 12], 'p'), [6, 10, 'y']],
    up:    [...pts('p', 4, 8, 7, 8, 4, 9, 7, 9, 5, 10, 6, 10), ...px([], range(3, 8), [11, 12], 'p')],
  },
  // Cinturón y cuello interior (color 2), al estilo de un uniforme de artes marciales
  belt: {
    down:  [...band(12, 3, 8, 'b'), ...band(8, 5, 6, 'b'), [4, 8, 'b'], [7, 8, 'b']],
    right: [...band(12, 3, 8, 'b'), [7, 8, 'b']],
    up:    [...band(12, 3, 8, 'b')],
  },
  // Armadura blanca con hombreras
  armor: {
    down:  [...px([], range(2, 9), [8, 9, 10], 'w'), [1, 9, 'w'], [10, 9, 'w'], ...band(10, 2, 9, 'n')],
    right: [...px([], range(3, 8), [8, 9, 10], 'w'), ...band(10, 3, 8, 'n')],
    up:    [...px([], range(2, 9), [8, 9, 10], 'w'), [1, 9, 'w'], [10, 9, 'w']],
  },
  // Abrigo largo: faldones del color de la camisa sobre las piernas
  coat: {
    down:  [...px([], [1, 2, 3], range(13, 16), 'c'), ...px([], [8, 9, 10], range(13, 16), 'C')],
    right: [...px([], [1, 2, 3, 4], range(13, 16), 'C'), [3, 12, 'c'], [2, 12, 'c']],
    up:    [...px([], range(1, 10), range(13, 16), 'c'), ...px([], [10], range(13, 16), 'C')],
  },
  // Nubes rojas (color del accesorio) ribeteadas en blanco
  clouds: {
    down:  [...pts('a', 3, 9, 4, 9, 4, 10, 7, 11, 8, 11, 8, 12), ...pts('w', 3, 10, 7, 12)],
    right: [...pts('a', 4, 9, 5, 9, 6, 11, 7, 11), ...pts('w', 4, 10, 6, 12)],
    up:    [...pts('a', 3, 9, 4, 9, 4, 10, 7, 9, 8, 9, 6, 12, 7, 12), ...pts('w', 3, 10, 8, 10)],
  },
  // Cuello marinero (color 2) con lazo (color del accesorio)
  bow: {
    down:  [...band(8, 3, 8, 'b'), [3, 9, 'a'], [4, 9, 'a'], [5, 9, 'A'], [6, 9, 'A'], [7, 9, 'a'], [8, 9, 'a'], [5, 10, 'a'], [6, 10, 'a']],
    right: [...band(8, 4, 7, 'b'), [6, 9, 'a'], [7, 9, 'a'], [7, 10, 'A']],
    up:    [...px([], range(2, 9), [8, 9], 'b'), ...band(10, 3, 8, 'B')],
  },
  // Falda corta (color 2)
  skirt: {
    down:  [...px([], range(1, 10), [13, 14], 'b'), [1, 14, 'B'], [10, 14, 'B'], ...band(13, 2, 9, 'b')],
    right: [...px([], range(2, 9), [13, 14], 'b'), [2, 14, 'B']],
    up:    [...px([], range(1, 10), [13, 14], 'b'), [1, 14, 'B'], [10, 14, 'B']],
  },
};

function compose(head, body, legs) { return [...head, ...body, ...legs]; }

// ---- Peinados -------------------------------------------------------------
// Píxeles extra de pelo por dirección ('h' pelo, 'H' sombra del pelo).
const AFRO = px(px(px([], range(2, 9), [0], 'h'), [0, 11], range(1, 4), 'H'), [1, 10], range(1, 5), 'h');

// Pelo en punta (estilo anime): picos arriba, a los lados y flequillo
const SPIKY_TOP = [...pts('h', 2, -2, 6, -2, 9, -2), ...pts('h', 1, -1, 2, -1, 4, -1, 5, -1, 6, -1, 8, -1, 9, -1),
  ...band(0, 1, 10, 'h'), ...pts('h', 0, 1, 1, 1, 10, 1, 11, 1), ...pts('H', -1, 2, 0, 2, 11, 2, 12, 2, 0, 3, 11, 3)];
const SPIKY = {
  down:  [...SPIKY_TOP, ...pts('h', 3, 3, 5, 3, 7, 3), ...pts('H', -1, 4, 12, 4)],
  up:    [...SPIKY_TOP, ...pts('H', 0, 4, 0, 5, 11, 4, 11, 5, -1, 6, 12, 6)],
  right: [...pts('h', 3, -2, 6, -2, 8, -2), ...pts('h', 2, -1, 3, -1, 5, -1, 6, -1, 8, -1, 9, -1), ...band(0, 1, 10, 'h'),
          ...pts('H', 0, 1, -1, 2, 0, 2, 0, 3, -2, 4, -1, 4, 0, 4, -1, 5), [8, 3, 'h'], [11, 2, 'H']],
};

// Llamarada vertical (pelo muy alto)
const FLAME_TOP = [...pts('h', 5, -3, 6, -3), ...band(-2, 4, 7, 'h'), ...band(-1, 3, 8, 'h'), ...band(0, 2, 9, 'h'),
  ...band(1, 1, 10, 'h'), ...pts('H', 4, -2, 3, -1, 2, 0, 0, 2, 11, 2)];
const FLAME = {
  down:  [...FLAME_TOP, [5, 3, 'h'], [6, 3, 'h']],
  up:    FLAME_TOP,
  right: [...pts('h', 4, -3, 5, -3), ...band(-2, 3, 6, 'h'), ...band(-1, 2, 7, 'h'), ...band(0, 1, 8, 'h'),
          ...pts('H', 3, -2, 2, -1, 1, 0, 0, 2, 0, 3), [9, 3, 'h']],
};

// Dos moños con coletas largas
const BUNS = [...pts('h', 1, -2, 2, -2, 9, -2, 10, -2), ...pts('h', 0, -1, 1, -1, 2, -1, 3, -1, 8, -1, 9, -1, 10, -1, 11, -1),
  ...pts('H', 0, 0, 1, 0, 2, 0, 9, 0, 10, 0, 11, 0)];
const TAILS = [...px([], [0], range(1, 14), 'h'), ...px([], [-1], range(2, 14), 'H'),
  ...px([], [11], range(1, 14), 'h'), ...px([], [12], range(2, 14), 'H')];
const ODANGO = {
  down:  [...BUNS, ...TAILS, [3, 3, 'h'], [8, 3, 'h']],
  up:    [...BUNS, ...TAILS, ...px([], range(1, 10), [5, 6], 'h')],
  right: [...pts('h', 2, -2, 3, -2, 1, -1, 2, -1, 3, -1, 4, -1), ...pts('H', 1, 0, 2, 0, 3, 0),
          ...px([], [0], range(1, 14), 'h'), ...px([], [-1], range(2, 14), 'H')],
};

export const HAIR_STYLES = {
  corto:   { label: 'corto',   extras: { down: [], up: [], right: [] } },
  largo:   { label: 'largo',   extras: {
    down:  px(px([], [1, 10], range(3, 10), 'h'), [0, 11], range(4, 9), 'H'),
    up:    px(px([], range(2, 9), range(5, 10), 'h'), [1, 10], range(4, 10), 'H'),
    right: px(px([], [1, 2, 3], range(3, 10), 'h'), [0], range(4, 9), 'H'),
  } },
  coleta:  { label: 'coleta', extras: {
    down:  [[0, 3, 'H'], [0, 4, 'H']],
    up:    [[5, 7, 'h'], [6, 7, 'h'], [5, 8, 'h'], [6, 8, 'H'], [5, 9, 'H']],
    right: [[0, 3, 'H'], [0, 4, 'h'], [0, 5, 'h'], [0, 6, 'H'], [1, 7, 'H']],
  } },
  rizado:  { label: 'rizado', extras: same3(AFRO) },
  calvo:   { label: 'calvo',  bald: true, extras: { down: [], up: [], right: [] } },
  puntas:  { label: 'en punta', extras: SPIKY },
  llama:   { label: 'llamarada', extras: FLAME },
  odango:  { label: 'moños', extras: ODANGO },
};

function styleHead(head, style) {
  if (!HAIR_STYLES[style] || !HAIR_STYLES[style].bald) return head;
  return head.map(r => r.replace(/h/g, 's'));
}

export const ACCESSORY_LIST = [
  { id: 'glasses', label: 'gafas' }, { id: 'headset', label: 'auriculares' }, { id: 'cap', label: 'gorra', hat: true },
  { id: 'beret', label: 'boina', hat: true }, { id: 'tie', label: 'corbata' },
  { id: 'strawhat', label: 'sombrero de paja', hat: true }, { id: 'elfcap', label: 'gorro puntiagudo', hat: true },
  { id: 'bandana', label: 'bandana ninja' }, { id: 'mask', label: 'máscara' }, { id: 'mustache', label: 'bigote' },
  { id: 'sword', label: 'espadón' }, { id: 'belt', label: 'cinturón' }, { id: 'armor', label: 'armadura' },
  { id: 'coat', label: 'abrigo largo' }, { id: 'clouds', label: 'nubes' }, { id: 'overalls', label: 'peto' },
  { id: 'bow', label: 'lazo marinero' }, { id: 'skirt', label: 'falda' },
];

// Pinta la base (12×18) desplazada dentro del lienzo de 16×21, aplica los extras y
// les añade contorno donde tocan una zona transparente.
function paint(rows, pal, extras, mirror) {
  const grid = Array.from({ length: SPRITE_H }, () => Array(SPRITE_W).fill('.'));
  rows.forEach((r, y) => [...r].forEach((k, x) => { grid[y + PAD_Y][x + PAD_X] = k; }));
  const painted = [];
  for (const [x, y, k] of extras) {
    const gx = x + PAD_X, gy = y + PAD_Y;
    if (gy < 0 || gy >= SPRITE_H || gx < 0 || gx >= SPRITE_W) continue;
    grid[gy][gx] = k;
    painted.push([gx, gy]);
  }
  for (const [x, y] of painted) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const row = grid[y + dy];
      if (row && row[x + dx] === '.') row[x + dx] = 'o';
    }
  }
  const c = document.createElement('canvas');
  c.width = SPRITE_W; c.height = SPRITE_H;
  const g = c.getContext('2d');
  grid.forEach((row, y) => row.forEach((k, x) => {
    if (k === '.' || !pal[k]) return;
    g.fillStyle = pal[k];
    g.fillRect(mirror ? SPRITE_W - 1 - x : x, y, 1, 1);
  }));
  return c;
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

// Genera todos los fotogramas de un personaje.
// look = { shirt, hair, hairStyle, skin, pants, shoes, eyes, accessory: [..], accent, accent2 }
export function makeCharacter(look) {
  const accent = look.accent || '#c03030', accent2 = look.accent2 || '#2a3a8a';
  const pal = {
    o: '#1b1426', e: look.eyes || '#1b1426', w: '#f4f4f4',
    h: look.hair, H: shade(look.hair, -35), s: look.skin, c: look.shirt, C: shade(look.shirt, -40),
    p: look.pants, k: look.shoes || '#2a1a14', g: '#101018', m: '#2e2e3a',
    a: accent, A: shade(accent, -45), b: accent2, B: shade(accent2, -40),
    n: '#c8ccd6', N: '#8a90a0', y: '#f5d442',
  };
  const style = HAIR_STYLES[look.hairStyle] ? look.hairStyle : 'corto';
  const accs = [].concat(look.accessory || []);
  // Primero el peinado y encima los accesorios (un sombrero tapa el pelo)
  const extrasFor = dir => [...HAIR_STYLES[style].extras[dir],
    ...accs.flatMap(a => (ACCESSORIES[a] && ACCESSORIES[a][dir]) || [])];
  const head = dir => styleHead(HEAD[dir], style);

  const frames = {};
  for (const dir of ['down', 'up', 'right']) {
    const legs = LEGS[dir];
    frames[dir] = ['stand', 'a', 'b'].reduce((o, ph) => {
      o[ph] = paint(compose(head(dir), BODY[dir], legs[ph]), pal, extrasFor(dir), false);
      return o;
    }, {});
  }
  frames.left = {};
  for (const ph of ['stand', 'a', 'b'])
    frames.left[ph] = paint(compose(head('right'), BODY.right, LEGS.right[ph]), pal, extrasFor('right'), true);

  const legsHidden = LEGS.down.stand;
  frames.typeDown = TYPE_DOWN.map(b => paint(compose(head('down'), b, legsHidden), pal, extrasFor('down'), false));
  frames.typeUp = TYPE_UP.map(b => paint(compose(head('up'), b, legsHidden), pal, extrasFor('up'), false));
  return frames;
}
