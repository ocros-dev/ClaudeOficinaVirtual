// Efectos de la arena (dueño: N3). Todo se dibuja en código sobre el canvas, sin imágenes y sin
// asignar memoria en el bucle: partículas, proyectiles, rayos, impactos, anillos y cifras viven en
// pools de tamaño fijo. Las razas y los reyes solo usan los ayudantes exportados (spark, ring,
// arcBolt, orbit, glow, shockwave, trail…); el límite de destellos y el movimiento reducido
// los aplica combat/director.js y este archivo (temblor, partículas a la mitad).

// ---- Movimiento reducido (se consulta en vivo) ---------------------------------------------------
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let REDUCED = !!(mq && mq.matches);
if (mq && mq.addEventListener) mq.addEventListener('change', e => { REDUCED = e.matches; });
export const reduced = () => REDUCED;
export function setReduced(v) { REDUCED = !!v; }           // para pruebas y para el visor

// ---- Aleatoriedad propia (los efectos vivos no usan Math.random) -----------------------------------
let seedState = 0x9e3779b9;
export function rnd() {
  seedState = (seedState + 0x6D2B79F5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rrange = (a, b) => a + (b - a) * rnd();
// Generador determinista a partir de una semilla (rayos ramificados que no cambian entre fotogramas)
export function seeded(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- Color ---------------------------------------------------------------------------------------
export function shade(hex, amt) {
  if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16), ch = s => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
// Rampa de 5 tonos (sombra profunda → brillo) a partir de un color base, con desplazamiento de tono
export function ramp5(base) {
  return [shade(base, -90), shade(base, -45), base, shade(base, 50), '#ffffff'];
}
export const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

// Rampas de rayo ya hechas (de borde a núcleo). Las razas pueden pasar la suya como array de 5 colores.
export const BEAM_RAMPS = {
  violet: ['#3a14a0', '#5a24c8', '#8a4aff', '#d8c4ff', '#ffffff'],
  gold: ['#8a4a10', '#d88a20', '#ffc840', '#fff0a0', '#ffffff'],
  fire: ['#7a1a0a', '#d84a14', '#ff8a28', '#ffd060', '#ffffff'],
  ice: ['#2a4a9a', '#5a8ae0', '#a8d0ff', '#e4f2ff', '#ffffff'],
  green: ['#1a5a2a', '#2f9a4a', '#6ad870', '#c8f8b0', '#ffffff'],
  shadow: ['#14081e', '#3a1860', '#7a38b8', '#c898ff', '#ffffff'],
  white: ['#6a7488', '#98a2b8', '#c8d0e0', '#eef2fa', '#ffffff'],
  blue: ['#14327a', '#2a62d0', '#5aa0ff', '#b8dcff', '#ffffff'],
  plague: ['#3a4a0a', '#7a9a1a', '#b8c83a', '#e8f090', '#ffffff'],
};
export const rampOf = r => Array.isArray(r) ? r : BEAM_RAMPS[r] || BEAM_RAMPS.violet;

// ---- Pools ---------------------------------------------------------------------------------------
const NP = 400, NPROJ = 40, NBEAM = 6, NIMP = 28, NRING = 28, NBOLT = 18, NNUM = 12, NTEL = 6;
const mk = (n, f) => Array.from({ length: n }, f);
const parts = mk(NP, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, ay: 0, t: 0, life: 0, c: '#fff', s: 2, kind: 0, drag: 0 }));
const projs = mk(NPROJ, () => ({ on: false }));
const beams = mk(NBEAM, () => ({ on: false }));
const imps = mk(NIMP, () => ({ on: false }));
const rings = mk(NRING, () => ({ on: false }));
const bolts = mk(NBOLT, () => ({ on: false }));
const nums = mk(NNUM, () => ({ on: false }));
const tels = mk(NTEL, () => ({ on: false }));
let pi = 0, T = 0, frameNo = 0, drawnFrame = -1;

function take(pool, ix) { for (let i = 0; i < pool.length; i++) { const o = pool[(ix.v + i) % pool.length]; if (!o.on) { ix.v = (ix.v + i + 1) % pool.length; return o; } } const o = pool[ix.v]; ix.v = (ix.v + 1) % pool.length; return o; }
const ixImp = { v: 0 }, ixRing = { v: 0 }, ixBolt = { v: 0 }, ixNum = { v: 0 }, ixProj = { v: 0 }, ixBeam = { v: 0 }, ixTel = { v: 0 };

export function clear() {
  for (const pool of [parts, projs, beams, imps, rings, bolts, nums, tels]) for (const o of pool) o.on = false;
  shakeAmp = 0;
}
export const stats = () => ({ parts: parts.filter(p => p.on).length, projs: projs.filter(p => p.on).length, beams: beams.filter(p => p.on).length, imps: imps.filter(p => p.on).length });

// ---- Partículas ----------------------------------------------------------------------------------
function part(x, y, vx, vy, life, c, s = 2, ay = 0, kind = 0, drag = 0) {
  let p = parts[pi]; pi = (pi + 1) % NP;
  p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.ay = ay; p.t = T; p.life = life; p.c = c; p.s = s; p.kind = kind; p.drag = drag;
}
// Chispas que salen en abanico. o: { color, color2, n, speed, life, size, gravity, ang, spread, lite }
export function spark(x, y, o = {}) {
  let n = o.n ?? 8; if (o.lite || REDUCED) n = Math.ceil(n / 2);
  const sp = o.speed ?? 110, life = o.life ?? 380, spread = o.spread ?? Math.PI * 2, ang = o.ang ?? 0;
  for (let i = 0; i < n; i++) {
    const a = spread >= Math.PI * 2 - .01 ? rnd() * Math.PI * 2 : ang + (rnd() - .5) * spread, v = sp * (.4 + rnd() * .8);
    part(x, y, Math.cos(a) * v, Math.sin(a) * v - (o.up ?? 0), life * (.6 + rnd() * .6), i % 3 === 0 && o.color2 ? o.color2 : (o.color || '#ffffff'), o.size ?? 2, o.gravity ?? 150, 0, .6);
  }
}
// Polvo del suelo al derrapar, aterrizar o arrancar
export function dust(x, y, o = {}) {
  let n = o.n ?? 6; if (o.lite || REDUCED) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const s = (o.face ?? 0) * -1;
    part(x + (rnd() - .5) * 14, y - 1, (s * 30 + (rnd() - .5) * 50) * (o.power ?? 1), -(8 + rnd() * 24), 340 + rnd() * 240, o.color || '#b8a888', 3 + (rnd() * 3 | 0), 20, 2, 1.2);
  }
}
// Rastro que deja algo que se mueve (estela de la embestida, cola de un proyectil)
export function trail(x, y, o = {}) { part(x + (rnd() - .5) * (o.spread ?? 4), y + (rnd() - .5) * (o.spread ?? 4), (rnd() - .5) * 14, (rnd() - .5) * 14, o.life ?? 260, o.color || '#fff', o.size ?? 3, 0, 0, 1); }
// Líneas de velocidad horizontales detrás de un dash
export function speedLines(x, y, face, o = {}) {
  const n = REDUCED ? 0 : (o.lite ? 2 : 4);
  for (let i = 0; i < n; i++) part(x - face * (6 + rnd() * 10), y - 6 - rnd() * (o.h ?? 40), -face * (40 + rnd() * 60), 0, 160 + rnd() * 100, o.color || '#ffffff', 2, 0, 3, 0);
}

