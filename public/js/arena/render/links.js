// Punto único por el que la escena, el HUD, el campamento y el combate llegan al arte (art/registry.js) y a los
// efectos (render/vfx.js). Mantiene los nombres estables aunque cambie el módulo de detrás.
import * as reg from '../art/registry.js';
import * as vfx from './vfx.js';

export const hasRegistry = () => true;

// Fotogramas. ci = índice de clase (0 vanguardia, 1 distancia o magia, 2 apoyo)
export const heroFrame = reg.heroFrame;
export const kingFrame = reg.kingFrame;
export const enemyFrame = reg.enemyFrame;
// Única función que pinta sprites (reflejo, altura z, destello)
export const drawFrame = reg.drawFrame;
export const prewarm = reg.prewarm;
export const releaseKing = reg.releaseKing;
export const setCombat = reg.setCombat;

// Efectos de una raza por etapa: { back(g, c, stage), front(g, c, stage), transformFx(g, c, k, from, to) } de art/races/<id>.js.
// c = { x, y, w, h, t, lite, face, alpha, idx, variant, charge }. Las razas no listas se ven con el maniquí, sin efectos.
// TEMPORAL: reg.raceArt(id) lo expone el registro (FIN-B); mientras no exista se lee de sus datos internos. Quitar el respaldo después.
const artOf = id => (reg.raceArt ? reg.raceArt(id) : reg._internals && reg._internals.RACE_ART && reg._internals.RACE_ART[id]);
export function raceFx(raceId) {
  const art = artOf(raceId);
  if (!art || !art.ready) return null;
  const fx = art.fx || {};
  const o = { back: fx.back, front: fx.front, transformFx: art.transformFx };
  return o.back || o.front || o.transformFx ? o : null;
}

// Efectos de pantalla
export const shakeOffset = now => vfx.shakeOffset(now);
export const drawVfx = (g, now) => vfx.draw(g, now);        // vfx.draw ignora la segunda llamada del mismo fotograma
