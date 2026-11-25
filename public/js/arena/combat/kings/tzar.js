// Ataque firma de Tzar-Nuul: Nube de Plaga (KS). Exhala un enjambre de esporas que viaja lento y en arco hasta la party,
// con una lluvia de esporas pesadas. Escala con la forma: enjambre más denso y segunda oleada.
// Solo se importan funciones de paso de ../actions.js. `k` = { form, kingId, color }.
import { pose, shoot, rain, fx, wait } from '../actions.js';

const PLAGUE = '#b8c83a', SPORE = '#e8f090';
export default {
  color: PLAGUE,
  signature: k => {
    const f = Math.max(1, Math.min(3, k.form || 1));
    const swarm = (n, ms) => shoot('plague', ms, { count: n, at: .04, gap: .88 / n, flight: 760, arc: 90, from: 'mouth', to: 'far', spread: 16, size: 1.1, knock: 0, fx: 'spark', color: PLAGUE, color2: SPORE });
    return [
      pose('cast', 320), fx('spark', { n: 14, color: PLAGUE, color2: SPORE, speed: 90 }), fx('shockwave', { r: 100 + f * 20, color: PLAGUE, double: true }),
      swarm(4 + 2 * f, 700), rain('plague', 6 + 3 * f, 900, { color: PLAGUE }),
      ...(f >= 2 ? [wait(120), pose('cast', 200), swarm(4 + 2 * f, 600), rain('plague', 5 + 3 * f, 800, { color: SPORE })] : []),
      ...(f >= 3 ? [fx('shockwave', { r: 190, double: true, shake: true, color: SPORE })] : []),
      wait(260),
    ];
  },
  paint: {},
};