// ---- Anillos y ondas -------------------------------------------------------------------------------
export function ring(x, y, o = {}) {
  if (!o.force && REDUCED && !o.still) return;
  const r = take(rings, ixRing);
  r.on = true; r.x = x; r.y = y; r.r0 = o.r0 ?? 4; r.r1 = o.r1 ?? 40; r.t0 = T + (o.delay ?? 0); r.life = o.life ?? 360; r.c = o.color || '#ffffff'; r.sq = o.squash ?? 1; r.w = o.w ?? 2; r.still = !!o.still; r.c2 = o.color2 || null;
}
// Onda de choque pegada al suelo: anillo aplastado y polvo
export function shockwave(x, y, o = {}) {
  ring(x, y, { r0: 6, r1: o.r ?? 80, life: o.life ?? 420, color: o.color || '#e8dcc0', squash: .32, w: o.w ?? 3, color2: o.color2, still: o.still });
  if (!o.noDust) dust(x, y, { n: o.dust ?? 8, color: o.dustColor, power: 1.5, lite: o.lite });
  if (o.double) ring(x, y, { r0: 4, r1: (o.r ?? 80) * .65, life: (o.life ?? 420) * .8, color: o.color2 || '#ffffff', squash: .32, w: 2, delay: 90 });
}

// ---- Rayos ramificados (relámpagos) ------------------------------------------------------------------
export function arcBolt(x0, y0, x1, y1, o = {}) {
  if (REDUCED && !o.still) { o = { ...o, life: Math.min(o.life ?? 200, 150), still: true }; }
  const b = take(bolts, ixBolt);
  b.on = true; b.x0 = x0; b.y0 = y0; b.x1 = x1; b.y1 = y1; b.seed = o.seed ?? (rnd() * 1e6 | 0); b.t0 = T; b.life = o.life ?? 220;
  b.c = o.color || '#d8c4ff'; b.core = o.core || '#ffffff'; b.w = o.w ?? 2; b.jag = o.jag ?? 14; b.br = o.branches ?? 2; b.still = !!o.still;
  return b;
}
// Rayo que cae del cielo (trueno, transformación). Devuelve el relámpago.
export function skyBolt(x, y, o = {}) {
  const b = arcBolt(x + (o.dx ?? 0), -8, x, y, { color: o.color || '#b890ff', core: '#ffffff', w: o.w ?? 4, jag: o.jag ?? 22, branches: o.branches ?? 3, life: o.life ?? 280, still: o.still });
  if (!o.noImpact) { ring(x, y, { r0: 6, r1: o.r ?? 54, life: 360, color: o.color || '#b890ff', squash: .32, w: 3, still: o.still }); spark(x, y - 4, { color: '#ffffff', color2: o.color || '#b890ff', n: 10, speed: 140, up: 40 }); }
  return b;
}

