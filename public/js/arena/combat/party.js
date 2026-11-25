// Parties en combate (dueño: N3): actores de los 3 héroes, cola de acciones, ráfaga, guardia viva,
// transformación, celebración, recorridos de entrada y salida y reacciones a los ataques enemigos.
// 1 acción a la vez por party; las que llegan mientras tanto se encolan (máx. 3) y el resto se funde en una
// ráfaga. Con la party ocupada la acción en curso se acelera (×1,6; ×3 si hay algo esperando > 0,3 s) y las
// encoladas se ejecutan en «modo rápido»: así la siguiente empieza en ≤ 0,6 s (ADR-A7).
import * as vfx from '../render/vfx.js';
import { rnd, rrange, reduced } from '../render/vfx.js';
import * as D from './director.js';
import * as A from './actions.js';
import { createActor, updateActor, startReact, addGhost, toGuard, setAnim } from './actor.js';
import { classify, forVanguardOnly, ROLES, ROLE_INDEX } from './toolmap.js';
import { scriptFor, stylesOf } from './moves/index.js';
import { SLOTS, FORM, CFG, laneFor, MIN_FEET_Y, CX, KING_Y } from '../config.js';
import { prewarm } from '../render/links.js';
import { sfx } from '../../sound.js';

export const parties = new Map();
const pending = new Map();                        // partyJoin recibido y todavía sin partyEnter
const MAX_QUEUE = 3, TEAM_GAP_MS = 8000;

export const heroesOf = name => { const p = parties.get(name); return p ? p.heroes : []; };
export const inArena = p => p.state !== 'camp' && p.slot != null;

// ---- Recorrido de entrada y salida ---------------------------------------------------------------------------------
function pathInfo(pts) {
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); tot += d; }
  return { pts, seg, tot };
}
function along(P, k) {
  let d = Math.max(0, Math.min(1, k)) * P.tot;
  for (let i = 0; i < P.seg.length; i++) {
    if (d <= P.seg[i] || i === P.seg.length - 1) {
      const f = P.seg[i] ? Math.min(1, d / P.seg[i]) : 1, a = P.pts[i], b = P.pts[i + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x };
    }
    d -= P.seg[i];
  }
  return { x: P.pts[0].x, y: P.pts[0].y, dx: 0 };
}

// ---- Creación -------------------------------------------------------------------------------------------------------------------
function makeParty(name, info, slot) {
  const p = {
    name, race: info.race || 'humanos', variant: info.variant || 0, slot, full: slot == null || slot < CFG.FULL_PARTIES, stage: info.stage || 1,
    heroes: [], state: 'enter', path: null, t0: 0, dur: 1, off: null, queue: [], cur: null, lastActionAt: 0, lastTeamAt: -1e9, cyc: 0,
    sparAt: 0, sparN: 0, tUntil: 0, tFrom: 1, tSwapped: true, focus: null, anchor: { x: CX, y: 470 }, style: stylesOf(info.race || 'humanos'),
    lastJobAt: 0, joinAt: 0,
  };
  return p;
}
function makeHeroes(p, starts, now) {
  const A0 = p.anchor;
  p.heroes = [0, 1, 2].map(i => {
    if (p.slot != null && p.slot >= CFG.FULL_PARTIES && i > 0) return null;       // las parties de solo vanguardia solo dibujan al héroe 0
    const s = starts && starts[i] ? starts[i] : { x: A0.x + FORM[i][0], y: A0.y + FORM[i][1] };
    const a = createActor({ kind: 'hero', ref: { race: p.race, ci: i, variant: p.variant }, party: p.name, idx: i, x: s.x, y: s.y, face: 1 });
    a.role = ROLES[i]; a.lite = D.isLite(p.slot);
    a.home = { x: A0.x + FORM[i][0], y: A0.y + FORM[i][1] };
    return a;
  }).filter(Boolean);
}

