// Secuaces y élites (dueño: N3 → EN-AI). Comportamiento visual: las reglas deciden quién vive y la vida;
// aquí se mueven, atacan a las parties (solo visual: los héroes reaccionan, nunca pierden), reaccionan a los golpes y mueren
// con espectáculo. Todo son planes de fases { ms, begin(a, s), on(a, k, s), end(a, s) } que avanza runPlan.
//  Secuaces: patrullan en zigzag separándose entre sí; cada 7-11 s se lanzan en GRUPO (2-3 a la vez): rodean a una party
//   por los flancos, algunos hacen fintas y golpean escalonados, y rebotan de vuelta. Murciélago: pica desde arriba; ojo: salva
//   de láseres. A veces uno suelto embiste. Al ser golpeados salen volando dando vueltas, rebotan y estallan, y empujan a
//   los vecinos. Los condenados (minionKill) salen despedidos en el primer impacto de la party.
//  Élites: guardaespaldas del rey. Se interponen entre el rey y la party que ataca, retroceden al ser golpeados, a veces
//   esquivan con imagen residual y contraatacan; cada 15-22 s hacen un ataque especial de área con aviso en el suelo
//   (verdugo: terremoto; brujo: lluvia de sombras; cancerbero: estampida; heraldo: alarido que alborota a los secuaces).
// Con movimiento reducido no hay patrullas ni planes: pose quieta en su sitio y destello al golpe.
import * as vfx from '../render/vfx.js';
import { rnd, rrange, seeded, reduced } from '../render/vfx.js';
import * as D from './director.js';
import { createActor, updateActor, kick, setAnim, addGhost, anchorPt } from './actor.js';
import { CX, KING_Y, MIN_FEET_Y } from '../config.js';
import { sfx } from '../../sound.js';

export const minions = new Map(), elites = new Map();
const MAX_ATTACKERS = 3;
let colorGlow = '#ff6a1a', cowerUntil = 0, swarmAt = 0, specialUntil = 0;
export const setGlow = c => { colorGlow = c || colorGlow; };
export const cower = (now, ms = 900) => { cowerUntil = now + ms; };
const attackers = () => { let n = 0; for (const m of minions.values()) if (m.plan) n++; return n; };
export const enemy = (kind, id) => (kind === 'minion' ? minions : kind === 'elite' ? elites : null)?.get(id) || null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = k => 1 - (1 - k) ** 2;
const sgn = v => (v < 0 ? -1 : 1);

// ---- Altas ---------------------------------------------------------------------------------------------------------------
export function spawnMinion(ev, now) {
  const r = seeded((ev.id * 2654435761) | 0), type = ev.enemy || ev.type;
  const hx = 100 + r() * 760, hy = type === 'murcielago' ? KING_Y - 64 + r() * 68 : type === 'sombra' ? KING_Y + 24 + r() * 16 : type === 'ojo' ? KING_Y - 36 + r() * 44 : KING_Y - 4 + r() * 36;
  const a = createActor({ id: ev.id, kind: 'minion', ref: { type }, x: CX + (r() - .5) * 80, y: KING_Y + 4, born: now });
  a.state = 'ai'; a.noFace = false; a.hx = hx; a.hy = Math.max(type === 'murcielago' ? 0 : MIN_FEET_Y - 40, hy); a.seed = r() * 10; a.nextAtk = now + 6000 + r() * 6000; a.mode = 'patrol'; a.plan = null;
  a.z = type === 'murcielago' ? 22 : type === 'ojo' ? 18 : 0; a.lite = false; a._seen = 0;
  if (!minions.size) swarmAt = Math.max(swarmAt, now + 4000);          // el primer enjambre no llega nada más aparecer
  minions.set(ev.id, a);
  vfx.spark(a.x, a.y - 10, { color: colorGlow, n: 6, speed: 70, lite: true });
}
export function killMinion(ev, now) {
  const m = minions.get(ev.id); if (!m || m.dead) return;
  m.condemned = { t: now, by: ev.by };
  m.plan = null; m.charge = null;
  if (ev.by == null) { m.explodeAt = now + rnd() * 650; }              // murió el rey: explotan en cadena
}
// Sale volando: arco alto, giros en el aire, estela, rebote y estallido. dirX: hacia dónde lo empuja el golpe
export function launchMinion(m, dirX, attacker) {
  if (m.dead || m.launch) return;
  const now = nowRef;
  m.plan = null; m.charge = null; m.mode = 'launched';
  const dist = rrange(110, 180) * (reduced() ? 0 : 1);
  m.launch = { t0: now, dur: reduced() ? 150 : 780, x0: m.x, y0: m.y, z0: m.z || 0, dx: dirX * dist, dy: rrange(-12, 14), h: reduced() ? 0 : rrange(70, 110) + (m.z || 0), bounced: false, spin: rnd() < .5 ? 1 : -1 };
  setAnim(m, 'launched', now);
  if (!reduced()) { vfx.speedLines(m.x, m.y - 14, dirX, { lite: true }); vfx.dust(m.x, m.y, { n: 3, face: dirX, lite: true }); }
}
export function spawnElite(ev, now) {
  const side = ev.side || 1, y = KING_Y + 16;
  const a = createActor({ id: ev.id, kind: 'elite', ref: { type: ev.enemy || ev.type }, x: CX + side * 236, y, born: now, face: -side });
  a.state = 'ai'; a.side = side; a.homeX = a.x; a.homeY = y; a.mode = 'idle'; a.plan = null; a.nextAtk = now + 2500 + rnd() * 2000; a.seed = rnd() * 10;
  a.nextSpecial = now + rrange(9000, 14000); a.counterAt = 0; a.dodgeAt = now + 3000; a.off = { x: 0, y: 0 }; a._seen = 0; a._script = null;
  a.z = (ev.enemy || ev.type) === 'heraldo' ? 22 : 0;
  elites.set(ev.id, a);
  vfx.spark(a.x, a.y - 30, { color: colorGlow, color2: '#ffffff', n: 14, speed: 120, lite: false });
  vfx.ring(a.x, a.y, { r1: 60, color: colorGlow, squash: .35, w: 3, still: true });
}
// Golpe que las reglas dan al élite (eliteHit): reacciona al instante (destello y retroceso) sin esperar al impacto
// visual del héroe; eliteReact deduplica con el impacto que llega después (hitUntil).
export function hitElite(ev, now) {
  const e = elites.get(ev.id); if (!e || e.dying) return;
  e.hitEv = now;
  if (D.flashOk(e.x, e.y, now)) e.flashAt = now;
}
export function downElite(ev, now) {
  const e = elites.get(ev.id); if (!e || e.dying) return;
  e.dying = now; e.plan = null; e.charge = null; e.dodge = null; kick(e, -e.side, 18); e.flashAt = D.flashOk(e.x, e.y, now) ? now : e.flashAt;
  vfx.spark(e.x, e.y - 30, { color: '#ffffff', color2: colorGlow, n: 20, speed: 200, size: 3 });
  vfx.ring(e.x, e.y - 20, { r1: 70, color: colorGlow, squash: .6, w: 3, still: true });
  if (!reduced()) vfx.shake(2, 200);
}
export function clearAll() { minions.clear(); elites.clear(); swarmAt = 0; specialUntil = 0; }

