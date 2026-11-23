// Razas de la arena (8 razas × 3 clases × 3 etapas × 2 paletas), todo original.
// Sistema paramétrico: cada héroe = aspecto base (paleta, peinado) + capas estáticas que se
// hornean una vez sobre el sprite de agente (makeCharacter) + efectos dinámicos (fx.js).
// Todas las coordenadas de las capas son del sprite de 12×18 mirando a la derecha (en vista
// lateral) o de frente/espalda; 'left' se obtiene reflejando.
import { makeCharacter, shade } from './sprites.js';

const PADX = 14, PADY = 14, CW = 40, CH = 34;
const LOOK0 = { hairStyle: 'corto', eyes: 'anime', iris: '#3a2a1a', hair: '#2b1d14', skin: '#f1c7a3', shirt: '#8a8aa0',
                pants: '#2d2a40', shoes: '#2a1a14', accessory: [], accent: '#c03030' };

// ---- Capas estáticas --------------------------------------------------------
// fn(R, v, pass, ...args): v = 'f' (frente), 'b' (espalda), 's' (lateral); pass = 'back' | 'front'.
const LAYERS = {
  sash(R, v, p, c) { if (p !== 'front') return; if (v === 's') R(3, 11, 6, 1, c); else { R(2, 11, 8, 1, c); R(8, 12, 2, 2, c); } },
  wraps(R, v, p, c) { if (p !== 'front') return; if (v === 's') { R(5, 11, 1, 2, c); R(4, 10, 2, 1, c); } else { R(2, 11, 1, 2, c); R(9, 11, 1, 2, c); } },
  runes(R, v, p, c) { if (p !== 'front') return; if (v === 's') { R(4, 9, 1, 1, c); R(6, 11, 1, 1, c); } else { R(2, 9, 1, 1, c); R(9, 10, 1, 1, c); R(5, 10, 2, 1, c); } },
  cape(R, v, p, c, len = 6, c2) {
    c2 = c2 || shade(c, -45);
    if (v === 'b') { if (p !== 'front') return; R(1, 8, 10, len, c); R(1, 8, 10, 1, shade(c, 25)); R(1, 7 + len, 10, 1, c2); }
    else if (p === 'back') { if (v === 's') { R(0, 8, 5, len, c); R(0, 7 + len, 5, 1, c2); } else { R(0, 8, 12, len, c); R(0, 7 + len, 12, 1, c2); } }
  },
  pads(R, v, p, c) { if (p !== 'front') return; if (v === 's') R(3, 8, 3, 2, c); else { R(0, 8, 2, 2, c); R(10, 8, 2, 2, c); R(0, 8, 2, 1, shade(c, 30)); R(10, 8, 2, 1, shade(c, 30)); } },
  armor(R, v, p, c, c2) { if (p !== 'front') return; if (v === 's') R(3, 9, 6, 4, c); else { R(2, 9, 8, 4, c); if (v === 'f') R(5, 9, 2, 3, c2); } },
  crossarms(R, v, p, c, c2) { if (p === 'front' && v === 'f') { R(2, 10, 8, 2, c); R(2, 10, 8, 1, c2); } },
  vest(R, v, p, c) { if (p !== 'front') return; if (v === 's') R(4, 9, 4, 3, c); else { R(2, 9, 3, 4, c); R(7, 9, 3, 4, c); } },
  sleeves(R, v, p, c) { if (p !== 'front' || v === 's') return; R(-1, 9, 3, 4, c); R(10, 9, 3, 4, c); R(-1, 12, 3, 1, shade(c, -40)); R(10, 12, 3, 1, shade(c, -40)); },
  trim(R, v, p, c) { if (p !== 'front') return; if (v === 's') R(3, 12, 6, 1, c); else { R(2, 12, 8, 1, c); if (v === 'f') { R(5, 8, 2, 1, c); } } },
  stripes(R, v, p, c) { if (p !== 'front' || v === 's') return; for (let y = 8; y < 13; y++) for (const x0 of [3, 6, 9]) R(x0 + (y % 2), y, 1, 1, c); },
  splash(R, v, p, c) { if (p !== 'front') return; R(3, 9, 1, 1, c); R(6, 11, 1, 1, c); R(8, 9, 2, 1, c); R(4, 12, 1, 1, c); R(5, 8, 1, 1, c); },
  patches(R, v, p, a, b, c) { if (p !== 'front') return; R(2, 9, 2, 2, a); R(8, 10, 2, 2, b); R(5, 12, 2, 1, c); },
  backpack(R, v, p, c) {
    if (v === 'b' && p === 'front') { R(3, 8, 6, 6, c); R(3, 8, 6, 1, shade(c, 30)); R(3, 13, 6, 1, shade(c, -40)); }
    else if (p === 'back') { if (v === 'f') { R(0, 8, 2, 5, c); R(10, 8, 2, 5, c); } else if (v === 's') { R(0, 8, 4, 6, c); R(0, 8, 4, 1, shade(c, 30)); } }
  },
  tail(R, v, p, c) {
    if (v === 'b' && p === 'front') { R(4, 12, 4, 6, c); R(5, 12, 2, 2, shade(c, 30)); }
    else if (p === 'back') { if (v === 's') { R(0, 11, 3, 2, c); R(-1, 9, 2, 3, c); R(-2, 7, 2, 3, c); R(-2, 6, 1, 1, '#fff'); } else if (v === 'f') { R(10, 13, 2, 4, c); R(11, 11, 1, 3, c); } }
  },
  scarftail(R, v, p, c, len = 8) {
    if (p !== 'back') return;
    if (v === 's') for (let i = 0; i < len; i++) R(2 - i, 8 + (i % 3 === 1 ? 1 : 0) + (i > 3 ? 1 : 0), 1, 2, i % 2 ? c : shade(c, 25));
    else for (let i = 0; i < 5; i++) R(9 + (i % 2), 9 + i, 2, 1, c);
  },
  hat(R, v, p, kind, c, c2) {
    if (p !== 'front') return;
    if (kind === 'tricorn') { R(0, 0, 12, 1, c); R(2, -1, 8, 1, c); R(3, -2, 6, 1, c); R(9, -4, 1, 3, c2 || '#ffffff'); R(10, -4, 1, 1, c2 || '#ffffff'); }
    else if (kind === 'crest') { R(1, 0, 10, 1, c); R(2, -1, 8, 1, c); R(5, -3, 2, 2, c2); R(5, -4, 2, 1, shade(c2, 30)); }
    else if (kind === 'bun') { R(4, -2, 4, 2, c); R(5, -3, 2, 1, c); }
    else if (kind === 'ears') { if (v === 's') { R(3, -2, 3, 3, c); R(4, -1, 1, 2, c2); R(7, -1, 2, 2, c); } else { R(1, -2, 3, 3, c); R(8, -2, 3, 3, c); R(2, -1, 1, 2, c2); R(9, -1, 1, 2, c2); } }
    else if (kind === 'crown') { R(2, 0, 8, 1, c); R(2, -1, 1, 1, c); R(5, -2, 2, 2, c); R(9, -1, 1, 1, c); R(5, -2, 2, 1, '#fff'); }
    else if (kind === 'band') { R(1, 2, 10, 1, c); R(0, 3, 1, 2, c); if (v === 'f') R(5, 2, 2, 1, '#e8eef8'); }
    else if (kind === 'horns') { R(1, -2, 2, 3, c); R(9, -2, 2, 3, c); R(1, -3, 1, 1, c); R(10, -3, 1, 1, c); }
  },
  weapon(R, v, p, kind, c, c2) {
    const side = v === 's', x = 11;
    if (kind === 'greatback') {
      if (v === 'b' && p === 'front') { for (let i = 0; i < 14; i++) { R(1 + Math.round(i * .7), 16 - i, 2, 1, c); } R(9, 3, 2, 2, c2); R(8, 5, 4, 1, c2); }
      else if (p === 'back') { if (v === 'f') { R(9, 2, 1, 4, c2); R(8, 5, 3, 1, c2); R(10, 6, 1, 4, c); } else if (v === 's') { R(2, 2, 1, 4, c2); R(1, 5, 3, 1, c2); R(2, 6, 1, 6, c); } }
      return;
    }
    if (p !== 'front') return;
    const blade = len => { R(x, 11 - len, 1, len, c); R(x, 11 - len, 1, 1, '#ffffff'); R(x - 1, 11, 3, 1, c2); R(x, 12, 1, 2, '#6a4422'); if (side) R(8, 11, 3, 1, c2); };
    if (kind === 'sword') blade(9);
    else if (kind === 'longsword') { blade(13); R(x + 1, 0, 1, 11, shade(c, -30)); }
    else if (kind === 'katana') { R(x, 3, 1, 9, c); R(x, 3, 1, 1, '#fff'); R(x - 1, 11, 3, 1, c2); R(x, 12, 1, 2, '#2a2a34'); if (side) R(8, 11, 3, 1, c2); }
    else if (kind === 'dagger') { R(x, 7, 1, 5, c); R(x - 1, 11, 3, 1, c2); }
    else if (kind === 'saber') { R(x, 5, 1, 7, c); R(x, 5, 1, 1, '#fff'); R(x - 1, 11, 3, 1, c2); }
    else if (kind === 'staff') { R(x, 1, 1, 17, c); R(x - 1, -1, 3, 3, c2); R(x, -1, 1, 1, '#fff'); R(x - 1, 6, 3, 1, shade(c, -30)); R(x - 1, 10, 3, 1, shade(c, -30)); if (side) R(8, 10, 3, 1, c); }
    else if (kind === 'brush') { R(x, 4, 1, 10, '#7a5230'); R(x - 1, 0, 3, 5, c); R(x, 0, 1, 2, shade(c, 40)); R(x - 1, 4, 3, 1, '#c8d0dc'); if (side) R(8, 10, 3, 1, '#7a5230'); }
    else if (kind === 'fan') { R(x - 1, 7, 4, 4, c); R(x - 1, 7, 4, 1, c2); R(x, 8, 1, 3, c2); R(x + 1, 8, 1, 3, c2); if (side) R(8, 10, 3, 1, c2); }
    else if (kind === 'chain') { for (let i = 0; i < 5; i++) R(x, 12 + i, 1, 1, i % 2 ? c : '#8a92a0'); R(x - 1, 17, 3, 1, c); R(x, 16, 1, 2, c); }
    else if (kind === 'shield') { if (side) { R(7, 5, 4, 10, c); R(7, 5, 4, 1, c2); R(8, 7, 1, 1, '#fff'); R(8, 12, 1, 1, '#fff'); } else { R(-3, 4, 5, 11, c); R(-3, 4, 5, 1, c2); R(-3, 14, 5, 1, shade(c, -40)); R(-2, 6, 1, 1, '#fff'); R(0, 6, 1, 1, '#fff'); R(-2, 12, 1, 1, '#fff'); R(0, 12, 1, 1, '#fff'); } }
    else if (kind === 'bigshield') { if (side) { R(6, 3, 5, 13, c); R(6, 3, 5, 1, c2); R(8, 7, 2, 4, c2); } else { R(-4, 2, 6, 14, c); R(-4, 2, 6, 1, c2); R(-2, 7, 2, 4, c2); R(-4, 15, 6, 1, shade(c, -40)); } }
    else if (kind === 'claws') { if (side) R(6, 13, 3, 1, c); else { R(1, 13, 1, 2, c); R(2, 13, 1, 2, c); R(9, 13, 1, 2, c); R(10, 13, 1, 2, c); } }
    else if (kind === 'longclaws') { if (side) { R(6, 13, 4, 1, c); R(6, 14, 3, 1, c); } else { R(0, 13, 1, 4, c); R(2, 13, 1, 4, c); R(9, 13, 1, 4, c); R(11, 13, 1, 4, c); } }
    else if (kind === 'lightspear') { R(x, -3, 1, 21, c); R(x - 1, -5, 3, 3, c2); R(x, -6, 1, 1, '#fff'); if (side) R(8, 11, 3, 1, c2); }
  },
  wings(R, v, p, kind, c, size = 7, c2) {
    if (p !== 'back') return;
    c2 = c2 || shade(c, 50);
    const wing = (sx, sd) => {
      for (let r = 0; r < 12; r++) {
        const len = Math.max(1, Math.round(size * Math.min(1, (r + 2) / 8) * (1 - r / 17)));
        const y = 12 - r, ix = sd < 0 ? sx - len : sx;
        if (kind === 'chains') { if (r % 3 === 0) for (let i = 0; i < len; i++) R(sd < 0 ? sx - i - 1 : sx + i, y + (r > 5 ? i >> 1 : -(i >> 1)), 1, 1, i % 2 ? c : c2); }
        else R(ix, y, len, 1, r % 4 === 0 ? c2 : c);
      }
    };
    if (v === 's') wing(2, -1); else { wing(1, -1); wing(11, 1); }
  },
  mark(R, v, p, kind, c) {
    if (p !== 'front' || v === 'b') return;
    const f = v === 'f';
    if (kind === 'scar') R(f ? 3 : 8, 3, 1, 3, c);
    else if (kind === 'cheeks') { if (f) { R(2, 5, 2, 1, c); R(8, 5, 2, 1, c); } else R(8, 5, 2, 1, c); }
    else if (kind === 'bolt') { if (f) { R(8, 5, 1, 1, c); R(9, 6, 1, 1, c); } else { R(8, 5, 1, 1, c); R(9, 6, 1, 1, c); } }
    else if (kind === 'fangs') { if (f) { R(4, 6, 1, 1, '#fff'); R(7, 6, 1, 1, '#fff'); } else R(9, 6, 1, 1, '#fff'); }
    else if (kind === 'smile') { if (f) R(4, 6, 4, 1, '#ffffff'); else R(8, 6, 2, 1, '#ffffff'); }
    else if (kind === 'shut') { if (f) { R(3, 4, 2, 1, c); R(7, 4, 2, 1, c); R(3, 5, 2, 1, '#f1c7a3'); R(7, 5, 2, 1, '#f1c7a3'); } else { R(8, 4, 2, 1, c); R(8, 5, 2, 1, '#f1c7a3'); } }
  },
  eyes(R, v, p, c, which) { if (p !== 'front' || v === 'b') return; if (v === 'f') { if (which !== 'R') R(3, 4, 2, 2, c); if (which !== 'L') R(7, 4, 2, 2, c); } else R(8, 4, 2, 2, c); },
  bangs(R, v, p, c) { if (p === 'front' && v === 'f') { R(3, 3, 3, 3, c); R(2, 3, 1, 2, c); } },
  goggles(R, v, p, c) { if (p !== 'front' || v === 'b') return; if (v === 'f') { R(2, 1, 3, 2, c); R(7, 1, 3, 2, c); R(5, 2, 2, 1, c); } else { R(5, 1, 3, 2, c); R(8, 1, 2, 1, c); } },
  tips(R, v, p, c) { if (p !== 'front') return; if (v === 's') { R(1, 3, 1, 2, c); R(3, 1, 2, 1, c); } else { R(2, 3, 1, 1, c); R(9, 3, 1, 1, c); R(3, 1, 1, 1, c); R(8, 1, 1, 1, c); R(5, 0, 2, 1, c); } },
  beard(R, v, p, c) { if (p !== 'front' || v === 'b') return; if (v === 'f') { R(3, 3, 3, 1, c); R(6, 3, 3, 1, c); R(3, 6, 6, 2, c); R(4, 8, 4, 3, c); } else { R(7, 3, 3, 1, c); R(7, 5, 3, 3, c); R(7, 8, 2, 3, c); } },
  pot(R, v, p, c) { if (p === 'front' && v !== 's') { R(9, 12, 2, 2, c); R(9, 12, 2, 1, '#fff'); } },
  springs(R, v, p, c) { if (p !== 'front') return; if (v === 's') { R(4, 18, 4, 1, c); R(5, 17, 1, 1, c); R(7, 17, 1, 1, c); } else { R(2, 18, 3, 1, c); R(7, 18, 3, 1, c); R(3, 17, 1, 1, c); R(8, 17, 1, 1, c); } },
  spirals(R, v, p, c) { if (p !== 'front' || v === 's') return; R(1, 9, 1, 1, c); R(1, 11, 1, 1, c); R(10, 10, 1, 1, c); R(10, 12, 1, 1, c); R(2, 10, 1, 1, c); R(9, 9, 1, 1, c); },
  ribbons(R, v, p, c) { if (p !== 'front') return; R(1, 11, 1, 5, c); R(10, 11, 1, 5, c); R(0, 14, 1, 3, shade(c, -30)); R(11, 14, 1, 3, shade(c, -30)); },
  glowhands(R, v, p, c) { if (p !== 'front' || v === 'b') return; if (v === 's') R(5, 11, 2, 2, c); else { R(1, 12, 2, 2, c); R(9, 12, 2, 2, c); } },
  flameSleeves(R, v, p) { if (p !== 'front' || v === 's') return; R(1, 9, 1, 1, '#ff9a2a'); R(10, 9, 1, 1, '#ffd24a'); R(0, 10, 1, 1, '#ff6a1a'); R(11, 10, 1, 1, '#ff9a2a'); R(0, 8, 1, 1, '#ffd24a'); R(11, 8, 1, 1, '#ff6a1a'); },
};

