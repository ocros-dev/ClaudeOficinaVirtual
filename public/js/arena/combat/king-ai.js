// Coreografía genérica del rey (dueño: N3). El rey es un actor más: usa las mismas funciones de paso que los héroes.
// Acciones (spec 4.4): respiración y mirada, esquiva (8-12 s o ante un proyectil), zarpazo (6-9 s), embestida (20-30 s),
// rugido (en kingForm y cada 40 s), rayo del rey (25-35 s, aviso de 1,2 s en el suelo y posible choque de rayos),
// teletransporte de sombra (formas 2 y 3) y ataque firma (al menos 1 vez por minuto, de combat/kings/<id>.js).
// Vigilante: si en 5 s no se ha desplazado, hace una esquiva. Nunca se aleja más de 80 px de su puesto.
import * as vfx from '../render/vfx.js';
import { rnd, rrange, reduced, ramp5 } from '../render/vfx.js';
import * as D from './director.js';
import * as A from './actions.js';
import { createActor, setAnim, clampActor } from './actor.js';
import { CX, KING_Y, CFG, KING_MAX_DX } from '../config.js';
import { KING_BY_ID } from '../races.js';
import { signatureOf } from './kings/index.js';

export let king = null;
const SPAWN_MS = CFG.SPAWN_MS || 2000, DYING_MS = CFG.DYING_MS || 2000;
let nextT = {}, lastMoveAt = 0, lastActAt = 0, style = null;
export const kingStyle = () => style;

export function spawn(ev, now) {
  const def = KING_BY_ID[ev.id] || { glow: '#ff6a1a', color: '#ff6a1a' };
  style = { spark: def.glow, spark2: '#ffffff', beam: ramp5(def.glow), projColor: def.glow, projColor2: '#ffffff', light: def.glow };
  const a = createActor({ id: 'king', kind: 'king', ref: { kingId: ev.id, form: ev.form || 1 }, x: CX, y: KING_Y, born: now });
  a.state = 'ai'; a.noFace = true; a.home = { x: CX, y: KING_Y }; a.appear = ev.appear || 'rise'; a.appearAt = now; a.lite = false;
  a.dying = 0; a.lane = null;
  king = a; lastMoveAt = now + SPAWN_MS; lastActAt = now;
  schedule(now + SPAWN_MS);
  vfx.shake(3, 260);
}
function schedule(now) {
  nextT = { dodge: now + rrange(8000, 12000), claw: now + rrange(3500, 6000), lunge: now + rrange(20000, 30000), roar: now + 40000, beam: now + rrange(14000, 22000), tele: now + rrange(12000, 18000), sig: now + rrange(25000, 40000) };
}
export function die(ev, now) {
  if (!king) return;
  if (king.script) { D.releaseBig(king); king.script = null; }
  king.dying = now; king.charge = null; king.halo = null; vfx.shake(4, 300);
}
export function clear() { king = null; }
export function setForm(form) { if (king) king.ref.form = form; }
export const formOf = () => (king ? king.ref.form : 1);

// Un rugido de transformación: interrumpe lo que esté haciendo el rey
export function onForm(ev, now, ctx) {
  if (!king || king.dying) return;
  if (king.script) { D.releaseBig(king); king.script = null; king.charge = null; }
  runScript([nudge(), A.pose('roar', 520), A.fx('form', { form: ev.form }), A.pose('roar', 700), A.fx('cower'), A.fx('shockwave', { r: 170, double: true, shake: true, color: style.spark }), A.wait(260), A.home(200)], now, ctx, { target: null, big: false });
  nextT.roar = now + 40000;
}

function runScript(steps, now, ctx, o = {}) {
  const X = { job: {}, party: null, target: o.target || null, style, speed: 1, fast: false, soft: true, role: 'king', i: 0, enemy: true, big: !!o.big, onDone: null, rainSpots: ctx.rainSpots };
  if (o.big && !D.acquireBig(king)) return false;
  A.startScript(king, steps, X, now);
  lastActAt = now;
  return true;
}
const sideOf = () => (rnd() < .5 ? -1 : 1);
// Paso lateral corto al empezar las acciones que no mueven al rey: así se desplaza al menos cada 5 s
const nudge = () => A.dash({ dx: (king && king.x > CX + 30 ? -1 : sideOf()) * rrange(14, 22), dy: 0 }, 120, { anim: 'lean', ghosts: 1, free: true, quiet: true });
const pickHero = ctx => { const l = ctx.partiesList().filter(p => p.state === 'guard' && p.heroes.length); if (!l.length) return null; const p = l[(rnd() * l.length) | 0]; return p.heroes[0]; };