// ---- Consultas ---------------------------------------------------------------------------------------------------------------
// Secuaz más cercano a una party (para que la regla 1.1 elija objetivo con posiciones reales)
export function nearestMinionTo(x, y) {
  let best = null, bd = 1e9;
  for (const m of minions.values()) if (!m.dead && !m.condemned && !m.launch) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } }
  return best;
}

// ---- Planes: lista de fases { ms, begin(a, s), on(a, k, s), end(a, s) } ---------------------------------------------------------------
let nowRef = 0;
function runPlan(a, now, dt) {
  const S = a.plan; if (!S) return false;
  let ph = S.phases[S.i];
  if (!ph) { a.plan = null; return false; }
  if (!S.started) { S.started = true; S.t0 = now; S.s = { x0: a.x, y0: a.y, z0: a.z }; if (ph.begin) ph.begin(a, S.s, now); }
  const k = Math.min(1, (now - S.t0) / Math.max(1, ph.ms));
  if (ph.on) ph.on(a, k, S.s, now);
  if (k >= 1) { if (ph.end) ph.end(a, S.s, now); S.i++; S.started = false; if (S.i >= S.phases.length) { a.plan = null; return false; } }
  return true;
}
const makePlan = (phases, now) => ({ phases, i: 0, started: false, t0: now });
const facing = (a, x) => { if (Math.abs(x - a.x) > 2) a.face = x > a.x ? 1 : -1; };
const guards = ctx => ctx.partiesList().filter(p => p.state === 'guard' && p.heroes.length);

function pickHero(ctx) {
  const list = guards(ctx);
  if (!list.length) return null;
  const p = list[(rnd() * list.length) | 0];
  return { p, h: p.heroes[0] };
}
function nearestHero(ctx, x, y) {
  let best = null, bd = 1e9;
  for (const p of guards(ctx)) { const h = p.heroes[0], d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = { p, h }; } }
  return best;
}
const hit = (ctx, tgt, a, big = false, now = nowRef) => { if (tgt) { ctx.incoming(tgt.p.name, { x: a.x, y: a.y, big }, now); vfx.impact(tgt.h.x, tgt.h.y - 30, { kind: big ? 'blast' : 'spark', color: colorGlow, lite: true }); sfx.hit?.(); } };
// Ataque de área: reaccionan las parties con algún héroe dentro de la elipse (cx, cy, rx, ry)
function areaHit(ctx, a, cx, cy, rx, ry, big, now = nowRef) {
  for (const p of guards(ctx)) {
    if (!p.heroes.some(h => ((h.x - cx) / rx) ** 2 + ((h.y - cy) / ry) ** 2 <= 1)) continue;
    ctx.incoming(p.name, { x: cx, y: cy, big }, now);
    vfx.impact(p.heroes[0].x, p.heroes[0].y - 30, { kind: big ? 'blast' : 'spark', color: colorGlow, lite: true });
  }
  sfx.hitBig?.();
}

