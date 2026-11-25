// Reglas de la arena: cada agente que trabaja es una party de 3 héroes (de una raza) que lucha contra un
// Rey Demonio gigante, con secuaces y demonios élite. Los agentes que no trabajan descansan en un
// campamento al pie de la escena (camp/), separado de la arena por una empalizada con una puerta.
// Aquí vive solo la LÓGICA (vida, poder, etapas, élites, secuaces, parties y recorridos): no se dibuja nada
// y no se importa nada de combat/, render/ ni art/. Todo lo que ocurre se anuncia con eventos (cola S.events)
// que combat/ convierte en coreografía. Contrato: docs/arena-v12-arquitectura.md (4.1 y 4.2).
// Todo se deduce de los eventos que ya llegan al navegador; no hay cambios en el servidor.
import { sfx } from '../sound.js';
import { CFG, KING_Y, AW, SLOTS, FORM, EDGE_Y, GATE_IN, GATE_OUT, FENCE_Y, CAMP_MAX } from './config.js';
import { RACES, HASH_RACES, raceForRole, KINGS, MINIONS, ELITES } from './races.js';
import * as camp from './camp/camp.js';

export { CFG };

// ---- Estado -------------------------------------------------------------------------------------------
export const S = {
  phase: 'none', phaseAt: 0, num: 0, king: null, parties: new Map(), slots: Array(CFG.VISIBLE_PARTIES).fill(null),
  elites: [], minions: [], joinSeq: 0, clock: 0, scale: 1, replayId: null, idleSince: null, now: 0,
  memRecent: [], lastKing: null, banner: null, summary: null, selected: null, quickUntil: 0, nextWave: 0,
  pendingElite: 0, lastDoor: 0, eliteSeq: 0, minionSeq: 0, nextId: 1, lastUp: 0, rngN: 0, waveFirst: false,
  camp: new Map(), campSlots: Array(CAMP_MAX).fill(null),     // agentes en reposo y quién ocupa cada puesto del campamento
  events: [],                                                  // cola de eventos hacia combat/ (se vacía en cada paso)
};
let env = { hash: s => s.length, shortName: s => s };
// Consultas visuales inyectadas por combat/ (si no hay combate cargado se usan los respaldos de más abajo)
const Q = { nearestMinion: null, heroPositions: null };
export function init(e = {}) {
  const { nearestMinion, heroPositions, ...rest } = e;
  env = { ...env, ...rest };
  if (nearestMinion) Q.nearestMinion = nearestMinion;
  if (heroPositions) Q.heroPositions = heroPositions;
}
export const active = () => S.phase !== 'none' || S.parties.size > 0;
export const setSelected = name => { S.selected = name; };
export function noteSnapshot(now) { S.quickUntil = now + CFG.QUICK_MS; }   // las parties ya presentes aparecen sin caminar

// ---- Eventos hacia combat/ ------------------------------------------------------------------------------
function emit(type, data) {
  S.events.push({ type, ...data });
  if (S.events.length > CFG.MAX_EVENTS) S.events.splice(0, S.events.length - CFG.MAX_EVENTS);
}
// Entrega los eventos acumulados y vacía la cola
export function takeEvents() { return S.events.length ? S.events.splice(0) : S.events; }
export function dropEvents() { S.events.length = 0; }

