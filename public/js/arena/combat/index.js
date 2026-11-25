// API de combate de la arena (dueño: N3; sección 4.2 de docs/arena-v12-arquitectura.md).
// Convierte los eventos de reglas en coreografía: actores con máquina de estados, cola por party, IA del rey, de los
// secuaces y de los élites, choque de rayos y efectos. No cambia vida, etapas ni daño: solo lo que se ve.
//   onEvents(list, now?)  vacía la lista de eventos de reglas
//   update(now, dt)       avanza la coreografía (now en ms; dt en s, se recalcula si hace falta)
//   drawables(g, now)     [{ y, draw() }] actores y capa de suelo; [] si no hay ningún actor (la escena usa su respaldo)
//   views()               Map<nombre, { cx, top, minX, maxX, bottom, footY }> para placas y clics
//   pause()               pestaña oculta: vacía colas, suelta guiones y deja a todos en guardia
//   nearestMinion(name), heroPositions(name)   consultas que se inyectan en rules.init
import * as vfx from '../render/vfx.js';
import * as D from './director.js';
import * as A from './actions.js';
import * as P from './party.js';
import * as KA from './king-ai.js';
import * as EN from './enemies-ai.js';
import * as CL from './clash.js';
import { updateActor } from './actor.js';
import { drawHero, drawKing, drawEnemy } from './draw.js';
import { KING_BY_ID } from '../races.js';
import { prewarm } from '../render/links.js';
import { CX, KING_Y } from '../config.js';

let lastNow = null, curNow = 0, G = null, NOW = 0, kingId = 'kazgorath', glow = '#ff6a1a';
const nowOf = n => n ?? (lastNow != null ? lastNow : (typeof performance !== 'undefined' ? performance.now() : 0));

// Consultas y utilidades que usan las IA
const ctx = {
  king: () => (KA.king && !KA.king.hidden ? KA.king : null),
  enemy: (kind, id) => EN.enemy(kind, id),
  partiesList: () => [...P.parties.values()],
  party: name => P.parties.get(name),
  nearestMinionActor: p => EN.nearestMinionTo(p.anchor.x, p.anchor.y),
  incoming: (name, o, now) => P.incoming(name, o, now),
  glowRamp: () => (KA.kingStyle() && KA.kingStyle().beam) || 'violet',
  heroRamp: hero => { const p = P.parties.get(hero.party); return p && p.style.beam; },
  // puntos del suelo donde caen las lluvias de proyectiles: sobre las parties y delante del rey
  rainSpots: () => {
    const s = []; for (const p of P.parties.values()) for (const h of p.heroes) s.push({ x: h.x, y: h.y });
    return s.length ? s : [{ x: CX, y: 440 }];
  },
};
A.hooks.now = () => curNow;
A.hooks.partyHeroes = name => (name ? P.heroesOf(name) : []);
A.hooks.allHeroes = () => { const l = []; for (const p of P.parties.values()) for (const h of p.heroes) if (h.visible) l.push(h); return l; };
A.hooks.launchMinion = EN.launchMinion;
A.hooks.kingDodge = () => KA.dodge(curNow, ctx);
A.hooks.incoming = (x, y, o) => P.incomingAt(x, y, o, curNow);
A.hooks.incomingParty = (name, o, now) => P.incoming(name, o, now);
A.hooks.beamStart = (a, X, s) => CL.tryStart(a, X, s, curNow, ctx);
A.hooks.cower = () => EN.cower(curNow);
A.hooks.setKingForm = f => KA.setForm(f);

// ---- Eventos de reglas ----------------------------------------------------------------------------------------------
export function onEvents(list, nowArg) {
  const now = curNow = nowOf(nowArg);
  for (const ev of list) {
    switch (ev.type) {
      case 'partyJoin': P.onJoin(ev, now); break;
      case 'partyEnter': P.onEnter(ev, now); break;
      case 'partyArrive': P.onArrive(ev, now); break;
      case 'partyExit': P.onExit(ev, now); break;
      case 'partyToCamp': P.onToCamp(ev, now); break;
      case 'partyStage': P.onStage(ev, now); break;
      case 'tool': P.onTool(ev, now); break;
      case 'passive': P.onPassive(ev, now); break;
      case 'teamCombo': P.onTeamCombo(ev, now); break;
      case 'finisher': P.onFinisher(ev, now, ctx); break;
      case 'celebrate': P.onCelebrate(ev, now); break;
      case 'minionSpawn': EN.spawnMinion(ev, now); break;
      case 'minionKill': EN.killMinion(ev, now); break;
      case 'eliteSpawn': EN.spawnElite(ev, now); break;
      case 'eliteHit': EN.hitElite(ev, now); break;
      case 'eliteDown': EN.downElite(ev, now); break;
      case 'kingSpawn': {
        kingId = ev.id; glow = (KING_BY_ID[ev.id] || {}).glow || glow; EN.setGlow(glow);
        prewarm({ king: ev.id, form: ev.form || 1, prio: 0 }); prewarm({ king: ev.id, form: Math.min(3, (ev.form || 1) + 1), prio: 2 });
        KA.spawn(ev, now); break;
      }
      case 'kingForm': prewarm({ king: kingId, form: ev.form, prio: 0 }); KA.onForm(ev, now, ctx); break;
      case 'kingDie': KA.die(ev, now); break;
      case 'reset': resetAll(); break;
      default: break;                                              // kingHit: la cifra sale en el impacto, no aquí
    }
  }
  list.length = 0;
}
function resetAll() {
  P.clearAll(); EN.clearAll(); KA.clear(); CL.reset(); D.reset(); vfx.clear(); lastNow = null;
}

