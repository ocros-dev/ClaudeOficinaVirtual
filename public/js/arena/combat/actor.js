// Actores y máquina de estados (dueño: N3). Un actor es un héroe, el rey, un élite o un secuaz.
// Posición = ancla de reglas (home) + coreografía (los pasos de actions.js la mueven) + muelle de retroceso.
// Estados: guard, move, script (guion de acción, prioridad 5), react (hit, block, dodge, launched; prioridad 3),
// transform (10), celebrate, enter, exit. El golpe recibido por el rey, élites y secuaces NO es un estado: es un
// impulso del muelle (recoil) más un destello, y se suma a lo que estén haciendo.
import { MIN_FEET_Y, KING_Y, CX, KING_MAX_DX } from '../config.js';
import { reduced, rnd, rrange } from '../render/vfx.js';

// ---- Animaciones: fotogramas y velocidad (contrato 3.7) ------------------------------------------------
const HERO = { idle: 4, walk: 6, run: 4, atk1: 3, atk2: 3, atk3: 3, kick: 3, charge: 3, fire: 2, cast: 4, hit: 2, block: 1, launched: 2, victory: 3, transform: 3, sit: 2, sleep: 2, eat: 2 };
const KING = { idle: 4, hit: 2, lean: 1, claw: 3, lunge: 2, roar: 2, charge: 2, beam: 2, cast: 3 };
const ELITE = { idle: 2, move: 4, atk: 3, hit: 1, special: 2 };
const MINION = { idle: 2, move: 2, atk: 2, launched: 1 };
const TABLE = { hero: HERO, king: KING, elite: ELITE, minion: MINION };
export const frameCount = (kind, anim) => (TABLE[kind] && TABLE[kind][anim]) || 1;
const FPS = { idle: 5, walk: 11, run: 15, move: 9, hit: 10 };
export const animFps = anim => FPS[anim] || 8;

// ---- Muelle de retroceso ---------------------------------------------------------------------------------
const K = 170, C = 17, W0 = Math.sqrt(K);
export function kick(a, dirX, px) {
  if (reduced()) return;                          // movimiento reducido: el golpe es pose + destello, sin retroceso             // dirX: +1 empuja a la derecha, -1 a la izquierda; px = retroceso máximo aproximado
  const mag = Math.min(px, a.kind === 'hero' ? 10 : 18);
  a.recoil.v += dirX * mag * W0 * 2.8;
}
function springStep(a, dt) {
  const r = a.recoil;
  if (!r.dx && !r.v) return;
  const acc = -K * r.dx - C * r.v;
  r.v += acc * dt; r.dx += r.v * dt;
  if (Math.abs(r.dx) < .05 && Math.abs(r.v) < 1) { r.dx = 0; r.v = 0; }
}

// ---- Creación --------------------------------------------------------------------------------------------
let seq = 1;
export function createActor(o) {
  const a = {
    id: o.id ?? 'a' + seq++, kind: o.kind, ref: o.ref || {}, party: o.party || null, idx: o.idx ?? 0,
    home: { x: o.x, y: o.y }, x: o.x, y: o.y, z: 0, face: o.face || 1,
    state: 'guard', t0: 0, dur: 0, anim: 'idle', frame: 0, animT0: 0,
    script: null, react: null, recoil: { dx: 0, v: 0 }, ghosts: [], flashAt: -1e9, alpha: 1,
    lane: null, priority: 1, lite: false, visible: true, vy: 0,
    free: false, fw: 48, fh: 64, ftop: 64, noFace: false, hitUntil: 0, buffUntil: 0, charge: null, halo: null,
    shuffle: { at: 0, tx: o.x, ty: o.y, on: false }, born: o.born ?? 0, lean: 0,
  };
  return a;
}

// ---- Anclas del arte ------------------------------------------------------------------------------------------
// El arte exporta puntos por fotograma (a.pts, que draw.js guarda al dibujar): (0,0) = pies, y negativa hacia arriba y x
// hacia donde mira el sprite. Devuelve el primero que exista de `names` en pantalla (con retroceso y altura), o null.
export function anchorPt(a, ...names) {
  const pts = a.pts; if (!pts) return null;
  for (const n of names) {
    const p = n && pts[n];
    if (Array.isArray(p) && p.length >= 2 && Math.abs(p[0]) < 320) return { x: a.x + a.recoil.dx + a.face * p[0], y: a.y - a.z + p[1] };
  }
  return null;
}

// ---- Imágenes residuales (≤ 4 por héroe; 0 en efectos reducidos) -------------------------------------------
export function addGhost(a, now, life = 260, ghostsMax = 4, alpha = .55) {
  if (ghostsMax <= 0) return;
  if (a.ghosts.length >= ghostsMax) a.ghosts.shift();
  a.ghosts.push({ x: a.x + a.recoil.dx, y: a.y, z: a.z, face: a.face, anim: a.anim, frame: a.frame, t0: now, life, alpha });
}
function pruneGhosts(a, now) { for (let i = a.ghosts.length - 1; i >= 0; i--) if (now - a.ghosts[i].t0 > a.ghosts[i].life) a.ghosts.splice(i, 1); }

// ---- Límites: carril y por debajo del rey ---------------------------------------------------------------------
export function clampActor(a, free) {
  if (a.kind === 'hero') {
    a.y = Math.max(MIN_FEET_Y, a.y);
    if (!free && !a.free && a.lane) a.x = Math.max(a.lane.x0, Math.min(a.lane.x1, a.x));
  } else if (a.kind === 'king') {
    a.x = Math.max(CX - KING_MAX_DX, Math.min(CX + KING_MAX_DX, a.x));
    a.y = Math.max(KING_Y - 12, Math.min(KING_Y + 56, a.y));
  }
}

