// Zona de descanso de la arena (paquete CAMP-L): un campamento al pie de la escena, separado del combate por una empalizada
// con una puerta por donde las parties salen a luchar y vuelven a descansar.
// Cada agente que no trabaja es un «camper»: 3 héroes de su raza (vista lateral, poses 16 bits vía el registro de arte) que
// van de actividad en actividad: caminan entre paradas, se sientan a comer, conversan mirándose, entrenan con sus animaciones
// de ataque reales y duermen. Las actividades y sus recorridos están en acts.js; el mobiliario, en props.js.
// Con prefers-reduced-motion todo queda quieto en la primera parada, sin saltos, flotación ni chispas animadas.
import { GATE_X, FENCE_Y, CAMP_SLOTS } from '../config.js';
import { reduced } from '../util.js';
import { heroFrame, drawFrame } from '../render/links.js';
import { ACTS, CHAT, pickAct, POSE_ANIM, frameOf, stopOf, actLabel } from './acts.js';
import { drawProp, drawOverlay, drawHeld, drawLog } from './props.js';

export { drawCampBackground, drawCampLive } from './props.js';

const SPEED = 80;                                            // px/s al cambiar de sitio dentro del campamento
const LEAVE_SPEED = 130;                                     // px/s al salir por la puerta
const ACT_MS = [10000, 18000];                               // duración de cada actividad
const FADE_MS = 500;
const GHOST_MS = 240;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sgn = v => (v < 0 ? -1 : 1);
const rn = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Puestos de descanso: la tabla vive en config.js (CAMP_SLOTS), única fuente de verdad (también la lee props.js)
export const slotBase = i => ({ x: CAMP_SLOTS[i][0], y: CAMP_SLOTS[i][1] });
export const actName = c => (c.act ? actLabel(c.act.kind, c.race) : '');

// ---- Campers: la party de un agente en reposo ----------------------------------------------------------------------
const applyStop = (c, h, i, s) => {
  const b = slotBase(c.cs);
  h.stop = s; h.tx = b.x + s[0]; h.ty = b.y + s[1]; h.face = s[2]; h.pose = s[3];
};
const stopNow = (c, i, now) => (reduced() ? ACTS[c.act.kind].route[i][0] : stopOf(c.act.kind, i, now - c.act.t0));

