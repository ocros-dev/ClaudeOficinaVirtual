// Registro de arte de la arena: fotogramas de héroes, reyes y enemigos, y la única función que pinta sprites.
// Horneado perezoso y troceado (scheduler.js), caché LRU de dos niveles (cache.js) y respaldos que nunca
// bloquean: si lo pedido no está listo se devuelve el mejor fotograma disponible (ready:false).
//
// API (la consumen render/, combat/ y camp/; no guardes un Frame más de un fotograma, la caché puede expulsarlo):
//   heroFrame(raceId, cls 0|1|2 (o id), stage, variant, anim, frame) -> Frame
//   kingFrame(kingId, form, anim, frame) -> Frame
//   enemyFrame(kind 'minion'|'elite', type, kingId, anim, frame) -> Frame
//   drawFrame(g, frame, x, y, { face=1, z=0, alpha=1, flash=0, tint=null })
//   prewarm(...), frameCount(kind, anim, raceId?), resolveAnim(raceId, anim), activeFrame(anim), stats(), releaseKing(id)
//   raceArt(raceId) -> definición de arte de la raza (materiales, fx, transformFx...) o null
// Frame = { img, sx, sy, w, h, ax, ay, pts, top, ready }
// Si lo pedido aún no está horneado se devuelve el último fotograma bueno de ese mismo personaje (ready:false); nunca
// una silueta de relleno. Una raza puede declarar geomVariant:true si su geometría cambia con la variante (emblema en B).

import { RACE_ART } from './races/index.js';
import { KING_ART } from './kings/index.js';
import minions from './enemies/minions.js';
import elites from './enemies/elites.js';
import maniqui from './maniqui.js';
import { KIT_VERSION, MANIQUI_MATERIALS, palette, buildPalette } from './kit16/ramps.js';
import { HERO_ANIMS, KING_ANIMS, ELITE_ANIMS, MINION_ANIMS, ACTIVE_FRAME, fallbackAnim } from './kit16/poses.js';
import { bakeHeroStrip, bakeKingStrip, bakeEnemyStrip, colorStrip, runSync } from './kit16/bake.js';
import { LruCache } from './kit16/cache.js';
import * as sched from './kit16/scheduler.js';

export { KIT_VERSION, HERO_ANIMS, KING_ANIMS, ELITE_ANIMS, MINION_ANIMS, ACTIVE_FRAME };
export const LIMITS = { idxBytes: 8 * 1048576, canvasBytes: 56 * 1048576 };

const idxCache = new LruCache(LIMITS.idxBytes);
const canvasCache = new LruCache(LIMITS.canvasBytes, { onEvict: (k, v) => { if (v && v.canvas) { v.canvas.width = 0; v.canvas.height = 0; } } });
const failed = new Set();
const bakeLog = { longest: 0, count: 0, totalMs: 0 };
const now = () => performance.now();

// ---------------------------------------------------------------------------------------------
// Utilidades
const hasAnim = art => a => !!(HERO_ANIMS[a] || (art.extraAnims && art.extraAnims[a]));
export function resolveAnim(raceId, anim) { const art = RACE_ART[raceId] || maniqui; return fallbackAnim(anim, hasAnim(art)); }
export const activeFrame = anim => ACTIVE_FRAME[anim] ?? 0;
export function frameCount(kind, anim, raceId) {
  if (kind === 'king') return KING_ANIMS[anim] || 1;
  if (kind === 'elite') return ELITE_ANIMS[anim] || 1;
  if (kind === 'minion') return MINION_ANIMS[anim] || 1;
  const art = raceId === 'maniqui' ? maniqui : RACE_ART[raceId];
  return (art && art.extraAnims && art.extraAnims[anim]) || HERO_ANIMS[anim] || 1;
}
/** Definición de arte de una raza ready (o null): efectos por etapa, materiales y rampas. */
export const raceArt = id => RACE_ART[id] || null;
const isReady = art => !!(art && art.ready && art.kit === KIT_VERSION && !failed.has(art.id));

function describe(st, canvas, ready) {
  const frames = [];
  for (let k = 0; k < st.n; k++) frames.push({ img: canvas, sx: k * st.w, sy: 0, w: st.w, h: st.h, ax: st.ax, ay: st.ay, pts: st.pts[k], top: st.top[k], ready });
  return frames;
}
function note(st) { bakeLog.count++; bakeLog.totalMs += st.ms; if (st.ms / st.n > bakeLog.longest) bakeLog.longest = st.ms / st.n; }