// ---- Secuaces: planes ---------------------------------------------------------------------------------------------------------------
// Embestida suelta (con finta a veces) y picado del murciélago, láser del ojo
function minionPlan(a, ctx, now) {
  const tgt = pickHero(ctx); if (!tgt) return null;
  const tx = tgt.h.x + (rnd() - .5) * 30, ty = Math.max(MIN_FEET_Y, tgt.h.y - 6);
  const back = { x: a.hx, y: a.hy };
  switch (a.ref.type) {
    case 'murcielago': return [                                           // picado: baja en arco y vuelve a subir
      { ms: 220, begin: m => { m.anim = 'move'; facing(m, tx); }, on: (m, k, s) => { m.x = lerp(s.x0, s.x0 + (tx - s.x0) * .3, k); m.z = s.z0 + Math.sin(k * Math.PI) * 14; } },
      { ms: 360, begin: m => { facing(m, tx); setAnim(m, 'atk', nowRef); }, on: (m, k, s) => { m.x = lerp(s.x0, tx, easeOut(k)); m.y = lerp(s.y0, ty, easeOut(k)); m.z = lerp(s.z0, 6, easeOut(k)); }, end: m => hit(ctx, tgt, m) },
      { ms: 480, begin: m => setAnim(m, 'move', nowRef), on: (m, k, s) => { m.x = lerp(s.x0, back.x, easeOut(k)); m.y = lerp(s.y0, back.y, easeOut(k)); m.z = lerp(s.z0, 22, easeOut(k)); } },
    ];
    case 'ojo': return [                                                   // láser fino: avisa con un punto que crece y dispara
      { ms: 520, begin: m => { m.charge = { t0: nowRef, ms: 520, style: 'orbs', color: colorGlow, color2: '#ffffff', size: 6 }; facing(m, tgt.h.x); }, on: (m, k) => { m.z = 18 + Math.sin(k * 20) * 1; } },
      { ms: 240, begin: m => { m.charge = null; beamAt(m, tgt, ctx); } },
    ];
    default: {                                                             // diablillo y sombra: finta, embestida y rebote
      const feint = rnd() < .45;
      return [
        { ms: 220, begin: m => { setAnim(m, 'move', nowRef); facing(m, tx); }, on: (m, k, s) => { m.x = lerp(s.x0, s.x0 - m.face * 14, easeOut(k)); } },      // se agacha un poco hacia atrás
        ...(feint ? [{ ms: 300, begin: m => { setAnim(m, 'atk', nowRef); }, on: (m, k, s) => { m.x = s.x0 + (tx - s.x0) * .3 * Math.sin(k * Math.PI); } }, { ms: 140, begin: m => setAnim(m, 'move', nowRef) }] : []),
        { ms: 260, begin: m => { setAnim(m, 'atk', nowRef); }, on: (m, k, s) => { m.x = lerp(s.x0, tx, k); m.y = lerp(s.y0, ty, k); if (!reduced() && !m.lite && Math.floor(k * 10) % 3 === 0) vfx.trail(m.x, m.y - 6, { color: colorGlow }); }, end: m => { hit(ctx, tgt, m); vfx.dust(m.x, m.y, { n: 4, face: m.face }); } },
        { ms: 420, begin: m => setAnim(m, 'move', nowRef), on: (m, k, s) => { m.x = lerp(s.x0, back.x, easeOut(k)); m.y = lerp(s.y0, back.y, easeOut(k)); m.z = Math.sin(k * Math.PI) * 26; }, end: m => { m.z = 0; } },
      ];
    }
  }
}
function beamAt(m, tgt, ctx) {
  const o = anchorPt(m, 'muzzle') || { x: m.x, y: m.y - m.z - 10 };
  m.b = vfx.beam({ x0: o.x, y0: o.y, x1: tgt.h.x, y1: tgt.h.y - 36, ramp: ctx.glowRamp(), w: 7, dur: 200, grow: 40, fade: 90, lite: true, flare: false });
  sfx.beam?.(); hit(ctx, tgt, m);
}

// Ataque en grupo: cada miembro rodea a la party por su lado (side: -1 izquierda, 1 derecha, 0 desde arriba), espera su turno
// (idx escalona los golpes 230 ms), a veces hace una finta, golpea y rebota de vuelta a su puesto de patrulla
function swarmPlan(a, tgt, side, idx, ctx) {
  const type = a.ref.type, hero = tgt.h, wait = 140 + idx * 230;
  const flyer = type === 'murcielago', eye = type === 'ojo', feint = !eye && idx > 0 && rnd() < .5;
  const spot = () => ({ x: clamp(hero.x + (side || (rnd() < .5 ? -1 : 1)) * (eye ? 170 : 80), 50, 910), y: Math.max(MIN_FEET_Y + 2, hero.y + (side ? 4 : -26)) });
  const back = { x: a.hx + rrange(-20, 20), y: a.hy };
  let sp = null, hop = 0;
  const approach = {
    ms: 520, begin: m => { sp = spot(); setAnim(m, 'move', nowRef); facing(m, hero.x); },
    on: (m, k, s) => {
      const e = easeOut(k); m.x = lerp(s.x0, sp.x, e); m.y = lerp(s.y0, eye ? clamp(sp.y - 50, MIN_FEET_Y - 40, 600) : sp.y, e); facing(m, hero.x);
      m.z = flyer ? lerp(s.z0, 40, e) : eye ? 18 + Math.sin(k * 9) * 2 : Math.abs(Math.sin(k * Math.PI * 3)) * 9;
      if (!reduced() && !flyer && !eye && !m.lite && Math.floor(k * 12) !== hop) { hop = Math.floor(k * 12); if (hop % 4 === 0) vfx.dust(m.x, m.y, { n: 1, face: m.face, lite: true }); }
    },
  };
  const hold = {
    ms: wait, begin: m => setAnim(m, flyer || eye ? 'move' : 'idle', nowRef),
    on: (m, k, s) => { facing(m, hero.x); m.x = s.x0 + Math.sin(k * 40) * 1.2; m.z = flyer ? 40 + Math.sin(k * 14) * 3 : eye ? 18 + Math.sin(k * 8) * 2 : 0; },
  };
  const phases = [approach, hold];
  if (eye) {                                                              // el ojo carga y dispara a la vez que el resto golpea
    phases.push({ ms: 420, begin: m => { m.charge = { t0: nowRef, ms: 420, style: 'orbs', color: colorGlow, color2: '#ffffff', size: 6 }; }, on: m => facing(m, hero.x) });
    phases.push({ ms: 260, begin: m => { m.charge = null; beamAt(m, tgt, ctx); } });
    phases.push({ ms: 420, begin: m => setAnim(m, 'move', nowRef), on: (m, k, s) => { m.x = lerp(s.x0, back.x, easeOut(k)); m.y = lerp(s.y0, back.y, easeOut(k)); m.z = 18; } });
    return phases;
  }
  if (feint) phases.push({ ms: 260, begin: m => setAnim(m, 'atk', nowRef), on: (m, k, s) => { m.x = s.x0 + (hero.x - s.x0) * .28 * Math.sin(k * Math.PI); } }, { ms: 120, begin: m => setAnim(m, 'move', nowRef) });
  phases.push({
    ms: flyer ? 340 : 230,
    begin: m => setAnim(m, 'atk', nowRef),
    on: (m, k, s) => {
      const hx = hero.x + (side || 1) * (flyer ? 8 : 20), hy = Math.max(MIN_FEET_Y, hero.y + (flyer ? -4 : 2)), e = flyer ? easeOut(k) : k;
      m.x = lerp(s.x0, hx, e); m.y = lerp(s.y0, hy, e); facing(m, hero.x);
      m.z = flyer ? lerp(s.z0, 8, e) : 0;
      if (!reduced() && !m.lite && Math.floor(k * 10) % 3 === 0) vfx.trail(m.x, m.y - (flyer ? m.z : 6), { color: colorGlow });
    },
    end: m => { hit(ctx, tgt, m); vfx.dust(m.x, m.y, { n: 4, face: m.face }); },
  });
  phases.push({
    ms: 520, begin: m => setAnim(m, 'move', nowRef),
    on: (m, k, s) => { m.x = lerp(s.x0, back.x, easeOut(k)); m.y = lerp(s.y0, back.y, easeOut(k)); m.z = flyer ? lerp(s.z0, 22, easeOut(k)) : Math.sin(k * Math.PI) * 30; },
    end: m => { m.z = flyer ? 22 : 0; },
  });
  return phases;
}
// Lanza a 2-3 secuaces libres sobre una party a la vez, uno por cada lado
function startSwarm(now, ctx) {
  const tgt = pickHero(ctx); if (!tgt) return false;
  const free = [...minions.values()].filter(m => !m.dead && !m.condemned && !m.launch && !m.plan && m.mode === 'patrol');
  if (free.length < 2) return false;
  free.sort((p, q) => Math.hypot(p.x - tgt.h.x, p.y - tgt.h.y) - Math.hypot(q.x - tgt.h.x, q.y - tgt.h.y));
  const team = free.slice(0, Math.min(MAX_ATTACKERS, free.length)).sort((p, q) => p.x - q.x);
  const sides = team.length === 2 ? [-1, 1] : [-1, 1, 0];
  const order = team.map((m, i) => ({ m, side: i === 0 ? sides[0] : i === team.length - 1 ? sides[1] : sides[2] }));
  order.forEach(({ m, side }, i) => { m.mode = 'swarm'; m.plan = makePlan(swarmPlan(m, tgt, side, i, ctx), now); });
  return true;
}