export function onJoin(ev, now) {
  pending.set(ev.name, { race: ev.race, variant: ev.variant, heroes: ev.heroes, stage: ev.stage });
  prewarm({ race: ev.race, variant: ev.variant, stage: ev.stage || 1, group: 'join' });
}
export function onEnter(ev, now) {
  const info = pending.get(ev.name) || {}; pending.delete(ev.name);
  const old = parties.get(ev.name); if (old) dropParty(old);
  const p = makeParty(ev.name, { race: info.race || (old && old.race), variant: info.variant ?? (old && old.variant), stage: info.stage }, ev.slot);
  p.path = pathInfo(ev.path); p.t0 = ev.t0; p.dur = Math.max(1, ev.dur);
  // Salida del campamento: ev.startPose (animación, o una por héroe) durante ev.startMs; después se levantan (idle, 200 ms) y
  // echan a correr. El tiempo total del recorrido (t0 + dur) no cambia: la carrera se comprime. Sin movimiento reducido solo.
  p.startPose = ev.startPose || null; p.hold = reduced() || !p.startPose ? 0 : Math.max(0, Math.min(ev.startMs ?? 700, p.dur * .6));
  const last = ev.path[ev.path.length - 1];
  p.anchor = { x: last.x, y: last.y };
  const st = info.heroes && info.heroes.length === 3 ? info.heroes : null;
  if (st) p.off = [[0, 0], [st[1].x - st[0].x, st[1].y - st[0].y], [st[2].x - st[0].x, st[2].y - st[0].y]];
  makeHeroes(p, null, now);
  for (const h of p.heroes) { const q = along(p.path, 0); h.x = q.x + (p.off ? p.off[h.idx][0] : FORM[h.idx][0]); h.y = q.y + (p.off ? p.off[h.idx][1] : FORM[h.idx][1]); h.visible = true; }
  p.state = 'enter'; p.lastActionAt = now; p.sparAt = now + rrange(4000, 6000);
  parties.set(p.name, p);
}
// partyArrive: también llega solo (parties «rápidas» sin partyEnter): se colocan en su puesto
export function onArrive(ev, now) {
  let p = parties.get(ev.name);
  if (!p) {
    const info = pending.get(ev.name) || {}; pending.delete(ev.name);
    const sl = SLOTS[ev.slot] || SLOTS[0];
    p = makeParty(ev.name, info, ev.slot); p.anchor = { x: sl[0], y: sl[1] };
    makeHeroes(p, null, now); parties.set(p.name, p);
  }
  p.state = 'guard'; p.lastActionAt = now; p.sparAt = now + rrange(2500, 4500);
  for (const h of p.heroes) {
    h.home = { x: p.anchor.x + FORM[h.idx][0], y: p.anchor.y + FORM[h.idx][1] };
    if (h.state === 'enter' || h.state === 'move') { toGuard(h, now); vfx.dust(h.x, h.y, { face: h.face, n: 6, lite: h.lite, power: 1.6 }); }
  }
}
export function onExit(ev, now) {
  const p = parties.get(ev.name); if (!p) return;
  abortAll(p, now); p.queue.length = 0;
  p.path = pathInfo(ev.path); p.t0 = ev.t0; p.dur = Math.max(1, ev.dur); p.off = null; p.state = 'exit';
  for (const h of p.heroes) { toGuard(h, now); h.state = 'exit'; h.shuffle.on = false; }
}
export function dropParty(p) { for (const h of p.heroes) if (h.script) D.releaseBig(h); D.releaseBig(p); parties.delete(p.name); }
export function onToCamp(ev) { const p = parties.get(ev.name); if (p) dropParty(p); pending.delete(ev.name); }
export function clearAll() { for (const p of [...parties.values()]) dropParty(p); pending.clear(); }