// ---------------------------------------------------------------------------------------------
// Héroes. Las razas sin terminar usan el maniquí con su paleta: la geometría se comparte por (cuerpo, altura, clase).
const substCache = new Map();
function subst(art) {
  let s = substCache.get(art.id);
  if (!s) {
    s = {
      id: art.id + '~m', materials: MANIQUI_MATERIALS, ramps: (v, st) => art.ramps(v, st), emit: art.emit, draw: maniqui.draw,
      extraAnims: {}, stageScale: art.stageScale, classes: art.classes.map((c, i) => ({ id: c.id, build: c.build, look: c.look, weapon: i % 3, anchors: c.anchors })),
    };
    substCache.set(art.id, s);
  }
  return s;
}
// Clave de geometría de un héroe: la variante solo entra si la raza la usa para dibujar (geomVariant)
const geomKey = (art, ready, ci, gs, a, scale, b, variant) => {
  if (!ready) return `m|${b.body}|${b.height}|${ci % 3}|${scale}|${a}`;
  return `${art.id}|${ci}|${gs}|${a}` + (art.geomVariant ? `|v${variant ? 1 : 0}` : '');
};
const clsIndex = (art, cls) => (typeof cls === 'number' ? Math.max(0, Math.min(art.classes.length - 1, cls | 0)) : Math.max(0, art.classes.findIndex(c => c.id === cls)));
let syncFrame = -1;

export function heroFrame(raceId, cls, stage = 1, variant = 0, anim = 'idle', frame = 0) {
  const art = raceId === 'maniqui' ? maniqui : RACE_ART[raceId] || RACE_ART.humanos;
  const ci = clsIndex(art, cls), ready = isReady(art), a = fallbackAnim(anim, hasAnim(art));
  const src = ready ? art : subst(art);
  const gs = art.geomStage ? art.geomStage(stage) : stage;
  const scale = (art.stageScale && art.stageScale[Math.min(art.stageScale.length, gs) - 1]) || 1;
  const b = art.classes[ci].build || {};
  const gKey = geomKey(art, ready, ci, gs, a, scale, b, variant);
  const cKey = `${gKey}|${art.id}|${variant}|${stage}`;
  const e = canvasCache.get(cKey);
  if (e) return e.frames[(frame | 0) % e.frames.length];
  enqueueHero(src, art, ci, gs, scale, a, variant, stage, gKey, cKey, ready, 0);
  // mejores sustitutos: idle de este héroe, idle síncrono (1 por fotograma de pantalla) y placeholder
  const idleG = geomKey(art, ready, ci, gs, 'idle', scale, b, variant), idleKey = `${idleG}|${art.id}|${variant}|${stage}`;
  const ie = canvasCache.get(idleKey);
  if (ie) return { ...ie.frames[0], ready: false };
  if (syncFrame !== sched.frameCounter()) {
    syncFrame = sched.frameCounter();
    const f = bakeSync(src, art, ci, gs, scale, 'idle', variant, stage, idleG, idleKey, ready);
    if (f) return { ...f.frames[0], ready: false };
  }
  return placeholder();
}

function enqueueHero(src, art, ci, gs, scale, a, variant, stage, gKey, cKey, ready, prio) {
  if (sched.has(cKey)) { sched.request(cKey, prio); return; }
  sched.request(cKey, prio, function* () {
    let st = idxCache.get(gKey);
    if (!st) { st = yield* bakeHeroStrip(src, ci, gs, a, scale, art.geomVariant ? variant : 0); note(st); idxCache.set(gKey, st, st.bytes); yield; }
    const canvas = yield* colorStrip(st, palette(src, variant, stage));
    const entry = { canvas, frames: describe(st, canvas, ready) };
    canvasCache.set(cKey, entry, st.W * st.h * 4);
  }, null, e => { onBakeError(art, e); });
}
function bakeSync(src, art, ci, gs, scale, a, variant, stage, gKey, cKey, ready) {
  try {
    let st = idxCache.get(gKey);
    if (!st) { st = runSync(bakeHeroStrip(src, ci, gs, a, scale, art.geomVariant ? variant : 0)); note(st); idxCache.set(gKey, st, st.bytes); }
    const canvas = runSync(colorStrip(st, palette(src, variant, stage)));
    const entry = { canvas, frames: describe(st, canvas, ready) };
    canvasCache.set(cKey, entry, st.W * st.h * 4);
    return entry;
  } catch (e) { onBakeError(art, e); return null; }
}
function onBakeError(art, e) {
  if (!failed.has(art.id)) { failed.add(art.id); console.error(`kit16: el arte de «${art.id}» falló al hornear; se usa el maniquí.
` + (e && e.stack || e)); }
}

