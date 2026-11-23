// Efectos de dibujo compartidos por las razas y los reyes de la arena (todo en código sobre canvas).
// Un efecto es una lista ['tipo', ...argumentos]. Se dibuja en dos pasadas: «back» (detrás del
// sprite) y «front» (delante). El contexto c lleva: x, y (pies), w, h (tamaño del sprite),
// t (ms), img (sprite ya compuesto), lite (efectos reducidos en la segunda fila).
import { shade } from './sprites.js';

export function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
export { shade };

// prefers-reduced-motion: se consulta en vivo para respetar el cambio sin recargar
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let reduceMotion = !!(mq && mq.matches);
if (mq && mq.addEventListener) mq.addEventListener('change', e => { reduceMotion = e.matches; });
export const reduced = () => reduceMotion;

// Resplandor pixelado (3 niveles de opacidad) cacheado por color y tamaño
const glows = new Map();
function glowImg(color, w, h) {
  const key = `${color}|${w}|${h}`;
  let c = glows.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = color;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + .5) / w * 2 - 1, ny = (y + .5) / h * 2 - 1, d = Math.hypot(nx, ny);
    const a = d < .5 ? .62 : d < .74 ? .44 : d < .92 ? .26 : d < 1 ? .5 : 0;  // borde más claro: recorta la silueta del aura
    if (a) { g.globalAlpha = a; g.fillRect(x, y, 1, 1); }
  }
  glows.set(key, c);
  return c;
}
export function drawGlow(g, color, cx, cy, w, h, t, amp = 1) {
  const pulse = reduceMotion ? .85 : .72 + .28 * Math.sin(t / 220);
  g.globalAlpha = Math.min(1, pulse * amp);
  g.drawImage(glowImg(color, w, h), Math.round(cx - w / 2), Math.round(cy - h / 2));
  g.globalAlpha = 1;
}

// Formas pequeñas para objetos que orbitan
export function shape(g, k, x, y, c, t = 0) {
  x = Math.round(x); y = Math.round(y);
  switch (k) {
    case 'star': px(g, x - 1, y, 3, 1, c); px(g, x, y - 1, 1, 3, c); break;
    case 'shuriken': px(g, x - 1, y - 1, 1, 1, c); px(g, x + 1, y - 1, 1, 1, c); px(g, x - 1, y + 1, 1, 1, c); px(g, x + 1, y + 1, 1, 1, c); px(g, x, y, 1, 1, '#fff'); break;
    case 'crystal': px(g, x, y - 2, 1, 4, c); px(g, x - 1, y - 1, 3, 2, c); px(g, x, y - 2, 1, 1, '#fff'); break;
    case 'blade': px(g, x, y - 3, 1, 6, c); px(g, x - 1, y + 1, 3, 1, '#8a92a0'); px(g, x, y - 3, 1, 1, '#fff'); break;
    case 'flag': px(g, x, y - 3, 1, 7, '#6a4422'); px(g, x + 1, y - 3, 3, 2, c); break;
    case 'rock': px(g, x - 1, y - 1, 3, 3, c); px(g, x - 1, y - 1, 3, 1, shade(c, 30)); px(g, x + 1, y, 1, 2, shade(c, -30)); break;
    case 'moon': px(g, x - 1, y - 2, 3, 5, c); px(g, x - 2, y - 1, 5, 3, c); px(g, x + 1, y - 1, 2, 3, '#2a2048'); break;
    case 'bird': px(g, x - 2, y - 1, 2, 1, c); px(g, x + 1, y - 1, 2, 1, c); px(g, x - 1, y, 3, 1, c); break;
    case 'ring': px(g, x - 1, y - 2, 3, 1, c); px(g, x - 1, y + 2, 3, 1, c); px(g, x - 2, y - 1, 1, 3, c); px(g, x + 2, y - 1, 1, 3, c); break;
    case 'snow': px(g, x, y - 1, 1, 3, c); px(g, x - 1, y, 3, 1, c); break;
    case 'leaf': px(g, x - 1, y, 3, 1, c); px(g, x, y - 1, 2, 1, c); px(g, x, y + 1, 1, 1, shade(c, -50)); break;
    case 'flower': px(g, x, y - 1, 1, 3, c); px(g, x - 1, y, 3, 1, c); px(g, x, y, 1, 1, '#fff2a0'); break;
    case 'gear': { const on = Math.floor(t / 200) % 2; px(g, x - 1, y - 1, 3, 3, c); px(g, x, y, 1, 1, '#2a2a30'); if (on) { px(g, x - 2, y, 1, 1, c); px(g, x + 2, y, 1, 1, c); } else { px(g, x, y - 2, 1, 1, c); px(g, x, y + 2, 1, 1, c); } break; }
    case 'drone': px(g, x - 2, y - 1, 5, 1, '#8a929a'); px(g, x - 1, y, 3, 2, c); px(g, x, y + 1, 1, 1, '#ff4a4a'); break;
    case 'fly': px(g, x, y, 1, 1, c); px(g, x - 1, y - 1, 1, 1, '#cfd8e8'); px(g, x + 1, y - 1, 1, 1, '#cfd8e8'); break;
    default: px(g, x - 1, y - 1, 2, 2, c); px(g, x - 1, y - 1, 1, 1, '#ffffff');   // orbe
  }
}