// ---- Aleatoriedad determinista y reyes recientes ------------------------------------------------------------
function strHash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rngFrom(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const RKEY = 'oficina.arena.recent';
function loadRecent() { try { const r = JSON.parse(localStorage.getItem(RKEY) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; } }
function saveRecent(id) {
  if (S.replayId) { S.memRecent = [id, ...S.memRecent].slice(0, CFG.RECENT); return; }   // la repetición no toca lo guardado
  try { localStorage.setItem(RKEY, JSON.stringify([id, ...loadRecent().filter(x => x !== id)].slice(0, CFG.RECENT))); } catch { /* sin almacenamiento */ }
}
// Elige rey: semilla = (hora de inicio | id de repetición) + nombre del primer agente; no repite los 2 últimos
function pickKing(first) {
  const seed = `${S.replayId ? 'r:' + S.replayId : 't:' + Math.floor(Date.now() / 1000)}|${first}|${S.num}`;
  const recent = S.replayId ? S.memRecent : loadRecent();
  let pool = KINGS.filter(k => !recent.includes(k.id));
  if (!pool.length) pool = KINGS.filter(k => !S.lastKing || k.id !== S.lastKing.id);
  return pool[Math.floor(rngFrom(strHash(seed))() * pool.length)];
}
const rngElite = () => rngFrom(strHash(`${S.king ? S.king.def.id : ''}|${S.num}|${S.rngN++}`))();

// ---- Parties ---------------------------------------------------------------------------------------------
const baseOf = a => String(a.base || a.name).split('#')[0].toLowerCase();
// Raza por tabla de roles; si no es un rol conocido, hash mod 8 sobre las 8 razas originales (no se reasigna a nadie)
function raceFor(base) {
  const known = raceForRole(base);
  return known ? RACES.find(r => r.id === known) : HASH_RACES[env.hash(base) % HASH_RACES.length];
}
// Variante B si ya hay otra party (en batalla o descansando) de la misma raza con otro rol; las instancias del mismo rol comparten variante
function variantFor(base, race) {
  const all = [...S.parties.values(), ...S.camp.values()];
  for (const p of all) if (p.base === base) return p.variant;
  const used = new Set(all.filter(p => p.race === race && p.base !== base).map(p => p.variant));
  return used.has(0) && !used.has(1) ? 1 : 0;
}
export const power = p => p.tools + p.sec / CFG.POWER_MS + p.bonus;
// Etapa de una raza para un poder dado (los Tempestarios tienen 4 etapas; el resto, 3)
export function stageFor(race, pw) { let s = 1; race.stages.forEach((st, i) => { if (pw >= st.power) s = i + 1; }); return s; }
export const kingAlive = () => !!S.king && !S.king.deadAt && (S.phase === 'spawn' || S.phase === 'fight');
export const workingCount = () => { let n = 0; for (const p of S.parties.values()) if (p.working) n++; return n; };
export const inCampState = p => p.state === 'wait' || p.state === 'gone';
export const inArena = p => !inCampState(p);     // 'wait' y 'gone': la party está en el campamento
export const isSingle = p => p.slot !== null && p.slot >= CFG.FULL_PARTIES;     // de la 5.ª a la 8.ª: solo vanguardia
const freeSlot = () => { const i = S.slots.indexOf(null); return i < 0 ? null : i; };
// Poder inicial de una party que llega con el combate empezado (spec 3.3: refuerzo tardío)
function lateBonus(race) {
  const k = S.king;
  if (!k || !kingAlive()) return 0;
  if (k.form >= 3 && race.stages.length >= 4) return race.stages[1].power;      // con el rey en forma 3 llega a la etapa 2
  return k.form >= 2 ? CFG.LATE_POWER : 0;
}

// ---- Campamento: puestos de descanso ----------------------------------------------------------------------
function takeCampSlot(owner) {
  const i = S.campSlots.indexOf(null);
  if (i < 0) return null;
  S.campSlots[i] = owner; owner.cs = i; return i;
}
function freeCampSlot(owner) { if (owner.cs !== null && S.campSlots[owner.cs] === owner) S.campSlots[owner.cs] = null; owner.cs = null; }
function campInfo(a) {
  const base = baseOf(a), race = raceFor(base);
  return { base, race, variant: variantFor(base, race), seed: strHash(a.name) % 97 };
}
// Un agente que no trabaja descansa en el campamento: entra por la puerta (o aparece ya sentado al abrir la escena)
function ensureCamper(a, now) {
  let c = S.camp.get(a.name), snap = false;
  if (!c) { c = camp.makeCamper(a, campInfo(a), now, null); S.camp.set(a.name, c); snap = now < S.quickUntil; }
  if (c.cs === null && (!c.leaving || c.gone) && takeCampSlot(c) !== null) camp.assignSlot(c, c.cs, now, snap);
}
function removeCamper(c) { freeCampSlot(c); S.camp.delete(c.name); }
// Una party que vuelve del combate pasa a ser un grupo en reposo, en el mismo sitio donde está
function toCamp(p, now) {
  const pos = heroPositions(p, now), info = { base: p.base, race: p.race, variant: p.variant, seed: p.seed };
  const slot = p.cs;
  removeParty(p, true);
  const c = camp.makeCamper({ name: p.name }, info, now, pos);
  S.camp.set(p.name, c);
  if (slot !== null) { S.campSlots[slot] = c; c.cs = slot; } else takeCampSlot(c);
  if (c.cs !== null) camp.assignSlot(c, c.cs, now, false);
}

function join(a, now) {
  const base = baseOf(a), race = raceFor(base), variant = variantFor(base, race);
  const p = {
    name: a.name, base, race, variant, order: ++S.joinSeq, seed: strHash(a.name) % 97, slot: null, cs: null, off: null,
    state: 'wait', x: GATE_IN.x + ((S.joinSeq % 3) - 1) * 44, y: GATE_IN.y + 20, pts: null, seg: null, tot: 0, t0: 0, dur: 1, side: S.joinSeq % 2 ? -1 : 1,
    working: true, doneAt: 0, celebrateAt: -1e9, tools: 0, sec: 0, passive: 0, comboAt: now, bonus: lateBonus(race),
    stage: 1, stageAt: -1e9, fxMs: CFG.PARTY_FX_MS, shoutAt: -1e9, lastHit: -1e9, hits: 0, turn: 0, counted: false, toolTs: [], rise: null,
  };
  // Si el agente descansaba, primero se levanta (camp.beginRise: pose de transición corta) y después su party sale desde
  // donde estaba (cada héroe parte de su sitio), andando hasta la puerta. Mientras se levanta, la party queda en 'wait'
  // con p.rise = el grupo en reposo, que sigue en S.camp y en su puesto; los golpes ya cuentan (ver hit).
  const c = S.camp.get(a.name);
  S.parties.set(a.name, p);
  if (c && c.cs !== null && !c.leaving && now >= S.quickUntil && camp.beginRise(c, now)) { p.rise = c; return p; }
  return startParty(p, c, now);
}
// La party sale al combate. c: el grupo en reposo del que viene (o undefined si entra por la puerta)
function startParty(p, c, now) {
  let heroes;
  if (c) {
    const [h0, h1, h2] = c.h;
    p.x = h0.x; p.y = h0.y; p.off = [[0, 0], [h1.x - h0.x, h1.y - h0.y], [h2.x - h0.x, h2.y - h0.y]];
    p.variant = c.variant;
    heroes = c.h.map(h => ({ x: h.x, y: h.y }));
    const slot = c.cs;
    removeCamper(c);
    if (slot !== null) { S.campSlots[slot] = p; p.cs = slot; }
  }
  emit('partyJoin', { name: p.name, race: p.race.id, variant: p.variant, stage: p.stage, from: c ? 'camp' : 'gate', heroes });
  if (!kingAlive()) return p;                                      // espera en el campamento a que aparezca el siguiente rey
  p.counted = true; addMaxHp(now); enter(p, now);
  maybeEliteByCrowd();
  return p;
}
// Fin de la pose de transición: el grupo deja de ser un camper y su party empieza a andar hacia la puerta
function finishRise(p, now) { const c = p.rise; p.rise = null; startParty(p, c, now); }
// El agente dejó de trabajar mientras se levantaba: vuelve a lo que hacía y la party no llega a salir
function cancelRise(p, now) {
  const c = p.rise; p.rise = null;
  S.parties.delete(p.name);
  if (c && S.camp.get(c.name) === c) camp.endRise(c, now);
}
// Recorrido de la party (el héroe de vanguardia) como una línea quebrada: pts = [{x, y}, ...]
function setPath(p, pts, now, speed, minMs, maxMs) {
  p.pts = pts; p.seg = []; p.tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); p.seg.push(d); p.tot += d; }
  p.t0 = now; p.dur = Math.min(maxMs, Math.max(minMs, p.tot / speed));
}
function along(p, k) {
  let d = Math.max(0, Math.min(1, k)) * p.tot;
  for (let i = 0; i < p.seg.length; i++) {
    if (d <= p.seg[i] || i === p.seg.length - 1) {
      const f = p.seg[i] ? Math.min(1, d / p.seg[i]) : 1, a = p.pts[i], b = p.pts[i + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x, dy: b.y - a.y };
    }
    d -= p.seg[i];
  }
  return { x: p.pts[0].x, y: p.pts[0].y, dx: 0, dy: 0 };
}
// Posición del héroe de vanguardia (respaldo de reglas; con combate cargado manda heroPositions)
const lead = (p, now) => { const q = heroPos(p, 0, now); return { x: q.x, y: q.y }; };
// Puntos de paso por la puerta cuando la party cruza la empalizada
function viaGate(from, to, goingOut) {
  if (from.y <= FENCE_Y && to.y <= FENCE_Y) return [from, to];
  return goingOut ? [from, GATE_IN, GATE_OUT, to] : [from, GATE_OUT, GATE_IN, to];
}
function enter(p, now) {
  if (p.cs !== null) { if (S.campSlots[p.cs] === p) S.campSlots[p.cs] = null; p.cs = null; }
  if (p.slot === null) { const s = freeSlot(); if (s !== null) { p.slot = s; S.slots[s] = p; } }
  const quick = now < S.quickUntil, tgt = p.slot === null ? { x: p.side < 0 ? 32 : AW - 32, y: EDGE_Y } : { x: SLOTS[p.slot][0], y: SLOTS[p.slot][1] };
  if (p.slot === null) { p.x = tgt.x; p.y = tgt.y; p.off = null; p.state = 'idle'; return; }      // sin puesto: cuenta para el daño, pero no se dibuja
  if (quick) { p.state = 'idle'; p.x = tgt.x; p.y = tgt.y; p.off = null; emit('partyArrive', { name: p.name, slot: p.slot }); return; }
  const from = lead(p, now);
  setPath(p, viaGate(from, tgt, true), now, CFG.WALK_SPEED, 700, CFG.WALK_MAX_MS);
  p.state = 'walk';
  emit('partyEnter', { name: p.name, slot: p.slot, stage: p.stage, path: p.pts, t0: p.t0, dur: p.dur });
  if (now - S.lastDoor > 600) { S.lastDoor = now; sfx.door(); }
}
// Si el campamento está lleno, el grupo del último puesto cede el suyo a la party que vuelve
function evictCamper(p) {
  for (let i = S.campSlots.length - 1; i >= 0; i--) {
    const o = S.campSlots[i];
    if (o && o.h && !o.rise) { camp.dismiss(o); o.cs = null; S.campSlots[i] = p; p.cs = i; return; }
  }
}
// La party vuelve caminando al campamento, a un puesto libre (si no queda ninguno, cruza la puerta y deja de verse)
function beginExit(p, now) {
  const from = lead(p, now);
  if (p.cs === null && takeCampSlot(p) === null) evictCamper(p);
  const b = p.cs === null ? { x: GATE_IN.x, y: camp.slotBase(2).y + 12 } : camp.slotBase(p.cs);
  setPath(p, viaGate(from, { x: b.x, y: b.y }, false), now, CFG.RETURN_SPEED, 900, CFG.RETURN_MAX_MS);
  p.off = null; p.state = 'exit';
  emit('partyExit', { name: p.name, path: p.pts, t0: p.t0, dur: p.dur });
}
function removeParty(p, keepCampSlot) {
  if (p.slot !== null) S.slots[p.slot] = null;
  if (!keepCampSlot) freeCampSlot(p);
  S.parties.delete(p.name);
  emit('partyToCamp', { name: p.name });                           // combat/ suelta sus actores
}
// Posición de un héroe (con retraso entre ellos al caminar). Es el respaldo de reglas y de la escena sin combate.
export function heroPos(p, i, now) {
  if (p.state === 'walk' || p.state === 'exit') {
    const raw = (now - p.t0 - i * 90) / p.dur, q = along(p, raw), f = FORM[i];
    let fx = f[0], fy = f[1];
    if (p.off) {                                                   // al salir del campamento se ordenan en formación
      const m = Math.min(1, Math.max(0, (now - p.t0) / 500));
      fx = p.off[i][0] + (f[0] - p.off[i][0]) * m; fy = p.off[i][1] + (f[1] - p.off[i][1]) * m;
    }
    return { x: q.x + fx, y: q.y + fy, moving: raw > 0 && raw < 1, dx: q.dx, dy: q.dy };
  }
  const f = p.off ? p.off[i] : FORM[i];
  return { x: p.x + f[0], y: p.y + f[1], moving: false, dx: 0, dy: 0 };
}
function heroPositions(p, now) {
  const q = Q.heroPositions && Q.heroPositions(p.name);
  return q && q.length === 3 ? q : [0, 1, 2].map(i => heroPos(p, i, now));
}
function addMaxHp(now) {
  if (!kingAlive()) return;
  S.king.max += CFG.HP_PER_PARTY; S.king.hp += CFG.HP_PER_PARTY; S.king.boostAt = now;
}
function maybeEliteByCrowd() {
  const b = S.king;
  if (!b || b.e3) return;
  let n = 0; for (const p of S.parties.values()) if (inArena(p)) n++;
  if (n >= CFG.ELITE_MIN_PARTIES) { b.e3 = true; S.pendingElite++; }
}