let ph = null;
function placeholder() {
  if (ph) return ph;
  const c = document.createElement('canvas'); c.width = 24; c.height = 40;
  const g = c.getContext('2d'); g.fillStyle = '#0a0810'; g.fillRect(4, 0, 16, 40); g.fillStyle = '#6a7090'; g.fillRect(5, 1, 14, 38);
  return (ph = { img: c, sx: 0, sy: 0, w: 24, h: 40, ax: 12, ay: 39, pts: {}, top: 40, ready: false });
}

// ---------------------------------------------------------------------------------------------
// Reyes y enemigos
const pals = new Map();
function palFor(key, art, arg) {
  let p = pals.get(key);
  if (!p) pals.set(key, p = buildPalette(art.materials, art.ramps(arg), art.emit ? art.emit(arg) : undefined));
  return p;
}

// Pósters: un fotograma de reposo por personaje, horneado de forma síncrona (≈ 10 ms el del rey, < 1 ms el de un enemigo) y
// guardado FUERA de la caché LRU, así nunca se expulsa. Son el respaldo mientras se hornea lo pedido: el rey y los
// enemigos no quedan nunca invisibles aunque la cola esté llena o la caché haya soltado sus tiras.
const posters = new Map();
const EMPTY = { img: null, sx: 0, sy: 0, w: 0, h: 0, ax: 0, ay: 0, pts: {}, top: 0, ready: false };
function poster(key, make) {
  let f = posters.get(key);
  if (!f) { try { f = make(); } catch (e) { f = null; console.error('kit16: póster «' + key + '» falló', e && e.stack || e); } if (f) posters.set(key, f); }
  return f;
}
const unready = f => (f ? { ...f, ready: false } : EMPTY);
function kingPoster(art, kingId, form) {
  return poster(`k|${kingId}|${form}`, () => {
    const st = runSync(bakeKingStrip(art, form, 'idle', 0)), canvas = runSync(colorStrip(st, palFor(`k|${kingId}|${form}`, art, form)));
    return describe(st, canvas, true)[0];
  });
}
// Póster de cualquier forma del rey (la actual si existe; si no, la más reciente que haya)
function anyKingPoster(kingId, form) {
  return posters.get(`k|${kingId}|${form}`) || posters.get(`k|${kingId}|${form - 1}`) || posters.get(`k|${kingId}|${form + 1}`) || posters.get(`k|${kingId}|1`) || posters.get(`k|${kingId}|2`) || posters.get(`k|${kingId}|3`);
}
function enemyPoster(art, kind, type, kingId) {
  return poster(`e|${kind}|${type}|${kingId}`, () => {
    const st = runSync(bakeEnemyStrip(art, kind, type, 'idle')), canvas = runSync(colorStrip(st, palFor(`e|${kind}|${kingId}`, art, kingId)));
    return describe(st, canvas, true)[0];
  });
}

function requestKing(art, kingId, form, anim, prio) {
  const gKey = `king|${kingId}|${form}|${anim}`;
  sched.request(gKey, prio, function* () {
    const st = yield* bakeKingStrip(art, form, anim); note(st); yield;
    const canvas = yield* colorStrip(st, palFor(`k|${kingId}|${form}`, art, form));
    canvasCache.set(gKey, { canvas, frames: describe(st, canvas, true) }, st.W * st.h * 4);
  }, null, e2 => onBakeError(art, e2));
}

export function kingFrame(kingId, form = 1, anim = 'idle', frame = 0) {
  const art = KING_ART[kingId];
  form = Math.max(1, Math.min(3, form | 0 || 1)); if (!KING_ANIMS[anim]) anim = 'idle';
  if (!isReady(art)) return unready(anyKingPoster(kingId, form));
  const e = canvasCache.get(`king|${kingId}|${form}|${anim}`);
  if (e) return e.frames[(frame | 0) % e.frames.length];
  requestKing(art, kingId, form, anim, -1);                         // lo del rey actual va antes que cualquier prehorneado
  const ie = canvasCache.get(`king|${kingId}|${form}|idle`);        // idle de esta forma; si no, el póster; si no, el de otra forma
  if (ie) return { ...ie.frames[0], ready: false };
  return unready(posters.get(`k|${kingId}|${form}`) || anyKingPoster(kingId, form) || kingPoster(art, kingId, form));
}