// ---- Secuaces: actualización ----------------------------------------------------------------------------------------------------
function updateMinion(a, now, dt, ctx) {
  if (a.explodeAt && now >= a.explodeAt) return explode(a, now);
  if (a.mode === 'launched') return updateLaunch(a, now, dt);
  if (a.condemned) {                                                   // espera el primer impacto; a los 800 ms sale despedido igualmente
    if (!a.explodeAt && now - a.condemned.t > 800) launchMinion(a, a.x < CX ? -1 : 1, null);
    return;
  }
  const t = now / 1000 + a.seed, type = a.ref.type, rm = reduced();
  if (!a.plan && (a.mode === 'swarm' || a.mode === 'solo')) a.mode = 'patrol';      // un plan cancelado (pausa, golpe) deja libre al secuaz
  if (rm) {                                                            // movimiento reducido: quietos en su sitio
    a.x = a.hx; a.y = a.hy; a.zoom = 1; a.plan = null; a.charge = null; a.mode = 'patrol';
    a.z = type === 'murcielago' ? 22 : type === 'ojo' ? 18 : 0; setAnim(a, 'idle', now); return;
  }
  // golpe suave (práctica de una party): se sobresalta con un saltito y se enfada
  if (a.hitUntil !== a._seen) {
    a._seen = a.hitUntil;
    if (a.hitUntil > 0) { a.plan = null; a.charge = null; a.mode = 'patrol'; a.flinch = now; a.nextAtk = Math.min(a.nextAtk, now + 1800); }
  }
  if (a.flinch && now - a.flinch < 260) {
    const k = (now - a.flinch) / 260; a.z = (type === 'murcielago' ? 22 : type === 'ojo' ? 18 : 0) + Math.sin(k * Math.PI) * 14; setAnim(a, 'launched', now); return;
  } else if (a.flinch) a.flinch = 0;
  if (a.plan) { if (!runPlan(a, now, dt)) { a.mode = 'patrol'; a.zoom = 1; } return; }
  // patrulla en zigzag
  let tx = a.hx, ty = a.hy;
  if (type === 'murcielago') { tx = a.hx + Math.sin(t * 1.3) * 52; ty = a.hy + Math.sin(t * 2.1) * 12; }
  else if (type === 'sombra') tx = a.hx + Math.sin(t * .7) * 60;
  else if (type === 'ojo') { ty = a.hy + Math.sin(t * 1.6) * 6; tx = a.hx + Math.sin(t * .5) * 30; }
  else { tx = a.hx + Math.sin(t * .9) * 46; ty = a.hy + Math.cos(t * 1.7) * 10; }
  for (const o of minions.values()) {                                  // se separan entre sí para no amontonarse
    if (o === a || o.dead) continue;
    const ox = a.x - o.x, oy = a.y - o.y, d = Math.hypot(ox, oy);
    if (d < 34 && d > .1) { tx += ox / d * (34 - d) * .8; ty += oy / d * (34 - d) * .4; }
  }
  const cow = now < cowerUntil;                                        // el rey ruge: se encogen
  if (cow) { ty += 6; }
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), sp = (type === 'murcielago' ? 120 : 76) * dt;
  if (d > .5) { const k = Math.min(1, sp / d); a.x += dx * k; a.y += dy * k; }
  a.y = Math.max(type === 'murcielago' ? 0 : MIN_FEET_Y - 40, a.y);
  if (a.dead) return;
  a.face = dx < -.4 ? -1 : dx > .4 ? 1 : a.face;
  setAnim(a, d > 3 ? 'move' : 'idle', now);
  a.zoom = cow ? .8 : 1;
  const born = now - a.born;
  if (type === 'murcielago') a.z = 22 + Math.sin(t * 5) * 3; else if (type === 'ojo') a.z = 18 + Math.sin(t * 3) * 2;
  else a.z = born < 700 ? Math.sin(born / 700 * Math.PI) * 24 : 0;     // salen del rey de un salto
  if (now >= a.nextAtk && !cow) {
    a.nextAtk = now + rrange(7000, 12000);
    if (attackers() === 0 && now < swarmAt - 2000) { const ph = minionPlan(a, ctx, now); if (ph) { a.mode = 'solo'; a.plan = makePlan(ph, now); } }   // uno suelto, lejos del turno del enjambre
  }
}
// Un golpe fuerte también aparta a los vecinos
function shoveNeighbors(a, dirX) {
  for (const o of minions.values()) {
    if (o === a || o.dead || o.condemned || o.launch) continue;
    const d = Math.hypot(o.x - a.x, o.y - a.y);
    if (d < 80) { kick(o, o.x >= a.x ? 1 : -1, 12); o.flinch = nowRef; o.plan = null; o.charge = null; o.mode = 'patrol'; }
  }
}
function updateLaunch(a, now, dt) {
  const L = a.launch, k = Math.min(1, (now - L.t0) / L.dur);
  a.x = L.x0 + L.dx * easeOut(k); a.y = Math.max(MIN_FEET_Y - 60, L.y0 + L.dy * easeOut(k));
  a.z = Math.sin(Math.min(1, k * 1.5) * Math.PI) * L.h * (k < .67 ? 1 : 0.0);
  if (k > .67) { const kk = (k - .67) / .33; a.z = Math.sin(kk * Math.PI) * L.h * .25; }   // un rebote pequeño
  if (k < .67 && !reduced()) a.face = Math.floor((now - L.t0) / 85) % 2 ? -L.spin : L.spin;   // da vueltas en el aire
  if (!L.bounced && k >= .67) { L.bounced = true; vfx.dust(a.x, a.y, { n: 5, lite: true }); if (!reduced()) vfx.ring(a.x, a.y, { r1: 26, color: '#e8dcc0', squash: .35, w: 2, life: 260 }); }
  if (!reduced() && Math.floor(now / 40) % 2) vfx.trail(a.x, a.y - a.z - 8, { color: colorGlow, size: 3 });
  if (k >= 1) explode(a, now);
}
function explode(a, now) {
  if (a.dead) return;
  a.dead = true; a.dyingAt = now;
  vfx.spark(a.x, a.y - a.z - 8, { color: '#ffffff', color2: colorGlow, n: 14, speed: 150, size: 3, lite: false });
  vfx.ring(a.x, a.y - a.z - 8, { r1: 34, color: colorGlow, squash: .8, w: 2, still: true });
  if (D.flashOk(a.x, a.y, now)) a.flashAt = now;
  if (!reduced()) shoveNeighbors(a, a.launch ? sgn(a.launch.dx) : 1);
  sfx.hit?.();
}

