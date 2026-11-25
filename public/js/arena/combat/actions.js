// Acciones como datos (dueño: N3, ADR-A4). Una acción es un guion: lista de pasos creados con las funciones
// de este archivo. Los archivos moves/*.js y kings/*.js SOLO las combinan; nunca tocan actor.x directamente.
// Aquí, y en director.js, se aplican en un único sitio: movimiento reducido, carril, y ≥ 352 de y,
// imágenes residuales, fichas de acciones grandes y la regla de latencia (primer impacto ≤ 250 ms).
import * as vfx from '../render/vfx.js';
import { reduced, rnd, rrange } from '../render/vfx.js';
import * as D from './director.js';
import { kick, addGhost, clampActor, frameCount, setAnim, anchorPt } from './actor.js';
import { MIN_FEET_Y, KING_Y, CX } from '../config.js';
import { sfx } from '../../sound.js';

// ---- Funciones de paso (lo que usan las razas y los reyes) ------------------------------------------------------
// Destinos: 'target.front' | 'target.behind' | 'target.above' | 'target.side' | 'home' | {dx, dy} (dx hacia donde mira) | {x, y}
export const dash = (to, ms = 140, o = {}) => ({ k: 'dash', ms, to, o });                         // arrancada rápida con estela
export const run = (to, ms = 300, o = {}) => ({ k: 'dash', ms, to, o: { anim: 'run', ease: 'lin', ghosts: 0, ...o } });  // carrera
export const leap = (to, ms = 320, o = {}) => ({ k: 'dash', ms, to, o: { anim: 'launched', ease: 'lin', h: 46, ghosts: 0, land: true, ...o } });
export const jumpBack = (dx = -40, ms = 160, o = {}) => ({ k: 'dash', ms, to: { dx }, o: { anim: 'launched', ease: 'out', h: 16, ghosts: 1, free: false, ...o } });
export const sidestep = (dx = 30, ms = 140, o = {}) => ({ k: 'dash', ms, to: { dy: dx }, o: { anim: 'run', ease: 'out', ghosts: 1, free: false, side: true, ...o } });
export const teleport = (to, ms = 120, o = {}) => ({ k: 'teleport', ms, to, o: { ghosts: 3, ...o } });
export const strike = (anim = 'atk1', ms = 180, o = {}) => ({ k: 'strike', ms, anim, o });          // knock, launch, fx, at, lunge, soft, big
export const combo = (anims, ms = 110, o = {}) => anims.map((an, i) => strike(an, ms, { ...o, knock: (o.knock ?? 4) + i * 1.5, lunge: 8 + i * 2, fx: i === anims.length - 1 ? (o.lastFx || o.fx || 'spark') : (o.fx || 'slash'), tilt: i % 2 ? -1 : 1 }));
export const charge = (ms = 500, o = {}) => ({ k: 'charge', ms, o });                               // ring: 'arcs'|'orbs'|'light'|'embers'|'runes', color, tap, from (ancla), keep
export const beam = (ms = 400, o = {}) => ({ k: 'beam', ms, o });                                   // style, big, w, from (ancla)
export const shoot = (proj = 'orb', ms = 320, o = {}) => ({ k: 'shoot', ms, proj, o });             // flight, arc, size, color, count, from, to, spread
export const cast = (ms = 400, o = {}) => ({ k: 'cast', ms, o });                                   // halo, ray, color
export const buff = (roles = ['vanguard', 'ranged'], ms = 1000, o = {}) => ({ k: 'buff', ms, roles, o });
export const home = (ms = 240, o = {}) => ({ k: 'home', ms, o });
export const wait = (ms = 100) => ({ k: 'wait', ms, o: {} });
export const pose = (anim, ms = 200, o = {}) => ({ k: 'pose', ms, anim, o });
export const fx = (name, o = {}) => ({ k: 'fx', ms: o.ms ?? 0, name, o });                          // shockwave, ring, spark, sky, dust, shake
export const rain = (style = 'orb', n = 8, ms = 900, o = {}) => ({ k: 'rain', ms, style, n, o });   // lluvia desde el cielo sobre la zona de combate
export const shakeStep = (amp = 3, ms = 200) => fx('shake', { amp, shakeMs: ms });
export const sound = name => fx('sound', { sound: name });

// ---- Enlaces que rellena combat/index.js (consultas que las acciones necesitan) ---------------------------------------
export const hooks = {
  launchMinion: null, kingDodge: null, incoming: null, incomingParty: null, beamStart: null, beamEnd: null, cower: null, setKingForm: null, now: () => 0, partyHeroes: null, allHeroes: null,
};