// ---- Golpes y daño ------------------------------------------------------------------------------------
// Secuaz más cercano a la party: lo decide combat/ (posiciones visuales); si no hay combate, el más antiguo
function nearestMinion(p) {
  const id = Q.nearestMinion ? Q.nearestMinion(p.name) : null;
  const m = id != null && S.minions.find(x => x.id === id && !x.dyingAt);
  if (m) return m;
  return S.minions.find(x => !x.dyingAt) || null;
}
// Cada herramienta es un golpe
export function hit(a, now) {
  const p = S.parties.get(a.name) || join(a, now);
  const was = p.working;
  p.working = true; p.doneAt = 0; p.tools++;
  if (!was && (p.state === 'exit' || p.state === 'gone')) enter(p, now);      // gracia: vuelve con su poder
  if (!kingAlive()) return;
  if (p.rise) { p.hits++; damage(p.race.stages[p.stage - 1].mult, now); sfx.hit(); return; }      // levantándose: el daño cuenta, el golpe visual aún no
  if (p.state === 'wait') return;
  p.lastHit = now; p.hits++;
  const elite = S.elites.find(e => !e.dyingAt), minion = elite ? null : nearestMinion(p);
  const pts = p.race.stages[p.stage - 1].mult;
  const target = elite ? { kind: 'elite', id: elite.id } : minion ? { kind: 'minion', id: minion.id } : { kind: 'king', id: S.king.def.id };
  p.toolTs = p.toolTs.filter(t => now - t < CFG.BURST_MS);
  const burstIndex = p.toolTs.length; p.toolTs.push(now);
  emit('tool', { name: p.name, tool: a.data ? a.data.tool || null : null, pts, target, burstIndex });
  if (minion) killMinion(minion, now, p.name);
  damage(pts, now);
  sfx.hit();
}
function killMinion(m, now, by) { m.dyingAt = now; emit('minionKill', { id: m.id, by }); }