// ---- Avance ------------------------------------------------------------------------------------------------------------------------
const kingCtx = { script: (a, n, d) => A.tickScript(a, n, d) };
export function update(now, dt) {
  if (lastNow != null && now - lastNow > 1500) pause();            // pestaña oculta o parón: no se reproduce nada acumulado
  const dts = lastNow == null ? .016 : Math.min(.1, Math.max(0, (now - lastNow) / 1000));
  lastNow = curNow = now;
  vfx.update(now, dts);
  if (KA.king) { updateActor(KA.king, now, dts, kingCtx); KA.update(now, dts, ctx); }
  EN.update(now, dts, ctx);
  P.update(now, dts, ctx);
  CL.update(now);
}
export function pause() {
  const now = lastNow != null ? lastNow : nowOf();
  P.pauseAll(now); CL.abort(now); D.reset(); vfx.clear();
  if (KA.king && KA.king.script) { KA.king.script = null; KA.king.charge = null; KA.king.state = 'ai'; KA.king.anim = 'idle'; KA.king.x = KA.king.home.x; KA.king.y = KA.king.home.y; KA.king.alpha = 1; KA.king.ghosts.length = 0; }
  for (const m of EN.minions.values()) { m.plan = null; m.charge = null; }
  for (const e of EN.elites.values()) { e.plan = null; e.charge = null; e.alpha = 1; e.fixedFrame = null; }
  lastNow = null;
}
export function reset() { resetAll(); }

// ---- Dibujo y vistas -------------------------------------------------------------------------------------------------------
const out = [];
function item(a, draw) { return a.item || (a.item = { y: 0, draw }); }
export function drawables(g, now) {
  G = g; NOW = now; out.length = 0;
  const k = KA.king && !KA.king.hidden ? KA.king : null;
  if (!P.parties.size && !k && !EN.minions.size && !EN.elites.size) return out;
  if (!ground.draw) { ground.draw = () => vfx.drawGround(G); }
  out.push(ground);
  for (const p of P.parties.values()) for (const h of p.heroes) {
    if (!h.visible) continue;
    const it = h.item || (h.item = { y: 0, draw: () => drawHero(G, h, p, A, NOW) });
    it.y = h.y; out.push(it);
  }
  if (k) { const it = k.item || (k.item = { y: 0, draw: () => drawKing(G, k, A, NOW) }); it.y = k.y; out.push(it); }
  for (const e of EN.elites.values()) { const it = e.item || (e.item = { y: 0, draw: () => drawEnemy(G, e, kingId, glow, NOW) }); it.y = e.y; out.push(it); }
  for (const m of EN.minions.values()) { if (m.dead) continue; const it = m.item || (m.item = { y: 0, draw: () => drawEnemy(G, m, kingId, glow, NOW) }); it.y = m.y; out.push(it); }
  return out;
}
const ground = { y: -10, draw: null };

const viewMap = new Map();
export function views() {
  viewMap.clear();
  for (const p of P.parties.values()) {
    if (!p.heroes.length) continue;
    let minX = 1e9, maxX = -1e9, top = 1e9, bottom = -1e9;
    for (const h of p.heroes) {
      const w = (h.fw || 48) / 2, t = h.y - h.z - (h.ftop || h.fh || 64);
      minX = Math.min(minX, h.x - w); maxX = Math.max(maxX, h.x + w); top = Math.min(top, t); bottom = Math.max(bottom, h.y);
    }
    viewMap.set(p.name, { cx: (minX + maxX) / 2, top, minX, maxX, bottom, footY: p.heroes[0].y });
  }
  return viewMap;
}
// Posición y altura de élites y secuaces (para que el HUD dibuje sus barras sin conocer los actores)
export function enemyViews() {
  const r = [];
  for (const e of EN.elites.values()) if (!e.dead && !e.dying) r.push({ kind: 'elite', id: e.id, x: e.x, top: e.y - e.z - (e.ftop || e.fh || 80) });
  return r;
}

// Héroes visibles con lo que la escena necesita para pintar los efectos de raza por etapa (render/scene.js).
// charge: progreso 0..1 de la carga en curso del héroe (0 si no carga); la escena lo pasa a los fx de raza.
const heroList = [];
export function heroViews() {
  heroList.length = 0;
  for (const p of P.parties.values()) for (const h of p.heroes) {
    if (!h.visible) continue;
    heroList.push({ name: p.name, idx: h.idx, race: h.ref.race, variant: h.ref.variant, stage: p.stage, x: h.x + h.recoil.dx, y: h.y, z: h.z, face: h.face, w: h.fw || 48, h: h.fh || 64, alpha: h.alpha, lite: !!h.lite,
      charge: h.charge ? Math.max(0, Math.min(1, ((lastNow ?? curNow) - h.charge.t0) / Math.max(1, h.charge.ms))) : 0 });
  }
  return heroList;
}

// ---- Consultas inyectadas en rules.init ------------------------------------------------------------------------------
export function nearestMinion(partyName) {
  const p = P.parties.get(partyName);
  const m = p ? EN.nearestMinionTo(p.anchor.x, p.anchor.y) : null;
  return m ? m.id : null;
}
export function heroPositions(partyName) {
  const p = P.parties.get(partyName);
  if (!p || p.heroes.length < 3) return null;                      // las de solo vanguardia: las reglas usan su respaldo
  return p.heroes.map(h => ({ x: h.x, y: h.y }));
}
export function debugInfo() {
  return { parties: P.parties.size, minions: EN.minions.size, elites: EN.elites.size, big: D.bigCount(), clash: CL.active(), vfx: vfx.stats(), king: KA.king ? { x: KA.king.x, y: KA.king.y, script: !!KA.king.script } : null };
}
export const shakeOffset = now => vfx.shakeOffset(now);