const isFreeDest = to => typeof to === 'string' && to.startsWith('target');
const MOVERS = new Set(['dash', 'teleport']);
const MIN_Y = MIN_FEET_Y;

// ---- Compilación: movimiento reducido, comprobaciones de carril y de home() ----------------------------------------------
export function compile(list, a, X) {
  const rm = reduced(), out = [];
  let free = false, homed = true;
  for (const st of list.flat(Infinity)) {
    if (!st) continue;
    const s = { ...st, o: st.o || {} };
    if (rm) {
      switch (s.k) {
        case 'dash': case 'teleport': continue;                                      // el actor se queda en su sitio
        case 'home': s.ms = 0; break;
        case 'strike': s.ms = D.FIXED_FLASH_MS; s.o = { ...s.o, at: .05, lunge: 0, still: true, ghosts: 0 }; break;
        case 'shoot': s.ms = D.FIXED_FLASH_MS; s.o = { ...s.o, at: .05, still: true }; break;
        case 'cast': s.ms = D.FIXED_FLASH_MS; s.o = { ...s.o, still: true, at: .05 }; break;
        case 'charge': continue;                                                      // el rayo se dibuja completo, sin carga animada
        case 'beam': s.ms = Math.min(s.ms, 320); s.o = { ...s.o, still: true }; break;
        case 'rain': s.ms = 200; s.o = { ...s.o, still: true }; break;
        case 'fx': if (!['spark', 'sound', 'form', 'cower'].includes(s.name)) continue; break;
        case 'wait': s.ms = Math.min(s.ms, 120); break;
        default:
      }
    }
    if (s.k === 'dash' && (isFreeDest(s.to) || s.to === 'home' || s.o.free)) free = true;
    if (s.k === 'teleport') free = true;
    if (isFreeDest(s.to) && (s.k === 'dash' || s.k === 'teleport')) homed = false;
    if (s.k === 'home') homed = true;
    out.push(s);
  }
  if (free && !homed && !rm) { D.warn('el guion sale del carril y no termina con home():', a.kind, a.ref && (a.ref.race || a.ref.kingId)); out.push(home(220)); }
  else if (!homed && !rm) out.push(home(220));
  return out;
}

// ---- Arranque y avance de un guion ------------------------------------------------------------------------------------------
// X: { job, target, speed, fast, soft, role, i, slot, party, onDone(a), style }
export function startScript(a, steps, X, now) {
  const list = compile(steps, a, X);
  a.script = { steps: list, i: -1, p: 0, X, s: null, t0: now, big: !!X.big };
  a.state = 'script'; a.priority = 5; a.react = null; a.shuffle.on = false;
  X.startedAt = X.startedAt ?? now;
  nextStep(a, now);
}
function finish(a, now) {
  const S = a.script, X = S.X;
  a.script = null; a.free = false; a.state = 'guard'; a.priority = 1; a.z = 0; a.alpha = 1; a.fixedFrame = null; a.charge = null; a.anim = 'idle'; a.animT0 = now; a.shuffle.at = now + 500; a.shuffle.on = false;
  clampActor(a, false);
  if (S.big) D.releaseBig(a);
  if (X.onDone) X.onDone(a, now);
}
function nextStep(a, now) {
  const S = a.script;
  for (;;) {
    S.i++; S.p = 0;
    if (S.i >= S.steps.length) { finish(a, now); return; }
    beginStep(a, S, S.steps[S.i], now);
    if (S.steps[S.i].ms > 0) return;
    tickStep(a, S, S.steps[S.i], now, 0, 1);            // pasos instantáneos
  }
}