function damage(pts, now) {
  const el = S.elites.find(e => !e.dyingAt);
  if (el) {                                                  // el élite protege al rey: recibe los golpes primero
    el.hp -= pts; el.flashAt = now;
    emit('eliteHit', { id: el.id, pts });
    if (el.hp <= 0) eliteDown(el, now);
    return;
  }
  const b = S.king;
  if (!b || b.deadAt) return;
  emit('kingHit', { pts });
  if (b.form < 3) {                                          // un golpe que cruzaría el umbral lo deja justo en él y transforma al rey
    const floor = b.max * CFG.FORM_HP[b.form - 1];
    if (b.hp - pts <= floor) { b.hp = Math.min(b.hp, floor); transformKing(now); return; }
  }
  b.hp -= pts;
  if (b.hp <= 0) { b.hp = 0; die('hp', now); }
}
function transformKing(now) {
  const b = S.king;
  b.form++; b.formAt = now; b.shoutAt = now;
  sfx.transform();
  S.pendingElite++;                                          // el rey se transforma: aparece un élite
  emit('kingForm', { form: b.form });
}
function checkForms(now) {
  const b = S.king;
  if (!b || b.deadAt || b.form >= 3 || now - b.formAt < CFG.KING_FX_MS + 200) return;
  const f = b.form;
  if (b.hp <= b.max * CFG.FORM_HP[f - 1] + 1e-6 || S.clock - b.baseClock >= CFG.FORM_MS[f - 1]) transformKing(now);
}