function startAct(c, now, first) {
  const kind = pickAct(c.race, c.act && c.act.kind), dur = rnd(...ACT_MS);
  if (!first && c.act) c.prev = { kind: c.act.kind, until: now + FADE_MS };
  // Al llegar al campamento cada party va por un punto distinto de su actividad, para que no cambien todas a la vez
  c.act = { kind, t0: now, dur, end: now + dur * (first ? rnd(.4, 1) : 1) };
  c.h.forEach(h => { h.stop = null; h.trail.length = 0; });
}
// Fuerza una actividad concreta (para probar y depurar desde la consola; las reglas no lo usan)
export function forceAct(c, kind, now, ms = 60000) {
  c.prev = null; c.act = { kind, t0: now, dur: ms, end: now + ms };
  c.h.forEach(h => { h.stop = null; h.trail.length = 0; });
  retarget(c, now, false);
}
// from: posiciones absolutas de los 3 héroes (al volver del combate) o null para entrar por la puerta
export function makeCamper(a, info, now, from) {
  const c = { name: a.name, base: info.base, race: info.race, variant: info.variant, seed: info.seed, cs: null, act: null, prev: null, chat: null, spk: 0, nextChat: now + rnd(1500, 4500), view: null, h: [] };
  for (let i = 0; i < 3; i++) {
    c.h.push({ x: from ? from[i].x : GATE_X + (i - 1) * 16, y: from ? from[i].y : FENCE_Y + 2, tx: 0, ty: 0, look: 1, face: 1, pose: 'stand', moving: false, fast: false,
      sd: i * 370 + info.seed * 13, top: 0, stop: null, arr: 0, wait: from ? 0 : now + i * 280, trail: [], lastTrail: 0 });
  }
  return c;
}
// Coloca a los héroes en el puesto: al empezar (o al cambiar de actividad) caminan a su sitio
export function assignSlot(c, slot, now, snap) {
  c.cs = slot; c.leaving = false; c.gone = false;
  startAct(c, now, true);
  retarget(c, now, snap);
}
function retarget(c, now, snap) {
  c.h.forEach((h, i) => {
    applyStop(c, h, i, stopNow(c, i, now));
    if (snap) { h.x = h.tx; h.y = h.ty; h.look = h.face; h.wait = 0; }
  });
}
// Un grupo que cede su puesto a una party que vuelve del combate: sale caminando por la puerta y se desvanece al cruzarla
export function dismiss(c) {
  c.leaving = true; c.gone = false; c.view = null; c.chat = null; c.prev = null;
  const now = performance.now();
  c.h.forEach((h, i) => { h.tx = GATE_X + (i - 1) * 8; h.ty = FENCE_Y - 8; h.pose = 'stand'; h.wait = now + i * 160; h.trail.length = 0; });
}
function step(h, dt, speed, now) {
  const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
  if (d < 1.2 || reduced()) { if (h.moving) h.arr = now; h.x = h.tx; h.y = h.ty; h.moving = false; h.fast = false; return false; }
  const k = Math.min(1, speed * dt / d); h.x += dx * k; h.y += dy * k; h.moving = true; h.fast = speed > 200;
  if (Math.abs(dx) > 1) h.look = dx > 0 ? 1 : -1;
  return true;
}
const faceTo = (h, o) => { if (Math.abs(o.x - h.x) > 6) h.look = o.x > h.x ? 1 : -1; };

// ---- Transición campamento → batalla: los héroes se levantan (con un pequeño escalonado) antes de salir andando por la puerta ----
// El grupo sigue siendo un camper mientras dura: reglas (rules.js) lo retira cuando c.rise.end llega y entonces nace la party.
const RISE_GAP = 100, RISE_SIT = 120, RISE_UP = 140;          // ms entre héroes, preparación sentado y salto de incorporarse
const RISE_MS = 2 * RISE_GAP + RISE_SIT + RISE_UP;
// Devuelve false si no hay nada que animar (movimiento reducido): rules sale directamente
export function beginRise(c, now) {
  if (reduced() || !c.h.length || c.cs === null) return false;
  c.rise = { t0: now, end: now + RISE_MS };
  c.chat = null; c.nextChat = now + 1e9;
  c.h.forEach(h => { h.tx = h.x; h.ty = h.y; h.moving = false; h.fast = false; h.trail.length = 0; });
  return true;
}
// El agente dejó de trabajar antes de salir: vuelve a su actividad
export function endRise(c, now) {
  c.rise = null; c.nextChat = now + 2500;
  c.act.end = now;                                              // elige otra actividad en el siguiente paso
  c.h.forEach(h => { h.pose = 'stand'; });
}
// Postura de un héroe mientras se levanta: null = todavía en lo suyo (le toca más tarde)
function riseLook(c, i, now) {
  const t = now - c.rise.t0 - i * RISE_GAP;
  if (t < 0) return null;
  if (t < RISE_SIT) return { anim: 'sit', frame: 0 };            // se echa hacia delante
  const q = (t - RISE_SIT) / RISE_UP;
  return { anim: 'idle', frame: 0, dy: q < 1 ? Math.round(Math.sin(q * Math.PI) * 8) : 0 };   // y se incorpora con un saltito
}
function viewOfCamper(c) {
  let minX = 1e9, maxX = -1e9, top = 1e9, bottom = 0;
  for (const h of c.h) {
    minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x); bottom = Math.max(bottom, h.y);
    top = Math.min(top, h.y - (h.top || (h.pose === 'lie' && !h.moving ? 30 : 60)));
  }
  c.view = { cx: (minX + maxX) / 2, top, minX: minX - 20, maxX: maxX + 20, bottom };
}