// Esquiva lateral con imagen residual; se usa también ante un proyectil y como vigilante
export function dodge(now, ctx) {
  if (!king || king.script || king.dying || now - king.appearAt < SPAWN_MS) return false;
  const side = Math.abs(king.x - CX) > 40 ? (king.x > CX ? -1 : 1) : sideOf();
  return runScript([A.dash({ dx: side * rrange(26, 40), dy: 0 }, 130, { anim: 'lean', ghosts: 2, free: true }), A.pose('lean', 140), A.home(260)], now, ctx);
}

export function update(now, dt, ctx) {
  const a = king; if (!a) return;
  const t = now - a.appearAt;
  if (a.dying) { if (now - a.dying > DYING_MS + 200) a.hidden = true; return; }
  if (t < SPAWN_MS) return;                                         // aparece: sin IA
  if (Math.hypot(a.x - a.home.x, a.y - a.home.y) > 8) lastMoveAt = now;
  if (a.script) return;
  a.anim === 'idle' || setAnim(a, 'idle', now);
  // el rey vuelve siempre a su puesto cuando no hace nada
  const dx = a.home.x - a.x, dy = a.home.y - a.y;
  if (Math.abs(dx) + Math.abs(dy) > .5) { const k = Math.min(1, 90 * dt / (Math.hypot(dx, dy) || 1)); a.x += dx * k; a.y += dy * k; }
  if (now - lastActAt < 900) return;                                // pausa mínima entre acciones propias
  const hero = pickHero(ctx), form = a.ref.form || 1;
  const due = k => now >= nextT[k];
  if (due('roar')) { nextT.roar = now + 40000; return void runScript([nudge(), A.pose('roar', 900), A.fx('cower'), A.fx('shockwave', { r: 150, double: true, shake: true, color: style.spark }), A.wait(200), A.home(200)], now, ctx); }
  if (due('beam') && hero) {
    nextT.beam = now + rrange(25000, 35000);
    // con una party de etapa ≥ 3 el rayo busca el choque
    const clashP = ctx.partiesList().find(p => p.stage >= 3 && p.state === 'guard' && p.heroes.length && !p.cur);
    const tgt = clashP && D.clashCan(now) ? (clashP.full ? clashP.heroes[1] : clashP.heroes[0]) : hero;
    const ok = runScript([nudge(), A.fx('telegraph', { ms: 1200, r: 80 }), A.charge(1200, { ring: 'embers', size: 40, tap: false, color: style.spark }), A.beam(700, { big: true, w: 44 }), A.wait(120), A.home(220)], now, ctx, { target: tgt, big: true });
    if (!ok) nextT.beam = now + 3000;                               // sin ficha: se aplaza 3 s
    return;
  }
  if (due('sig')) {
    nextT.sig = now + rrange(40000, 55000);
    const ok = runScript([nudge(), ...signatureOf(a.ref.kingId)({ form, kingId: a.ref.kingId, color: style.spark }), A.home(240)], now, ctx, { target: hero, big: true });
    if (!ok) nextT.sig = now + 3000;
    return;
  }
  if (due('lunge') && hero) {
    nextT.lunge = now + rrange(20000, 30000);
    return void runScript([A.pose('lean', 260), A.dash({ dx: 0, dy: 52 }, 220, { anim: 'lunge', ghosts: 3, free: true }), A.strike('lunge', 260, { big: true, knock: 0, fx: 'blast', lunge: 0, still: false }), A.fx('shockwave', { r: 130, shake: true, color: style.spark }), A.wait(180), A.home(460)], now, ctx, { target: hero });
  }
  if (due('claw') && hero) {
    nextT.claw = now + rrange(6000, 9000);
    return void runScript([A.pose('lean', 320), A.dash({ dx: 0, dy: 24 }, 120, { anim: 'lean', ghosts: 0, free: true }), A.strike('claw', 280, { big: true, knock: 0, fx: 'slash', lunge: 0 }), A.fx('wave', { big: true }), A.wait(120), A.home(320)], now, ctx, { target: hero });
  }
  if (due('tele') && form >= 2) {
    nextT.tele = now + rrange(15000, 22000);
    const side = Math.abs(a.x - CX) > 30 ? (a.x > CX ? -1 : 1) : sideOf();
    return void runScript([A.teleport({ x: CX + side * 72, y: KING_Y }, 200, { ghosts: 4 }), A.pose('lean', 240), A.wait(500), A.teleport('home', 200, { ghosts: 3 }), A.home(0)], now, ctx, { target: null });
  }
  if (due('dodge') || now - lastMoveAt > 5000) { nextT.dodge = now + rrange(8000, 12000); lastMoveAt = now; dodge(now, ctx); }
}

// Datos para dibujar
export function appearK(now) { return king ? Math.min(1, (now - king.appearAt) / SPAWN_MS) : 1; }