// ---- Élites y secuaces (parte lógica; el movimiento lo pone combat/enemies-ai.js) -------------------------------------
const eligibleElite = () => S.phase === 'fight' && S.king && !S.king.deadAt && S.king.hp > S.king.max * CFG.ELITE_STOP;
function spawnElite(now) {
  let n = 0; for (const p of S.parties.values()) if (inArena(p)) n++;
  const cap = n >= CFG.ELITE_MIN_PARTIES ? CFG.ELITE_MAX : 1;
  if (S.elites.filter(e => !e.dyingAt).length >= cap) return false;
  const def = ELITES[Math.floor(rngElite() * ELITES.length)], side = S.eliteSeq++ % 2 ? 1 : -1;
  const hp = CFG.ELITE_HP_BASE + CFG.ELITE_HP_PER_PARTY * n;
  const e = { id: S.nextId++, def, type: def.id, side, hp, max: hp, bornAt: now, dyingAt: 0, flashAt: -1e9, seed: S.rngN % 10 + .5 };
  S.elites.push(e);
  S.banner = { text: `¡Llega el ${def.name}!`, until: now + 1800, prio: 1 };
  sfx.elite();
  emit('eliteSpawn', { id: e.id, enemy: e.type, side });
  if (e.type === 'heraldo') S.nextWave = now;               // el heraldo llama a más secuaces
  return true;
}
function eliteDown(e, now) {
  e.dyingAt = now; e.hp = 0;
  for (const p of S.parties.values()) p.bonus += CFG.ELITE_POWER;      // la tensión eleva a las parties
  sfx.eliteDown();
  emit('eliteDown', { id: e.id });
}
function minionCap() { let n = 0; for (const p of S.parties.values()) if (inArena(p)) n++; return Math.min(CFG.MINIONS_MAX, 2 + 2 * n); }
function spawnWave(now, count) {
  const cap = minionCap();
  for (let i = 0; i < count; i++) {
    if (S.minions.filter(m => !m.dyingAt).length >= cap) break;
    const k = S.minionSeq++, def = MINIONS[k % MINIONS.length], type = def.id, hr = rngFrom(strHash(`${S.num}|${k}`));
    // hx, hy: sitio de patrulla sugerido (coordenadas de la escena); combat/ puede usarlo o ignorarlo
    const hx = 100 + hr() * 760, hy = type === 'murcielago' ? KING_Y - 64 + hr() * 68 : type === 'sombra' ? KING_Y + 24 + hr() * 16 : type === 'ojo' ? KING_Y - 36 + hr() * 44 : KING_Y - 4 + hr() * 36;
    const m = { id: S.nextId++, type, bornAt: now, dyingAt: 0, hx, hy, seed: hr() * 10, kind: k };
    S.minions.push(m);
    emit('minionSpawn', { id: m.id, enemy: type });
  }
}

