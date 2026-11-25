// Director global (dueño: N3): los presupuestos de toda la escena en un solo sitio.
// Fichas de acciones grandes (máx. 3), choques de rayos (1 a la vez, ≥ 20 s entre dos), imágenes
// residuales, efectos reducidos en la 3.ª party, limitador de destellos y movimiento reducido.
import { reduced } from '../render/vfx.js';

export const MAX_BIG = 3, CLASH_GAP_MS = 20000, GHOSTS_PER_HERO = 4, LITE_FROM_SLOT = 2, FLASH_MAX = 3, FLASH_WINDOW_MS = 1000, ZONE = 160;
export const DEBUG = typeof location !== 'undefined' && /[?&]debug=arena/.test(location.search || '');
export const warn = (...a) => { if (DEBUG) console.warn('[arena/combate]', ...a); };
export { reduced };

// ---- Acciones grandes (rayo cargado, técnica de equipo, choque, rayo del rey, ataque firma) -------------
const big = new Set();
export const bigCount = () => big.size;
export function acquireBig(owner, force = false) {
  if (big.has(owner)) return true;
  if (!force && big.size >= MAX_BIG) return false;
  big.add(owner); return true;
}
export function releaseBig(owner) { big.delete(owner); }

// ---- Choques de rayos ------------------------------------------------------------------------------
let clashActive = false, clashEndedAt = -1e9;
export const clashCan = now => !clashActive && now - clashEndedAt >= CLASH_GAP_MS && big.size < MAX_BIG;
export function clashBegin() { clashActive = true; }
export function clashEnd(now) { clashActive = false; clashEndedAt = now; }
export const clashRunning = () => clashActive;

// ---- Efectos reducidos y residuales --------------------------------------------------------------------
// Una party con puesto ≥ 2 (la 3.ª visible en adelante) usa la versión reducida de los efectos
export const isLite = slot => slot != null && slot >= LITE_FROM_SLOT;
export const ghostsMax = actor => (reduced() || actor.lite) ? 0 : GHOSTS_PER_HERO;

// ---- Limitador de destellos: ≤ 3 por segundo y por zona de 160×160 px ---------------------------------------
const zones = new Map();
export function flashOk(x, y, now, zoneKey) {
  const key = zoneKey || `${Math.floor(x / ZONE)},${Math.floor(y / ZONE)}`;
  let z = zones.get(key); if (!z) { z = []; zones.set(key, z); }
  while (z.length && now - z[0] > FLASH_WINDOW_MS) z.shift();
  if (z.length >= FLASH_MAX) return false;
  z.push(now); return true;
}
// Un destello fijo de movimiento reducido (0,15 s) se cuenta igual
export const FIXED_FLASH_MS = 150;

export function reset() { big.clear(); clashActive = false; clashEndedAt = -1e9; zones.clear(); }
