// Choque de rayos (dueño: N3). Lo inicia el rayo del rey si hay una party de etapa ≥ 3 (o el rayo de esa party
// mientras el rey carga). Dura 1,5 s: los dos haces se encuentran en un punto con onda y chispas; el punto oscila
// como mucho 40 px y acaba SIEMPRE a favor de la party, con impulso grande al rey. Destello solo en la zona del choque.
// Con movimiento reducido no hay choque animado: solo un destello fijo (lo resuelve el paso `beam`, que no llama aquí).
import * as vfx from '../render/vfx.js';
import { reduced, rrange } from '../render/vfx.js';
import * as D from './director.js';
import * as A from './actions.js';
import { kick } from './actor.js';
import { sfx } from '../../sound.js';

export const CLASH_MS = 1500;
let C = null;
export const active = () => !!C;

// ¿Puede esta party (etapa ≥ 3) chocar? Distancia o magia, o la vanguardia si es de solo vanguardia
export function partyCanClash(p) { return p && p.stage >= 3 && p.state === 'guard'; }
export function clashHero(p) { return p.full ? p.heroes[1] : p.heroes[0]; }

// a: quien inicia (rey o héroe) y ya está en su paso `beam`; ctx: { king(), partyOf(hero) }
// Devuelve true si el choque empezó (el paso `beam` no hace su impacto inicial)
export function tryStart(a, X, s, now, ctx) {
  if (reduced() || C || !D.clashCan(now) || !s.b) return false;
  const king = ctx.king(); if (!king) return false;
  let hero, kingSide;
  if (a.kind === 'king') {
    hero = X.target; kingSide = a;
    if (!hero || hero.kind !== 'hero') return false;
    const p = ctx.party(hero.party); if (!partyCanClash(p) || hero !== clashHero(p)) { hero = p && clashHero(p); if (!partyCanClash(p) || !hero || hero.script) return false; }
  } else {
    hero = a; kingSide = king; const p = ctx.party(a.party);
    if (!partyCanClash(p) || a !== clashHero(p) || !king.charge || X.target !== king) return false;
  }
  const S = a.script; if (!S) return false;
  D.clashBegin();
  const other = a.kind === 'king' ? hero : king;
  // el que inicia alarga su paso a la duración del choque (y no se acelera)
  S.steps[S.i].ms = CLASH_MS; S.p = 0; X.noCompress = true; X.speed = 1; s.b.locked = true; s.b.dur = CLASH_MS + 120;
  // el otro pasa a una pose de disparo y recibe su propio haz
  if (other.script) { D.releaseBig(other); other.script = null; }
  other.charge = null;
  const X2 = { target: a, style: X.style, speed: 1, role: 'ranged', i: 0, noCompress: true, soft: true, job: {}, onDone: null };
  A.startScript(other, [A.pose(other.kind === 'king' ? 'beam' : 'fire', CLASH_MS)], X2, now);
  const mo = A.muzzleOf(other), mi = A.muzzleOf(a);
  const style = other.kind === 'king' ? (X.style && X.style.beam) || 'violet' : (ctx.heroRamp(other) || 'violet');
  const bo = vfx.beam({ x0: mo.x, y0: mo.y, x1: mi.x, y1: mi.y, ramp: style, w: other.kind === 'king' ? 38 : 28, dur: CLASH_MS + 120, grow: 140, fade: 200, lite: false });
  bo.locked = true;
  C = { t0: now, a, other, king: kingSide, hero, bi: s.b, bo, u: .5, nextArc: now, pulse: 0, ctx };
  sfx.clash?.();
  vfx.ring((mo.x + mi.x) / 2, (mo.y + mi.y) / 2, { r1: 50, color: '#ffffff', squash: 1, w: 3, life: 300 });
  return true;
}

export function update(now) {
  if (!C) return;
  const c = C, k = Math.min(1, (now - c.t0) / CLASH_MS);
  const heroB = c.hero === c.a ? c.bi : c.bo, kingB = c.hero === c.a ? c.bo : c.bi;
  const hm = A.muzzleOf(c.hero), km = A.muzzleOf(c.king), L = Math.hypot(km.x - hm.x, km.y - hm.y) || 1;
  // punto de choque a lo largo de la línea héroe → rey: oscila ±40 px y en el último cuarto avanza hacia el rey
  const osc = Math.sin((now - c.t0) / 85) * 28 + Math.sin((now - c.t0) / 190) * 12;
  const push = k > .72 ? (k - .72) / .28 : 0;
  const u = Math.max(.12, Math.min(.96, .5 + osc / L * (1 - push) + push * .42));
  const P = { x: hm.x + (km.x - hm.x) * u, y: hm.y + (km.y - hm.y) * u };
  heroB.x0 = hm.x; heroB.y0 = hm.y; heroB.x1 = P.x; heroB.y1 = P.y;
  kingB.x0 = km.x; kingB.y0 = km.y; kingB.x1 = P.x; kingB.y1 = P.y;
  if (now >= c.nextArc) {
    c.nextArc = now + 90;
    vfx.arcBolt(P.x, P.y, P.x + rrange(-60, 60), P.y + rrange(-50, 40), { color: '#ffffff', w: 2, jag: 10, branches: 1, life: 140 });
    vfx.spark(P.x, P.y, { color: '#ffffff', color2: (c.a.kind === 'king' ? c.hero : c.a).x ? '#ffe8a0' : '#fff', n: 5, speed: 150, size: 3 });
  }
  c.pulse -= 16;
  if (c.pulse <= 0) { c.pulse = 400; vfx.ring(P.x, P.y, { r0: 6, r1: 40, color: '#ffffff', squash: 1, w: 2, life: 380 }); if (D.flashOk(P.x, P.y, now, 'clash')) vfx.shake(2, 120); }
  c.P = P;
  if (k >= 1) end(now);
}

function end(now) {
  const c = C; C = null;
  const king = c.king, kp = A.bodyPoint(king);
  kick(king, c.hero.x < king.x ? 1 : -1, 16);
  if (D.flashOk(king.x, king.y, now, 'king')) king.flashAt = now;
  vfx.impact(kp.x, kp.y, { kind: 'blast', color: '#ffffff', color2: '#ffe8a0', size: 2 });
  vfx.shockwave(king.x, king.y + 20, { r: 130, color: '#ffffff', double: true });
  vfx.shake(4, 280);
  c.bi.locked = false; c.bi.end(); c.bo.end();
  D.clashEnd(now);
  sfx.hitBig?.();
}
export function abort(now) { if (!C) return; const c = C; C = null; c.bi.locked = false; c.bi.end(); c.bo.end(); D.clashEnd(now); }
export function reset() { C = null; }