// ---- Capas nuevas de las razas (armas, sombreros y trajes) --------------------------------------------
// Se añaden sin tocar las anteriores: las armas y los sombreros nuevos se resuelven primero aquí.
const EXTRA_WEAPON = {
  hammer(R, side, c, c2) { R(11, 8, 1, 8, '#6a4422'); R(9, 4, 5, 4, c); R(9, 4, 5, 1, c2); R(13, 5, 1, 2, shade(c, -40)); },
  axe(R, side, c, c2) { R(11, 3, 1, 12, '#6a4422'); R(12, 2, 3, 5, c); R(12, 2, 3, 1, '#ffffff'); R(14, 3, 1, 3, c2); },
  axes(R, side, c, c2) {
    EXTRA_WEAPON.axe(R, side, c, c2);
    if (!side) { R(0, 3, 1, 12, '#6a4422'); R(-3, 2, 3, 5, c); R(-3, 2, 3, 1, '#ffffff'); R(-3, 3, 1, 3, c2); }
  },
  bow(R, side, c, c2) { R(11, 3, 1, 2, c); R(12, 5, 1, 6, c); R(11, 11, 1, 2, c); R(10, 4, 1, 8, c2); R(11, 8, 2, 1, '#e8dcc0'); },
  cannon(R, side, c, c2) { R(8, 9, 6, 3, c); R(8, 9, 6, 1, shade(c, 40)); R(13, 8, 2, 5, c2); R(7, 10, 2, 3, '#6a4422'); },
  jav(R, side, c, c2) { R(11, 1, 1, 15, '#8a6a3a'); R(10, -2, 3, 3, c); R(11, -3, 1, 1, '#ffffff'); R(10, 14, 3, 1, c2); },
  wand(R, side, c, c2) { R(11, 6, 1, 8, c); R(10, 4, 3, 3, c2); R(11, 3, 1, 1, '#ffffff'); },
  curved(R, side, c, c2) {
    const one = x0 => { R(x0, 4, 1, 8, c); R(x0 + 1, 3, 1, 2, c); R(x0 + 1, 2, 1, 1, '#ffffff'); R(x0 - 1, 11, 3, 1, c2); R(x0, 12, 1, 2, '#6a4422'); };
    one(11); if (!side) one(0);
  },
  totem(R, side, c, c2) { R(11, 2, 1, 14, '#6a4422'); R(9, 0, 5, 4, c); R(10, 1, 1, 1, '#14141c'); R(12, 1, 1, 1, '#14141c'); R(9, 5, 5, 1, c2); R(10, 8, 3, 1, c2); },
  flask(R, side, c, c2) { R(10, 10, 3, 3, c); R(10, 10, 3, 1, c2); R(11, 9, 1, 1, '#ffffff'); R(10, 13, 3, 1, shade(c, -40)); },
  lance(R, side, c, c2) { R(11, -2, 1, 19, '#8a8a96'); R(10, -4, 3, 3, c); R(11, -5, 1, 1, '#ffffff'); R(10, 3, 3, 1, c2); },
  cross(R, side, c, c2) { R(11, 2, 1, 14, c); R(9, -1, 5, 1, c2); R(9, 3, 5, 1, c2); R(9, 0, 1, 3, c2); R(13, 0, 1, 3, c2); },
};
const baseWeapon = LAYERS.weapon;
LAYERS.weapon = function weapon(R, v, p, kind, c, c2) {
  const fn = EXTRA_WEAPON[kind];
  if (!fn) return baseWeapon(R, v, p, kind, c, c2);
  if (p !== 'front' || v === 'b') return;
  fn(R, v === 's', c, c2);
};
const EXTRA_HAT = {
  elfears(R, v, c) { if (v === 's') { R(3, 3, 2, 1, c); R(2, 2, 1, 1, c); } else { R(0, 3, 1, 1, c); R(-1, 2, 1, 1, c); R(11, 3, 1, 1, c); R(12, 2, 1, 1, c); } },
  halo(R, v, c) { R(3, -3, 6, 1, c); R(2, -2, 1, 1, c); R(9, -2, 1, 1, c); },
  antlers(R, v, c) { R(2, -2, 1, 3, c); R(1, -3, 1, 1, c); R(3, -4, 1, 2, c); R(9, -2, 1, 3, c); R(10, -3, 1, 1, c); R(8, -4, 1, 2, c); },
  helm(R, v, c, c2) { R(1, 0, 10, 2, c); R(2, -1, 8, 1, c); R(5, -3, 2, 2, c2 || c); if (v === 'f') R(5, 2, 2, 2, c); },
  hood(R, v, c) { R(1, 0, 10, 1, c); R(0, 1, 1, 6, c); R(11, 1, 1, 6, c); R(1, 1, 1, 1, c); R(10, 1, 1, 1, c); },
  wizhat(R, v, c, c2) { R(0, 0, 12, 1, c); R(2, -1, 8, 1, c); R(3, -3, 6, 2, c); R(5, -6, 3, 3, c); R(7, -7, 2, 1, c); R(3, -1, 6, 1, c2); },
  dhorns(R, v, c) { R(1, -1, 2, 2, c); R(0, -2, 1, 1, c); R(9, -1, 2, 2, c); R(11, -2, 1, 1, c); },
  crescent(R, v, c) { R(4, -3, 4, 1, c); R(3, -2, 1, 2, c); R(8, -2, 1, 2, c); },
};
const baseHat = LAYERS.hat;
LAYERS.hat = function hat(R, v, p, kind, c, c2) {
  const fn = EXTRA_HAT[kind];
  if (!fn) return baseHat(R, v, p, kind, c, c2);
  if (p === 'front') fn(R, v, c, c2);
};
Object.assign(LAYERS, {
  // Mecha pequeño de los gnomos: casco-cabina y piernas pesadas
  mech(R, v, p, c, c2) { if (p !== 'front') return; R(1, 8, 10, 6, c); R(1, 8, 10, 1, shade(c, 40)); R(0, 13, 4, 5, c2); R(8, 13, 4, 5, c2); if (v !== 'b') R(4, 10, 4, 2, '#2a3a4a'); },
  stars(R, v, p, c) { if (p !== 'front' || v === 's') return; R(2, 9, 1, 1, c); R(9, 11, 1, 1, c); R(5, 12, 1, 1, c); R(7, 9, 1, 1, c); },
});