export function updateCamper(c, now, dt) {
  if (c.rise) { c.chatPos = null; viewOfCamper(c); return; }
  if (c.leaving && !c.gone) {
    let far = false;
    for (const h of c.h) { if (now < h.wait) { far = true; continue; } if (step(h, dt, LEAVE_SPEED, now)) far = true; }
    if (!far) c.gone = true;
    return;
  }
  if (c.cs === null) return;
  const rm = reduced(), b = slotBase(c.cs);
  if (now >= c.act.end) {
    startAct(c, now, false); retarget(c, now, false);
    c.nextChat = Math.max(c.nextChat, now + 900);
  }
  const kind = c.act.kind, A = ACTS[kind], t = now - c.act.t0;
  c.h.forEach((h, i) => {
    if (now < h.wait) return;                                  // entra por la puerta de uno en uno
    if (kind === 'play' && !rm) {                              // corretean en círculo alrededor del puesto
      const a = now * .0017 + i * 2.1;
      h.x = b.x + Math.cos(a) * 50; h.y = b.y + Math.sin(a) * 12 - 4;
      h.look = Math.sin(a) > 0 ? -1 : 1; h.moving = true; h.fast = false; return;
    }
    if (!rm && A.route[i].length > 1) { const s = stopOf(kind, i, t); if (s !== h.stop) applyStop(c, h, i, s); }
    if (!step(h, dt, A.speed || SPEED, now)) h.look = h.face;
    if (h.fast && !rm && now - h.lastTrail > 35) { h.lastTrail = now; h.trail.push({ x: h.x, y: h.y, t: now, look: h.look }); if (h.trail.length > 5) h.trail.shift(); }
    while (h.trail.length && now - h.trail[0].t > GHOST_MS) h.trail.shift();
  });
  if (c.prev && now > c.prev.until) c.prev = null;
  if (c.chat && now > c.chat.until) c.chat = null;
  if (!c.chat && now >= c.nextChat) {
    const pool = CHAT[kind];
    let hero = Math.floor(Math.random() * 3);
    if (kind === 'talk' && hero === c.spk) hero = (hero + 1 + Math.floor(Math.random() * 2)) % 3;    // en una charla se turnan
    c.chat = { text: pool[Math.floor(Math.random() * pool.length)], hero, until: now + 2400, at: now };
    c.spk = hero;
    c.nextChat = now + (kind === 'talk' ? rnd(2500, 3600) : rnd(4500, 9000));
  }
  // Conversación: los que están quietos se giran hacia quien habla; el que habla mira a sus compañeros
  if (A.turn && !rm) {
    const sp = c.chat ? c.chat.hero : A.turn === 'talk' ? c.spk : -1;
    if (sp >= 0) c.h.forEach((h, i) => {
      if (h.moving || now < h.wait) return;
      if (i !== sp) faceTo(h, c.h[sp]);
      else if (A.turn === 'talk') { let n = null, nd = 1e9; c.h.forEach((o, j) => { const d = j === i ? 1e9 : Math.abs(o.x - h.x); if (d < nd) { nd = d; n = o; } }); if (n) faceTo(h, n); }
    });
  }
  viewOfCamper(c);
  const sp = c.chat && c.h[c.chat.hero];
  c.chatPos = sp ? { x: sp.x, y: sp.y - (sp.top || 60) - 6 } : null;
}