// ---- Etapas y celebración ---------------------------------------------------------------------------------------------------------
export function onStage(ev, now) {
  const p = parties.get(ev.name); if (!p) return;
  abortAll(p, now);
  p.state = 'transform'; p.tFrom = p.stage; p.tTo = ev.to; p.tSwapped = false; p.t0x = now;
  p.tDur = reduced() ? 300 : (ev.to >= 4 ? (CFG.PARTY_FX_LATE_MS || 1400) : (CFG.PARTY_FX_MS || 900)); p.tUntil = now + p.tDur; p.tBolt = false;
  for (const h of p.heroes) { h.state = 'transform'; h.priority = 10; h.shuffle.on = false; setAnim(h, 'transform', now); h.fixedFrame = null; }
  prewarm({ race: p.race, variant: p.variant, stage: ev.to, group: 'join', prio: 0 });
  sfx.heroUp?.();
}
export function onCelebrate(ev, now) {
  const p = parties.get(ev.name); if (!p) return;
  abortAll(p, now); p.queue.length = 0; p.state = 'celebrate'; p.tUntil = now + (CFG.CELEBRATE_MS || 2000);
  for (const h of p.heroes) { toGuard(h, now); h.state = 'celebrate'; setAnim(h, 'victory', now); }
}
function abortAll(p, now) {
  for (const h of p.heroes) { if (h.script) { D.releaseBig(h); h.script = null; } h.charge = null; h.halo = null; h.react = null; h.z = 0; h.alpha = 1; h.fixedFrame = null; }
  D.releaseBig(p);
  p.cur = null;
}

// ---- Trabajos (acciones) ------------------------------------------------------------------------------------------------------------
function resolveTarget(job, kingActor, enemies) {
  const t = job.target;
  if (t) {
    if (t.kind === 'king') return kingActor;
    const e = enemies(t.kind, t.id);
    if (e && !e.dead) return e;
  }
  return kingActor;
}
export function pushJob(p, job, now) {
  job.t = now;
  if (p.state === 'wait') return;
  if (p.cur || p.state !== 'guard') {
    if (p.queue.length < MAX_QUEUE) { p.queue.push(job); return; }
    const last = p.queue[p.queue.length - 1];                          // ráfaga: se funde en la última encolada
    last.burst = (last.burst || 0) + 1 + (job.burst || 0); last.pts = (last.pts || 0) + (job.pts || 0);
    last.action = 'burst'; last.role = 'vanguard';
    return;
  }
  p.pendingStart = job;                                                // se arranca en el siguiente update (mismo fotograma)
}
function startJob(p, job, now, ctx) {
  if (p.heroes.length === 0) return;
  const kingA = ctx.king();
  if (job.target && job.target.kind === 'nearest') { const m = ctx.nearestMinionActor(p); job.target = m ? { kind: 'minion', id: m.id } : { kind: 'king' }; }
  const target = resolveTarget(job, kingA, ctx.enemy);
  let c = { action: job.action, role: job.role };
  if (!p.full) c = forVanguardOnly(c);
  if (job.burst) { c.action = 'burst'; }
  // fichas de acciones grandes: si no hay, el rayo baja a disparo y la técnica de equipo a combo
  let big = false;
  if (c.action === 'beam') { big = D.acquireBig(p); if (!big) c.action = 'longshot'; }
  if (c.action === 'team') {
    const ok = job.force || (p.stage >= 3 && now - p.lastTeamAt >= TEAM_GAP_MS);
    if (ok && D.acquireBig(p, job.force)) { big = true; p.lastTeamAt = now; } else { c.action = 'group'; }
  }
  const slotIdx = p.slot ?? 0;
  const mk = (hero, action, role, i) => {
    const X = { job, party: p.name, target, style: p.style, stage: p.stage, speed: 1, fast: !!job.fromQueue, soft: !!job.soft, role, i, slot: p.slot,
      spread: (slotIdx % 4) * 7 + i * 10, lane: slotIdx % 4, big: false, onDone: null, rainSpots: ctx.rainSpots };
    const s = { stage: p.stage, i, role, fast: X.fast, burst: (job.burst || 0) + 1, style: p.style, lite: hero.lite, race: p.race };
    X.steps = scriptFor(p.race, role, action, s);
    return X;
  };
  const jobs = [];
  if (c.action === 'team') for (const h of p.heroes) jobs.push([h, mk(h, 'team', ROLES[h.idx], h.idx)]);
  else if (c.action === 'group') {
    const v = p.heroes.find(h => h.idx === 0), r = p.heroes.find(h => h.idx === 1);
    if (v) jobs.push([v, mk(v, 'combo', 'vanguard', 0)]);
    if (r) jobs.push([r, mk(r, 'longshot', 'ranged', 1)]);
  } else if (c.action === 'finisher') for (const h of p.heroes) jobs.push([h, mk(h, 'finisher', ROLES[h.idx], h.idx)]);
  else {
    const idx = Math.min(ROLE_INDEX[c.role] ?? 0, p.heroes.length - 1), h = p.heroes[idx] || p.heroes[0];
    jobs.push([h, mk(h, c.action, ROLES[h.idx], h.idx)]);
  }
  p.cur = { job, left: jobs.length, Xs: jobs.map(j => j[1]), big, startAt: now };
  job.startAt = now; p.lastActionAt = now; p.focus = target; p.cyc++;
  p.lastAction = c.action;
  for (const [h, X] of jobs) {
    X.big = false;
    X.onDone = () => { if (!p.cur) return; p.cur.left--; };
    A.startScript(h, X.steps, X, now);
  }
  if (big) p.cur.bigOwner = p;
}
function finishCur(p, now) {
  if (p.cur && p.cur.big) D.releaseBig(p);
  const job = p.cur && p.cur.job;
  if (job && job.firstAt != null && D.DEBUG && job.firstAt > 250 && !job.soft) D.warn(`primer impacto a ${Math.round(job.firstAt)} ms (> 250) en ${job.action}/${p.race}`);
  p.cur = null;
}

