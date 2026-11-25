// Utilidades pequeñas que comparten escena, campamento y fondo (las razas y el combate usan las de render/vfx.js).
// Antes vivían en public/js/fx.js, que se retiró con el arte de la versión 1.1.

// prefers-reduced-motion se consulta en vivo y es la misma bandera que usa render/vfx.js (también para pruebas: setReduced)
export { reduced } from './render/vfx.js';

// Rectángulo relleno redondeado a píxeles enteros
export function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }

// Aclara u oscurece un color '#rrggbb' sumando `amt` a cada canal
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
