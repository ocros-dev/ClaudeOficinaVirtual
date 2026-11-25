// Composición de la escena de la arena: capa viva del fondo, dibujables ordenados por profundidad (pies), efectos
// y selección. No decide nada de reglas ni de coreografía: combina combat.drawables() y camp.camperItems().
// Contrato: docs/arena-v12-arquitectura.md (4.11).
import { S } from '../rules.js';
import { CX, KING_Y, CIRCLE_CY } from '../config.js';
import * as combat from '../combat/index.js';
import * as camp from '../camp/camp.js';
import { reduced, px, shade } from '../util.js';
import { drawVfx, shakeOffset as vfxShake, raceFx } from './links.js';

// Caja visible de cada party (placas y clics): la del combate; los grupos en reposo traen la suya
export function viewOf(name) {
  const a = combat.views().get(name);
  return a || (S.camp.get(name) || {}).view || null;
}
export const shakeOffset = now => (S.king && !reduced() ? vfxShake(now) : [0, 0]);

// ---- Capa viva bajo los sprites (círculo mágico): arte de la 1.1 a 2×. Las antorchas animadas las pinta render/stage-bg.js ------
function drawLive(g, now) {
  const b = S.king, col = b ? b.def.color : '#7a6aa8', on = !!b && S.phase !== 'calm', rm = reduced();
  const spin = rm ? 0 : now / 6000;
  g.save(); g.scale(2, 2); g.imageSmoothingEnabled = false;
  const cx = CX / 2, cy = CIRCLE_CY / 2, ky = KING_Y / 2;
  g.globalAlpha = on ? .2 : .08; g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, 180, 52, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = on ? .16 : .06; g.beginPath(); g.ellipse(cx, ky + 2, 120, 22, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  for (const [rx, ry, n, dir] of [[196, 55, 64, 1], [140, 40, 44, -1], [86, 24, 28, 1]]) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + spin * dir;
      px(g, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 1, 1, i % 4 === 0 ? col : on ? shade(col, -40) : '#4a3a7a');
      if (i % 8 === 0) { px(g, cx + Math.cos(a) * (rx - 3), cy + Math.sin(a) * (ry - 1), 2, 1, on ? '#ffffff' : '#7a6aa8'); px(g, cx + Math.cos(a) * (rx - 3) + 1, cy + Math.sin(a) * (ry - 1) - 1, 1, 3, on ? col : '#5a4a8a'); }
    }
  }
  g.restore();
  camp.drawCampLive(g, now);
}

// Resalta la party seleccionada: anillo en el suelo y flecha sobre ella
function drawSelect(g, v, footY, now) {
  const bob = reduced() ? 0 : Math.floor(now / 250) % 2 * 2, cx = (v.minX + v.maxX) / 2;
  g.strokeStyle = '#f5d442'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, footY - 4, (v.maxX - v.minX) / 2 + 4, 16, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f5d442'; const ax = Math.round(cx), ay = Math.round(v.top) - 36 - bob;
  g.fillRect(ax - 6, ay, 14, 2); g.fillRect(ax - 4, ay + 2, 10, 2); g.fillRect(ax - 2, ay + 4, 6, 2); g.fillRect(ax, ay + 6, 2, 2);
}

// Efectos vivos de la raza según la etapa (aura, órbitas, marcas) y remate de la transformación: arte de art/races/<id>.js.
// Van detrás (fx.back) y delante (fx.front) del héroe en la misma ordenación por profundidad.
const warnedFx = new Set();
function safe(id, fn) { try { fn(); } catch (e) { if (!warnedFx.has(id)) { warnedFx.add(id); console.error('arena: efecto de raza «' + id + '» falló', e); } } }
function raceEffects(g, now, items) {
  for (const h of combat.heroViews()) {
    const fx = raceFx(h.race);
    if (!fx) continue;
    const p = S.parties.get(h.name), k = p && p.stage > 1 ? (now - p.stageAt) / p.fxMs : 2;
    // charge: progreso 0..1 de la carga de la acción actual (combat.heroViews lo expone; sin dato, 0)
    const charge = typeof h.charge === 'number' ? Math.max(0, Math.min(1, h.charge)) : 0;
    const c = { x: Math.round(h.x), y: Math.round(h.y - h.z), w: h.w, h: h.h, t: now, lite: h.lite || h.idx > 0 || (p && p.slot !== null && p.slot >= 2), face: h.face, alpha: h.alpha, idx: h.idx, variant: h.variant, charge };
    if (fx.back) items.push({ y: h.y - .5, draw: () => safe(h.race, () => fx.back(g, c, h.stage)) });
    items.push({ y: h.y + .5, draw: () => safe(h.race, () => {
      if (fx.front) fx.front(g, c, h.stage);
      if (fx.transformFx && k >= 0 && k < 1 && h.idx === 0 && !reduced()) fx.transformFx(g, c, k, p.stage - 1, p.stage);
    }) });
  }
}

export function draw(g, now) {
  drawLive(g, now);
  const items = [];
  const own = combat.drawables(g, now);      // [] solo si no hay ningún actor: entonces se ve el escenario y el campamento
  for (const it of own) items.push(it);
  raceEffects(g, now, items);
  for (const c of S.camp.values()) camp.camperItems(c, now, items, g);
  items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
  const sel = S.selected;
  if (sel) {
    const c = S.camp.get(sel), pv = viewOf(sel);
    if (c && c.cs !== null && c.view) drawSelect(g, c.view, c.view.bottom, now);
    else if (!c && pv) drawSelect(g, pv, pv.footY ?? pv.bottom, now);
  }
  drawVfx(g, now);
}

// Party o grupo en reposo bajo el ratón (coordenadas del lienzo 960×608)
export function partyAt(mx, my) {
  let best = null, by = -1;
  for (const p of [...S.parties.values(), ...S.camp.values()]) {
    const v = viewOf(p.name);
    if (!v) continue;
    if (mx >= v.minX && mx <= v.maxX && my >= v.top - 28 && my <= v.bottom + 6 && v.bottom > by) { best = p; by = v.bottom; }
  }
  return best ? best.name : null;
}