// ---- Resolución de destinos -----------------------------------------------------------------------------------------------------
const sgn = v => v < 0 ? -1 : 1;
function anchorsOf(t, from, X) {
  const side = sgn((from.x - t.x) || ((X.i ?? 0) % 2 ? 1 : -1)), king = t.kind === 'king';
  const off = king ? Math.min(110, (t.fw || 200) * .34) : (t.fw || 40) * .5 + 16;
  const y = Math.max(MIN_Y + (king ? 10 : 0), king ? KING_Y + 22 : t.y + 6);
  const sp = (X.spread || 0);
  return {
    front: { x: t.x + side * (off + sp), y: y + (X.lane ?? 0) * 5 },
    behind: { x: t.x - side * (off + sp), y: y + (X.lane ?? 0) * 5 },
    above: { x: t.x + side * sp * .5, y, z: Math.min(90, (t.fh || 60) * .55) },
    side: { x: t.x + side * (off + 40 + sp), y: y + 14 },
    sideNum: side,
  };
}
function resolve(a, X, to) {
  const t = X.target;
  if (to === 'home') return { x: a.home.x, y: a.home.y, free: true };
  if (typeof to === 'string') {
    if (!t) return { x: a.x + a.face * 60, y: a.y, free: true };
    const an = anchorsOf(t, a, X), p = an[to.split('.')[1]] || an.front;
    return { x: p.x, y: p.y, z: p.z || 0, free: true };
  }
  if (to && to.x !== undefined) return { x: to.x, y: Math.max(MIN_Y, to.y ?? a.y), free: false };
  return { x: a.x + (to.dx ?? 0) * a.face, y: a.y + (to.dy ?? 0), free: false };
}
const ease = { out: p => 1 - (1 - p) * (1 - p), lin: p => p, dash: p => 1 - (1 - p) ** 3, inout: p => p < .5 ? 2 * p * p : 1 - 2 * (1 - p) ** 2 };

// Punto de origen de los proyectiles y rayos del actor. `from` = nombre de un ancla del arte ('mouth', 'hands', 'eyes',
// 'core' en los reyes; 'orb', 'blade', 'jaw', 'bell' en los élites; 'muzzle' en el ojo) o un punto {x, y}.
// Sin `from`: el rey dispara por la boca, los héroes por su ancla muzzle (o la mano cercana) y el resto desde el centro.
export function muzzleOf(a, from) {
  if (from && typeof from === 'object') return from;
  const p = anchorPt(a, from, ...(a.kind === 'king' ? ['mouth', 'eyes'] : ['muzzle', 'haN']));
  if (p) return p;
  if (a.kind === 'king') return { x: a.x + a.recoil.dx, y: a.y - (a.fh || 240) * .62 };
  return { x: a.x + a.face * ((a.fw || 48) * .45), y: a.y - (a.fh || 64) * .58 - a.z };
}
export const bodyPoint = t => ({ x: t.x + t.recoil.dx, y: t.y - t.z - (t.kind === 'king' ? (t.fh || 240) * .45 : (t.fh || 40) * .5) });

// ---- Impacto ---------------------------------------------------------------------------------------------------------------------------
// Efecto del golpe sobre el objetivo: muelle, destello (si lo permite el limitador), chispas, cifra, sonido
export function doImpact(X, a, o = {}) {
  const now = hooks.now(), t = X.target, soft = !!(X.soft || o.soft), at = o.at || (t ? bodyPoint(t) : { x: a.x + a.face * 50, y: a.y - 30 });
  const dir = t ? (sgn(t.x - a.x)) : a.face, job = X.job || {};
  let fxk = o.fx || 'spark';
  if (X.enemy) {                                                   // ataque enemigo: los héroes solo reaccionan (nunca pierden)
    vfx.impact(at.x, at.y, { kind: o.big ? 'blast' : (fxk === 'slash' ? 'slash' : 'spark'), color: X.style?.spark || '#ffffff', face: dir, lite: true });
    if (o.big && !reduced()) vfx.shake(o.shakeAmp ?? 3, 220);
    if (t && t.party && hooks.incomingParty && !o.miss) hooks.incomingParty(t.party, { x: a.x, y: a.y, big: !!o.big }, now);
    (o.big ? sfx.hitBig : sfx.hit)?.call(sfx);
    return;
  }
  if (t) {
    const cap = t.kind === 'hero' ? 10 : 16, kn = Math.min(cap, (o.knock ?? 6) * (soft ? .4 : 1));
    if (!o.miss) {
      kick(t, dir, kn);
      t.hitUntil = now + 170;
      if (!soft && D.flashOk(t.x, t.y, now, t.kind === 'king' ? 'king' : undefined)) t.flashAt = now;
      if (t.kind === 'minion' && !soft && (o.launch || t.condemned) && hooks.launchMinion) hooks.launchMinion(t, dir, a);
    }
  }
  if (!(o.miss || soft && fxk === 'slash')) vfx.impact(at.x, at.y, { kind: o.miss ? 'tap' : fxk, color: X.style?.spark || '#ffffff', color2: X.style?.spark2, face: dir, lite: a.lite });
  else vfx.impact(at.x, at.y, { kind: 'tap', color: X.style?.spark || '#ffffff', lite: a.lite });
  if (o.big && !reduced()) { vfx.shake(o.shakeAmp ?? 3, 220); }
  if (o.big) vfx.ring(at.x, at.y + 10, { r0: 8, r1: 54, life: 360, color: X.style?.spark || '#ffffff', squash: .55, w: 3, still: reduced() });
  if (o.dmg !== false && !soft && !job.numShown && job.pts && t && t.kind !== 'hero') {
    job.numShown = true; vfx.number(at.x, at.y - (t.kind === 'king' ? 30 : 14), job.pts, { big: o.big || job.pts >= 2 });
  }
  if (job.firstAt == null) job.firstAt = now - (job.startAt ?? now);
  if (o.sfx !== false) (o.big ? sfx.hitBig : sfx.hit)?.call(sfx);
}

