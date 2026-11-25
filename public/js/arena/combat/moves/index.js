// Registro de los movimientos de las 9 razas (dueño: N3; no se toca después).
import generic from './generic.js';
import tempestarios from './tempestarios.js';
import humanos from './humanos.js';
import elfos from './elfos.js';
import enanos from './enanos.js';
import orcos from './orcos.js';
import gnomos from './gnomos.js';
import bestiales from './bestiales.js';
import draconios from './draconios.js';
import astrales from './astrales.js';

export const MOVES = { tempestarios, humanos, elfos, enanos, orcos, gnomos, bestiales, draconios, astrales };
const DEFAULT_STYLE = { opener: 'dash', spark: '#ffffff', beam: 'violet', ring: 'arcs', projectile: 'orb', light: '#e0d0ff' };
export const stylesOf = raceId => ({ ...DEFAULT_STYLE, ...generic.styles, ...((MOVES[raceId] || {}).styles || {}) });

// Guion de una acción: moves/<raza>[rol][acción] y, si falta, generic. `team` se llama una vez por héroe (s.i)
export function scriptFor(raceId, role, action, s) {
  const m = MOVES[raceId] || {};
  let fn;
  if (action === 'team') fn = m.team || generic.team;
  else fn = (m[role] && m[role][action]) || (generic[role] && generic[role][action]) || generic.vanguard.probe;
  const out = fn(s);
  if (action === 'team' && Array.isArray(out) && Array.isArray(out[0])) return out[s.i] || out[0];   // también vale devolver un guion por héroe
  return out;
}
export const paintOf = raceId => (MOVES[raceId] && MOVES[raceId].paint) || {};