// ---- Dibujo de los héroes en reposo (poses del registro de arte) ---------------------------------------------------------
// Salto de ánimo (px hacia arriba): al empezar a hablar y en los momentos sincronizados de la actividad (golpe, brindis...)
const hopOf = (ms, dur, h) => (ms >= 0 && ms < dur ? Math.round(Math.sin(ms / dur * Math.PI) * h) : 0);
function cheer(c, i, h, now, A) {
  let up = 0;
  if (c.chat && c.chat.hero === i) {
    const q = now - c.chat.at;
    up = hopOf(q, 300, 5);
    if (A.turn === 'talk') up = Math.max(up, hopOf(q - 1100, 300, 4));          // gesticula una segunda vez
  }
  if (A.hop) {
    const [P, start, dur, who, clock] = A.hop;
    if (who === 'all' || (h.pose === 'watch' || h.pose === 'stand')) {
      const q = ((clock === 'h0' ? now + c.h[0].sd : now - c.act.t0) + i * 90) % P;
      up = Math.max(up, hopOf(q - start, dur, 6));
    }
  }
  return up;
}
// Animación, fotograma, mirada y objeto en la mano de un héroe en este instante
function look(c, i, h, now, rm) {
  if (c.rise) { const q = riseLook(c, i, now); if (q) return { anim: q.anim, frame: q.frame, item: null, ix: 0, iy: 0, flip: false, dx: 0, dy: q.dy || 0 }; }
  const kind = c.act.kind, A = ACTS[kind], t = now + h.sd, u = P => (t % P) / P, s = h.look || 1;
  const r = { anim: POSE_ANIM[h.pose] || 'idle', frame: null, item: null, ix: 0, iy: 0, flip: false, dx: 0, dy: 0 };
  if (h.moving) { r.anim = h.fast ? 'run' : h.pose === 'play' ? 'run' : 'walk'; return r; }
  switch (h.pose) {
    case 'eat': { const k = Math.floor(t / 700) % 3; if (k < 2) { r.item = 'leg'; r.ix = s * 10; r.iy = k ? -36 : -28; } break; }
    case 'drink': { const q = u(2600); r.item = 'mug'; r.ix = s * 10; r.iy = rm ? -32 : q < .3 ? -52 : -28; break; }
    case 'read': r.item = 'book'; r.iy = -24; r.flip = !rm && Math.floor(t / 2400) % 2; break;      // sentados, el libro va sobre el regazo
    case 'lift': {
      const q = u(2400); r.item = 'stone';
      r.iy = q < .15 ? -36 : q < .5 ? -36 - (q - .15) / .35 * 40 : q < .75 ? -76 : -76 + (q - .75) / .25 * 40;
      r.frame = q < .15 ? 0 : q < .5 ? 1 : q < .75 ? 2 : 1;
      if (rm) r.iy = -76; break;
    }
    case 'swing': case 'hammer': {                              // ciclo de 900 ms (el mobiliario sacude el muñeco y echa chispas a la vez)
      const P = 900, n = Math.floor(t / P), ms = t % P, hammer = h.pose === 'hammer';
      r.anim = hammer ? 'atk1' : ['atk1', 'atk2', 'atk1', 'atk3'][n % 4];
      if (ms < 390) { r.frame = Math.min(2, Math.floor(ms / 130)); r.dx = s * Math.round(Math.sin(clamp((ms - 30) / 330, 0, 1) * Math.PI) * (hammer ? 3 : n % 4 === 3 ? 12 : 8)); }
      else r.anim = 'idle';
      break;
    }
    case 'spar': {                                              // ciclo de 1400 ms: ataca uno y el otro recibe, y al revés
      if (i > 1) break;
      const ph = (u(1400) - (i ? .5 : 0) + 1) % 1, ms = ph * 1400;
      if (ph < .5 && ms < 390) { r.anim = 'atk2'; r.frame = Math.min(2, Math.floor(ms / 130)); r.dx = s * Math.round(Math.sin(clamp((ms - 30) / 330, 0, 1) * Math.PI) * 10); }
      else if (ph >= .69 && ph < .9) { r.anim = ph < .78 ? 'hit' : 'idle'; r.frame = 0; if (r.anim === 'hit') r.dx = -s * Math.round(Math.sin((ph - .69) / .09 * Math.PI) * 6); }
      else r.anim = 'idle';
      break;
    }
    case 'shoot': {                                             // ciclo de 2000 ms desde el inicio de la actividad (la flecha del mobiliario vuela entre .22 y .42)
      const q = ((now - c.act.t0) % 2000) / 2000;
      if (q >= .04 && q < .22) { r.anim = 'fire'; r.frame = 0; } else if (q >= .22 && q < .4) { r.anim = 'fire'; r.frame = 1; } else r.anim = 'idle';
      break;
    }
    case 'cast': { const q = u(2400); if (q > .1 && q < .5) { r.anim = 'cast'; r.frame = Math.min(3, Math.floor((q - .1) / .4 * 4)); } else r.anim = 'idle'; break; }
    case 'tinker': { const q = u(1800 + i * 300); r.anim = q < .2 ? 'atk1' : 'idle'; if (q < .2) r.frame = Math.min(2, Math.floor(q * 1800 / 130)); break; }
    case 'dash': {                                              // sparring relámpago: tras cada relámpago, un golpe y vuelta a la guardia
      const ms = now - h.arr;
      if (h.arr && ms < 390) { r.anim = i ? 'atk1' : 'atk2'; r.frame = Math.min(2, Math.floor(ms / 130)); r.dx = s * Math.round(Math.sin(clamp(ms / 390, 0, 1) * Math.PI) * 8); } else r.anim = 'idle';
      break;
    }
    case 'sit': if (!rm && c.race.id === 'astrales' && kind === 'meditate') r.dy = 12 + Math.round(Math.sin(now / 900 + i * 1.7) * 3); break;   // meditan flotando
  }
  if (rm && (r.anim.startsWith('atk') || r.anim === 'hit')) { r.anim = 'idle'; r.frame = null; r.dx = 0; }
  if (!rm) r.dy += cheer(c, i, h, now, A);
  return r;
}
function drawHero(g, c, i, now, rm) {
  const h = c.h[i], a = look(c, i, h, now, rm), id = c.race.id;
  const f = heroFrame(id, i, 1, c.variant, a.anim, a.frame != null ? a.frame : frameOf(a.anim, now, h.sd));
  const x = Math.round(h.x), y = Math.round(h.y);
  const al = clamp((h.y - (FENCE_Y - 6)) / 24, 0, 1);               // se desvanece al cruzar la puerta
  if (al <= 0) return;
  h.top = f.top || 0;
  if (h.fast && !rm) {                                              // imágenes residuales del relámpago
    const ghost = heroFrame(id, i, 1, c.variant, 'run', 1);
    for (const q of h.trail) drawFrame(g, ghost, q.x, q.y, { face: q.look, alpha: .3 * (1 - (now - q.t) / GHOST_MS), tint: c.race.color });
  }
  g.globalAlpha = .3 * al; g.fillStyle = '#000'; g.fillRect(x - 14, y - 2, 28, 4); g.globalAlpha = 1;
  const kind = c.act ? c.act.kind : '';
  const rising = c.rise && now - c.rise.t0 - i * RISE_GAP >= 0;
  if (!h.moving && !rising && (kind === 'fire' || kind === 'read') && (h.pose === 'sit' || h.pose === 'read' || h.pose === 'eat' || h.pose === 'drink')) drawLog(g, x, y + 2);
  const up = Math.round(a.dy || 0);
  drawFrame(g, f, x + (a.dx || 0), y - up, { face: h.look || 1, alpha: al });
  if (a.item) drawHeld(g, a.item, x + (a.dx || 0), y - up, a.ix, a.iy, now, a.flip);
}