// ---- Élites: planes ------------------------------------------------------------------------------------------------------------------------
// fast: contraataque (menos preparación). H(): puesto actual de guardia del élite (sigue al rey)
function elitePlan(a, ctx, now, tgt, fast = false) {
  tgt = tgt || pickHero(ctx); if (!tgt) return null;
  const hx = tgt.h.x, H = () => ({ x: a.homeX, y: a.homeY });
  const type = a.ref.type, toward = Math.sign(hx - a.x) || -a.side, w = fast ? .55 : 1;
  switch (type) {
    case 'verdugo': return [
      { ms: 360 * w, begin: m => { setAnim(m, 'move', nowRef); facing(m, hx); }, on: (m, k, s) => { m.x = lerp(s.x0, s.x0 + toward * 90, easeOut(k)); m.y = lerp(s.y0, Math.max(s.y0, Math.min(tgt.h.y - 90, s.y0 + 50)), easeOut(k)); } },
      { ms: 520 * w, begin: m => setAnim(m, 'atk', nowRef), on: (m, k) => { m.fixedFrame = Math.min(2, Math.floor(k * 3)); }, end: m => {
        if (!reduced()) { vfx.shockwave((anchorPt(m, 'blade') || { x: m.x + toward * 40 }).x, m.y, { r: 90, color: colorGlow, double: true }); vfx.shake(3, 220); sfx.slash?.(); }
        vfx.projectile({ x: (anchorPt(m, 'blade') || { x: m.x + toward * 30 }).x, y: m.y - 6, tx: tgt.h.x, ty: tgt.h.y - 6, dur: 300, style: 'wave', color: colorGlow, color2: '#ffffff', size: 1.4, face: toward, lite: false, onArrive: () => hit(ctx, tgt, m, true) });
        m.fixedFrame = null; } },
      { ms: 480, begin: m => { setAnim(m, 'special', nowRef); m.shield = nowRef + 480; }, on: (m, k, s) => { const h = H(); m.x = lerp(s.x0, h.x, easeOut(k)); m.y = lerp(s.y0, h.y, easeOut(k)); } },
    ];
    case 'brujo': return [
      { ms: 200, begin: m => { setAnim(m, 'special', nowRef); vfx.spark(m.x, m.y - 40, { color: colorGlow, n: 10, speed: 100 }); }, on: (m, k) => { m.alpha = 1 - k; } },
      { ms: 160, begin: m => { m.x = clamp(m.x + (rnd() < .5 ? -1 : 1) * rrange(60, 90), 120, 840); m.y = H().y + rrange(-10, 10); vfx.spark(m.x, m.y - 40, { color: colorGlow, color2: '#fff', n: 10, speed: 110 }); facing(m, hx); }, on: (m, k) => { m.alpha = k; } },
      { ms: 420 * w, begin: m => { setAnim(m, 'atk', nowRef); m.charge = { t0: nowRef, ms: 420 * w, style: 'runes', color: colorGlow, color2: '#fff', size: 12 }; },
        end: m => { m.charge = null; vfx.projectile({ x: (anchorPt(m, 'orb') || { x: m.x + m.face * 24 }).x, y: (anchorPt(m, 'orb') || { y: m.y - 44 }).y, tx: tgt.h.x, ty: tgt.h.y - 34, dur: 340, style: 'shadow', color: '#7a38b8', color2: colorGlow, size: 1.3, lite: false, onArrive: () => hit(ctx, tgt, m, false) }); } },
      { ms: 300, begin: m => setAnim(m, 'idle', nowRef), on: (m, k, s) => { const h = H(); m.x = lerp(s.x0, h.x, k); m.y = lerp(s.y0, h.y, k); } },
    ];
    case 'cancerbero': return [
      { ms: 260 * w, begin: m => { setAnim(m, 'move', nowRef); facing(m, hx); }, on: (m, k, s) => { m.x = lerp(s.x0, s.x0 + toward * 40, k); } },
      { ms: 340, begin: m => { setAnim(m, 'move', nowRef); }, on: (m, k, s) => { m.x = lerp(s.x0, hx - toward * 40, easeOut(k)); m.y = lerp(s.y0, Math.max(s.y0, tgt.h.y - 30), easeOut(k)); if (!reduced() && Math.floor(k * 12) % 3 === 0) { vfx.dust(m.x, m.y, { n: 1, face: m.face, lite: true }); vfx.trail(m.x, m.y - 14, { color: colorGlow }); } } },
      { ms: 260, begin: m => setAnim(m, 'atk', nowRef), on: (m, k) => { m.fixedFrame = Math.min(2, Math.floor(k * 3)); if (k > .4 && !m.bit1) { m.bit1 = true; hit(ctx, tgt, m); } if (k > .85 && !m.bit2) { m.bit2 = true; hit(ctx, tgt, m, false); } }, end: m => { m.bit1 = m.bit2 = false; m.fixedFrame = null; } },
      { ms: 480, begin: m => setAnim(m, 'move', nowRef), on: (m, k, s) => { const h = H(); m.x = lerp(s.x0, h.x, easeOut(k)); m.y = lerp(s.y0, h.y, easeOut(k)); m.z = Math.abs(Math.sin(k * Math.PI * 2)) * 24; }, end: m => { m.z = 0; } },
    ];
    default: return [                                                   // heraldo: picado, trompeta (onda) y vuelta a volar
      { ms: 380 * w, begin: m => { setAnim(m, 'move', nowRef); facing(m, hx); }, on: (m, k, s) => { m.x = lerp(s.x0, hx - toward * 60, easeOut(k)); m.y = lerp(s.y0, Math.max(s.y0, Math.min(tgt.h.y - 60, s.y0 + 80)), easeOut(k)); m.z = lerp(s.z0, 40, Math.sin(k * Math.PI)); } },
      { ms: 460 * w, begin: m => setAnim(m, 'special', nowRef), on: (m, k) => { m.fixedFrame = Math.min(1, Math.floor(k * 2)); if (k > .3 && !m.horn) { m.horn = true; if (!reduced()) { { const b = anchorPt(m, 'bell') || { x: m.x + m.face * 20, y: m.y - 60 }; vfx.ring(b.x, b.y, { r1: 120, color: colorGlow, squash: .7, w: 3, life: 500 }); } vfx.shake(2, 180); } sfx.elite?.(); } }, end: m => { m.horn = false; m.fixedFrame = null; hit(ctx, tgt, m, true); } },
      { ms: 520, begin: m => setAnim(m, 'move', nowRef), on: (m, k, s) => { const h = H(); m.x = lerp(s.x0, h.x, easeOut(k)); m.y = lerp(s.y0, h.y, easeOut(k)); m.z = lerp(s.z0, 22, easeOut(k)); } },
    ];
  }
}
// Ataque especial de área, siempre con aviso en el suelo de 0,7-1 s
function eliteSpecial(a, ctx, now) {
  const list = guards(ctx); if (!list.length) return null;
  const H = () => ({ x: a.homeX, y: a.homeY }), type = a.ref.type;
  const back = (ms = 520) => ({ ms, begin: m => setAnim(m, type === 'heraldo' || type === 'cancerbero' ? 'move' : 'idle', nowRef), on: (m, k, s) => { const h = H(); m.x = lerp(s.x0, h.x, easeOut(k)); m.y = lerp(s.y0, h.y, easeOut(k)); m.z = lerp(s.z0, type === 'heraldo' ? 22 : 0, easeOut(k)); } });
  switch (type) {
    case 'verdugo': {                                                      // terremoto: salta y se estrella, onda a su alrededor
      const R = 170;
      return [
        { ms: 800, begin: m => { setAnim(m, 'special', nowRef); m.charge = { t0: nowRef, ms: 800, style: 'embers', color: colorGlow, color2: '#ffffff', size: 14 }; vfx.telegraph(m.x, m.y, { r: R, dur: 800, color: colorGlow, squash: .42 }); sfx.elite?.(); } },
        { ms: 300, begin: m => { m.charge = null; }, on: (m, k, s) => { m.z = lerp(s.z0, 70, easeOut(k)); } },
        { ms: 140, begin: m => setAnim(m, 'atk', nowRef), on: (m, k, s) => { m.z = lerp(70, 0, k * k); m.fixedFrame = 2; }, end: m => {
          m.fixedFrame = null; m.z = 0; vfx.shockwave(m.x, m.y, { r: R, color: colorGlow, double: true, dust: 12 }); vfx.shake(5, 320); vfx.impact(m.x, m.y - 10, { kind: 'shock', color: colorGlow });
          areaHit(ctx, m, m.x, m.y, R, R * .42, true); } },
        { ms: 480, begin: m => { m.shield = nowRef + 480; setAnim(m, 'special', nowRef); }, on: (m, k, s) => { const h = H(); m.x = lerp(s.x0, h.x, easeOut(k)); m.y = lerp(s.y0, h.y, easeOut(k)); } },
      ];
    }
    case 'brujo': {                                                         // lluvia de sombras sobre las parties
      const spots = list.slice(0, 3).map(p => { const h = p.heroes[0]; return { p, x: clamp(h.x + rrange(-24, 24), 50, 910), y: Math.max(MIN_FEET_Y + 6, h.y), fired: false }; });
      return [
        { ms: 900, begin: m => { setAnim(m, 'special', nowRef); m.charge = { t0: nowRef, ms: 900, style: 'runes', color: colorGlow, color2: '#fff', size: 14 }; for (const s of spots) vfx.telegraph(s.x, s.y, { r: 46, dur: 900, color: '#7a38b8', squash: .42 }); sfx.elite?.(); },
          on: (m, k, s) => { m.z = lerp(s.z0, 30, easeOut(Math.min(1, k * 2))); } },
        { ms: 640, begin: m => { m.charge = null; setAnim(m, 'atk', nowRef); },
          on: (m, k) => { spots.forEach((s, i) => { if (!s.fired && k >= i * .28) { s.fired = true; vfx.projectile({ x: s.x, y: s.y - 300, tx: s.x, ty: s.y - 10, dur: 240, style: 'shadow', color: '#7a38b8', color2: colorGlow, size: 1.5, onArrive: () => { vfx.impact(s.x, s.y - 10, { kind: 'blast', color: '#7a38b8' }); vfx.ring(s.x, s.y, { r1: 46, color: '#7a38b8', squash: .42, w: 3, life: 340 }); areaHit(ctx, m, s.x, s.y, 56, 26, true); } }); } }); } },
        back(520),
      ];
    }
    case 'cancerbero': {                                                    // estampida: cruza el campo de lado a lado por delante del rey
      const tx = a.x < CX ? 900 : 60, y = KING_Y + 70, done = new Set();
      return [
        { ms: 800, begin: m => { setAnim(m, 'move', nowRef); facing(m, tx); vfx.telegraph(m.x, y, { r: 60, dur: 800, color: colorGlow, squash: .42 }); vfx.telegraph(tx, y, { r: 60, dur: 800, color: colorGlow, squash: .42 }); sfx.elite?.(); },
          on: (m, k, s) => { m.x = s.x0 - sgn(tx - s.x0) * 14 * Math.sin(k * Math.PI * 6) * k; m.y = lerp(s.y0, y, easeOut(k)); } },
        { ms: 780, begin: m => { setAnim(m, 'move', nowRef); done.clear(); },
          on: (m, k, s) => { m.x = lerp(s.x0, tx, k); m.y = y; m.z = Math.abs(Math.sin(k * Math.PI * 7)) * 10;
            if (!reduced() && Math.floor(k * 30) % 2) { vfx.dust(m.x, m.y, { n: 1, face: m.face, lite: true }); vfx.trail(m.x, m.y - 14, { color: colorGlow }); }
            for (const p of guards(ctx)) if (!done.has(p) && Math.abs(p.heroes[0].x - m.x) < 46) { done.add(p); ctx.incoming(p.name, { x: m.x, y: m.y, big: true }, nowRef); vfx.impact(p.heroes[0].x, p.heroes[0].y - 30, { kind: 'blast', color: colorGlow, lite: true }); sfx.hitBig?.(); vfx.shake(2, 140); } } },
        { ms: 260, begin: m => { setAnim(m, 'idle', nowRef); m.z = 0; vfx.dust(m.x, m.y, { n: 8, face: m.face }); } },
        { ms: 700, begin: m => setAnim(m, 'move', nowRef), on: (m, k, s) => { const h = H(); m.x = lerp(s.x0, h.x, easeOut(k)); m.y = lerp(s.y0, h.y, easeOut(k)); m.z = Math.abs(Math.sin(k * Math.PI * 2)) * 18; }, end: m => { m.z = 0; } },
      ];
    }
    default: {                                                              // heraldo: alarido que sacude a las parties y alborota a los secuaces
      const R = 230;
      return [
        { ms: 900, begin: m => { setAnim(m, 'move', nowRef); vfx.telegraph(m.x, m.y + 30, { r: R, dur: 900, color: colorGlow, squash: .36 }); sfx.elite?.(); },
          on: (m, k, s) => { m.y = lerp(s.y0, KING_Y + 40, easeOut(k)); m.z = lerp(s.z0, 60, easeOut(k)); } },
        { ms: 520, begin: m => setAnim(m, 'special', nowRef), on: (m, k) => { m.fixedFrame = Math.min(1, Math.floor(k * 2)); if (k > .25 && !m.horn) { m.horn = true;
            { const b = anchorPt(m, 'bell') || { x: m.x, y: m.y - m.z }; vfx.ring(b.x, b.y, { r1: R, color: colorGlow, squash: .45, w: 4, life: 600 }); vfx.ring(b.x, b.y, { r1: R * .7, color: '#ffffff', squash: .45, w: 2, life: 460, delay: 100 }); }
            vfx.shake(3, 260);
            areaHit(ctx, m, m.x, m.y + 30, R, R * .5, false); swarmAt = Math.min(swarmAt, nowRef + 500); } },        // los secuaces se lanzan a la vez
          end: m => { m.horn = false; m.fixedFrame = null; } },
        back(560),
      ];
    }
  }
}

