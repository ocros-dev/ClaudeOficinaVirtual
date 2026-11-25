// Ataque firma de Ysgrim: Lanza de Escarcha (KS). Carga un anillo de luz helada, lanza una fila de lanzas de hielo contra
// la party y deja caer carámbanos del cielo. Escala con la forma: más lanzas en la fila y más carámbanos.
// Solo se importan funciones de paso de ../actions.js. `k` = { form, kingId, color }.
import { pose, charge, shoot, rain, fx, wait } from '../actions.js';

const ICE = '#9ab0ff', FROST = '#e4f2ff';
export default {
  color: ICE,
  signature: k => {
    const f = Math.max(1, Math.min(3, k.form || 1));
    return [
      pose('lean', 240), fx('telegraph', { ms: 650, r: 55 + f * 10, color: '#7ad8ff' }),
      charge(420, { ring: 'light', color: ICE, color2: FROST, size: 26 + f * 6, tap: false, from: 'hands' }),
      // fila de lanzas: se lanzan una tras otra, a ras de la altura de los héroes
      shoot('ice', 380, { count: 2 + f, at: .12, gap: .17, flight: 300, size: 2.4, knock: 0, big: true, fx: 'blast', color: ICE, color2: FROST }),
      fx('ring', { r: 90, color: FROST, squash: .4 }),
      wait(100),
      rain('ice', 7 + 4 * f, 1000, { color: ICE }),
      ...(f >= 3 ? [fx('shockwave', { r: 200, double: true, shake: true, color: FROST })] : []),
      wait(260),
    ];
  },
  paint: {},
};
