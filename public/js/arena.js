// Tema «arena»: cada agente que trabaja es una party de 3 héroes (de una raza) que lucha contra un
// Rey Demonio gigante, con secuaces y demonios élite. Los agentes que no trabajan descansan en un
// campamento al pie de la escena (camp.js), separado de la arena por una empalizada con una puerta.
// Todo se deduce de los eventos que ya llegan al navegador (estado de los agentes y uso de
// herramientas); no hay cambios en el servidor.
// Especificación: docs/arena-spec.md.
import { W, H } from './map.js';
import { sfx } from './sound.js';
import { RACES, RACE_BY_ID, ROLES, raceForRole, heroSprite, fxOf, auraOf, HERO_SCALE } from './heroes.js';
import { KINGS, KING_BY_ID, kingSprite, minionSprite, MINIONS, eliteSprite, ELITES } from './bosses.js';
import { fxBack, fxFront, px, reduced, drawGlow, shade } from './fx.js';
import * as camp from './camp.js';

// ---- Constantes fáciles de ajustar ---------------------------------------------------------------
export const CFG = {
  HP_BASE: 100, HP_PER_PARTY: 40,            // vida máxima del rey = 100 + 40 × parties presentes
  STAGE_MULT: [1, 1.5, 2],                   // daño por herramienta según la etapa de la party
  STAGE_POWER: [0, 10, 25],                  // poder necesario para cada etapa (1, 2, 3)
  POWER_MS: 12000,                           // 1 punto de poder por cada 12 s trabajando
  PASSIVE_MS: 10000,                         // 1 punto de daño pasivo cada 10 s trabajando
  LATE_POWER: 5,                             // poder inicial si el rey ya está en forma 2 o 3
  ELITE_POWER: 3,                            // poder que ganan todas las parties al caer un élite
  FORM_HP: [0.6, 0.25],                      // el rey se transforma al 60 % y al 25 % de vida...
  FORM_MS: [3 * 60e3, 7 * 60e3],             // ...o a los 3 y 7 minutos
  ELITE_AT: 0.75, ELITE_STOP: 0.1,           // un élite al 75 % de vida; ninguno por debajo del 10 %
  ELITE_HP_BASE: 12, ELITE_HP_PER_PARTY: 4, ELITE_MIN_PARTIES: 3, ELITE_MAX: 2,
  WAVE_FIRST: 2, WAVE_N: 2, WAVE_MS: 15000, MINIONS_MAX: 10,   // oleadas de secuaces
  COMBO_MS: 30000, COMBO_DMG: 5,             // golpe combinado de una party en etapa 3
  GRACE_MS: 5000, CELEBRATE_MS: 2000, WALK_MAX_MS: 2000, WALK_SPEED: .22, RETURN_SPEED: .13, RETURN_MAX_MS: 2800,
  SPAWN_MS: 2000, DYING_MS: 2000, CALM_MS: 4000, FINISH_DELAY_MS: 400,
  PARTY_FX_MS: 900, KING_FX_MS: 1200, PARTY_SHOUT_MS: 2200, KING_SHOUT_MS: 2500,
  FULL_PARTIES: 6, VISIBLE_PARTIES: 10,      // 6 parties completas; de la 7.ª a la 10.ª solo el de vanguardia
  MAX_BALLOONS: 2,                           // gritos de party visibles a la vez
  MAX_CHATS: 2,                              // globos de conversación visibles a la vez en el campamento
  FLASH_GAP_MS: 340,                         // un destello blanco del rey como mucho cada 340 ms (< 3 por segundo)
  RECENT: 2, SUMMARY_MS: 6000, SUMMARY_MIN_S: 5, QUICK_MS: 500,
};

// ---- Escena -------------------------------------------------------------------------------------
const CX = W / 2, KING_Y = 170;
const FLOOR_CY = 196, CIRCLE_CY = 190;            // centros del suelo de piedra y del círculo mágico (la empalizada corta la arena en y = 248)
// Puestos de las parties (pies del héroe de vanguardia), en abanico: la primera al centro y las demás alternando
// Dos filas: delante (y 234) y detrás (y 212), con las de atrás desplazadas para no taparse; el hueco central de la fila de
// atrás queda libre para que la base del rey (pies en y ≈ 177) se vea entera. Las 6 primeras son parties completas.
const SLOTS = [[240, 234], [120, 234], [360, 234], [180, 212], [300, 212], [60, 212], [420, 212], [30, 234], [450, 234], [20, 212]];
const FORM = [[0, 0], [-17, -9], [17, -9]];       // vanguardia al frente; distancia y apoyo detrás
const EDGE_Y = 236;
const TORCHES = [[56, 104], [424, 104], [150, 126], [330, 126]];

// ---- Estado -------------------------------------------------------------------------------------
const S = {
  phase: 'none', phaseAt: 0, num: 0, king: null, parties: new Map(), slots: Array(CFG.VISIBLE_PARTIES).fill(null),
  elites: [], minions: [], fxs: [], parts: [], joinSeq: 0, clock: 0, scale: 1, replayId: null, idleSince: null,
  memRecent: [], lastKing: null, banner: null, summary: null, selected: null, quickUntil: 0, nextWave: 0,
  pendingElite: 0, lastDoor: 0, eliteSeq: 0, minionSeq: 0, shake: 0, lastUp: 0, rngN: 0, variants: new Map(),
  camp: new Map(), campSlots: Array(camp.CAMP_MAX).fill(null),     // agentes en reposo y quién ocupa cada puesto del campamento
};
let env = { hash: s => s.length, shortName: s => s };
export function init(e) { env = { ...env, ...e }; }
export const active = () => S.phase !== 'none' || S.parties.size > 0;
export const setSelected = name => { S.selected = name; };
export function noteSnapshot(now) { S.quickUntil = now + CFG.QUICK_MS; }   // las parties ya presentes aparecen sin caminar

// ---- Aleatoriedad determinista y reyes recientes ----------------------------------------------------
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
const rnd = () => Math.random();           // solo para efectos visuales (cifras, chispas)
const rngElite = () => rngFrom(strHash(`${S.king ? S.king.def.id : ''}|${S.num}|${S.rngN++}`))();

// ---- Parties ---------------------------------------------------------------------------------------
const baseOf = a => String(a.base || a.name).split('#')[0].toLowerCase();
function raceIndexFor(base) {
  const known = raceForRole(base);
  return known ? RACES.findIndex(r => r.id === known) : env.hash(base) % RACES.length;
}
// Variante B si ya hay otra party (en batalla o descansando) de la misma raza con otro rol; las instancias del mismo rol comparten variante
function variantFor(base, ri) {
  const all = [...S.parties.values(), ...S.camp.values()];
  for (const p of all) if (p.base === base) return p.variant;
  const used = new Set(all.filter(p => p.ri === ri && p.base !== base).map(p => p.variant));
  return used.has(0) && !used.has(1) ? 1 : 0;
}
const power = p => p.tools + p.sec / CFG.POWER_MS + p.bonus;
const stageFor = pw => pw >= CFG.STAGE_POWER[2] ? 3 : pw >= CFG.STAGE_POWER[1] ? 2 : 1;
const kingAlive = () => !!S.king && !S.king.deadAt && (S.phase === 'spawn' || S.phase === 'fight');
const workingCount = () => { let n = 0; for (const p of S.parties.values()) if (p.working) n++; return n; };
const inCampState = p => p.state === 'wait' || p.state === 'gone';
const inArena = p => !inCampState(p);     // 'wait' y 'gone': la party está en el campamento
const freeSlot = () => { const i = S.slots.indexOf(null); return i < 0 ? null : i; };

// ---- Campamento: puestos de descanso ----------------------------------------------------------------------
function takeCampSlot(owner) {
  const i = S.campSlots.indexOf(null);
  if (i < 0) return null;
  S.campSlots[i] = owner; owner.cs = i; return i;
}
function freeCampSlot(owner) { if (owner.cs !== null && S.campSlots[owner.cs] === owner) S.campSlots[owner.cs] = null; owner.cs = null; }
function campInfo(a) {
  const base = baseOf(a), ri = raceIndexFor(base);
  return { base, ri, race: RACES[ri], variant: variantFor(base, ri), seed: strHash(a.name) % 97 };
}
// Un agente que no trabaja descansa en el campamento: entra por la puerta (o aparece ya sentado al abrir la escena)
function ensureCamper(a, now) {
  let c = S.camp.get(a.name), snap = false;
  if (!c) { c = camp.makeCamper(a, campInfo(a), now, null); S.camp.set(a.name, c); snap = now < S.quickUntil; }
  if (c.cs === null && (!c.leaving || c.gone) && takeCampSlot(c) !== null) {      // hay un puesto libre: entra por la puerta (o aparece ya sentado al abrir la escena)
    camp.assignSlot(c, c.cs, now, snap);
    if (!c.el) makePlate(c, 'rest');
  }
}
function removeCamper(c) {
  freeCampSlot(c); S.camp.delete(c.name);
  if (c.el) { c.el.plate.remove(); c.el.ball.remove(); c.el = null; }
}
// Una party que vuelve del combate pasa a ser un grupo en reposo, en el mismo sitio donde está
function toCamp(p, now) {
  const pos = [0, 1, 2].map(i => heroPos(p, i, now)), info = { base: p.base, ri: p.ri, race: p.race, variant: p.variant, seed: p.seed };
  const slot = p.cs;
  removeParty(p, true);
  const c = camp.makeCamper({ name: p.name }, info, now, pos);
  S.camp.set(p.name, c);
  if (slot !== null) { S.campSlots[slot] = c; c.cs = slot; } else takeCampSlot(c);
  if (c.cs !== null) { camp.assignSlot(c, c.cs, now, false); makePlate(c, 'rest'); }
}