// ---- Fin del rey, inicio del siguiente ------------------------------------------------------------------------
function die(reason, now) {
  const b = S.king;
  b.deadAt = now; b.reason = reason; if (reason === 'hp') b.hp = 0;
  S.phase = 'dying'; S.phaseAt = now;
  S.banner = { text: `¡${b.def.name} derrotado!`, until: now + 2600, prio: 2 };
  sfx.victory();
  S.pendingElite = 0;
  S.minions.forEach((m, i) => { if (!m.dyingAt) { m.dyingAt = now + i * 110; emit('minionKill', { id: m.id, by: null }); } });     // los secuaces explotan en cadena
  S.elites.forEach(e => { if (!e.dyingAt) { e.dyingAt = now; emit('eliteDown', { id: e.id }); } });
  for (const p of S.parties.values()) if (inArena(p)) { p.celebrateAt = now; emit('celebrate', { name: p.name }); }
  emit('kingDie', { reason });
  const dur = (now - b.appearAt) / 1000;
  let mvp = null;
  for (const p of S.parties.values()) if (!mvp || p.hits > mvp.hits || (p.hits === mvp.hits && p.order < mvp.order)) mvp = p;
  let hits = 0; for (const p of S.parties.values()) hits += p.hits;
  S.summary = dur >= CFG.SUMMARY_MIN_S ? { at: now, king: b.def.name, dur, hits: hits + b.goneHits, mvp: mvp && mvp.hits ? env.shortName(mvp.name) : null } : null;
}
function startKing(now) {
  const list = [...S.parties.values()].filter(p => p.working).sort((p, q) => p.order - q.order);
  S.num++;
  const def = pickKing(list[0] ? list[0].name : '');
  saveRecent(def.id); S.lastKing = def;
  let n = 0; for (const p of S.parties.values()) if (p.working || inArena(p)) n++;
  const max = CFG.HP_BASE + CFG.HP_PER_PARTY * Math.max(1, n);
  S.king = { def, id: def.id, form: 1, hp: max, max, appearAt: now, baseClock: S.clock, formAt: -1e9, shoutAt: -1e9, boostAt: -1e9, deadAt: 0, e75: false, e3: false, goneHits: 0 };
  S.phase = 'spawn'; S.phaseAt = now; S.idleSince = null; S.summary = null; S.elites = []; S.minions = []; S.pendingElite = 0; S.nextWave = 0;
  S.banner = { text: `¡Aparece ${def.name}!`, until: now + 2400, prio: 1 };
  sfx.bossAppear();
  emit('kingSpawn', { id: def.id, form: 1, appear: def.appear });
  for (const p of S.parties.values()) {
    p.counted = true;
    if (p.working && p.state === 'wait' && !p.rise) enter(p, now);
  }
  maybeEliteByCrowd();
}