function requestEnemy(art, kind, type, anim, kingId, prio) {
  const gKey = `en|${kind}|${type}|${anim}`, cKey = `${gKey}|${kingId}`;
  sched.request(cKey, prio, function* () {
    let st = idxCache.get(gKey);
    if (!st) { st = yield* bakeEnemyStrip(art, kind, type, anim); note(st); idxCache.set(gKey, st, st.bytes); yield; }
    const canvas = yield* colorStrip(st, palFor(`e|${kind}|${kingId}`, art, kingId));
    canvasCache.set(cKey, { canvas, frames: describe(st, canvas, true) }, st.W * st.h * 4);
  }, null, e2 => onBakeError(art, e2));
}

export function enemyFrame(kind, type, kingId, anim, frame = 0) {
  const art = kind === 'elite' ? elites : minions, animSet = kind === 'elite' ? ELITE_ANIMS : MINION_ANIMS;
  if (!animSet[anim]) anim = 'idle';
  if (!isReady(art)) return EMPTY;
  const gKey = `en|${kind}|${type}|${anim}`, cKey = `${gKey}|${kingId}`, e = canvasCache.get(cKey);
  if (e) return e.frames[(frame | 0) % e.frames.length];
  requestEnemy(art, kind, type, anim, kingId, -1);
  const ie = canvasCache.get(`en|${kind}|${type}|idle|${kingId}`);
  return ie ? { ...ie.frames[0], ready: false } : unready(enemyPoster(art, kind, type, kingId));
}

/** Descarta las tiras de un rey (kingDie + CALM_MS): es el mayor consumidor de memoria. */
export function releaseKing(kingId) { for (const k of [...posters.keys()]) if (k.startsWith(`k|${kingId}|`)) posters.delete(k); sched.cancel(`king|${kingId}`); canvasCache.dropPrefix(`king|${kingId}|`); idxCache.dropPrefix(`king|${kingId}|`); }

// ---------------------------------------------------------------------------------------------
// Prehorneado
const GROUPS = {
  open: [['idle', 1], ['walk', 1]],
  join: [['walk', 1], ['run', 1], ['idle', 1], ['atk1', 1], ['atk2', 1], ['atk3', 1], ['charge', 1], ['fire', 1], ['cast', 1], ['hit', 1], ['block', 1],
    ['launched', 2], ['victory', 2], ['transform', 2], ['kick', 2]],
  camp: [['idle', 1], ['walk', 1], ['sit', 1], ['sleep', 1], ['eat', 1]],
  next: [['idle', 2], ['transform', 2], ['walk', 2], ['atk1', 2], ['atk2', 2], ['atk3', 2], ['cast', 2], ['fire', 2]],
  all: Object.keys(HERO_ANIMS).map(a => [a, 2]),
};
/**
 * prewarm({ race, cls?, stage, variant, group: 'open'|'join'|'camp'|'next'|'all', anims?, prio? })
 * prewarm({ king, form, prio? }). También acepta (raceId, cls, stage, variant, group).
 * cls omitido o null = las 3 clases.
 */
export function prewarm(a, ...rest) {
  const o = typeof a === 'object' && a ? a : { race: a, cls: rest[0], stage: rest[1], variant: rest[2], group: rest[3] };
  if (o.king) {
    const form = o.form || 1, p = o.prio ?? 1;
    const art = KING_ART[o.king];
    if (isReady(art) && p <= 0) kingPoster(art, o.king, form);        // spawn y cambio de forma: póster síncrono, una vez
    kingFrame(o.king, form, 'idle', 0);
    if (isReady(art)) for (const an of Object.keys(KING_ANIMS)) {
      const gKey = `king|${o.king}|${form}|${an}`;
      if (an === 'idle' || canvasCache.has(gKey)) continue;
      requestKing(art, o.king, form, an, p + 1);
    }
    // secuaces y élites del rey: reposo y movimiento ya, el resto después (así no aparecen vacíos al entrar)
    for (const [kind, ea, set] of [['minion', minions, MINION_ANIMS], ['elite', elites, ELITE_ANIMS]]) if (isReady(ea)) {
      for (const t of ea.types) for (const an of Object.keys(set)) {
        if (!canvasCache.has(`en|${kind}|${t.id}|${an}|${o.king}`)) requestEnemy(ea, kind, t.id, an, o.king, p + (an === 'idle' || an === 'move' ? 0 : 2));
      }
    }
    return;
  }
  const art = o.race === 'maniqui' ? maniqui : RACE_ART[o.race]; if (!art) return;
  const stage = o.stage || 1, variant = o.variant || 0, list = o.anims ? o.anims.map(x => [x, o.prio ?? 1]) : GROUPS[o.group || 'open'] || GROUPS.open;
  const classes = o.cls === undefined || o.cls === null ? art.classes.map((_, i) => i) : [clsIndex(art, o.cls)];
  const ready = isReady(art), src = ready ? art : subst(art);
  const gs = art.geomStage ? art.geomStage(stage) : stage, scale = (art.stageScale && art.stageScale[Math.min(art.stageScale.length, gs) - 1]) || 1;
  for (const [an, pr] of list) for (const ci of classes) {
    if (!hasAnim(art)(an)) continue;
    const b = art.classes[ci].build || {};
    const gKey = geomKey(art, ready, ci, gs, an, scale, b, variant);
    const cKey = `${gKey}|${art.id}|${variant}|${stage}`;
    if (canvasCache.has(cKey)) continue;
    enqueueHero(src, art, ci, gs, scale, an, variant, stage, gKey, cKey, ready, o.prio ?? pr);
  }
}