function join(a, now) {
  const base = baseOf(a), ri = raceIndexFor(base), variant = variantFor(base, ri);
  const p = {
    name: a.name, base, ri, race: RACES[ri], variant, order: ++S.joinSeq, seed: strHash(a.name) % 97, slot: null, cs: null, off: null,
    state: 'wait', x: camp.GATE_X + ((S.joinSeq % 3) - 1) * 22, y: camp.GATE_IN.y + 10, pts: null, seg: null, tot: 0, t0: 0, dur: 1, side: S.joinSeq % 2 ? -1 : 1,
    working: true, doneAt: 0, celebrateAt: -1e9, tools: 0, sec: 0, passive: 0, comboAt: now,
    bonus: S.king && S.king.form >= 2 && kingAlive() ? CFG.LATE_POWER : 0,
    stage: 1, stageAt: -1e9, shoutAt: -1e9, lastHit: -1e9, hits: 0, turn: 0, heroT: [-1e9, -1e9, -1e9], flashAt: -1e9, counted: false, el: null,
  };
  // Si el agente descansaba, su party sale desde donde estaba (cada héroe parte de su sitio) y conserva el puesto hasta cruzar la puerta
  const c = S.camp.get(a.name);
  if (c) {
    const [h0, h1, h2] = c.h;
    p.x = h0.x; p.y = h0.y; p.off = [[0, 0], [h1.x - h0.x, h1.y - h0.y], [h2.x - h0.x, h2.y - h0.y]];
    p.variant = c.variant;
    const slot = c.cs;
    removeCamper(c);
    if (slot !== null) { S.campSlots[slot] = p; p.cs = slot; }
  }
  S.parties.set(a.name, p);
  makePlate(p);
  if (!kingAlive()) return p;                                      // espera en el campamento a que aparezca el siguiente rey
  p.counted = true; addMaxHp(now); enter(p, now);
  maybeEliteByCrowd();
  return p;
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
const lead = (p, now) => { const q = heroPos(p, 0, now); return { x: q.x, y: q.y }; };
// Puntos de paso por la puerta cuando la party cruza la empalizada
function viaGate(from, to, goingOut) {
  if (from.y <= camp.FENCE_Y && to.y <= camp.FENCE_Y) return [from, to];
  return goingOut ? [from, camp.GATE_IN, camp.GATE_OUT, to] : [from, camp.GATE_OUT, camp.GATE_IN, to];
}
function enter(p, now) {
  if (p.cs !== null) { if (S.campSlots[p.cs] === p) S.campSlots[p.cs] = null; p.cs = null; }
  if (p.slot === null) { const s = freeSlot(); if (s !== null) { p.slot = s; S.slots[s] = p; } }
  const quick = now < S.quickUntil, tgt = p.slot === null ? { x: p.side < 0 ? 16 : W - 16, y: EDGE_Y } : { x: SLOTS[p.slot][0], y: SLOTS[p.slot][1] };
  if (p.slot === null) { p.x = tgt.x; p.y = tgt.y; p.off = null; p.state = 'idle'; return; }      // sin puesto: cuenta para el daño, pero no se dibuja
  if (quick) { p.state = 'idle'; p.x = tgt.x; p.y = tgt.y; p.off = null; p.flashAt = now; return; }
  const from = lead(p, now);
  setPath(p, viaGate(from, tgt, true), now, CFG.WALK_SPEED, 700, CFG.WALK_MAX_MS);
  p.state = 'walk';
  if (now - S.lastDoor > 600) { S.lastDoor = now; sfx.door(); }
}
// Si el campamento está lleno, el grupo del último puesto cede el suyo a la party que vuelve
function evictCamper(p) {
  for (let i = S.campSlots.length - 1; i >= 0; i--) {
    const o = S.campSlots[i];
    if (o && o.h) { camp.dismiss(o); o.cs = null; S.campSlots[i] = p; p.cs = i; return; }
  }
}
// La party vuelve caminando al campamento, a un puesto libre (si no queda ninguno, cruza la puerta y deja de verse)
function beginExit(p, now) {
  const from = lead(p, now);
  if (p.cs === null && takeCampSlot(p) === null) evictCamper(p);
  const b = p.cs === null ? { x: camp.GATE_X, y: camp.CAMP_SLOTS[2][1] + 6 } : camp.slotBase(p.cs);
  setPath(p, viaGate(from, { x: b.x, y: b.y }, false), now, CFG.RETURN_SPEED, 900, CFG.RETURN_MAX_MS);
  p.off = null; p.state = 'exit';
}
function removeParty(p, keepCampSlot) {
  if (p.slot !== null) S.slots[p.slot] = null;
  if (!keepCampSlot) freeCampSlot(p);
  S.parties.delete(p.name);
  if (p.el) { p.el.plate.remove(); p.el.ball.remove(); p.el = null; }
}
// Posición de un héroe (con retraso entre ellos al caminar)
function heroPos(p, i, now) {
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
function nearestMinion(p) {
  let best = null, bd = 1e9;
  for (const m of S.minions) if (!m.dyingAt) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
  return best;
}
const kingCenter = () => ({ x: CX, y: KING_Y - Math.round(kingSprite(S.king.def, S.king.form).h * .42) });
const burst = (x, y, color, n = 8, r = 14, life = 500) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd(); S.parts.push({ t: S.now, x, y, vx: Math.cos(a) * r * (.5 + rnd()), vy: Math.sin(a) * r * (.5 + rnd()) - 6, life, c: color }); } if (S.parts.length > 160) S.parts.splice(0, S.parts.length - 160); };

// Un héroe de la party ataca: vanguardia de cerca, distancia con proyectil y apoyo con un haz de luz
function strike(p, i, now, target) {
  const pos = heroPos(p, i, now), cls = p.race.cls[i], [kind, color] = cls.hit;
  p.heroT[i] = now;
  S.fxs.push({ t: now, kind: ['melee', 'shot', 'beam'][i], style: kind, color, ax: pos.x, ay: pos.y - 12, tx: target.x, ty: target.y, pi: p.name, hi: i });
  if (S.fxs.length > 40) S.fxs.shift();
}
// Cada herramienta es un golpe
export function hit(a, now) {
  const p = S.parties.get(a.name) || join(a, now);
  const was = p.working;
  p.working = true; p.doneAt = 0; p.tools++;
  if (!was && (p.state === 'exit' || p.state === 'gone')) enter(p, now);      // gracia: vuelve con su poder
  if (!kingAlive() || p.state === 'wait') return;
  p.lastHit = now; p.hits++;
  const elite = S.elites.find(e => !e.dyingAt), minion = elite ? null : nearestMinion(p);
  const target = elite ? { x: elite.x, y: elite.y - 22 } : minion ? { x: minion.x, y: minion.y - 6 } : kingCenter();
  if (p.slot !== null && p.slot < CFG.VISIBLE_PARTIES && inArena(p)) strike(p, p.turn++ % 3, now, target);
  if (minion) killMinion(minion, now);
  damage(CFG.STAGE_MULT[p.stage - 1], now);
  sfx.hit();
}
function killMinion(m, now) { m.dyingAt = now; burst(m.x, m.y - 6, S.king.def.pal.glow, 6, 12, 350); }

function addNum(o, pts, now) {
  o.dmg.push({ t: now, v: Math.round(pts * (8 + rnd() * 30)), dx: Math.round(rnd() * 16 - 8) });
  if (o.dmg.length > 6) o.dmg.shift();                      // se dibujan como mucho 6 cifras
}
function damage(pts, now) {
  const el = S.elites.find(e => !e.dyingAt);
  if (el) {                                                  // el élite protege al rey: recibe los golpes primero
    el.hp -= pts; el.flashAt = now; addNum(el, pts, now);
    if (el.hp <= 0) eliteDown(el, now);
    return;
  }
  const b = S.king;
  if (!b || b.deadAt) return;
  addNum(b, pts, now);
  if (now - b.flashAt > CFG.FLASH_GAP_MS) b.flashAt = now;
  if (b.form < 3) {                                          // un golpe que cruzaría el umbral lo deja justo en él y transforma al rey
    const floor = b.max * CFG.FORM_HP[b.form - 1];
    if (b.hp - pts <= floor) { b.hp = Math.min(b.hp, floor); transformKing(now); return; }
  }
  b.hp -= pts;
  if (b.hp <= 0) { b.hp = 0; die('hp', now); }
}
function transformKing(now) {
  const b = S.king;
  b.form++; b.formAt = now; b.shoutAt = now; S.shake = now;
  sfx.transform();
  S.pendingElite++;                                          // el rey se transforma: aparece un élite
  kingSprite(b.def, Math.min(3, b.form + 1));               // prepara la siguiente forma sin tirones
}
function checkForms(now) {
  const b = S.king;
  if (!b || b.deadAt || b.form >= 3 || now - b.formAt < CFG.KING_FX_MS + 200) return;
  const f = b.form;
  if (b.hp <= b.max * CFG.FORM_HP[f - 1] + 1e-6 || S.clock - b.baseClock >= CFG.FORM_MS[f - 1]) transformKing(now);
}