// ---- Razas -----------------------------------------------------------------------------------------------
// Cada raza: 2 paletas (A y B), 3 clases (vanguardia, distancia o magia, apoyo) y 3 etapas.
// Los textos '$x' de capas, aspecto y efectos se sustituyen por el color x de la paleta de la party.
// Etapa 2 y 3: capas y efectos añadidos sobre el sprite base (no hay sprites nuevos).
const L = o => ({ ...LOOK0, ...o });
export const ROLES = ['vanguardia', 'distancia o magia', 'apoyo'];
export const RACES = [
  { id: 'humanos', name: 'Humanos', place: 'Reino del Alba', emblem: ['☀', '☼'], color: '#e8b830',
    roles: ['claude', 'product-owner'],
    pal: [{ m: '#2e4a8a', a: '#e8b830', t: '#f4f4f4', h: '#6a3a1e', sk: '#f1c7a3' }, { m: '#1f7a7a', a: '#c8d0dc', t: '#f4e8c8', h: '#2b1d14', sk: '#d8a880' }],
    cls: [
      { n: 'Caballera', look: L({ hairStyle: 'coleta', hair: '$h', skin: '$sk', shirt: '$m', pants: '#e8e4d8', shoes: '#4a3a2a', iris: '#2a4a8a' }), hit: ['slash', '#ffe08a'],
        l: [['armor', '$m', '$a'], ['pads', '$a'], ['hat', 'crest', '$t', '$a'], ['weapon', 'sword', '#e8eef8', '$a'], ['weapon', 'shield', '$m', '$a']] },
      { n: 'Hechicero', look: L({ hairStyle: 'corto', hair: '$h', skin: '$sk', shirt: '$m', pants: '#2a2a4a', shoes: '#2a1a14', iris: '#3a5ac8' }), hit: ['bolt', '#7ad8ff'],
        l: [['cape', '$t', 5], ['hat', 'wizhat', '$m', '$a'], ['weapon', 'staff', '#8a5a32', '#7ad8ff']] },
      { n: 'Sanadora', look: L({ hairStyle: 'largo', hair: '#e8c878', skin: '$sk', shirt: '#f4f4f4', pants: '#f4f4f4', shoes: '#c8b890', iris: '#3a8a5a' }), hit: ['beam', '#fff2c0'],
        l: [['trim', '$a'], ['hat', 'halo', '$a'], ['weapon', 'cross', '#e8dcc0', '$a']] },
    ],
    st: [{ n: 'Formación', f: [] },
      { n: 'Alba Encendida', l: [['cape', '$a', 6]], f: [['aura', '$a'], ['rise', '$a', 4]] },
      { n: 'Gloria del Mediodía', l: [['wings', 'angular', '#fff2c0', 8], ['pads', '$a'], ['trim', '#ffffff']], f: [['aura', '$a', '#fff2c0'], ['rings', '#ffe08a', 2], ['rise', '#fff2c0', 5]] }],
    shouts: ['¡Por el alba!', '¡Que el sol nos guíe!'] },

  { id: 'elfos', name: 'Elfos', place: 'Silvanos del Umbral Verde', emblem: ['🍃', '🌿'], color: '#2f8a5a',
    roles: ['frontend-expert', 'ux-designer'],
    pal: [{ m: '#2f8a5a', a: '#c8d0dc', t: '#7a5230', h: '#d9c88a', sk: '#efd0b0' }, { m: '#3a8a9a', a: '#f0e8c8', t: '#8a6a3a', h: '#e8e8f0', sk: '#e8d0b8' }],
    cls: [
      { n: 'Danzante de hojas', look: L({ hairStyle: 'coleta', hair: '$h', skin: '$sk', shirt: '$m', pants: '#5a4a2a', shoes: '#4a3a1a', iris: '#2f8a5a' }), hit: ['slash', '#a0ffc0'],
        l: [['hat', 'elfears', '$sk'], ['sash', '$a'], ['weapon', 'curved', '$a', '#8a6a3a']] },
      { n: 'Arquera', look: L({ hairStyle: 'largo', hair: '$h', skin: '$sk', shirt: '$t', pants: '$m', shoes: '#4a3a1a', iris: '#2a6a8a' }), hit: ['arrow', '#e8e0c8'],
        l: [['hat', 'elfears', '$sk'], ['vest', '$m'], ['weapon', 'bow', '#7a5230', '$a']] },
      { n: 'Druida', look: L({ hairStyle: 'largo', hair: '#6a8a4a', skin: '$sk', shirt: '#f0f0d8', pants: '#e8e8c8', shoes: '#7a5230', iris: '#2a8a5a' }), hit: ['beam', '#ffb0d8'],
        l: [['hat', 'elfears', '$sk'], ['hat', 'antlers', '$t'], ['cape', '$m', 4], ['weapon', 'staff', '#7a5230', '#ffb0d8']] }],
    st: [{ n: 'Formación', f: [] },
      { n: 'Savia Despierta', l: [['wraps', '$a']], f: [['aura', '$m'], ['orbit', 3, 'leaf', '#7af0a0', 11, 4, 1.4]] },
      { n: 'Bosque Eterno', l: [['wings', 'angular', '#7a5230', 8, '#4aba6a'], ['scarftail', '#ff9ac8', 9]], f: [['aura', '$m', '#d8ffe0'], ['orbit', 4, 'flower', '#ff9ac8', 13, 5, 1.2], ['ribbon', '#7af0d0', '#ff9ac8']] }],
    shouts: ['¡El bosque despierta!', '¡Raíces y cielo, uníos!'] },

  { id: 'enanos', name: 'Enanos', place: 'Clanes de la Forja', emblem: ['⚒', '🔨'], color: '#c8602a',
    roles: ['backend-expert', 'devops-engineer'],
    pal: [{ m: '#c8602a', a: '#6a6f7a', t: '#aab0bc', h: '#a8441e', sk: '#e0a880' }, { m: '#6a6f7a', a: '#c8a040', t: '#e8d8a0', h: '#d0d0d8', sk: '#d89870' }],
    cls: [
      { n: 'Martillador', look: L({ hairStyle: 'calvo', skin: '$sk', shirt: '$m', pants: '#3a3a44', shoes: '#2a2a30', iris: '#3a2a1a' }), hit: ['slash', '#ffd0a0'], sz: 1.05,
        l: [['beard', '$h'], ['hat', 'helm', '$a', '$t'], ['armor', '$a', '$t'], ['weapon', 'hammer', '#8a8f9a', '#c8c8d0']] },
      { n: 'Artillero', look: L({ hairStyle: 'calvo', skin: '$sk', shirt: '$a', pants: '$m', shoes: '#2a2a30', iris: '#3a2a1a' }), hit: ['shot', '#ffb02a'],
        l: [['beard', '$h'], ['goggles', '#e8b830'], ['vest', '$t'], ['weapon', 'cannon', '#5a5f6a', '#ffb02a']] },
      { n: 'Rúnico', look: L({ hairStyle: 'calvo', skin: '$sk', shirt: '$a', pants: '$m', shoes: '#2a2a30', iris: '#2a6aa8' }), hit: ['beam', '#5ac8ff'],
        l: [['beard', '$h'], ['hat', 'hood', '$m'], ['runes', '#5ac8ff'], ['weapon', 'staff', '#6a6f7a', '#5ac8ff']] }],
    st: [{ n: 'Formación', f: [] },
      { n: 'Forja Encendida', l: [['trim', '#ff8a2a']], f: [['aura', '#ff6a1a'], ['rise', '#ffb02a', 5]] },
      { n: 'Corazón de Volcán', l: [['runes', '#ff8a2a'], ['trim', '#ffd24a'], ['pads', '#ff8a2a']], sz: 1.26, f: [['aura', '#ff6a1a', '#ffd24a'], ['flames', '#ff6a1a', '#ffd24a'], ['rise', '#ffd24a', 6]] }],
    shouts: ['¡A golpe de yunque!', '¡Que arda la montaña!'] },

  { id: 'orcos', name: 'Orcos', place: 'Tribus del Colmillo', emblem: ['🦷', '🪓'], color: '#a8704a',
    roles: ['security-expert', 'qa-engineer'],
    pal: [{ m: '#8a2a1a', a: '#e8dcc0', t: '#5a3a2a', h: '#1a1410', sk: '#a8704a' }, { m: '#5a4a3a', a: '#e8dcc0', t: '#c8a040', h: '#6a3a1e', sk: '#8a6a58' }],
    cls: [
      { n: 'Berserker', look: L({ hairStyle: 'puntas', hair: '$h', skin: '$sk', shirt: '$sk', pants: '$t', shoes: '#2a1a14', iris: '#e8c030' }), hit: ['slash', '#ffffff'], sz: 1.08,
        l: [['mark', 'fangs'], ['wraps', '$a'], ['weapon', 'axes', '#c8d0dc', '$a']] },
      { n: 'Cazador', look: L({ hairStyle: 'coleta', hair: '$h', skin: '$sk', shirt: '$t', pants: '$m', shoes: '#2a1a14', iris: '#e8c030' }), hit: ['jav', '#e8dcc0'],
        l: [['mark', 'fangs'], ['vest', '$a'], ['scarftail', '$m', 6], ['weapon', 'jav', '#e8dcc0', '$m']] },
      { n: 'Chamán', look: L({ hairStyle: 'rizado', hair: '$h', skin: '$sk', shirt: '$m', pants: '$t', shoes: '#2a1a14', iris: '#7ad8ff' }), hit: ['beam', '#7ad8ff'],
        l: [['mark', 'fangs'], ['hat', 'horns', '$a'], ['cape', '$t', 5], ['weapon', 'totem', '$a', '#7ad8ff']] }],
    st: [{ n: 'Formación', f: [] },
      { n: 'Sangre Hirviente', l: [['mark', 'scar', '#c02a1a'], ['stripes', '#c02a1a']], f: [['aura', '#c02a1a'], ['mist', '#ffffff']] },
      { n: 'Furia Ancestral', l: [['eyes', '#ffffff']], sz: 1.3, f: [['aura', '#c02a1a', '#ffffff'], ['ghosts', '#e8dcc0'], ['bolts', '#ffb0a0']] }],
    shouts: ['¡Colmillos fuera!', '¡Los ancestros rugen!'] },

  { id: 'gnomos', name: 'Gnomos', place: 'Taller del Engranaje', emblem: ['⚙', '🔧'], color: '#2ab0b0',
    roles: ['data-engineer', 'postgres-dba'],
    pal: [{ m: '#b8703a', a: '#2ab0b0', t: '#8a5a2a', h: '#e8d8b0', sk: '#f0c8a8' }, { m: '#2ab0b0', a: '#b8703a', t: '#d8e8e8', h: '#c8402a', sk: '#e8b890' }],
    cls: [
      { n: 'Piloto de mecha', look: L({ hairStyle: 'puntas', hair: '$h', skin: '$sk', shirt: '$t', pants: '$t', shoes: '#3a2a1a', iris: '#2a7a8a' }), hit: ['slash', '#9ae8e8'], sz: .95,
        l: [['mech', '$m', '$t'], ['goggles', '$a'], ['weapon', 'claws', '#c8c8d0']] },
      { n: 'Artífice', look: L({ hairStyle: 'rizado', hair: '$h', skin: '$sk', shirt: '$m', pants: '$t', shoes: '#3a2a1a', iris: '#2a7a8a' }), hit: ['shot', '#2ab0b0'],
        l: [['goggles', '$a'], ['backpack', '$t'], ['weapon', 'cannon', '$t', '$a']] },
      { n: 'Alquimista', look: L({ hairStyle: 'coletas', hair: '$h', skin: '$sk', shirt: '#f0ece0', pants: '$t', shoes: '#3a2a1a', iris: '#8a2a8a' }), hit: ['beam', '#ff7ab0'],
        l: [['goggles', '$a'], ['cape', '$m', 4], ['weapon', 'flask', '$a', '#ff7ab0']] }],
    st: [{ n: 'Formación', f: [] },
      { n: 'Engranaje Vivo', l: [['trim', '$a']], f: [['orbit', 2, 'gear', '$a', 12, 4, 1.4], ['rise', '$a', 4], ['aura', '$a']] },
      { n: 'Maquinaria Maestra', l: [['pads', '$m'], ['armor', '$a', '$t']], f: [['aura', '$a', '#ffffff'], ['orbit', 3, 'drone', '#d8e8f0', 14, 5, 1.6], ['orbit', 2, 'gear', '$a', 10, 4, 1.2]] }],
    shouts: ['¡Ajustando piezas!', '¡Modo máquina total!'] },

  { id: 'bestiales', name: 'Bestiales', place: 'Manada de la Luna', emblem: ['🌙', '🐾'], color: '#5a9aff',
    roles: ['explore', 'mobile-developer'],
    pal: [{ m: '#8a7a6a', a: '#5a9aff', t: '#c8b8a0', h: '#8a7a6a', sk: '#c8a890', c2: '#d8803a', c3: '#b08a5a' }, { m: '#d8dce8', a: '#7ad8c8', t: '#8a8a9a', h: '#d8dce8', sk: '#d8c8c0', c2: '#a8b0c8', c3: '#e8dcc0' }],
    cls: [
      { n: 'Oso guardián', look: L({ hairStyle: 'calvo', skin: '$h', shirt: '$m', pants: '$t', shoes: '#3a2a1a', iris: '#2a1a0a' }), hit: ['slash', '#d8d8e0'], sz: 1.12,
        l: [['hat', 'ears', '$h', '#c8a090'], ['tail', '$h'], ['armor', '$t', '$a'], ['weapon', 'bigshield', '$t', '$a']] },
      { n: 'Zorra ilusionista', look: L({ hairStyle: 'largo', hair: '$c2', skin: '$sk', shirt: '$a', pants: '$t', shoes: '#3a2a1a', iris: '#8a2aa8' }), hit: ['star', '#bca8ff'],
        l: [['hat', 'ears', '$c2', '#fff0e0'], ['tail', '$c2'], ['weapon', 'wand', '#7a5230', '$a']] },
      { n: 'Ciervo-sanador', look: L({ hairStyle: 'corto', hair: '$c3', skin: '$sk', shirt: '#f0ece0', pants: '$t', shoes: '#3a2a1a', iris: '#2a8a5a' }), hit: ['beam', '#bcd8ff'],
        l: [['hat', 'antlers', '#e8dcc0'], ['hat', 'ears', '$c3', '#fff'], ['tail', '$c3'], ['mark', 'cheeks', '$a'], ['weapon', 'wand', '#e8dcc0', '#bcd8ff']] }],
    st: [{ n: 'Formación', f: [] },
      { n: 'Llamada de la Manada', l: [['eyes', '#ffd24a']], f: [['aura', '$a'], ['spirit', 'beast', '$a']] },
      { n: 'Espíritu de Luna Llena', l: [['eyes', '#ffd24a'], ['mark', 'fangs']], f: [['backdrop', 'moon', '#f4f0d8', '#d8d4b8'], ['spirit', 'beast', '#bcd8ff'], ['aura', '$a', '#bcd8ff']] }],
    shouts: ['¡La manada llama!', '¡Que aúlle la luna!'] },

  { id: 'draconios', name: 'Draconios', place: 'Linaje de Escamas', emblem: ['🐉', '🔥'], color: '#c8306e',
    roles: ['software-architect', 'plan'],
    pal: [{ m: '#c8306e', a: '#f0c850', t: '#6a1840', h: '#f0c850', sk: '#d8708a' }, { m: '#d8a82a', a: '#2a8a9a', t: '#8a6a1a', h: '#2a8a9a', sk: '#c8a85a' }],
    cls: [
      { n: 'Lancero dracónico', look: L({ hairStyle: 'calvo', skin: '$sk', shirt: '$m', pants: '$t', shoes: '#2a2a30', iris: '#ffd24a' }), hit: ['slash', '#ffe08a'],
        l: [['hat', 'dhorns', '$a'], ['tail', '$t'], ['armor', '$m', '$a'], ['weapon', 'lance', '#c8d0dc', '$a']] },
      { n: 'Aliento-mago', look: L({ hairStyle: 'calvo', skin: '$sk', shirt: '$t', pants: '$m', shoes: '#2a2a30', iris: '#ffd24a' }), hit: ['breath', '#7ae8ff'],
        l: [['hat', 'dhorns', '$a'], ['tail', '$t'], ['cape', '$m', 4], ['weapon', 'wand', '#8a8a96', '#7ae8ff']] },
      { n: 'Sacerdotisa de escamas', look: L({ hairStyle: 'calvo', skin: '$sk', shirt: '#f0ece0', pants: '$m', shoes: '#2a2a30', iris: '#ffd24a' }), hit: ['beam', '#fff2c0'],
        l: [['hat', 'dhorns', '$a'], ['tail', '$t'], ['trim', '$a'], ['weapon', 'staff', '$a', '#fff2c0']] }],
    st: [{ n: 'Formación', f: [] },
      { n: 'Escama Ardiente', l: [['mark', 'cheeks', '$a']], f: [['aura', '$a'], ['smoke', '#9a9aa4']] },
      { n: 'Sangre de Dragón', l: [['wings', 'angular', '$m', 9, '$a']], f: [['aura', '$a', '#ffffff'], ['spirit', 'dragon', '$m'], ['rise', '$a', 5]] }],
    shouts: ['¡Arde, escama!', '¡Despierta, sangre antigua!'] },

  { id: 'astrales', name: 'Astrales', place: 'Hijos del Cielo Nocturno', emblem: ['★', '✦'], color: '#6a4ac8',
    roles: ['general-purpose'],
    pal: [{ m: '#6a4ac8', a: '#fff2c0', t: '#1a1a4a', h: '#b8a8ff', sk: '#c8c0f0' }, { m: '#1a1a5a', a: '#9ad8ff', t: '#6a4ac8', h: '#f4f4ff', sk: '#d8d0f8' }],
    cls: [
      { n: 'Guardián estelar', look: L({ hairStyle: 'calvo', skin: '$sk', shirt: '$m', pants: '$t', shoes: '#14143a', iris: '#fff2c0' }), hit: ['slash', '#fff2c0'], sz: 1.05,
        l: [['armor', '$m', '$a'], ['pads', '$a'], ['hat', 'crest', '$m', '$a'], ['weapon', 'shield', '$t', '$a'], ['weapon', 'sword', '$a', '$a']] },
      { n: 'Astróloga', look: L({ hairStyle: 'largo', hair: '$h', skin: '$sk', shirt: '$t', pants: '$t', shoes: '#14143a', iris: '#fff2c0' }), hit: ['star', '#fff2c0'],
        l: [['cape', '$m', 6], ['hat', 'wizhat', '$t', '$a'], ['stars', '$a'], ['weapon', 'wand', '#8a8aa8', '$a']] },
      { n: 'Monje lunar', look: L({ hairStyle: 'calvo', skin: '$sk', shirt: '$m', pants: '$t', shoes: '#14143a', iris: '#fff2c0' }), hit: ['beam', '#bfe8ff'],
        l: [['wraps', '$a'], ['hat', 'crescent', '$a'], ['glowhands', '$a']] }],
    st: [{ n: 'Formación', f: [] },
      { n: 'Constelación Naciente', l: [['stars', '$a']], f: [['aura', '$m'], ['orbit', 4, 'star', '$a', 12, 5, 1.2]] },
      { n: 'Firmamento Pleno', l: [['eyes', '#ffffff']], f: [['backdrop', 'galaxy', '$m', '$a'], ['rings', '$a', 3], ['aura', '$a', '#ffffff'], ['orbit', 5, 'star', '$a', 13, 5, 1.6]] }],
    shouts: ['¡Las estrellas se alinean!', '¡Todo el cielo en nosotros!'] },
];
export const RACE_BY_ID = Object.fromEntries(RACES.map(r => [r.id, r]));
const ROLE_RACE = Object.fromEntries(RACES.flatMap(r => r.roles.map(role => [role, r.id])));