// ---- Reacciones a los ataques enemigos (solo visuales) ----------------------------------------------------------------------------------
function rollReaction(h) {
  const r = rnd();
  if (h.idx === 0) return r < .5 ? 'block' : r < .8 ? 'dodge' : 'hit';
  return r < .5 ? 'dodge' : r < .85 ? 'hit' : 'block';
}
// Ataque enemigo sobre una party: todos los héroes en guardia reaccionan; si es grande, uno sale lanzado
export function incoming(name, o, now) {
  const p = parties.get(name); if (!p || p.state !== 'guard') return;
  let launched = !o.big;
  const order = [...p.heroes].sort((a, b) => Math.abs(a.x - o.x) - Math.abs(b.x - o.x));
  for (const h of order) {
    let kind = rollReaction(h);
    if (!launched) { kind = 'launched'; launched = true; }
    startReact(h, kind, now, o.x, { h: 50 });
    if (kind === 'block') vfx.impact(h.x + (o.x > h.x ? 14 : -14), h.y - 30, { kind: 'spark', color: '#e8f0ff', lite: h.lite });
    else if (kind === 'hit' || kind === 'launched') vfx.impact(h.x, h.y - 32, { kind: 'spark', color: '#ffffff', lite: h.lite });
    if (kind !== 'dodge' && D.flashOk(h.x, h.y, now) && h.state === 'react') h.flashAt = now;
  }
}
// Ataque que cae en un punto: reacciona la party más cercana si el punto está cerca de alguno de sus héroes
export function incomingAt(x, y, o, now) {
  let best = null, bd = 90;
  for (const p of parties.values()) for (const h of p.heroes) { const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } }
  if (best) { const p = parties.get(best.party); if (p && best.state === 'guard') startReact(best, rollReaction(best), now, x); }
}
export const nearestParty = (x, y) => {
  let best = null, bd = 1e9;
  for (const p of parties.values()) if (p.state === 'guard' && p.heroes.length) { const h = p.heroes[0], d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = p; } }
  return best;
};