// Partículas deterministas (sin Math.random en el bucle de dibujo)
const frac = n => n - Math.floor(n);

const FX = {
  // ['aura', color, color2?]
  aura: {
    back(g, a, c) {
      const w = Math.round(c.w * 1.35) + 6, h = Math.round(c.h * 1.3) + 4;
      drawGlow(g, a[0], c.x, c.y - c.h / 2 - 1, w, h, c.t);
      if (a[1] && !c.lite) drawGlow(g, a[1], c.x, c.y - c.h / 2 - 1, Math.round(w * .55), Math.round(h * .6), c.t + 300, .5);
    },
  },
  // ['rays', n, color]: rayos tras la cabeza
  rays: {
    back(g, a, c) {
      if (c.lite) return;
      const n = a[0], hx = c.x, hy = c.y - c.h * .78, spin = reduceMotion ? 0 : c.t / 2200;
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2 + spin;
        for (let r = 8; r < 13; r++) px(g, hx + Math.cos(ang) * r, hy + Math.sin(ang) * r * .8, 1, 1, r < 11 ? a[1] : shade(a[1], -50));
      }
    },
  },
  // ['orbit', n, forma, color, rx, ry, vel]
  orbit: {
    back(g, a, c) { orbit(g, a, c, false); },
    front(g, a, c) { orbit(g, a, c, true); },
  },
  // ['rise', color, n]: partículas que ascienden
  rise: {
    front(g, a, c) {
      const n = c.lite ? 1 : (a[1] || 4);
      for (let i = 0; i < n; i++) {
        const k = reduceMotion ? (i + .5) / n : frac(c.t / 1100 + i / n);
        px(g, c.x - c.w / 2 + 1 + frac(i * .37 + .1) * (c.w - 2), c.y - 2 - k * (c.h + 4), 1, 2, a[0]);
      }
    },
  },
  // ['clones', n, alpha]: copias translúcidas que se alternan
  clones: {
    back(g, a, c) {
      if (c.lite || !c.img) return;
      const n = a[0], step = reduceMotion ? 0 : Math.floor(c.t / 450);
      g.globalAlpha = a[1] || .4;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, off = 8 + (Math.floor(i / 2)) * 8 + ((step + i) % 2) * 2;
        g.drawImage(c.img, Math.round(c.x - c.ax + side * off), Math.round(c.y - c.ay + ((step + i) % 2)));
      }
      g.globalAlpha = 1;
    },
  },
  // ['ground', tipo, color]
  ground: {
    back(g, a, c) {
      if (c.lite) return;
      const [k, col] = a;
      if (k === 'frost') {
        g.globalAlpha = .55; g.fillStyle = col; g.beginPath(); g.ellipse(c.x, c.y, 11, 3.5, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        for (let i = 0; i < 5; i++) px(g, c.x - 9 + i * 4.5, c.y - 3 - (i % 2) * 1, 1, 2 + (i % 2), '#ffffff');
      } else if (k === 'hex') {
        for (let i = 0; i < 6; i++) {
          const ang = i / 6 * Math.PI * 2 + (reduceMotion ? 0 : c.t / 2500);
          const x = c.x + Math.cos(ang) * 10, y = c.y - 1 + Math.sin(ang) * 3;
          px(g, x - 1, y, 3, 1, col); px(g, x, y - 1, 1, 1, col); px(g, x, y + 1, 1, 1, col);
        }
      } else if (k === 'waves') {
        const r = reduceMotion ? 8 : 4 + frac(c.t / 1500) * 12;
        g.strokeStyle = col; g.globalAlpha = reduceMotion ? .5 : 1 - r / 16; g.lineWidth = 1;
        g.beginPath(); g.ellipse(c.x, c.y, r * (c.w / 12), r * .3, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      }
    },
  },
  // ['backdrop', tipo, color, color2]: elemento grande tras el personaje
  backdrop: {
    back(g, a, c) {
      if (c.lite) return;
      const [k, c1, c2] = a, cx = c.x, top = c.y - c.h;
      if (k === 'moon' || k === 'redmoon') {
        const r = k === 'moon' ? 9 : Math.round(c.h * .42);
        g.fillStyle = c1; g.beginPath(); g.arc(cx, top + c.h * .45, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = c2 || shade(c1, -40); g.beginPath(); g.arc(cx + r * .3, top + c.h * .45 - r * .2, r * .35, 0, Math.PI * 2); g.fill();
      } else if (k === 'wave') {
        for (let i = 0; i < 16; i++) {
          const hgt = 4 + Math.round(Math.sin(i * .6 + (reduceMotion ? 0 : c.t / 400)) * 2) + (i < 8 ? i * .8 : (16 - i) * .8);
          px(g, cx - 16 + i * 2, c.y - hgt - 2, 2, hgt, i % 3 ? c1 : (c2 || '#ffffff'));
        }
      } else if (k === 'canvas') {
        g.fillStyle = '#f4f0e6'; g.beginPath(); g.arc(cx, c.y - c.h * .5, 14, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#20232e'; g.lineWidth = 1; g.stroke();
        const cols = ['#e84545', '#4fb0ff', '#f5d442', '#5fd068', '#c8408a'];
        for (let i = 0; i < 9; i++) { const ang = i * 1.4 + (reduceMotion ? 0 : c.t / 1800); px(g, cx + Math.cos(ang) * 8 - 1, c.y - c.h * .5 + Math.sin(ang) * 8, 3, 1, cols[i % 5]); }
      } else if (k === 'galaxy') {
        const r = Math.round(c.h * .5), cyy = c.y - c.h * .5;
        g.globalAlpha = .55; g.fillStyle = c1; g.beginPath(); g.ellipse(cx, cyy, r * 1.2, r * .75, 0, 0, Math.PI * 2); g.fill();
        g.globalAlpha = .45; g.fillStyle = c2 || '#ffffff'; g.beginPath(); g.ellipse(cx, cyy, r * .7, r * .4, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        for (let i = 0; i < 14; i++) { const a = i * 2.4 + (reduceMotion ? 0 : c.t / 4000), d = (i % 7 + 1) / 7 * r * 1.1; px(g, cx + Math.cos(a) * d, cyy + Math.sin(a) * d * .6, 1, 1, i % 2 ? '#ffffff' : (c2 || '#ffffff')); }
      } else if (k === 'curtain') {
        const hw = Math.round(c.w * .75);
        px(g, cx - hw, top - 2, hw * 2, c.h + 2, '#8a1a2a');
        for (let i = 0; i < hw * 2; i += 4) px(g, cx - hw + i, top - 2, 1, c.h + 2, '#a82a3a');
        px(g, cx - hw, top - 2, hw * 2, 2, '#e8b830'); px(g, cx - hw, c.y - 2, hw * 2, 2, '#e8b830');
      }
    },
  },
  // ['spirit', 'beast' | 'dragon', color]: espíritu translúcido tras la party
  spirit: {
    back(g, a, c) {
      if (c.lite) return;
      const [k, col] = a, u = c.h / 18, bob = reduceMotion ? 0 : Math.sin(c.t / 500) * 1.2;
      const x = c.x + 2 * u, y = c.y - c.h * .75 + bob;
      g.globalAlpha = .38; g.fillStyle = col;
      if (k === 'beast') {                        // lobo de perfil
        g.fillRect(Math.round(x - 9 * u), Math.round(y), Math.round(16 * u), Math.round(7 * u));
        g.fillRect(Math.round(x + 5 * u), Math.round(y - 4 * u), Math.round(8 * u), Math.round(6 * u));
        g.fillRect(Math.round(x + 12 * u), Math.round(y - 1 * u), Math.round(5 * u), Math.round(3 * u));
        g.fillRect(Math.round(x + 6 * u), Math.round(y - 7 * u), Math.round(2 * u), Math.round(3 * u)); g.fillRect(Math.round(x + 10 * u), Math.round(y - 7 * u), Math.round(2 * u), Math.round(3 * u));
        g.fillRect(Math.round(x - 14 * u), Math.round(y - 3 * u), Math.round(6 * u), Math.round(3 * u));
        for (const lx of [-8, -4, 2, 6]) g.fillRect(Math.round(x + lx * u), Math.round(y + 6 * u), Math.round(2 * u), Math.round(5 * u));
        g.globalAlpha = .9; g.fillStyle = '#ffffff'; g.fillRect(Math.round(x + 9 * u), Math.round(y - 2 * u), 2, 1);
      } else {                                    // dragón con alas abiertas
        g.fillRect(Math.round(x - 6 * u), Math.round(y), Math.round(12 * u), Math.round(5 * u));
        g.fillRect(Math.round(x + 4 * u), Math.round(y - 6 * u), Math.round(4 * u), Math.round(7 * u)); g.fillRect(Math.round(x + 6 * u), Math.round(y - 8 * u), Math.round(6 * u), Math.round(4 * u));
        g.fillRect(Math.round(x - 14 * u), Math.round(y + 2 * u), Math.round(8 * u), Math.round(2 * u));
        for (let i = 0; i < 5; i++) { g.fillRect(Math.round(x - 6 * u - i * 2.4 * u), Math.round(y - (9 - i * 1.5) * u), Math.round((3 + i * .4) * u), Math.round((7 - i * .6) * u)); g.fillRect(Math.round(x + 2 * u + i * 2.2 * u), Math.round(y - (10 - i * 1.5) * u), Math.round((3 + i * .4) * u), Math.round((7 - i * .6) * u)); }
        g.globalAlpha = .9; g.fillStyle = '#ffffff'; g.fillRect(Math.round(x + 9 * u), Math.round(y - 6 * u), 2, 1);
      }
      g.globalAlpha = 1;
    },
  },
  // ['bolts', color]: rayitos en los brazos
  bolts: {
    front(g, a, c) {
      if (c.lite) return;
      const s = reduceMotion ? 0 : Math.floor(c.t / 260);
      for (let i = 0; i < 2; i++) {
        const bx = c.x + (i ? c.w * .5 : -c.w * .5 - 1), by = c.y - c.h * .65 + ((s + i) % 3) * 2;
        px(g, bx, by, 1, 2, a[0]); px(g, bx + (i ? 1 : -1), by + 2, 1, 2, a[0]); px(g, bx, by + 4, 1, 2, a[0]);
      }
    },
  },
  // ['mist', color]: vaho / humo cerca de la cara
  mist: {
    front(g, a, c) {
      if (c.lite) return;
      const k = reduceMotion ? .4 : frac(c.t / 1600);
      g.globalAlpha = 1 - k; px(g, c.x + 3 + k * 5, c.y - c.h * .75 - k * 3, 2, 2, a[0]); px(g, c.x + 5 + k * 6, c.y - c.h * .75 - k * 4 - 1, 1, 1, a[0]); g.globalAlpha = 1;
    },
  },
  // ['serpent', color]: dragón de tinta enroscado
  serpent: {
    front(g, a, c) {
      if (c.lite) return;
      for (let i = 0; i < 14; i++) {
        const k = i / 13, y = c.y - 2 - k * (c.h - 3), x = c.x + Math.sin(k * 9 + (reduceMotion ? 0 : c.t / 500)) * (c.w * .62);
        px(g, x, y, i === 13 ? 3 : 2, 2, a[0]);
      }
      px(g, c.x + Math.sin(9 + (reduceMotion ? 0 : c.t / 500)) * (c.w * .62) + 1, c.y - c.h + 1, 1, 1, '#ff4a4a');
    },
  },
  // ['barrier', color]: barrera semitransparente
  barrier: {
    front(g, a, c) {
      if (c.lite) return;
      g.globalAlpha = .28; g.fillStyle = a[0]; g.beginPath(); g.ellipse(c.x, c.y - c.h / 2, c.w * .9, c.h * .62, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = .6; g.strokeStyle = a[0]; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
    },
  },
  // ['rings', color, n]: anillos de luz horizontales
  rings: {
    back(g, a, c) { ringsDraw(g, a, c); },
  },
  // ['ribbon', c1, c2]: cintas de aurora que ondean
  ribbon: {
    front(g, a, c) {
      if (c.lite) return;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 10; i++) {
        const x = c.x + (j ? 1 : -1) * (c.w * .45 + i * 1.4), y = c.y - c.h * .8 + Math.sin(i * .7 + (reduceMotion ? 0 : c.t / 300) + j * 2) * 2;
        px(g, x, y, 1, 1, j ? a[1] : a[0]);
      }
    },
  },
  // ['nebula', c1, c2]: destellos de nebulosa (capa estelar)
  nebula: {
    front(g, a, c) {
      const n = c.lite ? 3 : 9;
      for (let i = 0; i < n; i++) {
        const on = reduceMotion || Math.floor(c.t / 500 + i * 3) % 3;
        if (on) px(g, c.x - c.w * .55 + frac(i * .618 + .2) * c.w * 1.1, c.y - c.h * .15 - frac(i * .37 + .1) * c.h * .7, 1, 1, i % 2 ? a[0] : a[1]);
      }
    },
  },
  // ['fan', n, forma, color]: hojas fantasma en abanico tras el héroe
  fan: {
    back(g, a, c) {
      if (c.lite) return;
      for (let i = 0; i < a[0]; i++) {
        const ang = -Math.PI / 2 + (i - (a[0] - 1) / 2) * .55;
        shape(g, a[1], c.x + Math.cos(ang) * 11, c.y - c.h * .5 + Math.sin(ang) * 11, a[2], c.t);
      }
    },
  },
  // ['core', color]: núcleo pulsante en el pecho
  core: {
    front(g, a, c) {
      const r = reduceMotion ? 2 : 1 + Math.floor((Math.sin(c.t / 260) + 1) * 1.2);
      g.globalAlpha = .45; px(g, c.x - r - 1, c.y - c.h * .5 - r - 1, r * 2 + 2, r * 2 + 2, a[0]); g.globalAlpha = 1;
      px(g, c.x - r + 1, c.y - c.h * .5 - r + 1, r * 2 - 2 || 1, r * 2 - 2 || 1, '#ffffff');
    },
  },
  // ['ghosts', color]: soldados fantasma tras el jefe
  ghosts: {
    back(g, a, c) {
      if (c.lite) return;
      g.globalAlpha = .35;
      for (const [dx, k] of [[-1.05, .72], [1.05, .72], [-.62, .85], [.62, .85]]) {
        const w = c.w * .14, h = c.h * k * .75, x = c.x + dx * c.w * .5 + Math.sin(c.t / 700 + dx * 3) * 1.5;
        px(g, x - w / 2, c.y - h, w, h, a[0]); px(g, x - w / 2 - 1, c.y - h * .7, w + 2, 2, a[0]); px(g, x - w / 2, c.y - h - 3, w, 3, a[0]);
      }
      g.globalAlpha = 1;
    },
  },
  // ['smoke', color]
  smoke: {
    front(g, a, c) {
      for (let i = 0; i < 3; i++) {
        const k = reduceMotion ? .3 + i * .2 : frac(c.t / 1800 + i / 3);
        g.globalAlpha = 1 - k; px(g, c.x - c.w * .3 + i * 4 + k * 4, c.y - c.h * .78 - k * 10, 2 + Math.round(k * 2), 2 + Math.round(k * 2), a[0]); g.globalAlpha = 1;
      }
    },
  },
  // ['flames', c1, c2]: llamas alrededor
  flames: {
    front(g, a, c) {
      const n = c.lite ? 3 : 8;
      for (let i = 0; i < n; i++) {
        const k = reduceMotion ? (i % 3) / 3 : frac(c.t / 700 + i * .21);
        px(g, c.x - c.w * .55 + frac(i * .61) * c.w * 1.1, c.y - 2 - k * c.h * .9, 2, 3, k < .5 ? a[0] : a[1]);
      }
    },
  },
};

function orbit(g, a, c, front) {
  const [n, k, col, rx = 13, ry = 5, vel = 1] = a;
  const cnt = c.lite ? Math.min(n, 2) : n, cy = c.y - c.h * (a[6] ?? .5);
  for (let i = 0; i < cnt; i++) {
    const ang = i / cnt * Math.PI * 2 + (reduceMotion ? 0 : c.t / 1000 * vel);
    if ((Math.sin(ang) > 0) !== front) continue;
    shape(g, k, c.x + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, col, c.t);
  }
}
function ringsDraw(g, a, c) {
  if (c.lite) return;
  g.strokeStyle = a[0]; g.lineWidth = 1;
  for (let i = 0; i < (a[1] || 3); i++) {
    g.globalAlpha = .8; g.beginPath(); g.ellipse(c.x, c.y - c.h * (.2 + i * .28), c.w * .8, 2.5, 0, 0, Math.PI * 2); g.stroke();
  }
  g.globalAlpha = 1;
}

export function fxBack(g, list, c) { for (const a of list || []) { const f = FX[a[0]]; if (f && f.back) f.back(g, a.slice(1), c); } }
export function fxFront(g, list, c) { for (const a of list || []) { const f = FX[a[0]]; if (f && f.front) f.front(g, a.slice(1), c); } }
