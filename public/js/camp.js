// Zona de descanso de la arena: un campamento al pie de la escena, separado del combate por una
// empalizada con una puerta por donde las parties salen a luchar y vuelven a descansar.
// Cada agente que no trabaja es un «camper»: 3 héroes de su raza que van cambiando de actividad con el
// tiempo (comer, conversar, entrenar, dormir...) y algunas propias de cada raza. Todo se dibuja en código.
import { W, H } from './map.js';
import { heroSprite } from './heroes.js';
import { px, reduced, shade } from './fx.js';

// ---- Geometría ---------------------------------------------------------------------------------------
export const FENCE_Y = 248;                                  // pie de la empalizada: por encima, la arena; por debajo, el campamento
export const GATE_X = 240;
export const GATE_IN = { x: GATE_X, y: 258 };                // lado del campamento
export const GATE_OUT = { x: GATE_X, y: 241 };               // lado de la arena
// Puestos de las parties en reposo (pies del héroe de referencia). Orden de ocupación: los más cercanos a la puerta primero.
export const CAMP_SLOTS = [[186, 274], [306, 274], [246, 297], [66, 274], [426, 274], [126, 297], [366, 297]];
export const CAMP_MAX = CAMP_SLOTS.length;
const SPEED = 34;                                            // px/s al cambiar de sitio dentro del campamento
const ACT_MS = [10000, 18000];                               // duración de cada actividad
const FADE_MS = 500;

const hashN = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const rnd = (a, b) => a + Math.random() * (b - a);

// ---- Sprites estáticos horneados una sola vez ----------------------------------------------------------
// bake(clave, ancho, alto, ancla x, ancla y, dibujo): las coordenadas de R son relativas al ancla (los pies del objeto).
const bakes = new Map();
function bake(key, w, h, ax, ay, fn) {
  let b = bakes.get(key);
  if (!b) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + ax, y + ay, ww, hh); });
    b = { c, ax, ay }; bakes.set(key, b);
  }
  return b;
}
const blit = (g, b, x, y) => g.drawImage(b.c, Math.round(x - b.ax), Math.round(y - b.ay));
const disc = (R, cx, cy, r, col) => { for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y + .25)); R(cx - hw, cy + y, hw * 2 + 1, 1, col); } };

const SPR = {
  table: () => bake('table', 32, 22, 16, 20, R => {
    R(-13, -10, 26, 4, '#8a6238'); R(-13, -10, 26, 1, '#a67c48'); R(-13, -6, 26, 2, '#5a3a20'); R(-12, -4, 3, 4, '#4a2e18'); R(10, -4, 3, 4, '#4a2e18');
    R(-9, -12, 6, 2, '#e8e0d0'); R(-8, -14, 4, 2, '#c0602a'); R(-7, -15, 2, 1, '#e8803a');           // plato con asado
    R(1, -12, 5, 2, '#d8a860'); R(2, -13, 3, 1, '#e8c078');                                           // pan
    R(8, -14, 3, 4, '#c8a040'); R(8, -15, 3, 1, '#ffffff'); R(11, -13, 1, 2, '#c8a040');             // jarra con espuma
    R(-12, -13, 3, 3, '#c8a040'); R(-12, -14, 3, 1, '#ffffff'); R(-2, -14, 3, 4, '#6a8a9a');          // otra jarra y un cántaro
  }),
  dummy: () => bake('dummy', 22, 30, 11, 27, R => {
    R(-5, -1, 11, 2, '#4a2e18'); R(-1, -21, 3, 21, '#6a4422'); R(-1, -21, 1, 21, '#8a5a30');
    R(-7, -17, 15, 3, '#7a5230'); R(-7, -17, 15, 1, '#9a6a3a');
    R(-3, -26, 7, 6, '#c8a868'); R(-3, -26, 7, 1, '#e0c488'); R(-1, -24, 3, 1, '#5a3a20'); R(0, -25, 1, 3, '#5a3a20');
    R(-5, -14, 3, 4, '#c8a868'); R(4, -14, 3, 4, '#c8a868');                                          // paja asomando
  }),
  target: () => bake('target', 26, 30, 13, 26, R => {
    R(-8, -9, 2, 9, '#5a3a20'); R(6, -9, 2, 9, '#5a3a20'); R(-8, -2, 16, 2, '#4a2e18');
    disc(R, 0, -16, 10, '#e8e0d0'); disc(R, 0, -16, 8, '#c03030'); disc(R, 0, -16, 6, '#e8e0d0'); disc(R, 0, -16, 4, '#c03030'); disc(R, 0, -16, 1, '#f5d442');
  }),
  anvil: () => bake('anvil', 24, 18, 12, 16, R => {
    R(-5, -3, 10, 3, '#4a2e18'); R(-5, -3, 10, 1, '#6a4422');
    R(-4, -6, 8, 3, '#3a3f4a'); R(-6, -9, 13, 3, '#5a5f6a'); R(-6, -9, 13, 1, '#8a90a0'); R(7, -9, 4, 2, '#5a5f6a'); R(7, -9, 3, 1, '#8a90a0');
  }),
  furnace: () => bake('furnace', 20, 20, 10, 18, R => {
    R(-7, -14, 14, 14, '#6a3a2a'); R(-7, -14, 14, 2, '#8a5a3a'); R(-7, -2, 14, 2, '#4a2418');
    for (let y = -11; y < -2; y += 3) R(-7, y, 14, 1, '#4a2418');
    R(-4, -9, 8, 6, '#1a0e08'); R(-2, -17, 4, 4, '#3a2a24'); R(-1, -19, 2, 2, '#3a2a24');            // boca y chimenea
  }),
  bench: () => bake('bench', 32, 22, 16, 20, R => {
    R(-14, -10, 28, 4, '#b8703a'); R(-14, -10, 28, 1, '#d8905a'); R(-14, -6, 28, 2, '#7a4a22'); R(-13, -4, 3, 4, '#5a3a1a'); R(11, -4, 3, 4, '#5a3a1a');
    R(-11, -14, 1, 4, '#8a90a0'); R(-12, -15, 3, 1, '#c8c8d0'); R(7, -12, 6, 2, '#e8e0c0'); R(8, -12, 3, 1, '#2a7a8a');   // martillo y plano
    R(-3, -12, 5, 2, '#c8a040'); R(-2, -13, 3, 1, '#e8c860');                                                       // piezas sueltas
  }),
  bedroll: () => bake('bedroll', 36, 12, 18, 6, R => {
    R(-15, -2, 30, 5, '#6a3a3a'); R(-15, -2, 30, 1, '#8a5a5a'); R(-15, 3, 30, 1, '#3a1a1a'); R(-6, 0, 18, 1, '#8a4a4a'); R(10, -3, 6, 5, '#e8e0d0'); R(10, -3, 6, 1, '#fff');
  }),
  slab: () => bake('slab', 32, 10, 16, 6, R => { R(-13, -2, 26, 4, '#4a4458'); R(-13, -2, 26, 1, '#6a6280'); R(-13, 2, 26, 1, '#2a243a'); R(-9, 0, 2, 1, '#5a5270'); R(4, 0, 3, 1, '#5a5270'); }),
  lantern: () => bake('lantern', 10, 16, 5, 14, R => { R(-2, -9, 5, 1, '#3a3028'); R(-2, -8, 5, 6, '#e8b840'); R(-1, -7, 3, 4, '#fff2b0'); R(-2, -2, 5, 1, '#3a3028'); R(0, -11, 1, 2, '#3a3028'); }),
  log: () => bake('log', 18, 8, 9, 5, R => { R(-8, -3, 16, 5, '#5a3a20'); R(-8, -3, 16, 1, '#7a5230'); R(-8, 2, 16, 1, '#3a2414'); R(-8, -2, 2, 3, '#a07848'); R(6, -2, 2, 3, '#a07848'); }),
  crate: () => bake('crate', 16, 16, 8, 15, R => { R(-6, -11, 12, 11, '#7a5230'); R(-6, -11, 12, 1, '#9a6a3a'); R(-6, -6, 12, 1, '#4a2e18'); R(-6, -11, 2, 11, '#5a3a20'); R(4, -11, 2, 11, '#5a3a20'); R(-1, -9, 2, 7, '#4a2e18'); }),
  barrel: () => bake('barrel', 14, 18, 7, 16, R => { R(-5, -13, 10, 13, '#7a5230'); R(-4, -14, 8, 1, '#7a5230'); R(-4, 0, 8, 1, '#5a3a20'); R(-5, -10, 10, 1, '#3a3f4a'); R(-5, -3, 10, 1, '#3a3f4a'); R(-5, -13, 2, 13, '#9a6a3a'); R(3, -13, 2, 13, '#4a2e18'); }),
};
const logAt = (g, x, y) => blit(g, SPR.log(), x, y);