// ---- Élites y secuaces ----------------------------------------------------------------------------------
const eligibleElite = () => S.phase === 'fight' && S.king && !S.king.deadAt && S.king.hp > S.king.max * CFG.ELITE_STOP;
function spawnElite(now) {
  let n = 0; for (const p of S.parties.values()) if (inArena(p)) n++;
  const cap = n >= CFG.ELITE_MIN_PARTIES ? CFG.ELITE_MAX : 1;
  if (S.elites.filter(e => !e.dyingAt).length >= cap) return false;
  const def = ELITES[Math.floor(rngElite() * ELITES.length)], side = S.eliteSeq++ % 2 ? 1 : -1;
  const hp = CFG.ELITE_HP_BASE + CFG.ELITE_HP_PER_PARTY * n;
  const e = { def, type: def.id, side, x: CX + side * 118, y: KING_Y + 8, hp, max: hp, bornAt: now, dyingAt: 0, flashAt: -1e9, dmg: [], seed: rnd() * 10 };
  S.elites.push(e);
  S.banner = { text: `¡Llega el ${def.name}!`, until: now + 1800, prio: 1 };
  sfx.elite();
  burst(e.x, e.y - 20, S.king.def.pal.glow, 10, 20, 600);
  if (e.type === 'heraldo') S.nextWave = now;               // el heraldo llama a más secuaces
  return true;
}
function eliteDown(e, now) {
  e.dyingAt = now; e.hp = 0;
  burst(e.x, e.y - 22, '#ffffff', 14, 26, 700); burst(e.x, e.y - 22, S.king.def.pal.glow, 10, 20, 700);
  for (const p of S.parties.values()) p.bonus += CFG.ELITE_POWER;      // la tensión eleva a las parties
  sfx.eliteDown();
}
function minionCap() { let n = 0; for (const p of S.parties.values()) if (inArena(p)) n++; return Math.min(CFG.MINIONS_MAX, 2 + 2 * n); }
function spawnWave(now, count) {
  const cap = minionCap();
  for (let i = 0; i < count; i++) {
    if (S.minions.filter(m => !m.dyingAt).length >= cap) break;
    const k = S.minionSeq++, def = MINIONS[k % MINIONS.length], type = def.id, hr = rngFrom(strHash(`${S.num}|${k}`));
    const hx = 50 + hr() * 380, hy = type === 'murcielago' ? KING_Y - 32 + hr() * 34 : type === 'sombra' ? KING_Y + 12 + hr() * 8 : type === 'ojo' ? KING_Y - 18 + hr() * 22 : KING_Y - 2 + hr() * 18;
    S.minions.push({ type, x: CX + (hr() - .5) * 60, y: KING_Y + 4, hx, hy, bornAt: now, dyingAt: 0, seed: hr() * 10, shotAt: now + 1500 + hr() * 1500, kind: k });
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
  S.minions.forEach((m, i) => { if (!m.dyingAt) m.dyingAt = now + i * 110; });     // los secuaces explotan en cadena
  S.elites.forEach(e => { if (!e.dyingAt) e.dyingAt = now; });
  for (const p of S.parties.values()) if (inArena(p)) p.celebrateAt = now;
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
  S.king = { def, form: 1, hp: max, max, appearAt: now, baseClock: S.clock, formAt: -1e9, shoutAt: -1e9, flashAt: -1e9, boostAt: -1e9, dmg: [], deadAt: 0, e75: false, e3: false, goneHits: 0 };
  S.phase = 'spawn'; S.phaseAt = now; S.idleSince = null; S.summary = null; S.elites = []; S.minions = []; S.pendingElite = 0; S.nextWave = 0;
  S.banner = { text: `¡Aparece ${def.name}!`, until: now + 2400, prio: 1 };
  sfx.bossAppear();
  for (const p of S.parties.values()) {
    p.counted = true;
    if (p.working && p.state === 'wait') enter(p, now);
  }
  maybeEliteByCrowd();
  kingSprite(def, 1); setTimeout(() => { kingSprite(def, 2); setTimeout(() => kingSprite(def, 3), 60); }, 120);   // hornea las formas sin tirones
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
    } else if (p.working) { p.working = false; p.doneAt = now; p.celebrateAt = now; }
  }
  for (const p of [...S.parties.values()]) {
    if (!names.has(p.name)) { removeParty(p); continue; }
    if (p.working) {
      p.sec += dtGame;
      const pass = Math.floor(p.sec / CFG.PASSIVE_MS);
      if (pass > p.passive) { const n = pass - p.passive; p.passive = pass; if (kingAlive() && inArena(p)) damage(n, now); }
    }
    // Movimiento: al llegar a la arena la party se planta en su puesto; al volver, queda en el campamento ('gone')
    if ((p.state === 'walk' || p.state === 'exit') && now >= p.t0 + p.dur + 2 * 90) {
      const end = p.pts[p.pts.length - 1];
      p.x = end.x; p.y = end.y; p.off = null;
      if (p.state === 'walk') { p.state = 'idle'; p.flashAt = now; } else p.state = 'gone';
    }
    // Etapas: de una en una y sin retroceder
    if (inArena(p) && p.state !== 'walk' && p.slot !== null) {
      const target = stageFor(power(p));
      if (target > p.stage && now - p.stageAt > CFG.PARTY_FX_MS + 100) {
        p.stage++; p.stageAt = now; p.shoutAt = now;
        if (now - S.lastUp > 400) { S.lastUp = now; sfx.heroUp(); }
      }
      // Golpe combinado (etapa 3)
      if (p.working && p.stage === 3 && kingAlive() && S.phase === 'fight' && now - p.comboAt >= CFG.COMBO_MS) {
        p.comboAt = now;
        const elite = S.elites.find(e => !e.dyingAt), tg = elite ? { x: elite.x, y: elite.y - 22 } : kingCenter();
        for (let i = 0; i < 3; i++) strike(p, i, now, tg);
        damage(CFG.COMBO_DMG, now);
      }
    }
    // Salida: celebra 2 s y vuelve caminando al campamento por la puerta; con 5 s de gracia conserva su poder
    // y, pasada la gracia, se queda descansando (pierde etapa y poder)
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
          const elite = S.elites.find(e => !e.dyingAt), tg = kingCenter();
          for (const p of S.parties.values()) if (inArena(p) && p.slot !== null && p.slot < CFG.VISIBLE_PARTIES) for (let i = 0; i < (p.slot >= CFG.FULL_PARTIES ? 1 : 3); i++) strike(p, i, now, elite ? { x: elite.x, y: elite.y - 22 } : tg);
          die('final', now);
        }
      } else S.idleSince = null;
      break;
    }
    case 'dying': if (now - S.phaseAt >= CFG.DYING_MS) { S.phase = 'calm'; S.phaseAt = now; S.king = null; S.minions = []; S.elites = []; } break;
    case 'calm':
      if (now - S.phaseAt >= CFG.CALM_MS) {
        if (workingCount() > 0) startKing(now); else { S.phase = 'none'; S.variants.clear(); }
      }
      break;
  }
  // Limpieza de secuaces y élites caídos
  S.minions = S.minions.filter(m => !m.dyingAt || now - m.dyingAt < 700);
  S.elites = S.elites.filter(e => !e.dyingAt || now - e.dyingAt < 900);
  if (S.banner && now > S.banner.until) S.banner = null;
  if (S.summary && now - S.summary.at > CFG.SUMMARY_MS + CFG.DYING_MS) S.summary = null;
  updateEnemies(now, dt);
}

export function reset() {
  for (const p of [...S.parties.values()]) removeParty(p);
  for (const c of [...S.camp.values()]) removeCamper(c);
  S.slots.fill(null); S.campSlots.fill(null);
  Object.assign(S, { phase: 'none', king: null, elites: [], minions: [], fxs: [], parts: [], idleSince: null, banner: null, summary: null, pendingElite: 0 });
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

// ---- Movimiento de secuaces y élites --------------------------------------------------------------------------
function nearestParty(x, y) {
  let best = null, bd = 1e9;
  for (const p of S.parties.values()) if (inArena(p) && p.slot !== null) { const d = Math.hypot(p.x - x, p.y - 30 - y); if (d < bd) { bd = d; best = p; } }
  return best;
}
function updateEnemies(now, dt) {
  for (const m of S.minions) {
    if (m.dyingAt) continue;
    const t = now / 1000 + m.seed;
    let tx = m.hx, ty = m.hy;
    if (m.type === 'diablillo') {                         // camina hacia la party más cercana y la «ataca»
      const p = nearestParty(m.hx, m.hy);
      if (p && Math.sin(t * .8) > .55) { tx = p.x + Math.sin(m.seed) * 20; ty = Math.min(KING_Y + 20, p.y - 40); }
    } else if (m.type === 'murcielago') { tx = m.hx + Math.sin(t * 1.3) * 26; ty = m.hy + Math.sin(t * 2.1) * 6; }
    else if (m.type === 'sombra') tx = m.hx + Math.sin(t * .7) * 30;
    else if (m.type === 'ojo') {                           // dispara bolitas visuales hacia las parties
      ty = m.hy + Math.sin(t * 1.6) * 3;
      if (now >= m.shotAt) { m.shotAt = now + 2500 + (m.seed % 1) * 2000; const p = nearestParty(m.x, m.y); if (p) S.fxs.push({ t: now, kind: 'orb', color: S.king ? S.king.def.pal.glow : '#fff', ax: m.x, ay: m.y, tx: p.x, ty: p.y - 24 }); }
    }
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), sp = (m.type === 'murcielago' ? 60 : 38) * dt;
    if (d > .5) { const k = Math.min(1, sp / d); m.x += dx * k; m.y += dy * k; }
    m.face = dx < -.2 ? -1 : dx > .2 ? 1 : m.face || 1;
  }
  for (const e of S.elites) {
    if (e.dyingAt) continue;
    const t = now / 1000 + e.seed;
    if (e.type === 'cancerbero') { e.x = CX + e.side * (130 + Math.sin(t * .8) * 70); e.y = KING_Y + 16; e.face = Math.cos(t * .8) * e.side > 0 ? 1 : -1; }
    else if (e.type === 'brujo') { e.x = CX + e.side * (96 + Math.sin(t * .6) * 20); e.y = KING_Y - 10 + Math.sin(t * 1.4) * 5; e.face = -e.side; }
    else if (e.type === 'heraldo') { e.x = CX + e.side * 128; e.y = KING_Y - 24 + Math.sin(t * 1.1) * 6; e.face = -e.side; }
    else { e.x = CX + e.side * 108; e.y = KING_Y + 8; e.face = -e.side; }
    if (e.type === 'brujo' && now - (e.castAt || 0) > 2600) { e.castAt = now; const p = nearestParty(e.x, e.y); if (p) S.fxs.push({ t: now, kind: 'orb', color: S.king.def.pal.glow, ax: e.x, ay: e.y - 30, tx: p.x, ty: p.y - 24 }); }
  }
}