// ---- Avance de cada paso -------------------------------------------------------------------------------------------------------------
export function tickScript(a, now, dt) {
  const S = a.script; if (!S) return;
  const X = S.X, st = S.steps[S.i];
  if (!st) { finish(a, now); return; }
  const sp = Math.max(1, X.speed || 1) * (X.fast ? 1.15 : 1);
  S.p = st.ms > 0 ? Math.min(1, S.p + dt * 1000 * sp / st.ms) : 1;
  tickStep(a, S, st, now, dt, S.p);
  if (a.script === S && S.p >= 1) { endStep(a, S, st, now); if (a.script === S) nextStep(a, now); }
}
const faceTo = (a, x) => { if (!a.noFace && Math.abs(x - a.x) > 2) a.face = x > a.x ? 1 : -1; };
const fixedFrame = (a, k, anim) => { a.fixedFrame = Math.min(frameCount(a.kind, anim) - 1, Math.floor(k * frameCount(a.kind, anim))); };
const ghostSnap = (a, now, st) => { const n = st.o.ghosts ?? 0; if (n > 0) addGhost(a, now, 230, Math.min(D.ghostsMax(a), n + 1)); };

function beginStep(a, S, st, now) {
  const X = S.X, o = st.o, s = S.s = { x0: a.x, y0: a.y, z0: a.z, lastGhost: now, fired: false, n: 0 };
  a.fixedFrame = null;
  switch (st.k) {
    case 'dash': {
      const d = resolve(a, X, st.to); s.tx = d.x; s.ty = Math.max(a.kind === 'hero' ? MIN_Y : -1e9, d.y); s.free = d.free || !!o.free; s.tz = d.z || 0; if (s.free && a.kind === 'hero') a.free = true;
      const dist = Math.hypot(s.tx - a.x, s.ty - a.y);
      if (!o.side && !(o.anim === 'launched')) faceTo(a, s.tx);
      else if (o.side) faceTo(a, X.target ? X.target.x : s.tx);
      setAnim(a, o.anim || 'run', now);
      if (dist > 40 && !o.quiet) { vfx.dust(a.x, a.y, { face: a.face, lite: a.lite, n: 5 }); if (o.anim !== 'launched') sfx.dash?.(); }
      if (o.ghosts) ghostSnap(a, now, st);
      break;
    }
    case 'teleport': {
      const d = resolve(a, X, st.to); s.tx = d.x; s.ty = Math.max(MIN_Y, d.y); s.free = true; s.jumped = false; if (a.kind === 'hero') a.free = true;
      setAnim(a, 'idle', now);
      vfx.spark(a.x, a.y - (a.fh || 60) * .5, { color: X.style?.spark || '#d8c4ff', color2: '#ffffff', n: 10, speed: 120, lite: a.lite });
      const n = Math.min(o.ghosts ?? 3, D.ghostsMax(a));
      for (let i = 0; i < n; i++) {                                               // residuales repartidos por el camino
        const f = (i + 1) / (n + 1);
        a.ghosts.push({ x: a.x + (s.tx - a.x) * f, y: a.y + (s.ty - a.y) * f, z: 0, face: s.tx >= a.x ? 1 : -1, anim: 'run', frame: i % 4, t0: now + i * 14, life: 300 + i * 30, alpha: .5 });
      }
      if (a.ghosts.length > 4) a.ghosts.splice(0, a.ghosts.length - 4);
      sfx.teleport?.();
      faceTo(a, s.tx);
      break;
    }
    case 'strike': {
      if (X.target) faceTo(a, X.target.x);
      setAnim(a, st.anim, now); s.n = frameCount(a.kind, st.anim);
      if (st.o.fast !== false && X.fast) s.at = Math.min(.3, o.at ?? .42); else s.at = o.at ?? .42;
      break;
    }
    case 'charge': {
      if (X.target) faceTo(a, X.target.x);
      setAnim(a, a.kind === 'king' ? 'charge' : 'charge', now);
      a.charge = { t0: now, ms: st.ms, style: o.ring || 'arcs', color: o.color || X.style?.beam?.[3] || X.style?.spark || '#d8c4ff', color2: o.color2 || '#ffffff', size: o.size ?? 16, from: o.from };
      // toque de energía a los ~190 ms (o a mitad de una carga corta): el primer impacto llega pronto
      s.tapAt = o.tap === false ? 2 : Math.min(.45, 190 / Math.max(1, st.ms));
      sfx.charge?.();
      break;
    }
    case 'beam': {
      const t = X.target;
      if (t) faceTo(a, t.x);
      setAnim(a, a.kind === 'king' ? 'beam' : 'fire', now);
      const m = muzzleOf(a, o.from), e = t ? bodyPoint(t) : { x: m.x + a.face * 300, y: m.y };
      const ramp = X.style?.beam || o.style || 'violet';
      s.b = vfx.beam({ x0: m.x, y0: m.y, x1: e.x, y1: e.y, ramp: o.ramp || ramp, w: o.w ?? (o.big ? 30 : 20), dur: st.ms + 40, grow: 110, fade: 160, lite: a.lite });
      s.tick = 0;
      sfx.beam?.();
      s.b.locked = false;
      if (!(hooks.beamStart && hooks.beamStart(a, X, s))) doImpact(X, a, { knock: o.knock ?? 10, fx: 'blast', big: true, shakeAmp: 3 });
      break;
    }
    case 'shoot': {
      if (X.target) faceTo(a, X.target.x);
      setAnim(a, 'fire', now); s.n = frameCount(a.kind, 'fire'); s.count = 0;
      break;
    }
    case 'cast': {
      if (X.target) faceTo(a, X.target.x);
      setAnim(a, a.kind === 'king' ? 'cast' : 'cast', now);
      if (o.halo !== false) a.halo = { t0: now, ms: st.ms, color: o.color || X.style?.light || '#e0d0ff' };
      sfx.cast?.();
      break;
    }
    case 'buff': {
      const heroes = hooks.partyHeroes ? hooks.partyHeroes(X.party) : [];
      for (const h of heroes) if (h !== a && (!st.roles || st.roles.includes(h.role))) {
        h.buffUntil = now + st.ms; h.halo = { t0: now, ms: st.ms, color: o.color || X.style?.light || '#e0d0ff' };
        vfx.ring(h.x, h.y - 4, { r0: 6, r1: 38, life: 420, color: X.style?.light || '#e0d0ff', squash: .35, w: 2, still: true });
        vfx.spark(h.x, h.y - (h.fh || 60) * .5, { color: '#ffffff', color2: X.style?.light || '#e0d0ff', n: 8, speed: 60, up: 60, lite: a.lite });
      }
      break;
    }
    case 'home': {
      s.tx = a.home.x; s.ty = a.home.y; s.free = true;
      if (st.ms > 0 && Math.hypot(a.home.x - a.x, a.home.y - a.y) > 30) { setAnim(a, 'run', now); faceTo(a, s.tx); if (o.ghosts) ghostSnap(a, now, st); }
      else setAnim(a, 'idle', now);
      break;
    }
    case 'pose': setAnim(a, st.anim, now); break;
    case 'wait': if (a.anim !== 'idle' && a.anim !== 'block') setAnim(a, 'idle', now); break;
    case 'rain': s.next = 0; break;
    default:
  }
}