// ---- Chispas de los Tempestarios (efecto, no mobiliario): meditan entre chispas y se persiguen a la velocidad del rayo ------
function bolt(g, x, y, seed, col) {
  let px = x, py = y;
  for (let k = 0; k < 4; k++) {
    g.fillStyle = k % 2 ? '#ffffff' : col; g.fillRect(Math.round(px), Math.round(py), 2, 2);
    px += (rn(seed + k * 3) - .5) * 10; py += (rn(seed + k * 5 + 1) - .3) * 8;
  }
}
function stormFx(g, c, now, rm, kind) {
  const col = c.race.color;
  c.h.forEach((h, i) => {
    if (h.moving || h.fast) return;
    if (kind === 'stormspar' && i === 2 || kind !== 'stormspar') {
      if (rm) { g.fillStyle = col; g.fillRect(Math.round(h.x - 14), Math.round(h.y - 44), 2, 2); g.fillStyle = '#fff'; g.fillRect(Math.round(h.x + 12), Math.round(h.y - 30), 2, 2); return; }
      const n = Math.floor(now / 90);
      for (let k = 0; k < 2; k++) {
        if (rn(n * 7 + i * 31 + k * 11) < .35) continue;
        const a = rn(n + i * 17 + k * 5) * 6.28, rr = 12 + rn(n * 3 + k) * 10;
        bolt(g, h.x + Math.cos(a) * rr, h.y - 30 + Math.sin(a) * 18, n * 13 + i * 7 + k, k ? '#bfa8ff' : col);
      }
    }
  });
  if (kind === 'stormspar' && !rm) {                                // chispazo en el choque de cada relámpago
    const [h0, h1] = c.h, ms = now - Math.max(h0.arr, h1.arr);
    if (h0.arr && !h0.moving && !h1.moving && ms > 100 && ms < 380) {
      const k = (ms - 100) / 280, mx = (h0.x + h1.x) / 2, my = h0.y - 34;
      g.globalAlpha = 1 - k;
      for (let n = 0; n < 8; n++) { const a = n * .785 + .3; g.fillStyle = n % 2 ? '#fff' : col; g.fillRect(Math.round(mx + Math.cos(a) * (4 + k * 22)), Math.round(my + Math.sin(a) * (3 + k * 14)), 3, 3); }
      g.fillStyle = '#fff'; g.fillRect(Math.round(mx - 1), Math.round(my - 12 * (1 - k)), 2, Math.round(24 * (1 - k)));
      g.globalAlpha = 1;
    }
  }
}
const STORM_KINDS = new Set(['meditate', 'stormspar', 'spells']);

