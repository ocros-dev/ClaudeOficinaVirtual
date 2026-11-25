// Ataque firma de Vhel-Morkai: Marea Negra (KS). Tentáculos de agua oscura que barren el suelo hacia la party: cada barrido
// es un zarpazo que lanza una media luna pegada al suelo. Escala con la forma: más barridos y, desde la forma 2, gotas negras.
// Solo se importan funciones de paso de ../actions.js. `k` = { form, kingId, color }.
import { pose, rain, fx, wait } from '../actions.js';

const TIDE = '#2ab0d0', FOAM = '#7affe0';
export default {
  color: TIDE,
  signature: k => {
    const f = Math.max(1, Math.min(3, k.form || 1));
    const sweeps = Array.from({ length: 2 + f }, (_, i) => [
      pose('claw', 170),
      fx('wave', { color: i % 2 ? FOAM : TIDE, ms2: 300 - i * 20, big: i % 2 === 1 || i === 1 + f }),
      fx('shockwave', { r: 100 + i * 20, color: i % 2 ? FOAM : TIDE, double: true }),
      wait(70),
    ]);
    return [
      pose('lean', 300), fx('shockwave', { r: 120 + f * 25, double: true, shake: true, color: TIDE }),
      ...sweeps,
      ...(f >= 2 ? [rain('shadow', 2 + 3 * f, 800, { color: TIDE })] : []),
      ...(f >= 3 ? [fx('shockwave', { r: 200, double: true, shake: true, color: FOAM })] : []),
      wait(240),
    ];
  },
  paint: {},
};