function tickStep(a, S, st, now, dt, p) {
  const s = S.s, X = S.X, o = st.o;
  switch (st.k) {
    case 'dash': {
      const e = (ease[o.ease || 'dash'] || ease.dash)(p);
      a.x = s.x0 + (s.tx - s.x0) * e; a.y = s.y0 + (s.ty - s.y0) * e;
      if (o.h) a.z = Math.sin(p * Math.PI) * o.h; else a.z = s.z0 + ((s.tz || 0) - s.z0) * e;
      if (a.anim === 'launched') a.fixedFrame = p < .5 ? 0 : 1;
      if (o.ghosts && now - s.lastGhost > 38) { s.lastGhost = now; ghostSnap(a, now, st); if (!a.lite) vfx.speedLines(a.x, a.y, a.face, { h: a.fh * .8, lite: a.lite }); }
      clampActor(a, s.free);
      break;
    }
    case 'teleport': {
      if (p < .4) a.alpha = 1 - p / .4;
      else {
        if (!s.jumped) {
          s.jumped = true; a.x = s.tx; a.y = s.ty; a.z = s.tz || 0; clampActor(a, true);
          if (X.target) faceTo(a, X.target.x);
          vfx.spark(a.x, a.y - (a.fh || 60) * .5, { color: X.style?.spark || '#d8c4ff', color2: '#ffffff', n: 12, speed: 150, lite: a.lite });
          vfx.ring(a.x, a.y, { r0: 4, r1: 36, life: 260, color: X.style?.spark || '#d8c4ff', squash: .35, w: 2, still: true });
        }
        a.alpha = Math.min(1, (p - .4) / .45);
      }
      break;
    }
    case 'strike': {
      const n = s.n || 1;
      a.fixedFrame = Math.min(n - 1, Math.floor(p * n));
      const lung = o.lunge ?? 10;
      if (lung && !o.still) a.x = s.x0 + a.face * lung * Math.sin(Math.min(1, p / .8) * Math.PI) * (X.target && Math.abs(X.target.x - a.x) < 140 ? 1 : .6);
      if (!s.fired && p >= s.at) {
        s.fired = true;
        doImpact(X, a, { knock: o.knock, launch: o.launch, fx: o.fx || (o.launch ? 'blast' : 'spark'), big: !!(o.big || o.launch), soft: o.soft });
        if (o.launch && !reduced()) { vfx.shake(2, 180); sfx.slash?.(); }
        if (o.wave && !reduced()) vfx.shockwave(X.target ? X.target.x : a.x, (X.target ? X.target.y : a.y), { r: 70, color: X.style?.spark, lite: a.lite });
      }
      clampActor(a, X.freeStrike);
      break;
    }
    case 'charge': {
      a.fixedFrame = Math.min(frameCount(a.kind, a.anim) - 1, Math.floor(p * frameCount(a.kind, a.anim)));
      if (!s.fired && p >= s.tapAt && X.target) {                                    // toque de energía: el primer impacto llega pronto
        s.fired = true;
        const m = muzzleOf(a, o.from), e = bodyPoint(X.target);
        vfx.arcBolt(m.x, m.y, e.x, e.y, { color: a.charge ? a.charge.color : '#d8c4ff', w: 1, jag: 8, branches: 0, life: 160 });
        doImpact(X, a, { knock: 3, fx: 'spark' });
      }
      break;
    }
    case 'beam': {
      a.fixedFrame = Math.min(1, Math.floor(p * 2));
      const m = muzzleOf(a, o.from), t = X.target, e = t ? bodyPoint(t) : null;
      if (s.b && s.b.on && !s.b.locked) { s.b.x0 = m.x; s.b.y0 = m.y; if (e) { s.b.x1 = e.x; s.b.y1 = e.y; } }
      s.tick += dt * 1000;
      if (s.tick > 130 && p < .9 && !(s.b && s.b.locked)) { s.tick = 0; if (e) { doImpact(X, a, { knock: 2, fx: 'spark', dmg: false, sfx: false, soft: false }); } }
      break;
    }
    case 'shoot': {
      const n = s.n || 1; a.fixedFrame = Math.min(n - 1, Math.floor(p * n));
      const count = o.count || 1;
      while (s.count < count && p >= (o.at ?? .3) + s.count * (o.gap ?? .12)) { s.count++; fireProjectile(a, X, st, s.count); }
      break;
    }
    case 'cast': {
      const n = frameCount(a.kind, a.anim); a.fixedFrame = Math.min(n - 1, Math.floor(p * n));
      if (!s.fired && p >= (o.at ?? .35)) {
        s.fired = true;
        if (X.target && o.ray !== false && (X.role === 'support' || o.ray)) {
          const m = muzzleOf(a, o.from), e = bodyPoint(X.target);
          vfx.beam({ x0: m.x, y0: m.y, x1: e.x, y1: e.y, ramp: X.style?.lightRamp || 'white', w: 8, dur: 160, grow: 40, fade: 120, lite: true });
          doImpact(X, a, { knock: 4, fx: 'spark' });
        } else if (X.target && o.hit) doImpact(X, a, { knock: 4, fx: 'spark' });
      }
      break;
    }
    case 'home': {
      if (st.ms > 0) {
        const e = ease.out(p); a.x = s.x0 + (s.tx - s.x0) * e; a.y = s.y0 + (s.ty - s.y0) * e; a.z = s.z0 * (1 - e);
        if (o.ghosts && now - s.lastGhost > 40) { s.lastGhost = now; ghostSnap(a, now, st); }
      } else { a.x = s.tx; a.y = s.ty; a.z = 0; }
      break;
    }
    case 'fx': runFx(a, X, st, now); break;
    case 'rain': {
      const gap = 1 / Math.max(1, st.n);
      while (s.next < st.n && p >= s.next * gap * .85) { dropOne(a, X, st, s.next); s.next++; }
      break;
    }
    default:
  }
}
function endStep(a, S, st, now) {
  const s = S.s;
  switch (st.k) {
    case 'dash': a.z = st.o.h ? 0 : (s.tz || 0); if (st.o.land && !reduced()) { vfx.shockwave(a.x, a.y, { r: 46, lite: a.lite, dust: 5 }); sfx.land?.(); } if (!st.o.free && !s.free) clampActor(a, false); break;
    case 'teleport': a.alpha = 1; a.z = s.tz || 0; break;
    case 'strike': a.x = Math.max(-1e5, a.x); break;
    case 'beam': if (s.b && !s.b.locked) s.b.end(); a.charge = null; if (hooks.beamEnd) hooks.beamEnd(a, S.X, s); break;
    case 'charge': if (!st.o.keep) a.charge = null; break;                        // la carga termina con su paso (keep: sigue en el siguiente)
    case 'cast': a.halo = null; break;
    case 'home': a.x = s.tx; a.y = s.ty; a.z = 0; a.alpha = 1; a.free = false; break;
    default:
  }
  a.fixedFrame = null;
}

