// Ataque firma de Kazgorath: Cometa de Brasas (KS). Avisa con un círculo en el suelo, carga brasas, lanza un cometa
// gigante en arco y deja caer una lluvia de bolas de fuego sobre las parties. Escala con la forma: más cometas y más lluvia.
// Solo se importan funciones de paso de ../actions.js. `k` = { form, kingId, color }.
import { pose, charge, shoot, rain, fx, wait } from '../actions.js';

const FIRE = '#ff6a1a', EMBER = '#ffd060';
export default {
  color: FIRE,
  signature: k => {
    const f = Math.max(1, Math.min(3, k.form || 1));
    return [
      pose('roar', 380), fx('shockwave', { r: 110 + f * 20, double: true, shake: f > 1, color: FIRE }),
      fx('telegraph', { ms: 700, r: 60 + f * 10, color: '#ff4a4a' }),
      charge(460, { ring: 'embers', color: FIRE, color2: EMBER, size: 20 + f * 4, tap: false, from: 'core' }),
      // el cometa: bola grande que sube y cae sobre la party elegida
      shoot('fire', 420, { count: f, at: .12, gap: .26, flight: 420, arc: 150, size: 2.5, knock: 0, big: true, fx: 'blast', color: FIRE, color2: EMBER }),
      wait(120),
      rain('fire', 5 + 3 * f, 1000, { color: FIRE }),
      ...(f >= 3 ? [fx('shockwave', { r: 190, double: true, shake: true, color: EMBER })] : []),
      wait(260),
    ];
  },
  paint: {},
};
