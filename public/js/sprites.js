// Personajes en pixel art (12×18) dibujados en código: sin assets externos.
// Cada fila es una cadena de 12 caracteres; cada carácter es una clave de la paleta.
//   .  transparente   o  contorno   e  ojos     h  pelo     s  piel
//   c  camisa         C  sombra     p  pantalón k  zapatos  w  blanco
//   g  gafas          m  auriculares a  accesorio A  sombra del accesorio

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

// Accesorios por rol: listas de [x, y, clave] por dirección
function band(y, x0, x1, k) { const r = []; for (let x = x0; x <= x1; x++) r.push([x, y, k]); return r; }
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
};

function compose(head, body, legs) { return [...head, ...body, ...legs]; }

// ---- Peinados -------------------------------------------------------------
// Píxeles extra de pelo por dirección ('h' pelo, 'H' sombra del pelo).
function px(list, xs, ys, k) { for (const x of xs) for (const y of ys) list.push([x, y, k]); return list; }
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const AFRO = px(px(px([], range(2, 9), [0], 'h'), [0, 11], range(1, 4), 'H'), [1, 10], range(1, 5), 'h');
export const HAIR_STYLES = {
  corto:  { label: 'corto',  extras: { down: [], up: [], right: [] } },
  largo:  { label: 'largo',  extras: {
    down:  px(px([], [1, 10], range(3, 10), 'h'), [0, 11], range(4, 9), 'H'),
    up:    px(px([], range(2, 9), range(5, 10), 'h'), [1, 10], range(4, 10), 'H'),
    right: px(px([], [1, 2, 3], range(3, 10), 'h'), [0], range(4, 9), 'H'),
  } },
  coleta: { label: 'coleta', extras: {
    down:  [[0, 3, 'H'], [0, 4, 'H']],
    up:    [[5, 7, 'h'], [6, 7, 'h'], [5, 8, 'h'], [6, 8, 'H'], [5, 9, 'H']],
    right: [[0, 3, 'H'], [0, 4, 'h'], [0, 5, 'h'], [0, 6, 'H'], [1, 7, 'H']],
  } },
  rizado: { label: 'rizado', extras: { down: AFRO, up: AFRO, right: AFRO } },
  calvo:  { label: 'calvo',  bald: true, extras: { down: [], up: [], right: [] } },
};

function styleHead(head, style) {
  if (!HAIR_STYLES[style] || !HAIR_STYLES[style].bald) return head;
  return head.map(r => r.replace(/h/g, 's'));
}

export const ACCESSORY_LIST = [
  { id: 'glasses', label: 'gafas' }, { id: 'headset', label: 'auriculares' }, { id: 'cap', label: 'gorra', hat: true },
  { id: 'beret', label: 'boina', hat: true }, { id: 'tie', label: 'corbata' },
];

function paint(rows, pal, extras, mirror) {
  const c = document.createElement('canvas');
  c.width = 12; c.height = 18;
  const g = c.getContext('2d');
  const grid = rows.map(r => r.split(''));
  for (const [x, y, k] of extras) if (grid[y] && grid[y][x] !== undefined) grid[y][x] = k;
  grid.forEach((row, y) => row.forEach((k, x) => {
    if (k === '.' || !pal[k]) return;
    g.fillStyle = pal[k];
    g.fillRect(mirror ? 11 - x : x, y, 1, 1);
  }));
  return c;
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

// Genera todos los fotogramas de un personaje.
// look = { shirt, hair, hairStyle, skin, pants, shoes, accessory: [..], accent }
export function makeCharacter(look) {
  const pal = {
    o: '#1b1426', e: '#1b1426', w: '#f4f4f4',
    h: look.hair, H: shade(look.hair, -35), s: look.skin, c: look.shirt, C: shade(look.shirt, -40),
    p: look.pants, k: look.shoes || '#2a1a14', g: '#101018', m: '#2e2e3a',
    a: look.accent || '#c03030', A: shade(look.accent || '#c03030', -45),
  };
  const style = HAIR_STYLES[look.hairStyle] ? look.hairStyle : 'corto';
  const accs = [].concat(look.accessory || []);
  // Primero el peinado y encima los accesorios (una gorra tapa el pelo)
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