// ---- Impactos --------------------------------------------------------------------------------------
// kind: 'spark' (golpe corto), 'slash' (tajo), 'blast' (explosión), 'shock' (onda), 'big' (golpe grande), 'tap' (toque suave)
export function impact(x, y, o = {}) {
  const kind = o.kind || 'spark', big = kind === 'blast' || kind === 'big' || kind === 'shock';
  const im = take(imps, ixImp);
  im.on = true; im.x = x; im.y = y; im.t0 = T; im.kind = kind; im.face = o.face || 1; im.c = o.color || '#ffffff'; im.c2 = o.color2 || '#ffe8a0';
  im.life = REDUCED ? 150 : big ? 300 : 200; im.s = o.size ?? (big ? 1.6 : 1);
  const lite = o.lite;
  if (kind === 'tap') { spark(x, y, { color: im.c, n: 3, speed: 70, life: 260, lite }); return; }
  spark(x, y, { color: im.c, color2: im.c2, n: big ? 16 : 8, speed: big ? 190 : 120, life: big ? 520 : 360, size: big ? 3 : 2, lite, ang: o.face ? (o.face > 0 ? 0 : Math.PI) : 0, spread: kind === 'slash' ? 2.2 : Math.PI * 2 });
  if (kind === 'shock') shockwave(x, y + (o.ground ?? 0), { r: 70 * im.s, color: im.c, lite });
  else if (big) ring(x, y, { r0: 6, r1: 46 * im.s, life: 340, color: im.c, squash: .7, w: 3 });
}

// ---- Proyectiles -----------------------------------------------------------------------------------
// o: { x, y, tx, ty, dur, style, color, color2, size, arc, track: () => ({x,y}), onArrive, through, face }
export function projectile(o) {
  const p = take(projs, ixProj);
  p.on = true; p.x = o.x; p.y = o.y; p.sx = o.x; p.sy = o.y; p.tx = o.tx; p.ty = o.ty; p.t0 = T; p.dur = Math.max(60, o.dur ?? 180);
  p.style = o.style || 'orb'; p.c = o.color || '#d8c4ff'; p.c2 = o.color2 || '#ffffff'; p.size = o.size ?? 1; p.arc = o.arc ?? 0;
  p.track = o.track || null; p.onArrive = o.onArrive || null; p.through = o.through ? 70 : 0; p.face = o.face || 1; p.trailT = 0; p.ang = 0; p.lite = !!o.lite; p.spin = rnd() * 6;
  return p;
}
function updateProjectile(p, dt) {
  let k = (T - p.t0) / p.dur;
  if (p.track && k < 1) { const q = p.track(); if (q) { p.tx = q.x; p.ty = q.y; } }
  let ex = p.tx, ey = p.ty;
  if (p.through) { const d = Math.hypot(ex - p.sx, ey - p.sy) || 1; ex += (ex - p.sx) / d * p.through; ey += (ey - p.sy) / d * p.through; }
  const kk = Math.min(1, k), nx = p.sx + (ex - p.sx) * kk, ny = p.sy + (ey - p.sy) * kk - Math.sin(kk * Math.PI) * p.arc;
  p.ang = Math.atan2(ny - p.y, nx - p.x) || p.ang; p.x = nx; p.y = ny;
  p.trailT += dt * 1000;
  if (p.trailT > (p.lite ? 40 : 22)) { p.trailT = 0; if (p.style !== 'wave') trail(p.x, p.y, { color: rnd() < .5 ? p.c : p.c2, size: 2 + (p.size > 1.2 ? 2 : 0), life: 240, spread: 6 * p.size }); }
  if (k >= 1) { p.on = false; if (p.onArrive) p.onArrive(p); }
}