// ---- Fondo: suelo del campamento, empalizada y puerta (se hornea con la escena) -----------------------------
export function drawCampBackground(g) {
  g.fillStyle = '#1f1810'; g.fillRect(0, FENCE_Y - 2, W, H - FENCE_Y + 2);
  for (let y = FENCE_Y; y < H; y++) for (let x = 0; x < W; x += 2) {
    const v = hashN(x, y, 4), c = v > .93 ? '#3e4a26' : v > .7 ? '#2c2318' : v > .55 ? '#241c12' : null;
    if (c) px(g, x, y, 2, 1, c);
  }
  for (let i = 0; i < 70; i++) {                                // matas de hierba y piedrecitas
    const x = hashN(i, 1, 7) * W, y = FENCE_Y + 6 + hashN(i, 2, 7) * (H - FENCE_Y - 8);
    if (Math.abs(x - GATE_X) < 18) continue;
    if (i % 3) { px(g, x, y, 1, 2, '#4a5a2e'); px(g, x + 2, y + 1, 1, 1, '#5a6a38'); px(g, x - 1, y + 1, 1, 1, '#3a4a24'); }
    else { px(g, x, y, 3, 2, '#4a4036'); px(g, x, y, 3, 1, '#6a5e50'); }
  }
  for (let y = FENCE_Y; y < H; y++) {                           // sendero de tierra pisada desde la puerta
    const hw = 11 + (y - FENCE_Y) * .14;
    for (let x = Math.round(GATE_X - hw); x < GATE_X + hw; x++) if (hashN(x, y, 3) > .25) px(g, x, y, 1, 1, hashN(y, x, 2) > .6 ? '#4a3c2a' : '#3c3022');
  }
  g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(0, FENCE_Y, W, 4);   // sombra de la empalizada sobre el suelo
  // Empalizada de troncos con puntas, con una atadura
  for (let x = 0; x < W; x += 5) {
    if (x + 4 > GATE_X - 23 && x < GATE_X + 23) continue;
    const hgt = 12 + Math.floor(hashN(x, 5) * 3), top = FENCE_Y - hgt;
    px(g, x, top + 1, 4, hgt, '#6a4a2a'); px(g, x + 1, top, 2, 1, '#6a4a2a');
    px(g, x, top + 1, 1, hgt, '#8a6a3a'); px(g, x + 3, top + 1, 1, hgt, '#3a2616');
    px(g, x + 1, top, 1, 1, '#8a6a3a');
    if (hashN(x, 9) > .75) px(g, x + 1, top + 3 + Math.floor(hashN(x, 8) * 5), 1, 2, '#4a3220');
  }
  px(g, 0, FENCE_Y - 8, W, 1, '#2a1a0e'); px(g, 0, FENCE_Y - 3, W, 1, '#2a1a0e');
  // Puerta: dos postes altos con travesaño, estandartes y farolillos (la llama se anima en drawCampLive)
  const gx = GATE_X;
  for (const s of [-1, 1]) {
    const x = s < 0 ? gx - 25 : gx + 21;
    px(g, x, FENCE_Y - 30, 5, 32, '#5a3a20'); px(g, x, FENCE_Y - 30, 1, 32, '#8a6a3a'); px(g, x + 4, FENCE_Y - 30, 1, 32, '#2a1a0e');
    px(g, x - 1, FENCE_Y - 33, 7, 3, '#3a2616'); px(g, x - 1, FENCE_Y - 33, 7, 1, '#6a4a2a');
    const bx = s < 0 ? x - 8 : x + 7;                            // estandarte colgando por fuera
    px(g, bx, FENCE_Y - 28, 6, 14, '#6a2234'); px(g, bx, FENCE_Y - 28, 6, 1, '#8a3a4a'); px(g, bx + 2, FENCE_Y - 24, 2, 4, '#c8a040'); px(g, bx + 1, FENCE_Y - 22, 4, 1, '#c8a040');
    px(g, bx, FENCE_Y - 14, 2, 2, '#6a2234'); px(g, bx + 4, FENCE_Y - 14, 2, 2, '#6a2234');
  }
  px(g, gx - 26, FENCE_Y - 28, 52, 3, '#5a3a20'); px(g, gx - 26, FENCE_Y - 28, 52, 1, '#8a6a3a'); px(g, gx - 26, FENCE_Y - 26, 52, 1, '#2a1a0e');
  for (let i = 0; i < 5; i++) px(g, gx - 20 + i * 10, FENCE_Y - 25, 2, 3, '#3a2616');   // clavijas
  for (let x = gx - 20; x < gx + 20; x += 2) px(g, x, FENCE_Y - 1, 2, 2, hashN(x, 1) > .5 ? '#6a6070' : '#4a4256');   // umbral de piedra
  // Barriles y cajas en los rincones
  const q = (spr, x, y) => g.drawImage(spr.c, Math.round(x - spr.ax), Math.round(y - spr.ay));
  q(SPR.barrel(), 12, FENCE_Y + 14); q(SPR.crate(), 28, FENCE_Y + 16); q(SPR.crate(), 20, FENCE_Y + 30); q(SPR.barrel(), 36, FENCE_Y + 40);
  q(SPR.barrel(), W - 12, FENCE_Y + 15); q(SPR.crate(), W - 28, FENCE_Y + 17); q(SPR.barrel(), W - 22, FENCE_Y + 38); q(SPR.crate(), W - 38, FENCE_Y + 48);
}
// Farolillos de la puerta y luz cálida del campamento (capa viva)
export function drawCampLive(g, now) {
  const rm = reduced();
  for (const s of [-1, 1]) {
    const x = s < 0 ? GATE_X - 23 : GATE_X + 23, y = FENCE_Y - 37, f = rm ? 1 : Math.floor(now / 130 + s) % 3;
    g.globalAlpha = .26; g.fillStyle = '#ff9a2a'; g.beginPath(); g.ellipse(x, y - 2, 12, 10, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    px(g, x - 2, y - 3 - f, 5, 5 + f, '#d8501a'); px(g, x - 1, y - 5 - f, 3, 5 + f, '#ff9a2a'); px(g, x, y - 4 - f, 1, 4, '#ffe08a');
  }
}

// ---- Actividades -------------------------------------------------------------------------------------------------
// pos: [x, y, mirada, postura] de cada héroe (vanguardia, distancia o magia, apoyo) respecto al puesto de la party.
export const ACTS = {
  fire:     { name: 'Cenando junto a la fogata', pos: [[-18, 2, 'right', 'eat'], [18, 2, 'left', 'eat'], [0, -9, 'down', 'drink']] },
  table:    { name: 'Banquete con jarras', pos: [[-20, 0, 'right', 'drink'], [20, 0, 'left', 'eat'], [0, -9, 'down', 'drink']] },
  talk:     { name: 'Conversando', pos: [[-15, 3, 'right', 'stand'], [15, 3, 'left', 'stand'], [0, -8, 'down', 'stand']] },
  dummy:    { name: 'Entrenando con el muñeco', pos: [[6, 3, 'right', 'swing'], [-24, 2, 'right', 'watch'], [-13, -8, 'right', 'watch']] },
  archery:  { name: 'Practicando puntería', pos: [[-10, 3, 'right', 'shoot'], [-31, 1, 'right', 'watch'], [-21, -8, 'right', 'watch']] },
  meditate: { name: 'Meditando', pos: [[-18, 3, 'down', 'sit'], [18, 3, 'down', 'sit'], [0, -7, 'down', 'sit']] },
  spells:   { name: 'Practicando hechizos', pos: [[-16, 3, 'right', 'cast'], [16, 3, 'left', 'cast'], [0, -8, 'down', 'stand']] },
  sleep:    { name: 'Durmiendo', pos: [[-22, 1, 'right', 'nap'], [22, 1, 'left', 'nap'], [0, -5, 'down', 'lie']] },
  spar:     { name: 'Combate de práctica', pos: [[-11, 3, 'right', 'spar'], [13, 3, 'left', 'spar'], [0, -9, 'down', 'watch']] },
  forge:    { name: 'Trabajando en la forja', pos: [[-8, 3, 'right', 'hammer'], [-27, -3, 'right', 'drink'], [18, -9, 'left', 'drink']] },
  read:     { name: 'Leyendo a la luz del farol', pos: [[-18, 3, 'right', 'read'], [18, 3, 'left', 'read'], [0, -9, 'down', 'read']] },
  lift:     { name: 'Levantando pesas', pos: [[0, 3, 'down', 'lift'], [-23, -2, 'right', 'watch'], [23, -2, 'left', 'watch']] },
  gears:    { name: 'Ajustando engranajes', pos: [[-19, 3, 'right', 'tinker'], [19, 3, 'left', 'tinker'], [0, -10, 'down', 'tinker']] },
  play:     { name: 'Jugando a la pilla', pos: [[0, 0, 'down', 'play'], [0, 0, 'down', 'play'], [0, 0, 'down', 'play']] },
};
// Pesos por raza: lo común a todas y lo propio de cada una (sustituye al peso común)
const WEIGHTS = {
  base: { fire: 2, table: 2, talk: 2.4, dummy: 1.2, archery: 1, meditate: 1, spells: 1, sleep: 1.2 },
  humanos: { spar: 3, play: 1 }, elfos: { read: 3.5, archery: 3 }, enanos: { forge: 4, table: 4 }, orcos: { lift: 3.5, dummy: 2.5, table: 3 },
  gnomos: { gears: 4, play: 1.5 }, bestiales: { play: 3, sleep: 2.5 }, draconios: { fire: 4, spells: 1.8 }, astrales: { meditate: 4, spells: 3 },
};
const CHAT = {
  fire: ['¡Ñam, ñam!', '¡Qué rico!', '¿Más sopa?', '🍖', '🍲', 'Está caliente'], table: ['¡Salud!', '¿Otra ronda?', '🍺', '¡Qué banquete!', '🍖'],
  talk: ['💬', '¿Viste al rey?', '¡Jajaja!', '¿Y tú qué tal?', '¡No me digas!', '💬', 'Mañana más'], dummy: ['¡Hah!', '¡Otra vez!', '¡Toma!', '¡Buen golpe!'],
  archery: ['¡En el blanco!', '¡Casi!', '¡Diana!', '🎯'], meditate: ['…', 'Om…', '✨', '☯'], spells: ['✨', '¡Mira esto!', '¡Chispa!', '¡Abracadabra!'],
  sleep: ['Zzz…', '💤', 'Zzz…'], spar: ['¡En guardia!', '¡Otra!', '¡Bien parado!', '¡Toma ya!'], forge: ['¡Clang!', '¡Más fuego!', '⚒', '¡Salud!'],
  read: ['📖', 'Shh…', '¡Qué capítulo!', 'Mmm…'], lift: ['¡Uno más!', '¡Fuerza!', '💪', '¡Grrr!'], gears: ['¡Ajustando!', '⚙', '¡Funciona!', '¡Clic, clac!'],
  play: ['¡Te pillé!', '¡Corre!', '¡Jaja!', '😄'],
};
function pickAct(c, avoid) {
  const w = { ...WEIGHTS.base, ...(WEIGHTS[c.race.id] || {}) };
  if (reduced()) delete w.play;                                 // sin movimiento continuo en pantalla
  const keys = Object.keys(w).filter(k => k !== avoid);
  let r = Math.random() * keys.reduce((s, k) => s + w[k], 0);
  for (const k of keys) { r -= w[k]; if (r <= 0) return k; }
  return keys[0];
}
export const actName = c => (c.act ? ACTS[c.act.kind].name : '');

// ---- Campers: la party de un agente en reposo ----------------------------------------------------------------------
export const slotBase = i => ({ x: CAMP_SLOTS[i][0], y: CAMP_SLOTS[i][1] });
function startAct(c, now, first) {
  const kind = pickAct(c, c.act && c.act.kind), dur = rnd(...ACT_MS);
  if (!first && c.act) c.prev = { kind: c.act.kind, until: now + FADE_MS };
  // Al llegar al campamento cada party va por un punto distinto de su actividad, para que no cambien todas a la vez
  c.act = { kind, t0: now, dur, end: now + dur * (first ? rnd(.4, 1) : 1) };
  const lay = ACTS[kind].pos;
  c.h.forEach((h, i) => { h.pose = lay[i][3]; h.face = lay[i][2]; });
}
// from: posiciones absolutas de los 3 héroes (al volver del combate) o null para entrar por la puerta
export function makeCamper(a, info, now, from) {
  const c = { name: a.name, base: info.base, ri: info.ri, race: info.race, variant: info.variant, seed: info.seed, cs: null, act: null, prev: null, chat: null, nextChat: now + rnd(1500, 4500), view: null, el: null, h: [] };
  for (let i = 0; i < 3; i++) c.h.push({ x: from ? from[i].x : GATE_X + (i - 1) * 9, y: from ? from[i].y : GATE_IN.y + 4, tx: 0, ty: 0, dir: 'down', face: 'down', pose: 'stand', moving: false, mdir: 'down', sd: i * 370 + info.seed * 13 });
  return c;
}
// Coloca a los héroes en el puesto: al empezar (o al cambiar de actividad) caminan a su sitio
export function assignSlot(c, slot, now, snap) {
  c.cs = slot; c.leaving = false; c.gone = false;
  startAct(c, now, true);
  retarget(c, snap);
}
function retarget(c, snap) {
  const b = slotBase(c.cs), lay = ACTS[c.act.kind].pos;
  c.h.forEach((h, i) => { h.tx = b.x + lay[i][0]; h.ty = b.y + lay[i][1]; if (snap) { h.x = h.tx; h.y = h.ty; h.dir = h.face; } });
}
// Un grupo que cede su puesto a una party que vuelve del combate: sale caminando por la puerta y queda sin sitio visible
export function dismiss(c) {
  c.leaving = true; c.gone = false; c.view = null; c.chat = null; c.prev = null;
  c.h.forEach((h, i) => { h.tx = GATE_IN.x + (i - 1) * 7; h.ty = GATE_IN.y + 5; h.pose = 'stand'; h.face = 'up'; });
}
export function updateCamper(c, now, dt) {
  if (c.leaving && !c.gone) {
    let far = false;
    for (const h of c.h) {
      const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
      if (d < 1.5 || reduced()) { h.x = h.tx; h.y = h.ty; h.moving = false; continue; }
      const k = Math.min(1, 70 * dt / d); h.x += dx * k; h.y += dy * k; h.moving = true; far = true;
      h.mdir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    if (!far) c.gone = true;
    return;
  }
  if (c.cs === null) return;
  const rm = reduced(), b = slotBase(c.cs);
  if (now >= c.act.end) {
    startAct(c, now, false); retarget(c, false);
    c.nextChat = Math.max(c.nextChat, now + 900);
  }
  const kind = c.act.kind;
  c.h.forEach((h, i) => {
    if (kind === 'play' && !rm) {                              // corretean en círculo alrededor del puesto
      const a = now * .0017 + i * 2.1, nx = b.x + Math.cos(a) * 25, ny = b.y + Math.sin(a) * 6 - 2;
      h.mdir = Math.cos(a) > 0 ? 'left' : 'right'; h.x = nx; h.y = ny; h.moving = true; return;
    }
    const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
    if (d < .6 || rm) { h.x = h.tx; h.y = h.ty; h.moving = false; h.dir = h.face; return; }
    const k = Math.min(1, SPEED * dt / d); h.x += dx * k; h.y += dy * k; h.moving = true;
    h.mdir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  });
  if (c.prev && now > c.prev.until) c.prev = null;
  if (c.chat && now > c.chat.until) c.chat = null;
  if (!c.chat && now >= c.nextChat) {
    const pool = CHAT[kind];
    c.chat = { text: pool[Math.floor(Math.random() * pool.length)], hero: Math.floor(Math.random() * 3), until: now + 2400, at: now };
    c.nextChat = now + (kind === 'talk' ? rnd(2800, 5000) : rnd(4500, 9000));
  }
  let minX = 1e9, maxX = -1e9, top = 1e9, bottom = 0;
  for (const h of c.h) { minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x); top = Math.min(top, h.y - (h.pose === 'lie' && !h.moving ? 14 : 28)); bottom = Math.max(bottom, h.y); }
  c.view = { cx: (minX + maxX) / 2, top, minX: minX - 10, maxX: maxX + 10, bottom };
  const sp = c.chat && c.h[c.chat.hero];
  c.chatPos = sp ? { x: sp.x, y: sp.y - 30 } : null;
}

// ---- Animación de las posturas -----------------------------------------------------------------------------------------
const FACE = { right: 1, left: -1, down: 0, up: 0 };
// Devuelve el desplazamiento, el fotograma y los objetos que sostiene el héroe en este instante
function anim(c, i, h, now, rm) {
  const t = now + h.sd, r = { dx: 0, dy: 0, sit: false, lie: false, ph: 'stand', item: null, ix: 0, iy: 0 }, s = FACE[h.dir] || 1;
  const bob = rm ? 0 : Math.floor(now / 450 + c.seed + i) % 2;
  const u = P => (t % P) / P;
  switch (h.pose) {
    case 'stand': r.dy = -bob; break;
    case 'sit': r.sit = true; break;
    case 'nap': r.sit = true; if (!rm) r.dy = Math.floor(t / 1100) % 2; break;
    case 'lie': r.lie = true; break;
    case 'eat': { r.sit = true; const k = Math.floor(t / 700) % 3; if (k < 2) { r.item = 'leg'; r.ix = (s || 1) * 5; r.iy = k ? -10 : -7; } break; }
    case 'drink': { r.sit = true; const q = u(2600); r.item = 'mug'; r.ix = (s || 1) * 5; r.iy = rm ? -9 : q < .3 ? -15 : -8; break; }
    case 'read': r.sit = true; r.item = 'book'; r.ix = 0; r.iy = -8; r.flip = !rm && Math.floor(t / 2400) % 2; break;
    case 'watch': if (!rm && Math.floor(t / 700) % 7 === 0) r.dy = -2; else r.dy = -bob; break;
    case 'swing': case 'hammer': { const q = u(900); if (!rm && q < .3) { r.dx = s * 3 * Math.sin(q / .3 * Math.PI); r.ph = 'a'; if (h.pose === 'hammer') r.dy = -Math.round(Math.sin(q / .3 * Math.PI) * 2); } else r.dy = -bob; break; }
    case 'spar': { const q = u(1400), mine = i === 0 ? q < .25 : q > .5 && q < .75, k = i === 0 ? q / .25 : (q - .5) / .25; if (!rm && mine) { r.dx = s * 3 * Math.sin(k * Math.PI); r.ph = 'a'; } else r.dy = -bob; break; }
    case 'shoot': { const q = u(2000); r.ph = !rm && q < .22 ? 'a' : 'stand'; break; }
    case 'cast': { const q = u(2400); if (!rm && q > .1 && q < .4) { r.ph = 'a'; r.dy = -1; } else r.dy = -bob; break; }
    case 'lift': {
      const q = u(2400); r.item = 'stone'; r.ix = 0;
      r.iy = q < .15 ? -9 : q < .5 ? -9 - (q - .15) / .35 * 24 : q < .75 ? -33 : -33 + (q - .75) / .25 * 24;
      if (rm) r.iy = -33; r.ph = !rm && q > .1 && q < .8 ? 'a' : 'stand'; r.dy = !rm && q < .1 ? 1 : 0; break;
    }
    case 'tinker': r.ph = !rm && Math.floor(t / 420) % 2 ? 'a' : 'stand'; break;
    case 'breath': r.dy = -bob; break;
    case 'play': r.dy = 0; break;
  }
  // El que habla da un saltito al empezar
  if (!rm && c.chat && c.chat.hero === i && now - c.chat.at < 360 && !r.lie) r.dy -= Math.round(Math.sin((now - c.chat.at) / 360 * Math.PI) * 2);
  return r;
}
function drawItem(g, kind, x, y, now, flip) {
  if (kind === 'leg') { px(g, x, y, 4, 3, '#c0602a'); px(g, x, y, 4, 1, '#e8803a'); px(g, x + 3, y + 2, 2, 2, '#e8e0d0'); }
  else if (kind === 'mug') { px(g, x, y, 4, 5, '#c8a040'); px(g, x, y - 1, 4, 1, '#ffffff'); px(g, x + 4, y + 1, 1, 3, '#c8a040'); px(g, x, y, 1, 5, '#e8c860'); }
  else if (kind === 'book') { px(g, x - 5, y, 10, 5, '#3a4a8a'); px(g, x - 4, y + 1, 4, 3, '#f0ead0'); px(g, x + 1, y + 1, 4, 3, flip ? '#fff8e0' : '#f0ead0'); px(g, x, y, 1, 5, '#1a2a5a'); }
  else if (kind === 'stone') { px(g, x - 8, y, 16, 3, '#6a6a76'); px(g, x - 8, y, 16, 1, '#9a9aa6'); px(g, x - 10, y - 1, 3, 5, '#4a4a56'); px(g, x + 7, y - 1, 3, 5, '#4a4a56'); }   // barra con pesas
}
function drawHero(g, c, i, now, rm) {
  const h = c.h[i], a = anim(c, i, h, now, rm);
  const dir = h.moving ? h.mdir : h.dir;
  const ph = h.moving ? ['a', 'stand', 'b', 'stand'][Math.floor(now / 130 + i) % 4] : a.ph;
  const lying = a.lie && !h.moving, sitting = a.sit && !h.moving;
  const spr = heroSprite(c.race, i, 1, c.variant, lying ? 'down' : dir, ph);
  const x = Math.round(h.x + a.dx), y = Math.round(h.y + a.dy + (h.moving && ph !== 'stand' ? -1 : 0));
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 7, Math.round(h.y) - 1, 14, 2);
  if (lying) {                                                  // tumbado sobre el petate, mirando hacia arriba
    g.save(); g.translate(x - 10, Math.round(h.y) + 1); g.rotate(Math.PI / 2); g.drawImage(spr.img, -spr.ax, -spr.ay); g.restore();
  } else if (sitting) {                                         // sentado: sin piernas y apoyado en un tronco
    const cut = 8, drop = 5;
    g.drawImage(spr.img, 0, 0, spr.img.width, spr.ay - cut, x - spr.ax, y - spr.ay + drop, spr.img.width, spr.ay - cut);
    if (!(c.act && (c.act.kind === 'table' || c.act.kind === 'meditate'))) logAt(g, x, y + 1);
  } else g.drawImage(spr.img, x - spr.ax, y - spr.ay);
  if (a.item) drawItem(g, a.item, x + a.ix - (a.item === 'book' || a.item === 'stone' ? 0 : 2), y + a.iy + (sitting ? 5 : 0), now, a.flip);
}