// ---------------------------------------------------------------------------------------------
// Dibujo: única función que pinta sprites
let aux = null;
function auxCanvas(w, h) {
  if (!aux) aux = document.createElement('canvas');
  if (aux.width < w) aux.width = w;
  if (aux.height < h) aux.height = h;
  return aux;
}
/**
 * Pinta un Frame con los pies en (x, y). face -1 refleja; z eleva (la sombra la pinta la escena);
 * flash 0..1 superpone luz blanca sobre la silueta (lo autoriza el limitador de destellos del director; se acota por tamaño);
 * tint = color o { color, a } superpone un tinte sobre la silueta.
 */
export function drawFrame(g, f, x, y, { face = 1, z = 0, alpha = 1, flash = 0, tint = null } = {}) {
  if (!f || !f.img || !f.img.width) return;
  const px = Math.round(x), py = Math.round(y - z), prev = g.imageSmoothingEnabled;
  // Un destello es una pincelada de luz, no una silueta: cuanto mayor es el sprite, menos opaco puede ser (rey ≤ 0,22)
  const area = f.w * f.h;
  if (flash > 0) flash = Math.min(flash, area > 40000 ? .22 : area > 14000 ? .4 : 1);
  g.imageSmoothingEnabled = false;
  if (alpha !== 1) g.globalAlpha = alpha;
  g.save();
  g.translate(px, py);
  if (face < 0) g.scale(-1, 1);
  g.drawImage(f.img, f.sx, f.sy, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
  const over = [];
  if (flash > 0) over.push(['#ffffff', Math.min(1, flash)]);
  if (tint) over.push(typeof tint === 'string' ? [tint, .5] : [tint.color, tint.a ?? .5]);
  for (const [color, a] of over) {
    const c = auxCanvas(f.w, f.h), ag = c.getContext('2d');
    ag.globalCompositeOperation = 'source-over'; ag.clearRect(0, 0, f.w, f.h);
    ag.drawImage(f.img, f.sx, f.sy, f.w, f.h, 0, 0, f.w, f.h);
    ag.globalCompositeOperation = 'source-in'; ag.fillStyle = color; ag.fillRect(0, 0, f.w, f.h);
    ag.globalCompositeOperation = 'source-over';
    g.globalAlpha = (alpha !== 1 ? alpha : 1) * a;
    g.drawImage(c, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
  }
  g.restore();
  g.globalAlpha = 1; g.imageSmoothingEnabled = prev;
}

// ---------------------------------------------------------------------------------------------
// Depuración y control
export const setCombat = sched.setCombat;
export const setBudgets = sched.setBudgets;
/** Avanza el horneado manualmente (si se llamó a manual(true)). */
export const pump = sched.pump;
export const manual = sched.setManual;
export function stats() {
  const i = idxCache.stats(), c = canvasCache.stats();
  return { idxMB: i.mb, canvasMB: c.mb, strips: c.entries, idxStrips: i.entries, queue: sched.pending(), longestBakeMsPerFrame: +bakeLog.longest.toFixed(2),
    bakes: bakeLog.count, avgBakeMs: bakeLog.count ? +(bakeLog.totalMs / bakeLog.count).toFixed(2) : 0, longestStepMs: +sched.stats.longestStep.toFixed(2), dropped: sched.stats.dropped, posters: posters.size, failed: [...failed] };
}
export const _internals = { idxCache, canvasCache, RACE_ART, KING_ART, maniqui, subst, failed, elites, minions, posters };