// ---- Reacciones de los héroes (solo visuales: nunca pierden) --------------------------------------------------------
// kind: 'hit' | 'block' | 'dodge' | 'launched'. Solo entra si el actor está en guardia o en movimiento.
export function startReact(a, kind, now, fromX, o = {}) {
  if (a.state !== 'guard' && a.state !== 'move') return false;
  const dir = (a.x >= fromX ? 1 : -1);
  if (reduced() && (kind === 'dodge' || kind === 'launched')) kind = 'hit';   // sin desplazamientos: solo la pose
  a.state = 'react'; a.priority = 3; a.t0 = now; a.react = { kind, dir, x0: a.x, y0: a.y };
  switch (kind) {
    case 'hit': a.dur = 320; a.anim = 'hit'; kick(a, dir, rrange(6, 10)); break;
    case 'block': a.dur = 420; a.anim = 'block'; kick(a, dir, rrange(4, 7)); break;
    case 'dodge': a.dur = 300; a.anim = 'run'; a.react.dx = dir * rrange(22, 34); break;
    case 'launched': a.dur = 760; a.anim = 'launched'; a.react.dx = dir * rrange(40, 60); a.react.h = o.h ?? 46; break;
  }
  a.animT0 = now;
  return true;
}
function reactStep(a, now, dt, ctx) {
  const r = a.react, k = Math.min(1, (now - a.t0) / a.dur);
  if (r.kind === 'dodge') {
    // sale rápido de la línea de ataque y vuelve al sitio en la segunda mitad
    a.x = r.x0 + r.dx * (k < .45 ? 1 - (1 - k / .45) ** 2 : 1 - (k - .45) / .55);
    if (!reduced() && !a.lite && k < .5 && ctx.ghost) ctx.ghost(a);
  } else if (r.kind === 'launched') {
    const e = 1 - (1 - k) ** 2; a.x = r.x0 + r.dx * Math.min(1, e * 1.1); a.z = Math.sin(Math.min(1, k) * Math.PI) * r.h;
    if (k > .7) a.anim = 'hit';
    if (k >= 1 && !r.landed) { r.landed = true; if (ctx.land) ctx.land(a); }
  }
  clampActor(a, false);
  if (k >= 1) { a.react = null; a.z = 0; a.state = 'guard'; a.priority = 1; a.anim = 'idle'; a.animT0 = now; if (r.kind === 'launched' || r.kind === 'dodge') a.shuffle.at = now + 300; }
}

// ---- Guardia viva: balanceo y pasitos de recolocación (nunca están quietos) -------------------------------------------
function guardStep(a, now, dt, face) {
  if (a.anim !== 'idle' && a.anim !== 'walk') { a.anim = 'idle'; a.animT0 = now; }
  if (face) a.face = face;
  if (reduced()) { a.anim = 'idle'; return; }
  const s = a.shuffle;
  if (!s.on && now >= s.at) {
    s.on = true; s.tx = a.home.x + rrange(-14, 14); s.ty = a.home.y + rrange(-5, 5);
    if (a.lane) s.tx = Math.max(a.lane.x0, Math.min(a.lane.x1, s.tx));
    s.ty = Math.max(MIN_FEET_Y, s.ty);
    a.anim = 'walk'; a.animT0 = now;
  }
  if (s.on) {
    const dx = s.tx - a.x, dy = s.ty - a.y, d = Math.hypot(dx, dy), sp = 56 * dt;
    if (d <= sp) { a.x = s.tx; a.y = s.ty; s.on = false; s.at = now + rrange(900, 2200); a.anim = 'idle'; a.animT0 = now; }
    else { a.x += dx / d * sp; a.y += dy / d * sp; if (Math.abs(dx) > 3) a.face = dx > 0 ? 1 : -1; }
  } else {                                           // el ancla puede moverse (la party reajusta su puesto): se acerca sin saltos
    const dx = a.home.x - a.x, dy = a.home.y - a.y, d = Math.hypot(dx, dy);
    if (d > 40) { const sp = 140 * dt, k = Math.min(1, sp / d); a.x += dx * k; a.y += dy * k; }
  }
}

// ---- Avance por fotograma -------------------------------------------------------------------------------------------------
// ctx: { ghost(a), land(a), face(a) → ±1 | 0, script(a, now, dt) }
export function updateActor(a, now, dt, ctx) {
  springStep(a, dt); pruneGhosts(a, now);
  if (a.script) { ctx.script(a, now, dt); }
  else if (a.state === 'react') reactStep(a, now, dt, ctx);
  else if (a.state === 'guard') guardStep(a, now, dt, ctx.face ? ctx.face(a) : 0);
  // fotograma que se dibuja
  const n = frameCount(a.kind, a.anim);
  if (a.fixedFrame != null) a.frame = Math.min(n - 1, a.fixedFrame);
  else a.frame = Math.floor((now - a.animT0) / 1000 * animFps(a.anim)) % n;
}
export function setAnim(a, anim, now) { if (a.anim !== anim) { a.anim = anim; a.animT0 = now; } }
export const toGuard = (a, now) => { a.state = 'guard'; a.priority = 1; a.script = null; a.react = null; a.z = 0; a.anim = 'idle'; a.animT0 = now; a.alpha = 1; a.fixedFrame = null; a.charge = null; a.free = false; a.shuffle.on = false; a.shuffle.at = now + 400; };