// ---- Proyectiles, efectos instantáneos y lluvia ----------------------------------------------------------------------------------
const PROJ_COLOR = { orb: '#d8c4ff', arrow: '#e8dcc0', bolt: '#d8c4ff', fire: '#ff8a28', ice: '#a8d0ff', shadow: '#7a38b8', plague: '#b8c83a', dart: '#c8d0e0', wave: '#e8dcc0', star: '#d8d0ff', moon: '#c8e0ff' };
// Destino propio de un proyectil: punto {x, y}, función (a, X, n) => punto, 'far' (el héroe más lejano del lanzador; con
// varios disparos va rotando de uno a otro, así el enjambre cruza la pantalla) o 'party' (un héroe cualquiera).
function destOf(a, X, to, n) {
  if (typeof to === 'function') return to(a, X, n);
  if (to && typeof to === 'object') return to;
  const list = (hooks.allHeroes ? hooks.allHeroes() : []).filter(h => h.visible !== false);
  if (!list.length) return null;
  if (to === 'far') { list.sort((p, q) => Math.abs(q.x - a.x) - Math.abs(p.x - a.x)); const h = list[(n - 1) % Math.min(list.length, 4)]; return { x: h.x, y: h.y - (h.fh || 60) * .5 }; }
  const h = list[(n * 7 + 3) % list.length]; return { x: h.x, y: h.y - (h.fh || 60) * .5 };
}
function fireProjectile(a, X, st, n) {
  const o = st.o, t = X.target, m = muzzleOf(a, o.from || (a.kind === 'king' ? 'hands' : undefined)), style = st.proj || 'orb', col = o.color || X.style?.projColor || PROJ_COLOR[style] || '#fff';
  const custom = o.to ? destOf(a, X, o.to, n) : null;                                   // destino propio: sin seguimiento ni esquiva
  const e = custom || (t ? bodyPoint(t) : { x: m.x + a.face * 300, y: m.y });
  if (o.still || reduced()) { if (custom) vfx.impact(e.x, e.y, { kind: 'spark', color: col, lite: true }); else doImpact(X, a, { knock: o.knock ?? 6, fx: o.fx || 'spark', miss: false }); return; }
  const jy = ((n - 1) % 2 ? -14 : 14 * (n > 1 ? 1 : 0)) + (o.spread ? ((n - 1) % 3 - 1) * o.spread : 0);
  const dodge = !custom && t && t.kind === 'king' && n === 1 && rnd() < .3 && hooks.kingDodge && hooks.kingDodge(t, a, o.flight ?? 170);
  vfx.projectile({
    x: m.x, y: m.y, tx: e.x, ty: e.y + jy, dur: o.flight ?? 170, style, color: col, color2: o.color2 || X.style?.projColor2 || '#ffffff', size: o.size ?? 1, arc: o.arc ?? 0, face: e.x >= m.x ? 1 : -1, lite: a.lite, through: dodge,
    track: dodge || !t || custom ? null : () => bodyPoint(t),
    onArrive: p => {
      if (custom) {                                                                    // cae en un punto: reacciona la party que esté allí
        vfx.impact(p.x, p.y, { kind: o.big ? 'blast' : 'spark', color: col, lite: true }); if (o.big && !reduced()) vfx.shake(2, 160);
        if (hooks.incoming) hooks.incoming(p.x, p.y, { big: !!o.big, from: a });
        sfx.hit?.(); return;
      }
      doImpact(X, a, { knock: o.knock ?? 6, fx: o.fx || (style === 'orb' || style === 'fire' ? 'blast' : 'spark'), miss: !!dodge, at: { x: p.x, y: p.y }, big: !!o.big });
    },
  });
  sfx.shoot?.();
}
function runFx(a, X, st, now) {
  const o = st.o, t = X.target, at = o.at === 'target' && t ? bodyPoint(t) : { x: a.x, y: a.y - (a.fh || 60) * .5 };
  const col = o.color || X.style?.spark || '#ffffff';
  switch (st.name) {
    case 'shockwave': vfx.shockwave(o.at === 'target' && t ? t.x : a.x, o.at === 'target' && t ? t.y : a.y, { r: o.r ?? 80, color: col, lite: a.lite, double: o.double }); if (o.shake) vfx.shake(3, 220); break;
    case 'ring': vfx.ring(at.x, at.y, { r1: o.r ?? 50, color: col, life: o.life ?? 360, squash: o.squash ?? .8, w: 3 }); break;
    case 'spark': vfx.spark(at.x, at.y, { color: col, color2: o.color2, n: o.n ?? 10, speed: o.speed ?? 120, lite: a.lite }); break;
    case 'dust': vfx.dust(a.x, a.y, { face: a.face, n: o.n ?? 6, lite: a.lite }); break;
    case 'sky': { const tx = o.at === 'target' && t ? t.x : a.x, ty = o.at === 'target' && t ? t.y : a.y; vfx.skyBolt(tx, ty, { color: col, r: o.r ?? 60 }); sfx.thunder?.(o.delay ?? 0); if (!reduced()) vfx.shake(2, 200); break; }
    case 'shake': vfx.shake(o.amp ?? 3, o.shakeMs ?? 200); break;
    case 'sound': sfx[o.sound]?.(); break;
    case 'cower': if (hooks.cower) hooks.cower(); break;
    case 'form': if (hooks.setKingForm) hooks.setKingForm(o.form); break;
    case 'telegraph': { const q = X.target; if (q) { const tg = vfx.telegraph(q.x, q.y + 4, { r: o.r ?? 70, dur: o.ms ?? 1200, color: o.color || '#ff4a4a' }); (X.tels || (X.tels = [])).push(tg); } break; }
    case 'wave': {                                                  // onda pegada al suelo hacia el objetivo (zarpazo del rey)
      if (!t) break;
      const hp = anchorPt(a, o.from || 'hands'), sx = hp && a.kind === 'king' ? hp.x : a.x + a.face * 30;
      const scale = o.scale ?? (a.kind === 'king' ? Math.max(1, Math.min(1.8, (a.fw || 260) / 260)) : 1);      // el rey grande lanza una onda grande
      vfx.projectile({ x: sx, y: a.y + 6, tx: t.x, ty: t.y - 4, dur: o.ms2 ?? 260, style: 'wave', color: col, color2: '#ffffff', size: 1.6 * scale, face: sgn(t.x - sx), lite: a.lite,
        onArrive: () => doImpact(X, a, { fx: 'blast', big: !!o.big }) });
      break;
    }
    default:
  }
}
function dropOne(a, X, st, i) {
  const o = st.o, party = hooks.partyHeroes ? hooks.partyHeroes(null) : [];
  const spots = X.rainSpots ? X.rainSpots() : [{ x: CX + (rnd() - .5) * 600, y: 430 + rnd() * 100 }];
  const sp = spots[(i + (rnd() * spots.length | 0)) % spots.length], col = o.color || X.style?.projColor || PROJ_COLOR[st.style] || '#ff8a28';
  const x = sp.x + (rnd() - .5) * 50, y = sp.y;
  if (st.o.still || reduced()) { vfx.impact(x, y - 10, { kind: 'spark', color: col, lite: true }); return; }
  vfx.projectile({ x: x - 60, y: -20, tx: x, ty: y, dur: 380 + rnd() * 120, style: st.style === 'orb' ? 'fire' : st.style, color: col, color2: '#ffffff', size: 1.1, face: 1, lite: true,
    onArrive: () => { vfx.shockwave(x, y, { r: 54, color: col, lite: true, dust: 4 }); vfx.impact(x, y - 8, { kind: 'blast', color: col, lite: true }); if (hooks.incoming) hooks.incoming(x, y, { big: false, from: a }); } });
}