// ---- Dibujo: fondo (se hornea una vez) --------------------------------------------------------------------------
const hashN = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function ellFill(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (let y = -Math.ceil(ry); y < Math.ceil(ry); y++) { const k = (y + .5) / ry, half = rx * Math.sqrt(Math.max(0, 1 - k * k)); if (half > 0) g.fillRect(Math.round(cx - half), Math.round(cy + y), Math.round(half * 2), 1); }
}
function ellRing(g, cx, cy, rx, ry, c, step = 1) {
  g.fillStyle = c;
  for (let i = 0; i < 360; i += step) { const a = i / 180 * Math.PI; g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1); }
}
export function drawBackground(g) {
  const sky = g.createLinearGradient(0, 0, 0, 160);
  sky.addColorStop(0, '#0a0614'); sky.addColorStop(1, '#271b3e');
  g.fillStyle = '#16102a'; g.fillRect(0, 0, W, H);
  g.fillStyle = sky; g.fillRect(0, 0, W, 160);
  for (let i = 0; i < 60; i++) px(g, hashN(i, 1) * W, hashN(i, 2) * 70, 1, 1, i % 5 ? '#6a5a9a' : '#e8e0ff');
  // Gradas en arco detrás: filas de bloques con pilares rotos
  for (let r = 0; r < 6; r++) {
    const y = 78 + r * 12, rows = shade('#241a3a', r * 5);
    g.fillStyle = rows; g.fillRect(0, y, W, 12);
    g.fillStyle = shade(rows, 14); g.fillRect(0, y, W, 1); g.fillStyle = shade(rows, -22); g.fillRect(0, y + 11, W, 1);
    for (let x = (r % 2) * 14; x < W; x += 28) { g.fillStyle = shade(rows, -14); g.fillRect(x, y + 1, 1, 10); }
    // Público: siluetas apretadas con ropas apagadas, algunas con el brazo en alto (más oscuras cuanto más lejos)
    const CROWD = ['#7a3a4a', '#3a6a7a', '#8a7a3a', '#5a4a8a', '#4a7a4a', '#8a5a3a'];
    for (let xx = 2; xx < W - 6; xx += 5) {
      const hv = hashN(xx, r, 9); if (hv < .18) continue;
      const x = xx + Math.round((hashN(xx, r, 3) - .5) * 3), cl = shade(CROWD[Math.floor(hashN(xx, r, 5) * CROWD.length)], -30 + r * 3), up = hv > .88;
      const sk = ['#9a7660', '#7a5a48', '#b08a6a'][Math.floor(hashN(xx, r, 6) * 3)], hair = ['#1c1210', '#3a2418', '#9a8658', '#5a5a64'][Math.floor(hashN(xx, r, 7) * 4)];
      px(g, x - 1, y + 7, 7, 5, cl); px(g, x, y + 6, 5, 1, cl);                    // hombros y torso
      px(g, x + 1, y + 2, 4, 4, sk); px(g, x + 1, y + 1, 4, 2, hair);                // cabeza con pelo
      if (up) { px(g, x - 2, y + 1, 2, 7, cl); px(g, x - 2, y, 2, 2, sk); }          // brazo en alto
    }
  }
  g.fillStyle = 'rgba(10,6,24,.5)'; g.fillRect(0, 78, W, 72);                      // velo: el público es ambiente, no compite con la acción
  // Muro de fondo con arcos
  for (const x of [0, 96, 192, 288, 384]) {
    g.fillStyle = '#120c20'; g.fillRect(x + 14, 30, 68, 50);
    ellFill(g, x + 48, 30, 34, 14, '#120c20');
    g.fillStyle = '#2a2040'; g.fillRect(x + 10, 30, 4, 50); g.fillRect(x + 82, 30, 4, 50);
    ellRing(g, x + 48, 30, 36, 15, '#3a2e58');
  }
  // Pilares ruinosos con antorcha
  for (const [x, h] of [[36, 92], [150, 70], [330, 70], [444, 92]]) {
    const top = 150 - h;
    g.fillStyle = '#2e2448'; g.fillRect(x - 9, top, 18, h);
    g.fillStyle = '#4a3c70'; g.fillRect(x - 9, top, 4, h); g.fillStyle = '#1a1230'; g.fillRect(x + 5, top, 4, h);
    for (let y = top + 6; y < 150; y += 10) { g.fillStyle = '#1e1636'; g.fillRect(x - 9, y, 18, 1); }
    g.fillStyle = '#4a3c70'; g.fillRect(x - 12, top - 3, 24, 4); g.fillStyle = '#1a1230'; g.fillRect(x - 12, top + 1, 24, 1);
    for (let i = 0; i < 5; i++) px(g, x - 12 + hashN(x, i) * 22, top - 3, 3 + (i % 2) * 2, 1 + (i % 3), '#16102a');       // borde roto
  }
  // Estandartes
  for (const x of [96, 384]) {
    g.fillStyle = '#4a1624'; g.fillRect(x - 6, 58, 12, 34); g.fillStyle = '#6a2234'; g.fillRect(x - 6, 58, 3, 34);
    for (let i = 0; i < 3; i++) px(g, x - 6 + i * 4, 92, 4, 3 - i, '#4a1624');
    px(g, x - 2, 68, 4, 4, '#c8a040'); px(g, x - 1, 72, 2, 6, '#c8a040'); px(g, x - 4, 70, 8, 1, '#c8a040');
  }
  // Soportes de antorcha
  for (const [x, y] of TORCHES) { g.fillStyle = '#3a2e20'; g.fillRect(x - 1, y, 3, 9); g.fillStyle = '#6a5a40'; g.fillRect(x - 3, y - 2, 7, 3); g.fillStyle = '#1a1210'; g.fillRect(x - 2, y - 1, 5, 1); }
  // Suelo de piedra circular
  g.fillStyle = '#1a1430'; g.fillRect(0, 140, W, H - 140);
  ellFill(g, CX, FLOOR_CY, 238, 80, '#2a2240'); ellFill(g, CX, FLOOR_CY, 230, 76, '#443c58');
  for (let y = 116; y < camp.FENCE_Y; y++) for (let x = 10; x < W - 10; x += 2) {
    const nx = (x - CX) / 228, ny = (y - FLOOR_CY) / 75;
    if (nx * nx + ny * ny < 1 && hashN(x, y) > .8) px(g, x, y, 2, 1, hashN(y, x) > .5 ? '#4e4664' : '#3a324e');
  }
  for (const [rx, ry] of [[210, 66], [170, 53], [120, 38]]) { ellRing(g, CX, FLOOR_CY, rx, ry, '#2c2442'); ellRing(g, CX, FLOOR_CY + 1, rx, ry, '#4e4668'); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; for (let r = .52; r < .9; r += .006) px(g, CX + Math.cos(a) * 210 * r, FLOOR_CY + Math.sin(a) * 66 * r, 1, 1, '#2c2442'); }
  drawThrone(g);
  camp.drawCampBackground(g);                                   // empalizada con puerta y campamento de descanso
}
// Trono vacío del Rey Demonio (queda tras el rey; solo se ve entero con la arena vacía)
function drawThrone(g) {
  const x = CX, y = KING_Y + 6, st = '#3c3258', hi = '#5c4e80', sh = '#1c1430';
  const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
  for (let i = 0; i < 3; i++) { const w = 92 - i * 12; R(-w / 2, -i * 6, w, 6, st); R(-w / 2, -i * 6, w, 1, hi); R(-w / 2, -i * 6 + 5, w, 1, sh); }
  for (let r = 0; r < 70; r++) {                                  // respaldo con punta
    const hw = r < 54 ? 22 : Math.max(2, 22 - (r - 54) * 1.4), yy = -18 - r;
    R(-hw, yy, hw * 2, 1, st); R(-hw, yy, 3, 1, hi); R(hw - 3, yy, 3, 1, sh);
  }
  R(-28, -44, 10, 30, st); R(18, -44, 10, 30, st); R(-28, -44, 10, 2, hi); R(18, -44, 10, 2, hi);
  R(-22, -34, 44, 16, '#2c2444');
  for (const sd of [-1, 1]) { for (let k = 0; k < 14; k++) R(sd * (18 + k * .6) - (sd < 0 ? 3 : 0), -88 - k, 3, 1, st); R(sd * 18 - (sd < 0 ? 3 : 0), -88, 3, 1, hi); }     // cuernos
  R(-5, -78, 10, 8, '#d8d0c0'); R(-3, -75, 2, 3, '#0e0a14'); R(1, -75, 2, 3, '#0e0a14'); R(-1, -71, 2, 2, '#0e0a14');                        // cráneo
  for (const [a, b] of [[-14, -62], [12, -62], [-4, -56], [-10, -48], [8, -48]]) { R(a, b, 3, 1, '#7a4ac8'); R(a + 1, b + 1, 1, 3, '#7a4ac8'); }  // runas
}

