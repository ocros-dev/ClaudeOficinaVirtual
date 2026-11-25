// Fachada del tema arena: misma API que tenía arena.js (más SIZE, pause y resume) para que main.js no conozca
// la estructura interna. Une las reglas (rules.js), el combate (combat/), la escena (render/) y la interfaz HTML.
import * as rules from './rules.js';
import * as combat from './combat/index.js';
import * as scene from './render/scene.js';
import * as hud from './render/hud.js';
import { prewarm, releaseKing, setCombat } from './render/links.js';
import { drawBackground as paintStage } from './render/stage-bg.js';
import { CFG } from './config.js';
export { CFG, SIZE } from './config.js';

let paused = false, lastCombat = null, frames = 0;

// env: { hash, shortName }. Las consultas visuales de combat/ se inyectan en las reglas (4.2).
export function init(env = {}) {
  rules.init({ ...env, nearestMinion: combat.nearestMinion, heroPositions: combat.heroPositions });
  hud.initHud(env);
}
export const active = rules.active;
export const setSelected = rules.setSelected;
export const noteSnapshot = rules.noteSnapshot;
export const hit = rules.hit;       // el daño cuenta aunque la pestaña esté oculta; solo se descartan los eventos visuales
export const forget = rules.forget;
export const setReplay = rules.setReplay;
export const info = rules.info;
export const snapshot = rules.snapshot;
export const drawBackground = paintStage;
export const draw = scene.draw;
export const partyAt = scene.partyAt;
export const shakeOffset = scene.shakeOffset;
export const mountHud = hud.mountHud;
export const updateHud = hud.updateHud;

// ---- Horneado de arte: avisa al registro de lo que se va a necesitar ------------------------------------------------------
// El prehorneado de entrada de party y de rey lo pide también combat/; aquí se cubre el resto (campamento, etapa siguiente)
// y la liberación del rey anterior. El registro ignora lo que ya está en caché o en cola.
const warned = new Set();
function warm(key, o) { if (!warned.has(key)) { warned.add(key); prewarm(o); } }
function onEventsArt(list) {
  for (const ev of list) {
    if (ev.type === 'partyJoin') prewarm({ race: ev.race, variant: ev.variant, stage: ev.stage || 1, group: 'join' });
    else if (ev.type === 'partyStage') {
      const p = rules.S.parties.get(ev.name);
      if (p) prewarm({ race: p.race.id, variant: p.variant, stage: ev.to, group: 'join', prio: 0 });
    } else if (ev.type === 'kingSpawn') {
      prewarm({ king: ev.id, form: ev.form || 1, prio: 0 });
      prewarm({ king: ev.id, form: 2, prio: 2 });
    } else if (ev.type === 'kingDie') {
      const id = ev.id || (rules.S.king && rules.S.king.def.id);
      // El rey es el mayor consumidor de memoria: se descarta pasado el descanso, si no ha vuelto a salir el mismo
      if (id) setTimeout(() => { if (!rules.S.king || rules.S.king.def.id !== id) releaseKing(id); warned.delete('k' + id); }, CFG.CALM_MS + 500);
    }
  }
}
function warmPoll() {
  for (const c of rules.S.camp.values()) warm(`c|${c.race.id}|${c.variant}`, { race: c.race.id, variant: c.variant, stage: 1, group: 'camp' });
  for (const p of rules.S.parties.values()) {
    const next = p.race.stages[p.stage];                             // etapa siguiente al 80 % del poder que pide
    if (next && rules.power(p) >= next.power * .8) warm(`n|${p.name}|${p.stage + 1}`, { race: p.race.id, variant: p.variant, stage: p.stage + 1, group: 'next' });
  }
}

// Un paso: reglas → eventos → combate
export function step(now, dt, agents) {
  rules.step(now, dt, agents);
  const ev = rules.takeEvents();
  const S = rules.S, inCombat = !!S.king && S.phase !== 'calm' || S.parties.size > 0 && S.phase === 'dying';
  if (inCombat !== lastCombat) { lastCombat = inCombat; setCombat(inCombat); }   // presupuesto de horneado: 4 ms con combate, 8 ms sin él
  if (paused) return;
  if (ev.length) { onEventsArt(ev); combat.onEvents(ev); }
  if (++frames % 20 === 0) warmPoll();
  combat.update(now, dt);
}
export function reset() {
  rules.reset();
  const ev = rules.takeEvents();
  if (ev.length) combat.onEvents(ev);       // partyToCamp y reset: combat suelta sus actores
  combat.pause();
  hud.clearPlates();
}
// Pestaña oculta: se vacían las colas y no se acumula nada; al volver se sigue desde el estado actual
export function pause() { paused = true; rules.dropEvents(); combat.pause(); }
export function resume() { paused = false; rules.dropEvents(); }