// Dibuja una línea de cuadrados de 'size' px (sin antialiasing); es la base de rayos, flechas y relámpagos
function lineSq(g, x0, y0, x1, y1, size, color) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(d / Math.max(1, size * .75)));
  g.fillStyle = color;
  const h = size / 2;
  for (let i = 0; i <= n; i++) { const t = i / n; g.fillRect(Math.round(x0 + dx * t - h), Math.round(y0 + dy * t - h), size, size); }
}
export { lineSq };

function drawProjectile(g, p) {
  const s = p.size, x = p.x, y = p.y, c = p.c, c2 = p.c2, ca = Math.cos(p.ang), sa = Math.sin(p.ang);
  switch (p.style) {
    case 'arrow': {
      lineSq(g, x - ca * 16 * s, y - sa * 16 * s, x, y, 2, '#d8d0c0');
      lineSq(g, x - ca * 20 * s, y - sa * 20 * s, x - ca * 14 * s, y - sa * 14 * s, 3, c);
      px(g, x + ca * 3 - 2, y + sa * 3 - 2, 5, 5, c2); px(g, x - 1 + ca * 4, y - 1 + sa * 4, 3, 3, '#ffffff'); break;
    }
    case 'bolt': {
      const r = seeded(Math.floor(T / 40) + p.spin * 100);
      let ax = x - ca * 26 * s, ay = y - sa * 26 * s;
      for (let i = 1; i <= 5; i++) { const t = i / 5, bx = x - ca * 26 * s * (1 - t) + (r() - .5) * 10, by = y - sa * 26 * s * (1 - t) + (r() - .5) * 10; lineSq(g, ax, ay, bx, by, 3, c); lineSq(g, ax, ay, bx, by, 1, c2); ax = bx; ay = by; }
      break;
    }
    case 'dart': lineSq(g, x - ca * 12 * s, y - sa * 12 * s, x, y, 3, c); px(g, x - 1, y - 1, 3, 3, c2); break;
    case 'ice': { const r = 6 * s; px(g, x - r, y - 2, r * 2, 4, c); px(g, x - 2, y - r, 4, r * 2, c); px(g, x - 3, y - 3, 6, 6, c2); lineSq(g, x - ca * 14, y - sa * 14, x, y, 4, c); break; }
    case 'wave': {                                   // media luna que viaja pegada al suelo
      const r = 18 * s, f = p.face;
      for (let i = -r; i <= r; i += 3) { const yy = (i * i) / (r * 1.3) - r * .4; px(g, x + f * yy * .9, y + i * .35, 4, 3, i % 6 ? c : c2); }
      break;
    }
    case 'star': {                                   // estrella de 4 puntas que gira a saltos (+ y × alternos)
      const r = Math.round(6 * s), diag = Math.floor(T / 90 + p.spin) % 2;
      glowBlob(g, x, y, r + 4, c, .3);
      g.fillStyle = c;
      for (let i = -r; i <= r; i++) {
        const w = Math.max(1, Math.round((1 - Math.abs(i) / (r + 1)) * 2.2));
        if (diag) { g.fillRect(Math.round(x + i * .8 - w / 2), Math.round(y + i * .8 - w / 2), w, w); g.fillRect(Math.round(x + i * .8 - w / 2), Math.round(y - i * .8 - w / 2), w, w); }
        else { g.fillRect(Math.round(x + i), Math.round(y - w / 2), 1, w); g.fillRect(Math.round(x - w / 2), Math.round(y + i), w, 1); }
      }
      glowBlob(g, x, y, Math.max(2, Math.round(r * .42)), c2, 1); glowBlob(g, x, y, Math.max(1, Math.round(r * .2)), '#ffffff', 1);
      break;
    }
    case 'moon': {                                   // luna creciente: el lado convexo va por delante
      const r = Math.round(8 * s), ox = -ca * r * .55, oy = -sa * r * .55, ri = r * .86;
      g.fillStyle = c2; if (!p.lite) { glowBlob(g, x, y, r + 4, c, .25); }
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        if (i * i + j * j > r * r) continue;
        if ((i - ox) ** 2 + (j - oy) ** 2 < ri * ri) continue;
        g.fillStyle = (i * ca + j * sa) > r * .35 ? '#ffffff' : (i + j) % 3 ? c : c2;
        g.fillRect(Math.round(x + i), Math.round(y + j), 1, 1);
      }
      break;
    }
    case 'fire': case 'shadow': case 'plague': {
      const r = Math.round(9 * s), fl = Math.floor(T / 80) % 2;
      glowBlob(g, x, y, r + 6, c, .35); glowBlob(g, x, y, r, c, 1); glowBlob(g, x, y, Math.round(r * .62), c2, 1); glowBlob(g, x - fl, y - 1, Math.round(r * .3), '#ffffff', 1);
      break;
    }
    default: {                                       // 'orb': esfera de energía con núcleo claro
      const r = Math.round(7 * s) + (Math.floor(T / 90) % 2);
      glowBlob(g, x, y, r + 5, c, .3); glowBlob(g, x, y, r, c, 1); glowBlob(g, x - 1, y - 1, Math.round(r * .6), c2, 1); glowBlob(g, x - 2, y - 2, Math.max(1, Math.round(r * .25)), '#ffffff', 1);
    }
  }
}
// Disco pixelado (sin antialiasing) hecho con filas de fillRect
function glowBlob(g, cx, cy, r, color, alpha) {
  r = Math.max(1, Math.round(r)); g.fillStyle = color; if (alpha < 1) g.globalAlpha = alpha;
  for (let j = -r; j <= r; j++) { const w = Math.floor(Math.sqrt(r * r - j * j)); g.fillRect(Math.round(cx) - w, Math.round(cy) + j, w * 2 + 1, 1); }
  if (alpha < 1) g.globalAlpha = 1;
}
export { glowBlob };