// ---- Dibujo: capa viva bajo los sprites (círculo mágico, antorchas) --------------------------------------------------
export function drawLive(g, now) {
  const b = S.king, col = b ? b.def.color : '#7a6aa8', on = !!b && S.phase !== 'calm', rm = reduced();
  const spin = rm ? 0 : now / 6000, cy = CIRCLE_CY;
  g.globalAlpha = on ? .2 : .08; g.fillStyle = col; g.beginPath(); g.ellipse(CX, cy, 180, 52, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = on ? .16 : .06; g.beginPath(); g.ellipse(CX, KING_Y + 2, 120, 22, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  for (const [rx, ry, n, dir] of [[196, 55, 64, 1], [140, 40, 44, -1], [86, 24, 28, 1]]) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + spin * dir;
      px(g, CX + Math.cos(a) * rx, cy + Math.sin(a) * ry, 1, 1, i % 4 === 0 ? col : on ? shade(col, -40) : '#4a3a7a');
      if (i % 8 === 0) { px(g, CX + Math.cos(a) * (rx - 3), cy + Math.sin(a) * (ry - 1), 2, 1, on ? '#ffffff' : '#7a6aa8'); px(g, CX + Math.cos(a) * (rx - 3) + 1, cy + Math.sin(a) * (ry - 1) - 1, 1, 3, on ? col : '#5a4a8a'); }
    }
  }
  // Antorchas (llama de 3 fotogramas)
  camp.drawCampLive(g, now);
  for (const [x, y] of TORCHES) {
    const f = rm ? 1 : Math.floor(now / 110 + x) % 3, h = 5 + f;
    g.globalAlpha = .22; g.fillStyle = '#ff9a2a'; g.beginPath(); g.ellipse(x, y - 8, 14, 11, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    px(g, x - 2, y - h, 5, h, '#d8501a'); px(g, x - 1, y - h - 2, 3, h, '#ff9a2a'); px(g, x, y - h - 1, 1, h - 1, '#ffe08a');
  }
}

// ---- Dibujo: rey ------------------------------------------------------------------------------------------------------
export function shakeOffset(now) {
  const b = S.king;
  if (!b || reduced() || b.form < 2) return [0, 0];
  const t = now - b.formAt;
  if (t < 0 || t > 500) return [0, 0];
  const amp = 2 * (1 - t / 500), s = Math.floor(t / 60);
  return [s % 2 ? amp : -amp, (s >> 1) % 2 ? amp * .5 : -amp * .5].map(Math.round);
}
const easeOut = k => 1 - (1 - k) * (1 - k);
function drawKing(g, b, now) {
  const def = b.def, spr = kingSprite(def, b.form), dying = b.deadAt ? now - b.deadAt : 0, rm = reduced();
  const appear = S.phase === 'spawn' ? Math.min(1, (now - S.phaseAt) / CFG.SPAWN_MS) : 1;
  const tk = b.form > 1 ? (now - b.formAt) / CFG.KING_FX_MS : 2, transforming = tk >= 0 && tk < 1;
  const bob = rm || appear < 1 ? 0 : Math.round(Math.sin(now / 800) * 1.2);
  let x = CX, y = KING_Y + bob, clipFloor = false, alpha = 1;
  if (appear < 1) {
    const e = easeOut(appear);
    if (def.appear === 'descend') { y = KING_Y - (1 - e) * 90; alpha = Math.min(1, appear * 2.2); }
    else { y = KING_Y + (1 - e) * (spr.h + 6); clipFloor = true; }
  }
  if (dying) alpha = Math.max(0, 1 - Math.max(0, dying - 500) / (CFG.DYING_MS - 500));
  // Sombra enorme sobre la arena
  g.globalAlpha = .32 * Math.min(1, appear * 1.6) * (dying ? alpha : 1); g.fillStyle = '#000';
  g.beginPath(); g.ellipse(CX, KING_Y + 1, spr.w * .36, 9, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = .14 * Math.min(1, appear * 1.6) * (dying ? alpha : 1); g.beginPath(); g.ellipse(CX, KING_Y + 8, spr.w * .56, 17, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  if (appear < 1) {                                      // columnas de luz de la aparición
    g.globalAlpha = (1 - appear) * .8;
    for (let i = -6; i <= 6; i++) for (let k = 0; k < spr.h * Math.min(1, appear * 2); k += 4) px(g, CX + i * 7, KING_Y - k, 1, 2, def.color);
    g.globalAlpha = 1;
  }
  g.save();
  if (clipFloor) { g.beginPath(); g.rect(0, 0, W, KING_Y + 3); g.clip(); }
  const ctx = { x, y, w: Math.round(spr.w * .55), h: Math.round(spr.h * .85), t: now, img: spr.img, ax: spr.ax, ay: spr.ay };
  g.globalAlpha = alpha;
  const fx = def.fx[b.form - 1];
  fxBack(g, fx, ctx);
  const prev = transforming ? kingSprite(def, b.form - 1) : null;
  if (transforming && rm) {                              // movimiento reducido: fundido directo
    g.globalAlpha = alpha * (1 - tk); g.drawImage(prev.img, x - prev.ax, y - prev.ay);
    g.globalAlpha = alpha * tk; g.drawImage(spr.img, x - spr.ax, y - spr.ay);
  } else if (transforming && tk < .35) g.drawImage(prev.img, x - prev.ax, y - prev.ay);
  else g.drawImage(spr.img, x - spr.ax, y - spr.ay);
  g.globalAlpha = alpha;
  // Brillo de los ojos y del núcleo
  if (!dying && appear >= 1) {
    const pul = rm ? .8 : .6 + .4 * Math.sin(now / 300);
    for (const [ex, ey] of spr.eyes) drawGlow(g, def.pal.glow, x + ex, y + ey, 9, 7, now, pul * .8);
    if (spr.core) drawGlow(g, def.pal.glow, x + spr.core[0], y + spr.core[1], 14, 12, now + 400, pul * .7);
  }
  const flash = now - b.flashAt < 140 || (dying && dying < 300) ? .7 : transforming && !rm ? Math.max(0, tk < .35 ? tk / .35 : 1 - (tk - .35) / .65) * .9 : 0;
  if (flash > 0) { const w = transforming && tk < .35 ? prev : spr; g.globalAlpha = flash * alpha; g.drawImage(w.white, x - w.ax, y - w.ay); }
  g.globalAlpha = alpha;
  if (!dying) fxFront(g, fx, ctx);
  g.restore(); g.globalAlpha = 1;
  if (transforming && !rm) {                             // onda expansiva
    const r = tk * 150;
    g.strokeStyle = `rgba(255,255,255,${1 - tk})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y - spr.h * .4, r, r * .55, 0, 0, Math.PI * 2); g.stroke();
  }
  if (dying) {                                           // explosiones en cadena sobre el cuerpo
    for (let i = 0; i < 14; i++) {
      const t0 = i * 110, k = (dying - t0) / 500;
      if (k < 0 || k > 1) continue;
      const bx = x + (hashN(i, 3) - .5) * spr.w * .5, by = y - hashN(i, 4) * spr.h * .8, r = 3 + k * 12;
      g.fillStyle = i % 2 ? '#f5d442' : '#ffffff'; g.globalAlpha = 1 - k; g.fillRect(Math.round(bx - r / 2), Math.round(by - r / 2), Math.round(r), Math.round(r)); g.globalAlpha = 1;
    }
  }
  for (const dm of b.dmg) {                              // cifras de daño (solo visuales)
    const age = now - dm.t;
    // Con la forma 3 (muy alta) la cifra se detendría sobre la barra de vida: el punto de partida no baja de y = 36 y sube 15 px como mucho, sin pasar de y = 21
    if (age < 900) drawNumber(g, dm.v, x + dm.dx, Math.max(36, y - spr.h * .75) - age / 60, age < 120 ? '#ffffff' : '#f5d442');
  }
  // Escudo de sombra mientras un élite lo protege
  if (S.elites.some(e => !e.dyingAt) && !dying) {
    g.strokeStyle = def.pal.glow; g.lineWidth = 1; g.globalAlpha = rm ? .45 : .3 + .2 * Math.sin(now / 350);
    g.beginPath(); g.ellipse(x, y - spr.h * .5, spr.w * .36, spr.h * .55, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  }
}

// Cifras de daño en pixel art: fuente 3×5 ampliada 1,5× (cada casilla ocupa 2-1-2 px por columna y fila: 5×8 px por cifra)
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
                '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
const DSC = 1.5, DW = 5, DPITCH = 6, DH = 8;
function drawNumber(g, n, x, y, color) {
  const s = String(n), w = s.length * DPITCH - 1, x0 = Math.round(x - w / 2), y0 = Math.round(y);
  const span = k => [Math.round(k * DSC), Math.round((k + 1) * DSC)];
  for (const [ox, oy, c] of [[-1, 0, '#1a0a10'], [1, 0, '#1a0a10'], [0, -1, '#1a0a10'], [0, 1, '#1a0a10'], [0, 0, color]])
    [...s].forEach((ch, i) => {
      const m = DIGITS[+ch];
      for (let p = 0; p < 15; p++) if (m[p] === '1') {
        const [a, b] = span(p % 3), [r, t] = span(Math.floor(p / 3));
        px(g, x0 + i * DPITCH + a + ox, y0 + r + oy, b - a, t - r, c);
      }
    });
}

// ---- Dibujo: secuaces y élites -----------------------------------------------------------------------------------
function drawMinion(g, m, now) {
  const king = S.king ? S.king.def : S.lastKing || KINGS[0];
  const fr = Math.floor(now / (m.type === 'murcielago' ? 120 : 260) + m.seed) % 2;
  if (m.dyingAt) {
    const k = (now - m.dyingAt) / 600;
    if (k < 0) { drawMinionImg(g, m, king, fr, 1); return; }
    if (k > 1) return;
    g.globalAlpha = 1 - k; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, r = 3 + k * 12; px(g, m.x + Math.cos(a) * r, m.y - 7 + Math.sin(a) * r, 2, 2, i % 2 ? '#fff' : king.pal.glow); } g.globalAlpha = 1;
    return;
  }
  const grow = Math.min(1, (now - m.bornAt) / 400);
  if (m.type !== 'murcielago') { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(Math.round(m.x - 5), Math.round(m.y), 10, 2); }
  if (m.type !== 'ojo') { g.globalAlpha = grow; drawGlow(g, king.pal.glow, m.x, m.y - (m.type === 'murcielago' ? 12 : 6), 18, 14, now, .3); g.globalAlpha = 1; }   // halo del color del rey: se leen sobre el suelo oscuro
  g.globalAlpha = grow; drawMinionImg(g, m, king, fr, 1); g.globalAlpha = 1;
}
function drawMinionImg(g, m, king, fr, a) {
  const c = minionSprite(m.type, king, fr), lift = m.type === 'murcielago' ? 6 : m.type === 'ojo' ? 8 : 0;
  const x = Math.round(m.x - c.width / 2), y = Math.round(m.y - c.height - lift);
  if (m.type === 'ojo') drawGlow(g, king.pal.glow, m.x, m.y - lift - 8, 22, 22, S.now, .5);
  if (m.face < 0 && m.type !== 'ojo') { g.save(); g.translate(Math.round(m.x), 0); g.scale(-1, 1); g.drawImage(c, -Math.round(c.width / 2), y); g.restore(); }
  else g.drawImage(c, x, y);
}
function drawElite(g, e, now) {
  const king = S.king ? S.king.def : S.lastKing || KINGS[0], spr = eliteSprite(e.type, king);
  const dying = e.dyingAt ? now - e.dyingAt : 0;
  if (dying > 700) return;
  const grow = Math.min(1, (now - e.bornAt) / 500), flip = e.face < 0;
  const lift = e.type === 'brujo' || e.type === 'heraldo' ? 10 : 0;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(Math.round(e.x - spr.w * .3), Math.round(e.y + 2 - (lift ? 0 : 1)), Math.round(spr.w * .6), 2);
  g.globalAlpha = dying ? Math.max(0, 1 - dying / 700) : grow;
  const x = Math.round(e.x), y = Math.round(e.y - lift);
  drawGlow(g, king.pal.glow, e.x, y - spr.h * .5, Math.round(spr.w * 1.5), Math.round(spr.h * 1.15), now, .3);    // aura de élite: lo separa del rey y del fondo
  g.strokeStyle = king.pal.glow; g.lineWidth = 1; g.beginPath(); g.ellipse(e.x, e.y + 1, spr.w * .42, 4, 0, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = dying ? Math.max(0, 1 - dying / 700) : grow;
  g.save(); g.translate(x, y);
  if (flip) g.scale(-1, 1);
  g.drawImage(spr.img, -spr.ax, -spr.ay);
  if (now - e.flashAt < 140 || (dying && dying < 160)) { g.globalAlpha = .7; g.drawImage(spr.white, -spr.ax, -spr.ay); }
  g.restore(); g.globalAlpha = 1;
  if (!dying) {                                          // barra de vida del élite
    const bw = 24, bx = Math.round(e.x - bw / 2), by = Math.round(y - spr.h - 5);
    px(g, bx - 1, by - 1, bw + 2, 4, '#1a0a14'); px(g, bx, by, bw, 2, '#4a1a24');
    px(g, bx, by, Math.max(1, Math.round(bw * Math.max(0, e.hp) / e.max)), 2, '#e8b830');
    for (const dm of e.dmg) { const age = now - dm.t; if (age < 800) drawNumber(g, dm.v, e.x + dm.dx, Math.max(22, by - 10 - age / 70), '#ffffff'); }
  }
}

// ---- Dibujo: parties --------------------------------------------------------------------------------------------------------
function drawParty(g, p, now) {
  const rm = reduced(), single = p.slot !== null && p.slot >= CFG.FULL_PARTIES, order = single ? [0] : [1, 2, 0];
  const camped = p.state === 'gone' || p.state === 'wait';          // en el campamento se ve la forma base
  const stage = camped ? 1 : p.stage, transforming = stage > 1 && now - p.stageAt < CFG.PARTY_FX_MS, tk = (now - p.stageAt) / CFG.PARTY_FX_MS;
  const lite = p.slot === null || p.slot >= 3;
  const lead = heroPos(p, 0, now), celebrating = (!p.working && now - p.doneAt < CFG.CELEBRATE_MS) || now - p.celebrateAt < 1500;
  let top = 1e9, minX = 1e9, maxX = -1e9, bottom = 0;
  // Anillos de poder en el suelo (distinguen la etapa de un vistazo) y destello de llegada
  if (p.state !== 'wait' && stage >= 2) {
    const col = auraOf(p.race, p.variant, stage), pul = rm ? .8 : .65 + .35 * Math.sin(now / 260 + p.seed);
    g.lineWidth = 1; g.strokeStyle = col; g.globalAlpha = pul;
    g.beginPath(); g.ellipse(lead.x, lead.y - 4, stage === 3 ? 34 : 28, stage === 3 ? 11 : 8, 0, 0, Math.PI * 2); g.stroke();
    if (stage === 3 && !lite) { g.strokeStyle = '#ffffff'; g.globalAlpha = pul * .7; g.beginPath(); g.ellipse(lead.x, lead.y - 4, 24, 7, 0, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
  }
  const arr = now - p.flashAt;
  if (arr >= 0 && arr < 450 && p.state !== 'wait') { g.strokeStyle = `rgba(255,255,255,${1 - arr / 450})`; g.lineWidth = 1; g.beginPath(); g.ellipse(lead.x, lead.y - 8, arr / 450 * 26, arr / 450 * 14, 0, 0, Math.PI * 2); g.stroke(); }
  for (const i of order) {
    const pos = heroPos(p, i, now), moving = pos.moving, atk = now - p.heroT[i];
    const dir = moving ? (Math.abs(pos.dx) > Math.abs(pos.dy) ? (pos.dx > 0 ? 'right' : 'left') : (pos.dy > 0 ? 'down' : 'up')) : p.state === 'wait' ? 'up' : 'down';
    const lunge = !moving && atk < 220;
    const ph = moving ? ['a', 'stand', 'b', 'stand'][Math.floor(now / 130 + i) % 4] : lunge ? 'a' : 'stand';
    let ox = 0, oy = moving && ph !== 'stand' ? -1 : 0;
    if (!moving) {
      if (lunge && S.king && i === 0) oy = -Math.round(Math.sin(atk / 220 * Math.PI) * 6);
      else if (celebrating && p.state === 'idle') oy = -2 * (Math.floor(now / 180 + i) % 2);
      else if (!rm) oy = -(Math.floor(now / 450 + p.seed + i) % 2);
    }
    if (lunge && i === 1) ox = Math.round(-Math.sin(atk / 220 * Math.PI) * 2);
    const shown = transforming && !rm && Math.floor((now - p.stageAt) / 170) % 2 ? stage - 1 : stage;
    const spr = heroSprite(p.race, i, shown, p.variant, dir, ph);
    const x = Math.round(pos.x + ox), y = Math.round(pos.y + oy);
    const ctx = { x, y, w: Math.round(12 * spr.sz), h: Math.round(18 * spr.sz), t: now, img: spr.img, ax: spr.ax, ay: spr.ay, lite: lite || i > 0 };
    const fx = fxOf(p.race, p.variant, shown);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 7, Math.round(pos.y) - 1, 14, 2);
    fxBack(g, fx, ctx);
    if (transforming && rm) {
      const p0 = heroSprite(p.race, i, stage - 1, p.variant, dir, ph);
      g.globalAlpha = 1 - tk; g.drawImage(p0.img, x - p0.ax, y - p0.ay);
      g.globalAlpha = Math.min(1, tk); g.drawImage(spr.img, x - spr.ax, y - spr.ay); g.globalAlpha = 1;
    } else g.drawImage(spr.img, x - spr.ax, y - spr.ay);
    fxFront(g, fx, ctx);
    for (let k = 0; k < stage; k++) px(g, x - stage + k * 2 + 1, y - Math.round(22 * spr.sz), 1, 2, '#f5d442');      // marcas de etapa
    top = Math.min(top, y - Math.round(21 * spr.sz) - 4); minX = Math.min(minX, x); maxX = Math.max(maxX, x); bottom = Math.max(bottom, y);
  }
  if (transforming && !rm) {                             // onda expansiva
    const r = tk * 36;
    g.strokeStyle = `rgba(255,255,255,${1 - tk})`; g.lineWidth = 1; g.beginPath(); g.ellipse(lead.x, lead.y - 12, r, r * .6, 0, 0, Math.PI * 2); g.stroke();
  }
  p.view = { cx: (minX + maxX) / 2, top, minX: minX - 10, maxX: maxX + 10, bottom };
  if (p.name === S.selected) drawSelect(g, p.view, lead.y, now);
}
// Resalta la party seleccionada (en el campamento o en la batalla): anillo en el suelo y flecha sobre ella
function drawSelect(g, v, footY, now) {
  const bob = reduced() ? 0 : Math.floor(now / 250) % 2, cx = (v.minX + v.maxX) / 2;
  g.strokeStyle = '#f5d442'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, footY - 3, (v.maxX - v.minX) / 2 + 2, 10, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f5d442'; const ax = Math.round(cx), ay = Math.round(v.top) - 17 - bob;
  g.fillRect(ax - 3, ay, 7, 1); g.fillRect(ax - 2, ay + 1, 5, 1); g.fillRect(ax - 1, ay + 2, 3, 1); g.fillRect(ax, ay + 3, 1, 1);
}

// ---- Dibujo: ataques, proyectiles y partículas ---------------------------------------------------------------------------
function drawFxs(g, now) {
  S.fxs = S.fxs.filter(f => now - f.t < 520);
  for (const f of S.fxs) {
    const age = now - f.t, dx = f.tx - f.ax, dy = f.ty - f.ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    if (f.kind === 'melee') {                            // tajo cerca del héroe y chispa en el objetivo
      const k = Math.min(1, age / 220);
      if (k < 1) for (let i = 0; i < 9; i++) { const d = 7 + k * 12 + i * .9; px(g, f.ax + ux * d + (i % 2) * uy * 2, f.ay + uy * d - (i % 2) * ux * 2, 2, 1, i < 5 ? '#ffffff' : f.color); }
      impact(g, f, age, 200);
    } else if (f.kind === 'shot' || f.kind === 'orb') {  // proyectil con estela
      const dur = f.kind === 'orb' ? 520 : 260, k = Math.min(1, age / dur);
      if (k < 1) {
        const x = f.ax + dx * k, y = f.ay + dy * k - Math.sin(k * Math.PI) * (f.kind === 'orb' ? 6 : 0);
        for (let t = 1; t <= 3; t++) { g.globalAlpha = 1 - t * .28; px(g, x - ux * t * 3, y - uy * t * 3, 2, 2, f.color); } g.globalAlpha = 1;
        if (f.style === 'arrow' || f.style === 'jav') { px(g, x, y, 3, 1, '#ffffff'); px(g, x + 3, y, 1, 1, f.color); }
        else px(g, x - 1, y - 1, 3, 3, f.kind === 'orb' ? f.color : '#ffffff');
        if (f.style === 'breath') for (let t = 0; t < 5; t++) px(g, x - ux * t * 2 + (t % 2), y - uy * t * 2, 3, 3, t % 2 ? f.color : '#ffffff');
      }
      if (f.kind === 'shot') impact(g, f, age, dur);
    } else if (f.kind === 'beam') {                      // haz de luz que ilumina a los otros dos
      if (age < 200) {
        g.globalAlpha = 1 - age / 200; g.strokeStyle = f.color; g.lineWidth = 2; g.beginPath(); g.moveTo(f.ax, f.ay); g.lineTo(f.tx, f.ty); g.stroke();
        g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
      }
      impact(g, f, age, 120);
    }
  }
  S.parts = S.parts.filter(q => now - q.t < q.life);
  for (const q of S.parts) { const k = (now - q.t) / q.life; g.globalAlpha = 1 - k; px(g, q.x + q.vx * k * 1.4, q.y + q.vy * k * 1.4 + k * k * 8, 2, 2, q.c); } g.globalAlpha = 1;
}
function impact(g, f, age, at) {
  const k = (age - at) / 200;
  if (k < 0 || k > 1) return;
  g.globalAlpha = 1 - k; const r = 2 + k * 5;
  px(g, f.tx - r, f.ty, r * 2, 1, '#ffffff'); px(g, f.tx, f.ty - r, 1, r * 2, '#ffffff'); px(g, f.tx - 1, f.ty - 1, 3, 3, f.color); g.globalAlpha = 1;
}

// ---- Dibujo de la escena completa --------------------------------------------------------------------------------------------
export function draw(g, now) {
  drawLive(g, now);
  const items = [];
  if (S.king && S.phase !== 'calm') items.push({ y: KING_Y, draw: () => drawKing(g, S.king, now) });
  for (const m of S.minions) items.push({ y: m.y + (m.type === 'murcielago' ? 40 : 0), draw: () => drawMinion(g, m, now) });
  for (const e of S.elites) items.push({ y: e.y + 1, draw: () => drawElite(g, e, now) });
  for (const p of S.parties.values()) {
    if ((p.state === 'gone' && p.cs === null) || (p.slot === null && !inCampState(p))) { p.view = null; continue; }
    items.push({ y: p.state === 'walk' || p.state === 'exit' ? heroPos(p, 0, now).y : p.y, draw: () => drawParty(g, p, now) });
  }
  for (const c of S.camp.values()) camp.camperItems(c, now, items, g);
  items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
  const sc = S.selected && S.camp.get(S.selected);
  if (sc && sc.cs !== null && sc.view) drawSelect(g, sc.view, sc.view.bottom, now);
  drawFxs(g, now);
}

// ---- Interacción -------------------------------------------------------------------------------------------------------------
export function partyAt(mx, my) {
  let best = null, by = -1;
  for (const p of [...S.parties.values(), ...S.camp.values()]) {
    const v = p.view;
    if (!v) continue;
    if (mx >= v.minX && mx <= v.maxX && my >= v.top - 14 && my <= v.bottom + 3 && v.bottom > by) { best = p; by = v.bottom; }
  }
  return best ? best.name : null;
}
export function info(name) {
  const c = S.camp.get(name);
  if (c) return `En descanso: ${camp.actName(c).toLowerCase()}<br>Party: ${c.race.name} (${c.race.place}) · variante ${c.variant ? 'B' : 'A'}`;
  const p = S.parties.get(name);
  if (!p) return '';
  const st = p.race.st[p.stage - 1].n;
  return `Party: ${p.race.name} (${p.race.place}) · variante ${p.variant ? 'B' : 'A'}<br>Etapa ${p.stage}: ${st} · poder ${Math.floor(power(p))}<br>` +
    p.race.cls.map((c, i) => `${ROLES[i]}: ${c.n}`).join(' · ');
}

// ---- Interfaz HTML: barra del rey, placas, banners y resumen ---------------------------------------------------------------------
let hud = null, stageEl = null;
export function mountHud(stage) {
  stageEl = stage;
  const el = (tag, cls, html = '') => Object.assign(document.createElement(tag), { className: cls, innerHTML: html });
  hud = {
    bar: el('div', 'arena-hud', '<span class="ah-king"></span><span class="ah-form" title="Forma del rey"></span><span class="ah-track" role="progressbar" aria-label="Vida del Rey Demonio" aria-valuemin="0" aria-valuemax="100"><i class="ah-fill"></i><b class="ah-mark" data-f="2" title="Transformación al 60 %"></b><b class="ah-mark" data-f="3" title="Transformación al 25 %"></b></span><span class="ah-pct"></span><span class="ah-more"></span>'),
    banner: el('div', 'arena-banner'), shout: el('div', 'bub villain arena-shout'), summary: el('div', 'arena-summary'),
    empty: el('div', 'arena-empty', 'La arena espera…'), more: el('div', 'camp-more'), last: {},
  };
  hud.bar.hidden = hud.banner.hidden = hud.shout.hidden = hud.summary.hidden = hud.empty.hidden = hud.more.hidden = true;
  hud.banner.setAttribute('role', 'status'); hud.banner.setAttribute('aria-live', 'polite');
  hud.summary.addEventListener('click', () => { S.summary = null; });
  stage.append(hud.bar, hud.banner, hud.shout, hud.summary, hud.empty, hud.more);
}
// Placa con el nombre del agente y su globo de texto; kind = 'rest' para los que descansan en el campamento
function makePlate(p, kind) {
  if (!stageEl) return;
  const plate = Object.assign(document.createElement('div'), { className: 'aplate' + (kind ? ' ' + kind : ''), innerHTML: '<span class="ap-em" aria-hidden="true"></span><span class="ap-n"></span><span class="ap-st"></span>' });
  const ball = Object.assign(document.createElement('div'), { className: kind ? 'bub rest' : 'bub hero' });
  plate.hidden = ball.hidden = true;
  stageEl.append(plate, ball);
  p.el = { plate, ball, em: plate.children[0], n: plate.children[1], st: plate.children[2], last: {} };
}
const setText = (o, k, el, v) => { if (o[k] !== v) { o[k] = v; el.textContent = v; } };
export function updateHud(now, on) {
  if (!hud) return;
  const b = on ? S.king : null, bar = hud.bar, sw = stageEl.clientWidth;
  bar.hidden = !b || S.phase === 'calm';
  if (b && !bar.hidden) {
    const pct = Math.max(0, Math.min(100, Math.ceil(b.hp / b.max * 100)));
    setText(hud.last, 'k', bar.querySelector('.ah-king'), `👑 ${b.def.name}, ${b.def.title}`);
    setText(hud.last, 'f', bar.querySelector('.ah-form'), '◆'.repeat(b.form) + '◇'.repeat(3 - b.form));
    bar.querySelector('.ah-form').setAttribute('aria-label', `Forma ${b.form} de 3`);
    setText(hud.last, 'p', bar.querySelector('.ah-pct'), `${pct} %`);
    const fill = bar.querySelector('.ah-fill'), track = bar.querySelector('.ah-track');
    fill.style.width = pct + '%'; fill.dataset.lvl = pct > 50 ? 'ok' : pct > 25 ? 'mid' : 'low';
    track.setAttribute('aria-valuenow', pct);
    bar.querySelector('[data-f="2"]').style.display = b.form < 2 ? '' : 'none';      // marcas de los umbrales aún no superados
    bar.querySelector('[data-f="3"]').style.display = b.form < 3 ? '' : 'none';
    bar.querySelector('[data-f="2"]').style.left = CFG.FORM_HP[0] * 100 + '%'; bar.querySelector('[data-f="3"]').style.left = CFG.FORM_HP[1] * 100 + '%';
    track.classList.toggle('boost', now - b.boostAt < 500);
    const over = [...S.parties.values()].filter(p => p.slot === null && !inCampState(p)).length;
    setText(hud.last, 'm', bar.querySelector('.ah-more'), over ? `+${over} parties` : '');
  }
  hud.stage = stageEl; stageEl.classList.toggle('arena-live', !!on && !bar.hidden);
  const bn = on ? S.banner : null;
  hud.banner.hidden = !bn;
  if (bn) setText(hud.last, 'bn', hud.banner, bn.text);
  // Sin rey ni nadie luchando: «La arena espera…» si no hay ninguna party, «Los héroes descansan…» si hay alguien en el campamento
  const idleArena = on && S.phase === 'none' && workingCount() === 0;
  hud.empty.hidden = !idleArena;
  if (idleArena) setText(hud.last, 'em', hud.empty, S.camp.size + S.parties.size > 0 ? 'Los héroes descansan…' : 'La arena espera…');
  const hidden = on ? [...S.camp.values()].filter(c => c.cs === null).length : 0;     // en reposo pero sin sitio visible
  hud.more.hidden = !hidden;
  if (hidden) setText(hud.last, 'mo', hud.more, `+${hidden} descansando`);
  // Grito del rey al transformarse
  const showShout = on && b && !b.deadAt && S.phase !== 'calm' && b.form >= 2 && now - b.shoutAt < CFG.KING_SHOUT_MS;
  hud.shout.hidden = !showShout;
  if (showShout) {
    setText(hud.last, 'sh', hud.shout, b.def.shouts[b.form - 2]);
    const half = hud.shout.offsetWidth / 2 + 2;
    hud.shout.style.left = Math.max(half, Math.min(sw - half, (CX + 78) / W * sw)) + 'px';
    hud.shout.style.top = (KING_Y - kingSprite(b.def, b.form).h * .55) / H * 100 + '%';
  }
  const sm = on ? S.summary : null;
  hud.summary.hidden = !sm;
  if (sm) setText(hud.last, 'sm', hud.summary, `🏆 ${sm.king} · ${Math.round(sm.dur)} s · ${sm.hits} golpes${sm.mvp ? ' · MVP: ' + sm.mvp : ''}`);
  // Placas de las parties y sus gritos: como mucho 3 globos a la vez (los más recientes) y apilados si están cerca
  const talking = [];
  const loud = new Set([...S.parties.values()].filter(p => p.stage > 1 && now - p.shoutAt < CFG.PARTY_SHOUT_MS).sort((p, q) => q.shoutAt - p.shoutAt).slice(0, CFG.MAX_BALLOONS));
  for (const p of S.parties.values()) {
    const e = p.el; if (!e) continue;
    const v = p.view, show = on && v;
    e.plate.hidden = !show;
    if (!show) { e.ball.hidden = true; continue; }
    const camped = inCampState(p);
    setText(e.last, 'em', e.em, p.race.emblem[p.variant]);
    setText(e.last, 'n', e.n, env.shortName(p.name));
    setText(e.last, 's', e.st, camped ? '' : '◆'.repeat(p.stage) + '◇'.repeat(3 - p.stage));
    e.st.setAttribute('aria-label', `etapa ${p.stage} de 3`);
    e.plate.classList.toggle('sel', p.name === S.selected);
    e.plate.classList.toggle('wait', camped);
    e.plate.style.left = Math.max(30, Math.min(W - 30, v.cx)) / W * 100 + '%';
    e.plate.style.top = (v.top - 3) / H * 100 + '%';
    const shouting = loud.has(p);
    let txt = shouting ? p.race.shouts[p.stage - 2] : (!p.working && now - p.doneAt < CFG.CELEBRATE_MS && p.state !== 'wait') ? '🏆 ¡victoria!' : '';
    e.ball.hidden = !txt;
    if (txt) {
      setText(e.last, 'b', e.ball, txt);
      e.ball.className = 'bub hero' + (shouting ? '' : ' done');
      const k = W / sw, half = e.ball.offsetWidth / 2 + 2, hw = half * k, bh = e.ball.offsetHeight * k + 8;   // en unidades de escena
      let cx = v.cx, near = 0;
      if (shouting && b && !b.deadAt && S.phase !== 'calm') {      // el globo no tapa al rey: si cae sobre su silueta, se aparta hacia su lado
        const ks = kingSprite(b.def, b.form), kl = CX - ks.w * .32 - hw, kr = CX + ks.w * .32 + hw;
        const hitsKing = (v.top - 14) - bh < KING_Y + 10 && v.top - 14 > KING_Y - ks.h;
        if (hitsKing && cx > kl && cx < kr) cx = cx < CX ? kl : kr;
      }
      for (const q of talking) if (Math.abs(q - cx) < hw * 2) near++;      // si hay otro encima, sube un nivel
      talking.push(cx);
      e.ball.style.left = Math.max(half, Math.min(sw - half, cx / W * sw)) + 'px';
      e.ball.style.top = (v.top - 14 - near * 16) / H * 100 + '%';
    }
  }
  // Los que descansan: placa con el nombre y, cuando hablan, un globo sobre el héroe que habla (como mucho 3 a la vez)
  const chatty = new Set([...S.camp.values()].filter(c => c.chat && c.cs !== null).sort((p, q) => q.chat.at - p.chat.at).slice(0, CFG.MAX_CHATS));
  for (const c of S.camp.values()) {
    const e = c.el; if (!e) continue;
    const v = c.view, show = on && v && c.cs !== null;
    e.plate.hidden = !show;
    if (!show) { e.ball.hidden = true; continue; }
    setText(e.last, 'em', e.em, c.race.emblem[c.variant]);
    setText(e.last, 'n', e.n, env.shortName(c.name));
    e.plate.classList.toggle('sel', c.name === S.selected);
    e.plate.classList.toggle('wait', true);
    e.plate.style.left = Math.max(30, Math.min(W - 30, v.cx)) / W * 100 + '%';
    e.plate.style.top = (v.top - 3) / H * 100 + '%';
    const talk = chatty.has(c) && c.chatPos;
    e.ball.hidden = !talk;
    if (talk) {
      setText(e.last, 'b', e.ball, c.chat.text);
      const half = e.ball.offsetWidth / 2 + 2;
      e.ball.style.left = Math.max(half, Math.min(sw - half, c.chatPos.x / W * sw)) + 'px';
      e.ball.style.top = (v.top - 11) / H * 100 + '%';
    }
  }
  const cv = stageEl.querySelector('canvas');
  if (cv) {
    const resting = S.camp.size + [...S.parties.values()].filter(inCampState).length;
    const label = on ? (b ? `Arena: ${b.def.name}, ${b.def.title}, ${Math.ceil(b.hp / b.max * 100)} % de vida, ${workingCount()} parties luchando, ${resting} descansando`
      : resting ? `Arena sin batalla: ${resting} parties descansando en el campamento` : 'Arena vacía: la arena espera') : 'Oficina virtual';
    if (hud.last.cv !== label && (!hud.cvAt || now - hud.cvAt > 3000)) { hud.last.cv = label; hud.cvAt = now; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label); }
  }
}

// Resumen del estado (útil para depurar y para las pruebas)
export const snapshot = () => ({
  phase: S.phase, num: S.num, replay: S.replayId, banner: S.banner && S.banner.text,
  king: S.king && { id: S.king.def.id, form: S.king.form, hp: Math.round(S.king.hp * 10) / 10, max: S.king.max, elites: S.elites.filter(e => !e.dyingAt).length },
  minions: S.minions.filter(m => !m.dyingAt).length, elites: S.elites.filter(e => !e.dyingAt).map(e => ({ type: e.type, hp: e.hp, max: e.max })),
  parties: [...S.parties.values()].map(p => ({ name: p.name, race: p.race.id, variant: p.variant, stage: p.stage, power: Math.round(power(p) * 10) / 10, slot: p.slot, state: p.state, working: p.working, camp: p.cs })),
  camp: [...S.camp.values()].map(c => ({ name: c.name, race: c.race.id, variant: c.variant, slot: c.cs, act: c.act && c.act.kind })),
});