// ---- Objetos y efectos de cada actividad -----------------------------------------------------------------------------------
function flame(g, x, y, now, seed, rm, k = 1) {
  const f = rm ? 1 : Math.floor(now / 110 + seed) % 3, hh = Math.round((6 + f * 2) * k);
  px(g, x - 2 * k, y - hh, 5 * k, hh, '#d8501a'); px(g, x - 1 * k, y - hh - 2, 3 * k, hh, '#ff9a2a'); px(g, x, y - hh - 1, 1, hh - 1, '#ffe08a');
}
function glow(g, x, y, rx, ry, col, a) { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
function campfire(g, bx, by, now, c, rm, pot) {
  glow(g, bx, by - 5, 24, 10, '#ff9a2a', .2);
  if (pot) {
    px(g, bx - 7, by - 17, 1, 16, '#3a2a1a'); px(g, bx + 6, by - 17, 1, 16, '#3a2a1a'); px(g, bx - 7, by - 17, 14, 1, '#3a2a1a');
    px(g, bx - 4, by - 14, 8, 5, '#2a2a32'); px(g, bx - 4, by - 14, 8, 1, '#5a5a66'); px(g, bx - 5, by - 14, 1, 2, '#2a2a32'); px(g, bx + 4, by - 14, 1, 2, '#2a2a32');
    if (!rm) for (let k = 0; k < 3; k++) { const q = ((now / 55 + k * 30 + c.seed * 7) % 90) / 90; g.globalAlpha = (1 - q) * .55; px(g, bx - 1 + Math.sin(q * 6 + k) * 2, by - 16 - q * 14, 2, 2, '#e8e8f0'); } g.globalAlpha = 1;
  }
  px(g, bx - 7, by - 2, 14, 3, '#4a2e18'); px(g, bx - 5, by - 4, 10, 2, '#6a4426'); px(g, bx - 8, by - 1, 2, 2, '#6a6070'); px(g, bx + 6, by - 1, 2, 2, '#6a6070');
  flame(g, bx, by - 3, now, c.seed, rm);
  if (!rm) for (let k = 0; k < 2; k++) { const q = ((now / 40 + k * 45 + c.seed * 3) % 90) / 90; g.globalAlpha = 1 - q; px(g, bx - 3 + k * 5 + Math.sin(q * 9) * 2, by - 10 - q * 12, 1, 1, '#ffb02a'); } g.globalAlpha = 1;
}
function constell(g, c, now, rm) {                              // astrales: constelación entre los tres héroes
  const pts = c.h.map(h => [h.x, h.y - 30]);
  g.strokeStyle = '#fff2c0'; g.globalAlpha = .5; g.lineWidth = 1; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[2][0], pts[2][1] - 4); g.lineTo(pts[1][0], pts[1][1]); g.stroke(); g.globalAlpha = 1;
  for (const [x, y] of [pts[0], [pts[2][0], pts[2][1] - 4], pts[1]]) { px(g, x - 1, y, 3, 1, '#fff2c0'); px(g, x, y - 1, 1, 3, '#fff2c0'); }
  if (!rm) for (let k = 0; k < 5; k++) { const a = now / 1400 + k * 1.26; px(g, c.view.cx + Math.cos(a) * 26, c.h[2].y - 24 + Math.sin(a) * 8, 2, 2, k % 2 ? '#fff2c0' : '#bfa8ff'); }
}
function zzz(g, x, y, now) {
  for (let k = 0; k < 3; k++) {
    const q = (now / 2600 + k / 3) % 1, zx = Math.round(x + q * 10 + k * 3), zy = Math.round(y - q * 18), c = k % 2 ? '#bcd8ff' : '#ffffff';
    g.globalAlpha = Math.sin(q * Math.PI);
    px(g, zx, zy, 6, 1, c); px(g, zx + 4, zy + 1, 2, 1, c); px(g, zx + 3, zy + 2, 2, 1, c); px(g, zx + 1, zy + 3, 2, 1, c); px(g, zx, zy + 4, 6, 1, c);
  }
  g.globalAlpha = 1;
}
function gear(g, x, y, r, teeth, ang, col, dark) {
  for (let yy = -r; yy <= r; yy++) { const hw = Math.floor(Math.sqrt(r * r - yy * yy + .25)); px(g, x - hw, y + yy, hw * 2 + 1, 1, col); }
  for (let k = 0; k < teeth; k++) { const a = ang + k * Math.PI * 2 / teeth; px(g, x + Math.cos(a) * (r + 1) - 1, y + Math.sin(a) * (r + 1) - 1, 2, 2, col); }
  px(g, x - 1, y - 1, 2, 2, dark);
}
// Parte estática de la actividad (queda bajo y entre los héroes por la ordenación en profundidad)
function drawProp(g, kind, c, bx, by, now, rm) {
  switch (kind) {
    case 'fire': campfire(g, bx, by, now, c, rm, true); break;
    case 'table': blit(g, SPR.table(), bx, by); break;
    case 'dummy': {
      const q = ((now + c.h[0].sd) % 900) / 900, wob = rm || q < .25 || q > .6 ? 0 : Math.sin((q - .25) / .35 * Math.PI * 3) * (1 - (q - .25) / .35) * .12;
      g.save(); g.translate(bx + 27, by); g.rotate(wob); blit(g, SPR.dummy(), 0, 0); g.restore(); break;
    }
    case 'archery': blit(g, SPR.target(), bx + 34, by - 1); break;
    case 'sleep': blit(g, SPR.bedroll(), bx, by - 5); break;
    case 'forge': blit(g, SPR.anvil(), bx + 6, by); blit(g, SPR.furnace(), bx + 31, by);
      glow(g, bx + 31, by - 6, 14, 10, '#ff6a1a', rm ? .25 : .2 + .08 * Math.sin(now / 160)); px(g, bx + 28, by - 8, 6, 4, rm ? '#ff9a2a' : Math.floor(now / 120) % 2 ? '#ffb02a' : '#ff8a1a'); break;
    case 'read': blit(g, SPR.lantern(), bx, by + 2); glow(g, bx, by - 8, 22, 14, '#ffd060', rm ? .22 : .18 + .05 * Math.sin(now / 400)); break;
    case 'lift': blit(g, SPR.slab(), bx, by + 3); break;
    case 'gears': {
      blit(g, SPR.bench(), bx, by);
      const ang = rm ? 0 : now / 500;
      gear(g, bx - 4, by - 17, 4, 6, ang, '#2ab0b0', '#14505a'); gear(g, bx + 4, by - 16, 3, 5, -ang * 1.4 + .5, '#c8803a', '#5a3a1a'); break;
    }
  }
}
// Efectos por encima de los héroes: proyectiles, chispas, orbes, aura, ronquidos...
function overlay(g, kind, c, bx, by, now, rm) {
  const [h0, h1, h2] = c.h;
  switch (kind) {
    case 'dummy': {
      const q = ((now + h0.sd) % 900) / 900;
      if (!rm && q > .18 && q < .45) { const k = (q - .18) / .27; g.globalAlpha = 1 - k; for (let i = 0; i < 5; i++) px(g, bx + 24 + i * 2 - k * 3, by - 16 + Math.sin(i * 2 + k * 5) * 4 - k * 4, 2, 1, i % 2 ? '#fff' : '#ffe08a'); g.globalAlpha = 1; }
      break;
    }
    case 'archery': {
      const P = 2000, n = Math.floor((now - c.act.t0) / P), q = ((now - c.act.t0) % P) / P;
      const tx = bx + 31, ty = by - 15 + (n % 3 - 1) * 2;
      for (let k = Math.max(0, n - 4); k < n; k++) { const yy = by - 15 + ((k % 5) - 2) * 3, xx = bx + 30 - (k % 2); px(g, xx - 5, yy, 6, 1, '#e8dcc0'); px(g, xx - 6, yy - 1, 1, 3, '#a8441e'); }   // flechas clavadas
      if (!rm && q > .22 && q < .42) {
        const k = (q - .22) / .2, sx = h0.x + 8, sy = h0.y - 14, ex = tx, ey = ty, x = sx + (ex - sx) * k, y = sy + (ey - sy) * k;
        const arrow = c.race.cls[0].hit[0] === 'jav' || c.race.id === 'elfos';
        if (arrow) { px(g, x - 4, y, 6, 1, '#e8dcc0'); px(g, x + 2, y, 1, 1, '#ffffff'); px(g, x - 5, y - 1, 1, 3, '#a8441e'); }
        else { const col = c.race.cls[1].hit[1]; for (let t = 0; t < 3; t++) { g.globalAlpha = 1 - t * .3; px(g, x - (ex - sx) / 60 * t * 3, y - (ey - sy) / 60 * t * 3, 2, 2, col); } g.globalAlpha = 1; px(g, x, y, 3, 3, '#ffffff'); }
      }
      break;
    }
    case 'meditate': {
      glow(g, bx, by - 2, 34, 11, c.race.color, .18);
      c.h.forEach((h, i) => { if (h.moving) return; const f = rm ? 0 : Math.floor(now / 700 + i) % 2; for (let k = 0; k < 2; k++) { const a = rm ? k * 3.1 : now / 600 + k * 3.14 + i; px(g, h.x + Math.cos(a) * 9 - 1, h.y - 26 + Math.sin(a) * 3 - f, 2, 2, k ? '#ffffff' : c.race.color); } });
      if (c.race.id === 'astrales') constell(g, c, now, rm);
      break;
    }
    case 'spells': {
      [h0, h1].forEach((h, i) => {
        const P = 2400, q = ((now + h.sd) % P) / P, col = c.race.cls[i].hit[1], s = i ? -1 : 1;
        if (rm) { px(g, h.x + s * 7, h.y - 20, 3, 3, col); return; }
        if (q > .3) { const k = (q - .3) / .7; g.globalAlpha = 1 - k * k; px(g, h.x + s * 8 + Math.sin(k * 6) * 2, h.y - 17 - k * 22, 3, 3, col); px(g, h.x + s * 8 + Math.sin(k * 6) * 2 + 1, h.y - 18 - k * 22, 1, 1, '#ffffff'); g.globalAlpha = 1; }
        else if (q > .1) px(g, h.x + s * 7, h.y - 17, 2, 2, col);
      });
      const a = rm ? 0 : now / 500;                             // orbe que flota entre ellos
      glow(g, bx, by - 24, 8, 7, c.race.color, .25); px(g, bx - 1, by - 25 + (rm ? 0 : Math.round(Math.sin(a))), 3, 3, '#ffffff'); px(g, bx + Math.cos(a) * 6, by - 24 + Math.sin(a) * 3, 2, 2, c.race.color);
      break;
    }
    case 'sleep': {
      glow(g, bx, by + 5, 16, 6, '#ff9a2a', .12); flame(g, bx, by + 5, now, c.seed, true, .5); px(g, bx - 4, by + 5, 8, 2, '#4a2e18');
      if (!rm) zzz(g, h2.x + 8, h2.y - 12, now); else { px(g, h2.x + 9, h2.y - 18, 4, 1, '#fff'); px(g, h2.x + 11, h2.y - 17, 1, 2, '#fff'); px(g, h2.x + 9, h2.y - 15, 4, 1, '#fff'); }
      break;
    }
    case 'spar': {
      const q = ((now + h0.sd) % 1400) / 1400;
      if (!rm) for (const [a, b] of [[.18, .3], [.68, .8]]) if (q > a && q < b) { const k = (q - a) / (b - a), mx = (h0.x + h1.x) / 2, my = h0.y - 14; g.globalAlpha = 1 - k; px(g, mx - 3 - k * 3, my, 7 + k * 6, 1, '#ffffff'); px(g, mx, my - 3 - k * 3, 1, 7 + k * 6, '#ffe08a'); g.globalAlpha = 1; }
      break;
    }
    case 'forge': {
      const q = ((now + h0.sd) % 900) / 900, ax = bx + 6, ay = by - 10;
      px(g, ax - 2, ay - 1, 5, 1, rm ? '#ff9a2a' : '#ff8a1a');                   // lingote al rojo sobre el yunque
      if (!rm && q > .2 && q < .55) { const k = (q - .2) / .35; g.globalAlpha = 1 - k; for (let i = 0; i < 6; i++) { const a = -Math.PI * (.1 + i * .16); px(g, ax + Math.cos(a) * k * 12, ay + Math.sin(a) * k * 12 + k * k * 10, 1, 1, i % 2 ? '#ffd24a' : '#ff8a1a'); } g.globalAlpha = 1; }
      break;
    }
    case 'fire': {
      if (c.race.id === 'draconios' && !rm) {                                    // el aliento del draconio aviva la hoguera
        const q = ((now + h1.sd) % 3600) / 3600;
        if (q > .5 && q < .72) { const k = (q - .5) / .22; for (let i = 0; i < 7; i++) { const f = i / 6, x = h1.x - 4 + (bx - h1.x + 4) * f, y = h1.y - 15 + (by - 6 - h1.y + 15) * f + Math.sin(i + now / 60) * 1.5; g.globalAlpha = Math.sin(k * Math.PI); px(g, x, y, 3 - Math.floor(f * 1.5), 3, i % 2 ? '#ffb02a' : '#ff6a1a'); } g.globalAlpha = 1; }
      }
      break;
    }
    case 'gears': {
      if (!rm) { const q = ((now / 300) % 3) / 3; g.globalAlpha = 1 - q; px(g, bx + 8 + q * 8, by - 20 - q * 8, 2, 1, '#9ae8e8'); px(g, bx - 10 - q * 6, by - 19 - q * 6, 1, 1, '#ffd24a'); g.globalAlpha = 1; }
      break;
    }
  }
}
// Añade a la lista de dibujo los elementos de la party en reposo (cada héroe y objeto con su profundidad)
export function camperItems(c, now, items, g) {
  const rm = reduced();
  if (c.leaving) { if (!c.gone) c.h.forEach((h, i) => items.push({ y: h.y, draw: () => drawHero(g, c, i, now, rm) })); return; }
  if (c.cs === null || !c.act) return;
  const b = slotBase(c.cs);
  const push = (kind, alpha) => {
    if (alpha <= 0) return;
    items.push({ y: b.y + (kind === 'table' || kind === 'gears' ? 0 : kind === 'sleep' ? -8 : -1), draw: () => { g.globalAlpha = alpha; drawProp(g, kind, c, b.x, b.y, now, rm); g.globalAlpha = 1; } });
    items.push({ y: b.y + 40, draw: () => { g.globalAlpha = alpha; overlay(g, kind, c, b.x, b.y, now, rm); g.globalAlpha = 1; } });
  };
  if (c.prev) push(c.prev.kind, Math.max(0, (c.prev.until - now) / FADE_MS));
  push(c.act.kind, Math.min(1, (now - c.act.t0) / FADE_MS));
  c.h.forEach((h, i) => items.push({ y: h.y + (c.act.kind === 'play' ? 0 : .1 * i), draw: () => drawHero(g, c, i, now, rm) }));
}