// ---- Rayos grandes -----------------------------------------------------------------------------------
// o: { x0, y0, x1, y1, ramp, w, dur, grow, fade, flicker }. Devuelve el rayo: se pueden mover sus extremos y llamar a .end()
export function beam(o) {
  const b = take(beams, ixBeam);
  b.on = true; b.x0 = o.x0; b.y0 = o.y0; b.x1 = o.x1; b.y1 = o.y1; b.ramp = rampOf(o.ramp); b.w = o.w ?? 22; b.t0 = T; b.dur = o.dur ?? 400;
  b.grow = o.grow ?? 140; b.fade = o.fade ?? 160; b.still = REDUCED; b.endAt = 0; b.lite = !!o.lite; b.flare = o.flare !== false;
  b.end = () => { if (b.on && !b.endAt) b.endAt = T; };
  return b;
}
function beamWidth(b) {
  const age = T - b.t0;
  let k = b.still ? 1 : Math.min(1, age / b.grow);
  const rem = b.endAt ? b.fade - (T - b.endAt) : b.dur - age;
  if (rem < b.fade) k = Math.min(k, Math.max(0, rem / b.fade));
  return b.w * (b.still ? 1 : (.5 + .5 * k)) * (k < 1 ? k : 1) * (b.still ? 1 : 1 + .08 * Math.sin(age / 35));
}
function drawBeam(g, b) {
  const W = beamWidth(b); if (W < 2) return;
  const dx = b.x1 - b.x0, dy = b.y1 - b.y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const bands = [1, .72, .5, .3, .14], step = Math.max(2, Math.round(W / 6));
  for (let bi = 0; bi < 5; bi++) {
    const size = Math.max(1, Math.round(W * bands[bi])), c = b.ramp[bi];
    g.fillStyle = c; const h = size / 2;
    if (Math.abs(dy) < Math.abs(dx) * .08) {                      // casi horizontal: una banda de fillRect (más barato y nítido)
      g.fillRect(Math.round(Math.min(b.x0, b.x1)), Math.round(b.y0 - h), Math.round(Math.abs(dx)), size);
    } else if (Math.abs(dx) < Math.abs(dy) * .08) {
      g.fillRect(Math.round(b.x0 - h), Math.round(Math.min(b.y0, b.y1)), size, Math.round(Math.abs(dy)));
    } else {
      const n = Math.ceil(L / step);
      for (let i = 0; i <= n; i++) { const t = i / n; g.fillRect(Math.round(b.x0 + dx * t - h), Math.round(b.y0 + dy * t - h), size, size); }
    }
  }
  if (b.flare) {                                                  // destello en el origen y en el final
    glowBlob(g, b.x0, b.y0, W * .85, b.ramp[1], .45); glowBlob(g, b.x0, b.y0, W * .5, b.ramp[3], 1);
    glowBlob(g, b.x1, b.y1, W * .9, b.ramp[2], .4); glowBlob(g, b.x1, b.y1, W * .45, b.ramp[4], 1);
  }
  if (!b.still && !b.lite) {                                      // chispas laterales a lo largo del haz
    const r = seeded(Math.floor(T / 60) * 7 + 3);
    for (let i = 0; i < 6; i++) { const t = r(), side = (r() - .5) * W * 1.6; px(g, b.x0 + dx * t - uy * side, b.y0 + dy * t + ux * side, 2, 2, i % 2 ? b.ramp[3] : b.ramp[4]); }
  }
}