// ---- Élites: actualización -------------------------------------------------------------------------------------------------------------
// Puesto de guardia: sigue al rey en su flanco y se interpone entre él y la party que ataca (o la más cercana)
function updateHome(a, ctx) {
  const K = ctx.king(), kx = K ? K.x : CX, base = kx + a.side * 236;
  let thr = null, td = 1e9;
  for (const p of guards(ctx)) {
    const h = p.heroes[0], d = Math.abs(h.x - base) - (p.heroes.some(q => q.script) ? 220 : 0);
    if (d < td) { td = d; thr = h; }
  }
  a.threat = thr;
  if (!thr || reduced()) { a.homeX = base; a.homeY = KING_Y + 16; return; }
  const pull = a.ref.type === 'brujo' ? .2 : .38;                         // el brujo se queda más atrás
  a.homeX = clamp(base + (thr.x - base) * pull, 90, 870);
  if (Math.abs(a.homeX - kx) < 140) a.homeX = kx + a.side * 140;
  a.homeY = KING_Y + 16 + (a.ref.type === 'heraldo' ? 0 : 16);          // un paso hacia delante, entre el rey y las parties
}
function startDodge(a, now, fromX) {
  const dir = sgn(a.x - fromX) || a.side;
  a.dodge = { t0: now, ms: 320, dx: dir * rrange(40, 56) }; a.dodgeAt = now + rrange(2800, 4200);
  a.dodgeFrom = a.x;
}
function eliteReact(a, now, ctx) {
  if (reduced() || a.plan) return;
  // golpe recibido: retrocede y se recupera; a veces contraataca enseguida
  const fresh = a.hitUntil !== a._seen || a.hitEv !== a._seenEv;
  a._seen = a.hitUntil; a._seenEv = a.hitEv;
  if (fresh && now - (a.lastReact || -1e9) > 260) {                       // el evento de reglas y el impacto visual cuentan como un solo golpe
    a.lastReact = now;
    if (a.hitUntil > 0 || a.hitEv > 0) {
      const from = a.threat ? a.threat.x : a.x - a.face, dir = sgn(a.x - from) || -a.face;
      a.off.x = clamp(a.off.x + dir * 26, -40, 40); a.off.y = -3; a.hurtUntil = now + 200;
      if (now >= a.counterAt && rnd() < .5 && guards(ctx).length) { a.counterAt = now + 4200; a.counterQ = now + 260; }
    }
  }
  if (a.counterQ && now >= a.counterQ) {
    a.counterQ = 0;
    const tgt = nearestHero(ctx, a.x, a.y), ph = tgt && elitePlan(a, ctx, now, tgt, true);
    if (ph) { a.plan = makePlan(ph, now); a.nextAtk = Math.max(a.nextAtk, now + 3500); return; }
  }
  // un ataque de héroe viene hacia él: a veces lo esquiva de un salto lateral con imagen residual
  if (!a.dodge && now >= a.dodgeAt) {
    for (const p of guards(ctx)) for (const h of p.heroes) {
      const sc = h.script;
      if (sc && sc !== a._script && sc.X && sc.X.target === a) { a._script = sc; if (rnd() < .3) startDodge(a, now, h.x); }
    }
  }
}
function updateElite(a, now, dt, ctx) {
  if (a.dying) { if (now - a.dying > 700) a.dead = true; a.alpha = Math.max(0, 1 - (now - a.dying) / 700); return; }
  a.alpha = Math.min(1, (now - a.born) / 500);
  const type = a.ref.type, rm = reduced();
  updateHome(a, ctx);
  if (a.plan) {
    a._seen = a.hitUntil; a._seenEv = a.hitEv;                          // los golpes durante un ataque no provocan reacción tardía
    runPlan(a, now, dt);
    if (!a.plan) { a.alpha = 1; a.fixedFrame = null; a.charge = null; a.z = type === 'heraldo' ? 22 : 0; a.nextAtk = Math.max(a.nextAtk, now + 1500); }
    return;
  }
  eliteReact(a, now, ctx);
  const t = now / 1000 + a.seed;
  let tx = a.homeX, ty = a.homeY, sp = 90;
  if (rm) { a.x = tx; a.y = ty; setAnim(a, 'idle', now); a.face = a.threat ? sgn(a.threat.x - a.x) : -a.side; return; }
  if (type === 'cancerbero') { tx += a.side * Math.sin(t * .8) * 40; }
  else if (type === 'brujo') { ty += -10 + Math.sin(t * 1.4) * 5; }
  else if (type === 'heraldo') { ty += -8 + Math.sin(t * 1.1) * 6; a.z = 22 + Math.sin(t * 2.2) * 4; }
  a.off.x *= 1 - Math.min(1, 2.2 * dt); a.off.y *= 1 - Math.min(1, 2.2 * dt);
  tx += a.off.x; ty += a.off.y;
  if (Math.abs(a.off.x) > 3) sp = 170;                                  // se recupera del retroceso
  if (a.dodge) {                                                        // paso lateral rápido y vuelta al puesto
    const D0 = a.dodge, k = (now - D0.t0) / D0.ms;
    if (k >= 1) a.dodge = null; else { tx = D0.dodgeX ?? (D0.dodgeX = clamp(D0.dx + a.x, 90, 870)); if (k > .45) tx = lerp(D0.dodgeX, a.homeX, (k - .45) / .55); sp = 420; if (k < .5 && Math.floor(now / 50) !== a._gh) { a._gh = Math.floor(now / 50); addGhost(a, now, 220, 3, .45); } }
  }
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d > .4) { const k = Math.min(1, sp * dt / d); a.x += dx * k; a.y += dy * k; }
  a.face = a.threat ? (Math.abs(a.threat.x - a.x) > 8 ? sgn(a.threat.x - a.x) : a.face) : (type === 'cancerbero' ? (dx < -.1 ? -1 : dx > .1 ? 1 : a.face) : -a.side);
  const moving = (d > 2 && type === 'cancerbero') || a.dodge || Math.abs(a.off.x) > 3;
  if (now < (a.hurtUntil || 0)) setAnim(a, 'hit', now); else setAnim(a, moving ? 'move' : 'idle', now);
  if (now >= a.nextSpecial && now > specialUntil && guards(ctx).length) {
    const ph = eliteSpecial(a, ctx, now);
    a.nextSpecial = now + rrange(15000, 22000);
    if (ph) { a.plan = makePlan(ph, now); specialUntil = now + 4500; a.nextAtk = Math.max(a.nextAtk, now + 5500); return; }
  }
  if (now >= a.nextAtk) { a.nextAtk = now + rrange(4500, 7500); const ph = elitePlan(a, ctx, now); if (ph) a.plan = makePlan(ph, now); }
}

export function update(now, dt, ctx) {
  nowRef = now;
  // Turno del enjambre de secuaces: cada 7-11 s (o antes si el heraldo da la alarma), nunca mientras el rey ruge
  if (!reduced() && now >= swarmAt && now >= cowerUntil && minions.size > 1) {
    swarmAt = now + (startSwarm(now, ctx) ? rrange(7000, 11000) : 1500);
  }
  for (const [id, m] of minions) { updateActor(m, now, dt, {}); if (m.dead && now - (m.dyingAt || 0) > 400) minions.delete(id); else if (!m.dead) updateMinion(m, now, dt, ctx); }
  for (const [id, e] of elites) { updateActor(e, now, dt, {}); if (e.dead) elites.delete(id); else updateElite(e, now, dt, ctx); }
}