// Raza de un rol conocido (sin distinguir mayúsculas) o undefined
export const raceForRole = role => ROLE_RACE[String(role || '').toLowerCase()];

// Etapa 1, 2 y 3: la silueta crece al despertar y más en la ascensión (si la raza no fija su tamaño)
export const STAGE_SZ = [1, 1.08, 1.18];
const sizeOf = (race, cls, stage) => (cls.sz || 1) * ((race.st[stage - 1].sz) || STAGE_SZ[stage - 1]);

// ---- Hornear sprites ----------------------------------------------------------------------------------------
export const HERO_SCALE = 1.5;                 // los héroes miden unos 27 px (18 × 1,5) en la etapa 1
const tok = (v, pal) => (typeof v === 'string' && v[0] === '$' ? pal[v.slice(1)] || pal.m : Array.isArray(v) ? v.map(x => tok(x, pal)) : v);
export const palOf = (race, variant) => race.pal[variant] || race.pal[0];
const frameCache = new Map(), imgCache = new Map();
function framesOf(race, ci, variant) {
  const key = `${race.id}|${ci}|${variant}`;
  let f = frameCache.get(key);
  if (!f) {
    const pal = palOf(race, variant), look = race.cls[ci].look, o = {};
    for (const k in look) o[k] = tok(look[k], pal);
    frameCache.set(key, f = makeCharacter(o));
  }
  return f;
}
// Efectos dinámicos de una etapa (con la paleta ya aplicada)
const fxCache = new Map();
export function fxOf(race, variant, stage) {
  const key = `${race.id}|${variant}|${stage}`;
  let f = fxCache.get(key);
  if (!f) fxCache.set(key, f = tok(race.st[stage - 1].f, palOf(race, variant)));
  return f;
}
export function auraOf(race, variant, stage) { const a = fxOf(race, variant, stage).find(f => f[0] === 'aura'); return a ? a[1] : race.color; }