// ---- Aviso en el suelo (telegraph) ---------------------------------------------------------------------
export function telegraph(x, y, o = {}) {
  const t = take(tels, ixTel);
  t.on = true; t.x = x; t.y = y; t.r = o.r ?? 60; t.t0 = T; t.dur = o.dur ?? 1200; t.c = o.color || '#ff4a4a'; t.sq = o.squash ?? .38;
  t.end = () => { t.on = false; };
  return t;
}
function drawTelegraph(g, t) {
  const age = T - t.t0, k = Math.min(1, age / t.dur), blink = REDUCED || Math.floor(age / 260) % 2 === 0;   // ≤ 2 Hz
  g.strokeStyle = t.c; g.lineWidth = 2; g.globalAlpha = blink ? .85 : .45;
  g.beginPath(); g.ellipse(Math.round(t.x), Math.round(t.y), t.r, t.r * t.sq, 0, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = .18 + .22 * k; g.fillStyle = t.c; g.beginPath(); g.ellipse(Math.round(t.x), Math.round(t.y), t.r * k, t.r * t.sq * k, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
}

// ---- Cifras de daño ------------------------------------------------------------------------------------
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
  '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
export function number(x, y, pts, o = {}) {
  const n = nums[ixNum.v]; ixNum.v = (ixNum.v + 1) % NNUM;           // como mucho 12 en pantalla (las más viejas se pisan)
  n.on = true; n.x = x + Math.round((rnd() - .5) * 28); n.y = y; n.t0 = T; n.v = Math.max(1, Math.round(pts * (8 + rnd() * 30))); n.c = o.color || '#ffffff'; n.big = !!o.big;
}
function drawNumbers(g) {
  for (const n of nums) if (n.on) {
    const age = T - n.t0; if (age > 1000) { n.on = false; continue; }
    const s = String(n.v), sc = n.big ? 3 : 2, pitch = 4 * sc, w = s.length * pitch - sc, x0 = Math.round(n.x - w / 2), y0 = Math.round(n.y - (REDUCED ? 14 : Math.min(40, age / 20)));
    g.globalAlpha = age > 700 ? Math.max(0, 1 - (age - 700) / 300) : 1;
    for (const [ox, oy, c] of [[-1, 0, '#1a0a10'], [1, 0, '#1a0a10'], [0, -1, '#1a0a10'], [0, 1, '#1a0a10'], [0, 0, n.c]]) {
      g.fillStyle = c;
      for (let i = 0; i < s.length; i++) { const m = DIGITS[+s[i]]; for (let p = 0; p < 15; p++) if (m[p] === '1') g.fillRect(x0 + i * pitch + (p % 3) * sc + ox, y0 + Math.floor(p / 3) * sc + oy, sc, sc); }
    }
    g.globalAlpha = 1;
  }
}

// ---- Temblor de pantalla --------------------------------------------------------------------------------
let shakeAmp = 0, shakeT0 = 0, shakeMs = 0;
export function shake(amp = 3, ms = 220) {
  if (REDUCED) return;
  amp = Math.min(4, amp); ms = Math.min(300, ms);
  if (T - shakeT0 < shakeMs && amp < shakeAmp) return;
  shakeAmp = amp; shakeT0 = T; shakeMs = ms;
}
export function shakeOffset(now) {
  if (REDUCED || !shakeAmp) return [0, 0];
  const age = (now ?? T) - shakeT0; if (age >= shakeMs) { shakeAmp = 0; return [0, 0]; }
  const k = 1 - age / shakeMs, a = Math.max(1, Math.round(shakeAmp * k));
  return [Math.round(Math.sin(age * .09) * a), Math.round(Math.cos(age * .13) * a * .6)];
}

// ---- Efectos que dibujan los actores (carga de rayo, halo, aura de impulso) -------------------------------
// Carga de un rayo: partículas que convergen hacia (x,y) y esfera que crece. k = 0..1. style: 'arcs'|'orbs'|'light'|'embers'|'runes'
export function drawCharge(g, x, y, k, o = {}) {
  const c = o.color || '#d8c4ff', c2 = o.color2 || '#ffffff', style = o.style || 'arcs', still = REDUCED || o.still, lite = o.lite;
  const r = 4 + k * (o.size ?? 16), t = T / 1000;
  glowBlob(g, x, y, r + 5, c, .28); glowBlob(g, x, y, r, c, 1); glowBlob(g, x, y, r * .6, c2, 1);
  const n = lite ? 4 : 8;
  for (let i = 0; i < n; i++) {
    const ph = still ? i / n : ((t * 1.7 + i / n) % 1), ang = i / n * Math.PI * 2 + (still ? 0 : t * 2.2), d = (1 - ph) * (30 + 14 * k) + r;
    const sx = x + Math.cos(ang) * d, sy = y + Math.sin(ang) * d * .8;
    if (style === 'arcs') { lineSq(g, sx, sy, x + Math.cos(ang) * (d * .55 + r * .4), y + Math.sin(ang) * (d * .55 + r * .4) * .8, 2, i % 2 ? c : c2); }
    else if (style === 'runes') { px(g, sx - 2, sy - 2, 5, 1, c); px(g, sx, sy - 3, 1, 5, c2); }
    else px(g, sx - 1, sy - 1, style === 'embers' ? 3 : 2, style === 'embers' ? 3 : 2, i % 2 ? c : c2);
  }
  if (style === 'arcs' || style === 'light') {                // anillo que se cierra
    g.strokeStyle = c; g.lineWidth = 2; g.globalAlpha = .8;
    const rr = (1 - k) * 34 + r + 4; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), rr, rr * .8, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  }
}
// Halo de potenciación sobre un héroe: anillos que suben (cx,cy en pies; h = alto del sprite)
export function drawHalo(g, x, y, h, k, o = {}) {
  const c = o.color || '#e0d0ff';
  g.strokeStyle = c; g.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const ph = REDUCED ? .4 + i * .3 : (k * 1.6 + i * .5) % 1;
    g.globalAlpha = (1 - ph) * .9; g.beginPath(); g.ellipse(Math.round(x), Math.round(y - ph * h), 20 - ph * 4, 6, 0, 0, Math.PI * 2); g.stroke();
  }
  g.globalAlpha = 1;
}