// ---- Avance por fotograma ---------------------------------------------------------------------------------------------------------------------
export function update(now, dt, ctx) {
  const heroCtx = {
    ghost: a => addGhost(a, now, 200, D.ghostsMax(a), .4),
    land: a => { vfx.dust(a.x, a.y, { n: 4, lite: a.lite }); },
    face: a => { const p = parties.get(a.party), t = p && p.focus && !p.focus.dead ? p.focus : ctx.king(); const x = t ? t.x : CX; return Math.abs(x - a.x) < 3 ? 0 : x > a.x ? 1 : -1; },
    script: (a, n, d) => A.tickScript(a, n, d),
  };
  let full = 0; for (const p of parties.values()) if (p.state !== 'enter' && p.slot != null && p.slot < CFG.FULL_PARTIES) full++;
  for (const p of parties.values()) {
    // carril: ± px alrededor del puesto de cada héroe, según cuántas parties completas haya
    const lw = laneFor(full, !p.full);
    for (const h of p.heroes) { h.lane = { x0: h.home.x - lw, x1: h.home.x + lw }; h.lite = D.isLite(p.slot); }
    if (p.state === 'enter' || p.state === 'exit') updateWalk(p, now);
    else if (p.state === 'transform') updateTransform(p, now);
    else if (p.state === 'celebrate') updateCelebrate(p, now);
    else if (p.state === 'guard') updateGuard(p, now, ctx);
    for (const h of p.heroes) {
      if (p.state === 'enter' || p.state === 'exit' || p.state === 'transform' || p.state === 'celebrate') { if (h.script) { D.releaseBig(h); h.script = null; } }
      updateActor(h, now, dt, heroCtx);
      if (h.state === 'transform') { h.fixedFrame = Math.min(2, Math.floor((now - p.t0x) / p.tDur * 3)); }
    }
  }
}
function updateWalk(p, now) {
  const exit = p.state === 'exit';
  let allDone = true;
  for (const h of p.heroes) {
    const hold = exit ? 0 : p.hold || 0, el = now - p.t0 - h.idx * 90;
    const raw = (el - hold) / Math.max(1, p.dur - hold);
    if (raw < 1) allDone = false;
    const q = along(p.path, raw);
    let fx = FORM[h.idx][0], fy = FORM[h.idx][1];
    if (p.off && !exit) { const m = Math.min(1, Math.max(0, (now - p.t0) / 500)); fx = p.off[h.idx][0] + (FORM[h.idx][0] - p.off[h.idx][0]) * m; fy = p.off[h.idx][1] + (FORM[h.idx][1] - p.off[h.idx][1]) * m; }
    h.x = q.x + fx; h.y = q.y + fy; h.z = 0; h.state = exit ? 'exit' : 'enter'; h.alpha = 1;
    const moving = raw > 0 && raw < 1;
    if (moving && Math.abs(q.dx) > 1) h.face = q.dx > 0 ? 1 : -1;
    const pose = Array.isArray(p.startPose) ? p.startPose[h.idx] : p.startPose;
    if (hold && el < hold - 200 && pose) setAnim(h, pose, now);          // sigue en su actividad del campamento
    else setAnim(h, moving ? (exit ? 'walk' : 'run') : 'idle', now);     // se levanta (idle) y sale corriendo
    if (moving && !exit && !h.lite && !reduced() && Math.floor(now / 90) % 3 === h.idx) vfx.dust(h.x, h.y, { face: h.face, n: 2, lite: true });
  }
  if (allDone && !exit && p.slot != null && !p.arrivedFlag) { /* partyArrive de reglas termina la entrada */ }
}
function updateTransform(p, now) {
  const k = Math.min(1, (now - p.t0x) / p.tDur), lead = p.heroes[0];
  if (!p.tSwapped && k >= .45) {
    p.tSwapped = true; p.stage = p.tTo;
    for (const h of p.heroes) { if (D.flashOk(h.x, h.y, now)) h.flashAt = now; vfx.ring(h.x, h.y, { r0: 8, r1: 56, life: 420, color: p.style.spark2 || p.style.spark, squash: .35, w: 3, still: reduced() }); }
  }
  if (!reduced()) {
    if (!p.tBolt && k >= .3 && lead) { p.tBolt = true; vfx.skyBolt(lead.x, lead.y, { color: p.style.spark2 || p.style.spark, r: 60 }); sfx.thunder?.(0); vfx.shake(2, 200); }
    for (const h of p.heroes) if (Math.floor(now / 70) % 2 === 0) vfx.spark(h.x, h.y - (h.fh || 60) * .5, { color: p.style.spark, color2: '#ffffff', n: 1, speed: 80, up: 60, lite: true });
  } else for (const h of p.heroes) h.alpha = k < .5 ? 1 - k / .5 : (k - .5) / .5;       // fundido directo de 0,3 s
  if (k >= 1) endTransform(p, now);
}
function endTransform(p, now) {
  p.state = 'guard'; p.stage = p.tTo;
  for (const h of p.heroes) { toGuard(h, now); h.alpha = 1; }
  p.lastActionAt = now;
}
function updateCelebrate(p, now) {
  const k = (now - (p.tUntil - (CFG.CELEBRATE_MS || 2000))) / 1000;
  for (const h of p.heroes) { h.z = reduced() ? 0 : Math.max(0, Math.sin(k * 7 + h.idx * 1.3)) * 14; h.fixedFrame = null; setAnim(h, 'victory', now); }
  if (now >= p.tUntil) { p.state = 'guard'; for (const h of p.heroes) toGuard(h, now); }
}
function updateGuard(p, now, ctx) {
  if (p.cur) {
    const waiting = p.queue.length ? now - p.queue[0].t : 0, sp = p.queue.length ? (waiting > 300 ? 3 : 1.6) : 1;
    for (const X of p.cur.Xs) if (!X.noCompress) X.speed = sp;
    if (p.cur.left <= 0 && p.heroes.every(h => !h.script)) finishCur(p, now);
  }
  if (!p.cur) {
    let job = p.pendingStart; p.pendingStart = null;
    if (!job && p.queue.length) { job = p.queue.shift(); job.fromQueue = true; }
    if (job) startJob(p, job, now, ctx);
    else if (now - p.lastActionAt > p.sparAt) {
      // guardia viva: cada 4-6 s sin acción, cruce de golpes sin daño con el secuaz más cercano o con el rey
      p.sparAt = rrange(4000, 6000); p.lastActionAt = now;
      const role = ROLES[p.sparN++ % (p.full ? 3 : 1)];
      const near = ctx.nearestMinionActor(p);
      startJob(p, { action: 'spar', role, soft: true, pts: 0, target: near ? { kind: 'minion', id: near.id } : { kind: 'king' } }, now, ctx);
    }
  }
}