// ---- Bucle lógico ---------------------------------------------------------------------------------------------
export function step(now, dt, agents) {
  S.now = now;
  const dtGame = dt * 1000 * S.scale;
  S.clock += dtGame;
  const names = new Set();
  for (const a of agents) {
    names.add(a.name);
    const working = a.data.state === 'working';
    let p = S.parties.get(a.name);
    if (working && !p) p = join(a, now);                  // si descansaba, su party sale desde el campamento
    if (!p) { ensureCamper(a, now); continue; }           // sin trabajo: descansa en el campamento
    if (working) {
      if (!p.working) { p.working = true; p.doneAt = 0; if (p.state === 'exit' || p.state === 'gone') enter(p, now); }   // gracia: vuelve con su poder
    } else if (p.working) { p.working = false; p.doneAt = now; p.celebrateAt = now; if (inArena(p)) emit('celebrate', { name: p.name }); }
  }
  for (const p of [...S.parties.values()]) {
    if (!names.has(p.name)) { removeParty(p); continue; }
    if (p.working) {
      p.sec += dtGame;
      const pass = Math.floor(p.sec / CFG.PASSIVE_MS);
      if (pass > p.passive) {
        const n = pass - p.passive; p.passive = pass;
        if (kingAlive() && inArena(p)) { emit('passive', { name: p.name, pts: n }); damage(n, now); }
      }
    }
    // Movimiento: al llegar a la arena la party se planta en su puesto; al volver, queda en el campamento ('gone')
    if ((p.state === 'walk' || p.state === 'exit') && now >= p.t0 + p.dur + 2 * 90) {
      const end = p.pts[p.pts.length - 1];
      p.x = end.x; p.y = end.y; p.off = null;
      if (p.state === 'walk') { p.state = 'idle'; emit('partyArrive', { name: p.name, slot: p.slot }); } else p.state = 'gone';
    }
    // Etapas: de una en una y sin retroceder
    if (inArena(p) && p.state !== 'walk' && p.slot !== null) {
      const target = stageFor(p.race, power(p));
      if (target > p.stage && now - p.stageAt > p.fxMs + 100) {
        const from = p.stage;
        p.stage++; p.stageAt = now; p.shoutAt = now; p.fxMs = p.stage >= 4 ? CFG.PARTY_FX_LATE_MS : CFG.PARTY_FX_MS;
        emit('partyStage', { name: p.name, from, to: p.stage });
        if (now - S.lastUp > 400) { S.lastUp = now; sfx.heroUp(); }
      }
      // Golpe combinado (etapa 3 o más)
      if (p.working && p.stage >= 3 && kingAlive() && S.phase === 'fight' && now - p.comboAt >= CFG.COMBO_MS) {
        p.comboAt = now;
        emit('teamCombo', { name: p.name });
        damage(CFG.COMBO_DMG, now);
      }
    }
    // Salida: celebra 2 s y vuelve caminando al campamento por la puerta; con 5 s de gracia conserva su poder
    // y, pasada la gracia, se queda descansando (pierde etapa y poder)
    if (p.rise) { if (!p.working) cancelRise(p, now); else if (now >= p.rise.rise.end) finishRise(p, now); continue; }
    if (!p.working) {
      const since = now - p.doneAt;
      if (p.state === 'wait') { toCamp(p, now); continue; }
      if (since >= CFG.CELEBRATE_MS && p.state !== 'exit' && p.state !== 'gone') beginExit(p, now);
      if (since >= CFG.GRACE_MS && (p.state === 'gone' || since >= CFG.GRACE_MS + 800)) { if (S.king) S.king.goneHits += p.hits; toCamp(p, now); }
    }
  }
  // Los que descansan: se quitan los que ya no existen y el resto cambia de actividad con el tiempo
  for (const c of [...S.camp.values()]) { if (!names.has(c.name)) removeCamper(c); else camp.updateCamper(c, now, dt); }
  // Parties sin puesto toman uno libre
  for (const p of S.parties.values()) if (p.slot === null && inArena(p) && p.working && freeSlot() !== null && p.state !== 'wait') enter(p, now);

  const b = S.king;
  switch (S.phase) {
    case 'none': if (workingCount() > 0) startKing(now); break;
    case 'spawn': case 'fight': {
      if (S.phase === 'spawn' && now - S.phaseAt >= CFG.SPAWN_MS) { S.phase = 'fight'; S.nextWave = now; S.waveFirst = true; }
      if (S.phase === 'fight') {
        // Élites (por vida, por transformación y por multitud)
        if (!b.e75 && b.hp <= b.max * CFG.ELITE_AT) { b.e75 = true; S.pendingElite++; }
        if (S.pendingElite > 0 && eligibleElite() && spawnElite(now)) S.pendingElite--;
        else if (S.pendingElite > 0 && b.hp <= b.max * CFG.ELITE_STOP) S.pendingElite = 0;
        // Oleadas de secuaces: 2 al empezar y 2 más cada 15 s
        if (now >= S.nextWave) { spawnWave(now, CFG.WAVE_N); S.nextWave = now + CFG.WAVE_MS; }
      }
      checkForms(now);
      // Golpe final: todos terminaron (con un pequeño margen para no parpadear entre herramientas)
      if (workingCount() === 0) {
        if (S.idleSince === null) S.idleSince = now;
        if (now - S.idleSince >= CFG.FINISH_DELAY_MS) {
          const names2 = [...S.parties.values()].filter(p => inArena(p) && p.slot !== null && p.slot < CFG.VISIBLE_PARTIES).map(p => p.name);
          emit('finisher', { names: names2 });
          die('final', now);
        }
      } else S.idleSince = null;
      break;
    }
    case 'dying': if (now - S.phaseAt >= CFG.DYING_MS) { S.phase = 'calm'; S.phaseAt = now; S.king = null; S.minions = []; S.elites = []; } break;
    case 'calm':
      if (now - S.phaseAt >= CFG.CALM_MS) {
        if (workingCount() > 0) startKing(now); else S.phase = 'none';
      }
      break;
  }
  // Limpieza de secuaces y élites caídos
  S.minions = S.minions.filter(m => !m.dyingAt || now - m.dyingAt < 700);
  S.elites = S.elites.filter(e => !e.dyingAt || now - e.dyingAt < 900);
  if (S.banner && now > S.banner.until) S.banner = null;
  if (S.summary && now - S.summary.at > CFG.SUMMARY_MS + CFG.DYING_MS) S.summary = null;
}