// ---- Resplandor y órbitas (portados de fx.js; las razas los usan desde aquí) -----------------------------------
const glows = new Map();
function glowImg(color, w, h) {
  const key = `${color}|${w}|${h}`;
  let c = glows.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = color;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + .5) / w * 2 - 1, ny = (y + .5) / h * 2 - 1, d = Math.hypot(nx, ny);
    const a = d < .5 ? .62 : d < .74 ? .44 : d < .92 ? .26 : d < 1 ? .5 : 0;
    if (a) { g.globalAlpha = a; g.fillRect(x, y, 1, 1); }
  }
  glows.set(key, c);
  return c;
}
export function glow(g, color, cx, cy, w, h, t, amp = 1) {
  const pulse = REDUCED ? .85 : .72 + .28 * Math.sin(t / 220);
  g.globalAlpha = Math.min(1, pulse * amp);
  g.drawImage(glowImg(color, Math.round(w), Math.round(h)), Math.round(cx - w / 2), Math.round(cy - h / 2));
  g.globalAlpha = 1;
}
export function orbit(g, o) {
  const { x, y, n = 4, rx = 20, ry = 7, color = '#fff', t = 0, vel = 1, size = 2, front = true, lite = false } = o;
  const cnt = lite ? Math.min(n, 2) : n;
  for (let i = 0; i < cnt; i++) {
    const ang = i / cnt * Math.PI * 2 + (REDUCED ? 0 : t / 1000 * vel);
    if ((Math.sin(ang) > 0) !== front) continue;
    px(g, x + Math.cos(ang) * rx - size / 2, y + Math.sin(ang) * ry - size / 2, size, size, color);
  }
}