// Devuelve { img, ax, ay, sz }: imagen horneada y punto de apoyo (centro de los pies).
// dir: 'down' | 'up' | 'left' | 'right'; ph: 'stand' | 'a' | 'b'
export function heroSprite(race, ci, stage, variant, dir, ph) {
  const key = `${race.id}|${ci}|${stage}|${variant}|${dir}|${ph}`;
  let e = imgCache.get(key);
  if (e) return e;
  const pal = palOf(race, variant), cls = race.cls[ci];
  const layers = [...cls.l];
  for (let s = 2; s <= stage; s++) layers.push(...(race.st[s - 1].l || []));
  const v = dir === 'down' ? 'f' : dir === 'up' ? 'b' : 's', mirror = dir === 'left';
  const frames = framesOf(race, ci, variant), frame = (frames[dir] || frames.down)[ph] || frames.down.stand;
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const g = c.getContext('2d');
  const R = (x, y, w, hh, col) => { g.fillStyle = col; g.fillRect(PADX + (mirror ? 12 - x - w : x), PADY + y, w, hh); };
  const run = pass => { for (const [name, ...args] of layers) { const fn = LAYERS[name]; if (fn) fn(R, v, pass, ...tok(args, pal)); } };
  run('back');
  g.drawImage(frame, PADX, PADY);
  run('front');
  const sz = sizeOf(race, cls, stage) * HERO_SCALE;
  const s = document.createElement('canvas'); s.width = Math.round(CW * sz); s.height = Math.round(CH * sz);
  const sg = s.getContext('2d'); sg.imageSmoothingEnabled = false;
  sg.drawImage(c, 0, 0, s.width, s.height);
  e = { img: s, ax: Math.round((PADX + 6) * sz), ay: Math.round((PADY + 18) * sz), sz };
  imgCache.set(key, e);
  return e;
}