export function reset() {
  for (const p of [...S.parties.values()]) removeParty(p);
  for (const c of [...S.camp.values()]) removeCamper(c);
  S.slots.fill(null); S.campSlots.fill(null);
  Object.assign(S, { phase: 'none', king: null, elites: [], minions: [], idleSince: null, banner: null, summary: null, pendingElite: 0 });
  emit('reset', {});                                             // aviso extra para combat/ (suelta rey, élites y secuaces)
}
export function forget(name) {
  const p = S.parties.get(name); if (p) removeParty(p);
  const c = S.camp.get(name); if (c) removeCamper(c);
}
// Durante una repetición los tiempos de trabajo usan el reloj acelerado
export function setReplay(r) {
  S.scale = r && !r.finished ? Math.max(1, Number(r.speed) || 1) : 1;
  const id = r ? r.id : null;
  if (id !== S.replayId) { S.replayId = id; S.memRecent = []; reset(); S.num = 0; }
}

// ---- Información para el panel ---------------------------------------------------------------------------------------
export function info(name) {
  const c = S.camp.get(name);
  if (c && !c.rise) return `En descanso: ${camp.actName(c).toLowerCase()}<br>Party: ${c.race.name} (${c.race.place}) · variante ${c.variant ? 'B' : 'A'}`;
  const p = S.parties.get(name);
  if (!p) return '';
  const st = p.race.stages[p.stage - 1].n;
  return `Party: ${p.race.name} (${p.race.place}) · variante ${p.variant ? 'B' : 'A'}<br>Etapa ${p.stage}: ${st} · poder ${Math.floor(power(p))}<br>` +
    p.race.cls.map((c, i) => `${['vanguardia', 'distancia o magia', 'apoyo'][i]}: ${c.n}`).join(' · ');
}

// Resumen del estado (útil para depurar y para las pruebas)
export const snapshot = () => ({
  phase: S.phase, num: S.num, replay: S.replayId, banner: S.banner && S.banner.text,
  king: S.king && { id: S.king.def.id, form: S.king.form, hp: Math.round(S.king.hp * 10) / 10, max: S.king.max, elites: S.elites.filter(e => !e.dyingAt).length },
  minions: S.minions.filter(m => !m.dyingAt).length, elites: S.elites.filter(e => !e.dyingAt).map(e => ({ type: e.type, hp: e.hp, max: e.max })),
  parties: [...S.parties.values()].map(p => ({ name: p.name, race: p.race.id, variant: p.variant, stage: p.stage, stages: p.race.stages.length, power: Math.round(power(p) * 10) / 10, slot: p.slot, state: p.state, working: p.working, camp: p.cs })),
  camp: [...S.camp.values()].map(c => ({ name: c.name, race: c.race.id, variant: c.variant, slot: c.cs, act: c.act && c.act.kind })),
});