// Añade a la lista de dibujo los elementos de la party en reposo (cada héroe y objeto con su profundidad)
export function camperItems(c, now, items, g) {
  const rm = reduced();
  if (c.leaving) { if (!c.gone) c.h.forEach((h, i) => items.push({ y: h.y, draw: () => drawHero(g, c, i, now, rm) })); return; }
  if (c.cs === null || !c.act) return;
  const b = slotBase(c.cs);
  const push = (kind, alpha) => {
    if (alpha <= 0) return;
    items.push({ y: b.y + (kind === 'table' || kind === 'gears' ? 0 : kind === 'sleep' ? -16 : -2), draw: () => { g.globalAlpha = alpha; drawProp(g, kind, c, b.x, b.y, now, rm); g.globalAlpha = 1; } });
    items.push({ y: b.y + 80, draw: () => { g.globalAlpha = alpha; drawOverlay(g, kind, c, b.x, b.y, now, rm); g.globalAlpha = 1; } });
  };
  if (c.prev) push(c.prev.kind, Math.max(0, (c.prev.until - now) / FADE_MS));
  push(c.act.kind, c.rise ? Math.max(0, 1 - (now - c.rise.t0) / (RISE_MS * .8)) : Math.min(1, (now - c.act.t0) / FADE_MS));
  c.h.forEach((h, i) => items.push({ y: h.y + (c.act.kind === 'play' ? 0 : .2 * i), draw: () => drawHero(g, c, i, now, rm) }));
  if (c.race.id === 'tempestarios' && STORM_KINDS.has(c.act.kind) && c.view) items.push({ y: b.y + 81, draw: () => stormFx(g, c, now, rm, c.act.kind) });
}