// ---- Bucle ----------------------------------------------------------------------------------------------
export function update(now, dt) {
  T = now; frameNo++;
  dt = Math.min(.1, Math.max(0, dt));
  for (const p of parts) if (p.on) {
    const age = T - p.t; if (age >= p.life) { p.on = false; continue; }
    if (p.drag) { const f = Math.max(0, 1 - p.drag * dt); p.vx *= f; p.vy *= f; }
    p.vy += p.ay * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (const p of projs) if (p.on) updateProjectile(p, dt);
  for (const b of beams) if (b.on) { const age = T - b.t0; if ((b.endAt && T - b.endAt > b.fade) || age > b.dur + b.fade) b.on = false; }
  for (const o of imps) if (o.on && T - o.t0 > o.life) o.on = false;
  for (const o of rings) if (o.on && T - o.t0 > o.life) o.on = false;
  for (const o of bolts) if (o.on && T - o.t0 > o.life) o.on = false;
  for (const o of tels) if (o.on && T - o.t0 > o.dur) o.on = false;
}

// Capa del suelo (avisos): la pinta combat como un dibujable con y = -1
export function drawGround(g) {
  for (const t of tels) if (t.on) drawTelegraph(g, t);
}

function drawRing(g, r) {
  const age = T - r.t0; if (age < 0) return;
  const k = Math.min(1, age / r.life), rad = r.r0 + (r.r1 - r.r0) * (r.still ? 1 : k);
  g.globalAlpha = r.still ? .8 : 1 - k * k; g.strokeStyle = k < .35 && r.c2 ? r.c2 : r.c; g.lineWidth = r.w;
  g.beginPath(); g.ellipse(Math.round(r.x), Math.round(r.y), rad, rad * r.sq, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
}
function drawImpact(g, im) {
  const age = T - im.t0, k = Math.min(1, age / im.life), s = im.s, x = im.x, y = im.y;
  if (im.kind === 'tap') return;
  if (im.kind === 'slash') {                                         // tajo diagonal que se afina
    const f = im.face, L = 26 * s * (1 - k * .3);
    lineSq(g, x - f * L * .6, y + L * .7, x + f * L * .6, y - L * .7, Math.max(1, Math.round(5 * (1 - k))), im.c);
    lineSq(g, x - f * L * .5, y + L * .6, x + f * L * .5, y - L * .6, Math.max(1, Math.round(2 * (1 - k))), '#ffffff'); return;
  }
  const r = (im.kind === 'spark' ? 10 : 18) * s * (.4 + k * .8);
  g.fillStyle = k < .4 ? '#ffffff' : im.c;
  g.fillRect(Math.round(x - r), Math.round(y - 1), Math.round(r * 2), 3); g.fillRect(Math.round(x - 1), Math.round(y - r), 3, Math.round(r * 2));       // estrella de 4 puntas
  const d = r * .6; px(g, x - d, y - d, 2, 2, im.c2); px(g, x + d - 1, y - d, 2, 2, im.c2); px(g, x - d, y + d - 1, 2, 2, im.c2); px(g, x + d - 1, y + d - 1, 2, 2, im.c2);
  if (k < .5) glowBlob(g, x, y, r * .55 * s, '#ffffff', 1 - k);
}
function drawBolt(g, b) {
  const age = T - b.t0, k = age / b.life, r = seeded(b.seed + (b.still ? 0 : Math.floor(age / 55)));
  const segs = Math.max(4, Math.round(Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 22));
  g.globalAlpha = k > .7 ? 1 - (k - .7) / .3 : 1;
  const pts = [[b.x0, b.y0]];
  for (let i = 1; i < segs; i++) { const t = i / segs; pts.push([b.x0 + (b.x1 - b.x0) * t + (r() - .5) * b.jag * 2, b.y0 + (b.y1 - b.y0) * t + (r() - .5) * b.jag]); }
  pts.push([b.x1, b.y1]);
  for (let i = 1; i < pts.length; i++) { lineSq(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], b.w + 2, b.c); }
  for (let i = 1; i < pts.length; i++) { lineSq(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], Math.max(1, b.w - 1), b.core); }
  for (let j = 0; j < b.br; j++) {                                    // ramas
    const at = pts[1 + Math.floor(r() * (pts.length - 2))], len = 20 + r() * 30, a = (r() - .5) * 2.4 + (b.y1 > b.y0 ? Math.PI / 2 : 0);
    lineSq(g, at[0], at[1], at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len, Math.max(1, b.w - 1), b.c);
  }
  g.globalAlpha = 1;
}
function drawParticles(g) {
  for (const p of parts) if (p.on) {
    const age = T - p.t, k = age / p.life;
    g.globalAlpha = p.kind === 2 ? .55 * (1 - k) : k > .6 ? 1 - (k - .6) / .4 : 1;
    g.fillStyle = p.c;
    const s = p.kind === 2 ? Math.round(p.s * (1 + k)) : k > .75 && p.s > 1 ? p.s - 1 : p.s;
    if (p.kind === 3) g.fillRect(Math.round(p.x), Math.round(p.y), 12 * (1 - k) + 3, 1);
    else g.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }
  g.globalAlpha = 1;
}

// Capa superior: se dibuja una sola vez por fotograma aunque la llamen scene.js y combat/index.js
export function draw(g, now) {
  if (drawnFrame === frameNo) return;
  drawnFrame = frameNo;
  g.imageSmoothingEnabled = false;
  for (const r of rings) if (r.on) drawRing(g, r);
  for (const b of beams) if (b.on) drawBeam(g, b);
  for (const b of bolts) if (b.on) drawBolt(g, b);
  for (const p of projs) if (p.on) drawProjectile(g, p);
  for (const o of imps) if (o.on) drawImpact(g, o);
  drawParticles(g);
  drawNumbers(g);
}