// ---- Eventos de reglas ----------------------------------------------------------------------------------------------------------------------------------
export function onTool(ev, now) {
  const p = parties.get(ev.name); if (!p || p.state === 'enter' || p.state === 'exit' || p.state === 'camp') return;
  const c = classify(ev.tool, p.cyc);
  if (!c) return;
  const job = { action: c.action, role: c.role, pts: ev.pts, target: ev.target, tool: ev.tool, burst: 0 };
  pushJob(p, job, now);
}
export function onPassive(ev, now) {
  const p = parties.get(ev.name); if (!p || p.state !== 'guard' || p.cur || p.queue.length) return;
  // el daño pasivo es un cruce de golpes con el más cercano; lleva la cifra de daño
  p.pendingStart = { action: 'probe', role: 'vanguard', pts: ev.pts, target: { kind: 'nearest' } };
}
export function onTeamCombo(ev, now) {
  const p = parties.get(ev.name); if (!p || p.state === 'enter' || p.state === 'exit') return;
  pushJob(p, { action: 'team', role: 'all', pts: 0, target: { kind: 'king' }, force: true, burst: 0 }, now);
}
export function onFinisher(ev, now, ctx) {
  for (const name of ev.names || []) {
    const p = parties.get(name); if (!p || p.state === 'enter' || p.state === 'exit') continue;
    abortAll(p, now); p.queue.length = 0; p.state = 'guard'; for (const h of p.heroes) toGuard(h, now);
    p.pendingStart = { action: 'finisher', role: 'all', pts: 0, target: { kind: 'king' }, force: true };
  }
}
export function pauseAll(now) {
  for (const p of parties.values()) {
    p.queue.length = 0; p.pendingStart = null; abortAll(p, now);
    if (p.state === 'guard' || p.state === 'transform') { if (p.state === 'transform') { p.stage = p.tTo || p.stage; } p.state = 'guard'; }
    for (const h of p.heroes) if (h.state !== 'enter' && h.state !== 'exit') { toGuard(h, now); h.x = h.home.x; h.y = h.home.y; }
  }
}
