// Oficina virtual — bucle principal: estado en vivo, movimiento, dibujo y panel.
import { makeCharacter, ANIME_PRESETS } from './sprites.js';
import {
  TS, W, H, ROOMS, DESKS, GUEST_DESKS, PROPS, SPOTS, ENTRANCE, corridorTiles,
  buildWorld, findPath, drawBackground, drawLiveWall, drawProp, propBaseline,
  drawDesk, deskBaseline, drawChair, chairBaseline,
} from './map.js';
import { createTimeline, CATEGORIES } from './timeline.js';
import { sfx, setSfx, setMusic } from './sound.js';
import { createEditor } from './editor.js';
import * as arena from './arena/index.js';
import { setReduced, reduced as motionReduced } from './arena/render/vfx.js';

// Tema: 'office' (oficina) o 'arena' (parties de héroes contra un Rey Demonio). El antiguo tema
// «mundo RPG» ('rpg') ya no existe: quien lo tenía guardado abre la arena.
let theme = (() => {
  try {
    for (const k of ['oficina.mode', 'oficina.raid.recent', 'oficina.raid.boss']) localStorage.removeItem(k);   // restos de la versión anterior
    const t = localStorage.getItem('oficina.theme');
    return t === 'arena' || t === 'rpg' ? 'arena' : 'office';
  } catch { return 'office'; }
})();
const isArena = () => theme === 'arena';

const cv = document.getElementById('cv');
const g = cv.getContext('2d');
const stage = document.getElementById('stage');
// Tamaño lógico del lienzo según el tema: la oficina es de 480×304 y la arena de 960×608 (arena.SIZE)
const sizeOf = () => (isArena() ? arena.SIZE : { w: W, h: H });
function applySize() {
  const { w, h } = sizeOf();
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; bg.width = w; bg.height = h; }
  stage.style.aspectRatio = `${w} / ${h}`;
  fitStage();
}
// Escalado entero cuando se pueda: en la arena el escenario mide un múltiplo de 960 px si cabe ×1 o más
function fitStage() {
  const avail = stage.parentElement ? stage.parentElement.clientWidth : 0, { w } = arena.SIZE;
  const k = Math.floor((avail - 8) / w);                      // 8 px de borde del escenario
  stage.style.setProperty('--arena-w', isArena() && k >= 1 ? `${k * w + 8}px` : '100%');
}
if (typeof ResizeObserver === 'function') new ResizeObserver(fitStage).observe(stage.parentElement);
arena.mountHud(stage);

buildWorld();
const bg = document.createElement('canvas');
function paintBackground() {
  const bctx = bg.getContext('2d'), { w, h } = sizeOf();
  bctx.clearRect(0, 0, w, h);
  (isArena() ? arena.drawBackground : drawBackground)(bctx);
}
applySize();
paintBackground();

// ---- Aspecto de cada agente ---------------------------------------------
const COLORS = {
  'claude': '#d97757', 'product-owner': '#e05d8a', 'software-architect': '#9b6cf0', 'ux-designer': '#f08fd0',
  'frontend-expert': '#4fb0ff', 'backend-expert': '#3d7bff', 'mobile-developer': '#45d4c8',
  'data-engineer': '#5fd068', 'postgres-dba': '#3a9fb0', 'devops-engineer': '#f5a142',
  'security-expert': '#e84545', 'qa-engineer': '#f5d442',
};
const LOOKS = {
  'claude':             { accessory: 'tie', accent: '#7a2a1a', pants: '#2d2a40' },
  'product-owner':      { accessory: 'tie', accent: '#2d3d7a' },
  'software-architect': { accessory: 'glasses' },
  'ux-designer':        { accessory: 'beret', accent: '#c03030' },
  'frontend-expert':    {},
  'backend-expert':     { accessory: 'headset' },
  'mobile-developer':   { accessory: 'cap', accent: '#f5a142' },
  'data-engineer':      { accessory: 'cap', accent: '#2f7a3c' },
  'postgres-dba':       { accessory: 'glasses' },
  'devops-engineer':    { accessory: 'headset' },
  'security-expert':    { shirt: '#7a2430', hair: '#7a2430' },   // sudadera con capucha
  'qa-engineer':        { accessory: 'cap', accent: '#3d7bff' },
};
const HAIR = ['#2b1d14', '#6b3e1e', '#d9b26a', '#1a1a1a', '#8a2a1a', '#c8c8c8', '#4a2a5a'];
const SKIN = ['#f1c7a3', '#e0b088', '#c08a60', '#8a5a3a'];
const PANTS = ['#2d2a40', '#3a4a6a', '#4a3a2a', '#2a3a3a'];
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function colorOf(name) { return COLORS[name] || `hsl(${hash(name) % 360} 60% 60%)`; }
// Aspecto por defecto (derivado del nombre) y aspecto personalizado guardado con el editor
// Estilo anime por defecto de cada rol (los demás agentes reciben uno según su nombre)
const ROLE_ANIME = {
  'claude': 'heroe', 'product-owner': 'estudiante', 'software-architect': 'rival', 'ux-designer': 'maga',
  'frontend-expert': 'piloto', 'backend-expert': 'ninja', 'mobile-developer': 'idol', 'data-engineer': 'estudiante',
  'postgres-dba': 'samurai', 'devops-engineer': 'samurai', 'security-expert': 'ninja', 'qa-engineer': 'idol',
};
function defaultLook(name) {
  const h = hash(name);
  const preset = ANIME_PRESETS.find(p => p.id === ROLE_ANIME[name]) || ANIME_PRESETS[h % ANIME_PRESETS.length];
  return { ...officeLook(name), ...preset.look };
}
function officeLook(name) {
  const h = hash(name), l = LOOKS[name] || {};
  return {
    hairStyle: 'corto', eyes: 'normal', iris: '#3d7bff',
    hair: l.hair || HAIR[h % HAIR.length], skin: SKIN[(h >> 3) % SKIN.length],
    shirt: l.shirt || COLORS[name] || ['#8a8aa0', '#c08a50', '#6a9a5a', '#a05a8a', '#5a7aa0'][h % 5],
    pants: l.pants || PANTS[(h >> 5) % PANTS.length], shoes: '#2a1a14',
    accessory: [].concat(l.accessory || []), accent: l.accent || '#c03030',
  };
}
let customLooks = {};
function lookOf(name) { return { ...defaultLook(name), ...(customLooks[name] || {}) }; }
function applyLook(base, look) {
  for (const a of Object.values(agents)) if (baseOf(a.name) === base) a.frames = makeCharacter(look || lookOf(base));
}

// ---- Herramientas -> globos ---------------------------------------------
const TOOL_TXT = {
  Bash: '⌨ terminal', Edit: '✎ editando', Write: '✎ escribiendo', MultiEdit: '✎ editando', NotebookEdit: '✎ notebook',
  Read: '📄 leyendo', Grep: '🔍 buscando', Glob: '🔍 buscando', WebSearch: '🌐 investigando', WebFetch: '🌐 leyendo web',
  Delegar: '📋 delegando', Pensando: '💭 pensando', Empezando: '… empezando', SubagentHandback: '📨 entregando',
  TodoWrite: '📝 planificando',
};
function toolText(tool) {
  if (!tool) return '';
  if (/Browser|chrome/.test(tool)) return '🖥 navegador';
  if (tool.startsWith('mcp__ccd_turn')) return '📝 organizando';
  if (tool.startsWith('mcp__')) return '🔌 ' + tool.split('__').pop().slice(0, 14);
  return TOOL_TXT[tool] || tool;
}
const SLOW_TOOLS = /^(Read|Grep|Glob|WebSearch|WebFetch|Pensando|Empezando)$/;

// ---- Agentes -------------------------------------------------------------
const agents = {};
let now = performance.now();
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const center = ([x, y]) => ({ x: x * TS + 8, y: y * TS + 13 });
const tileOf = a => [Math.floor(a.x / TS), Math.floor(a.y / TS)];

// ---- Reparto de escritorios ---------------------------------------------
// Cada equipo tiene sus propios agentes (~/.claude/agents). Los que coinciden con un
// puesto predefinido lo usan; el resto ocupa los puestos libres por orden alfabético.
// Si hay más agentes que puestos, los sobrantes trabajan como invitados.
let assigned = {};
let roster = ['claude'];
function assignDesks(list) {
  roster = list && list.length ? list : roster;
  assigned = { claude: DESKS.claude };
  const free = Object.entries(DESKS).filter(([n]) => n !== 'claude');
  for (const n of roster) {
    const i = free.findIndex(([pref]) => pref === n);
    if (i >= 0) { assigned[n] = free[i][1]; free.splice(i, 1); }
  }
  for (const n of [...roster].sort()) {
    if (!assigned[n] && free.length) assigned[n] = free.shift()[1];
  }
  renderPlates();
}
function isGuest(name) { return !assigned[name]; }
function deskOf(a) {
  if (assigned[a.name]) return assigned[a.name];
  if (a.guestDesk) return a.guestDesk;
  const used = new Set(Object.values(agents).filter(o => o !== a && o.guestDesk && o.data.state !== 'idle').map(o => o.guestDesk));
  a.guestDesk = GUEST_DESKS.find(d => !used.has(d)) || GUEST_DESKS[0];
  return a.guestDesk;
}

const baseOf = name => name.split('#')[0];

arena.init({ hash, shortName: n => shortName(n) });

function createAgent(data) {
  const base = data.type || baseOf(data.name);
  const a = {
    name: data.name, data, base, frames: makeCharacter(lookOf(base)), color: colorOf(base),
    x: 0, y: 0, dir: 'down', route: [], goal: null, seated: false, hidden: false,
    walkT: 0, nextIdle: 0, bubble: null, seed: hash(data.name) % 97,
    bub: Object.assign(document.createElement('div'), { className: 'bub' }),
    tag: Object.assign(document.createElement('div'), { className: 'tag', textContent: shortName(data.name) }),
  };
  stage.append(a.bub, a.tag);
  if (data.state !== 'idle') { sitDown(a, deskOf(a)); }
  else if (isGuest(a.name)) { a.hidden = true; }
  else { Object.assign(a, center(pick(corridorTiles))); a.nextIdle = now + rnd(0, 3000); }
  return a;
}

const SHORT = { 'product-owner': 'PO', 'software-architect': 'arquitecto', 'postgres-dba': 'DBA', 'data-engineer': 'datos', 'ux-designer': 'UX', 'qa-engineer': 'QA' };
function shortName(name) {
  const [b, n] = name.split('#');
  return (SHORT[b] || b.replace(/-(expert|engineer|developer|designer)$/, '')) + (n ? ' #' + n : '');
}

function sitDown(a, d) {
  a.x = d.px.x; a.y = d.px.y; a.route = []; a.seated = true; a.desk = d; a.goal = { kind: 'seat' };
}

function goTo(a, tile, goal, final) {
  const [sx, sy] = tileOf(a);
  const path = findPath(sx, sy, tile[0], tile[1]);
  a.seated = false;
  a.goal = Object.assign({ tile }, goal);
  if (!path) { const c = final || center(tile); a.x = c.x; a.y = c.y; a.route = []; arrive(a); return; }
  a.route = path.slice(1).map(center);
  if (final) a.route.push(final);
}

function goSeat(a) {
  const d = deskOf(a);
  a.desk = d;
  if (a.seated && a.x === d.px.x && a.y === d.px.y) return;
  a.bubble = null;
  goTo(a, [d.seat.x, d.seat.y], { kind: 'seat' }, d.px);
}

function arrive(a) {
  const goal = a.goal || {};
  if (goal.kind === 'seat') { a.seated = true; a.dir = 'down'; }
  if (goal.kind === 'post') { a.seated = false; a.dir = goal.face || 'up'; }
  if (goal.kind === 'exit') {
    a.hidden = true; a.guestDesk = null;
    if (a.leaving) { a.bub.remove(); a.tag.remove(); delete agents[a.name]; renderList(); }
  }
  if (goal.kind === 'spot') {
    a.bubble = goal.bubble || null;
    if (goal.face) a.dir = goal.face;
    a.nextIdle = now + (goal.dur || rnd(4000, 9000));
  }
  if (goal.kind === 'seat' && a.data.state === 'idle') a.nextIdle = now + (goal.dur || rnd(5000, 10000));
}

// Qué hacer cuando no hay trabajo
function claimed() {
  return new Set(Object.values(agents).filter(o => o.goal && o.goal.tile).map(o => o.goal.tile.join(',')));
}
function freeFrom(list) {
  const c = claimed();
  const free = list.filter(t => !c.has(t.join(',')));
  return free.length ? pick(free) : null;
}
function chooseIdle(a) {
  a.bubble = null;
  if (isGuest(a.name)) { goTo(a, [ENTRANCE.x, ENTRANCE.y], { kind: 'exit' }); return; }
  const r = Math.random();
  let tile = null, goal = { kind: 'spot' };
  if (r < 0.2) { tile = freeFrom(SPOTS.coffee); goal.bubble = '☕'; }
  else if (r < 0.32) { tile = freeFrom(SPOTS.cooler); goal.bubble = '💧'; }
  else if (r < 0.4) { tile = freeFrom(SPOTS.vending); goal.bubble = '🍫'; goal.face = 'up'; }
  else if (r < 0.47) { tile = freeFrom(SPOTS.bench); goal.bubble = '📱'; }
  else if (r < 0.65) {
    const other = Object.values(agents).find(o => o !== a && !o.hidden && !o.seated && !o.route.length && o.data.state === 'idle');
    if (other) {
      const [ox, oy] = tileOf(other);
      tile = freeFrom([[ox - 1, oy], [ox + 1, oy]].filter(([x, y]) => corridorTiles.some(([cx, cy]) => cx === x && cy === y)));
      if (tile) {
        goal.bubble = '💬'; goal.face = tile[0] < ox ? 'right' : 'left';
        other.bubble = '💬'; other.dir = tile[0] < ox ? 'left' : 'right'; other.nextIdle = now + 9000;
      }
    }
  } else if (r < 0.8) {
    const d = deskOf(a);
    goTo(a, [d.seat.x, d.seat.y], { kind: 'seat', dur: rnd(6000, 12000) }, d.px);
    return;
  }
  tile = tile || freeFrom(corridorTiles);
  goal.dur = rnd(3500, 8000);
  goTo(a, tile, goal);
}

function upsert(data, quiet) {
  timeline.push(data);
  let a = agents[data.name];
  if (!a) {
    a = agents[data.name] = createAgent(data);
    // Un agente nuevo que llega trabajando entra por la puerta
    if (!quiet && data.state !== 'idle' && isGuest(a.name)) {
      a.hidden = true; a.data = { ...data, state: 'idle' }; upsert(data, true);
      sfx.door(); sfx.start();
    }
    renderList(); return;
  }
  const prev = a.data.state;
  a.data = data;
  a.leaving = false;
  // En la arena, cada herramienta que usa el agente es un golpe de su party al Rey Demonio
  if (data.state === 'working' && !quiet && isArena()) arena.hit(a, now);
  if (!quiet && prev !== data.state) {
    if (data.state === 'working' && prev !== 'working') sfx.start();
    if (data.state === 'done' && !isArena()) sfx.done();
  }
  if (data.state === 'working' || data.state === 'done') {
    if (a.hidden) {
      a.hidden = false; a.seated = false; a.goal = null; a.route = [];
      Object.assign(a, center([ENTRANCE.x, ENTRANCE.y]));
      if (!quiet) sfx.door();
    }
    if (!(a.goal && a.goal.kind === 'seat' && (a.seated || a.route.length))) goSeat(a);
    else if (a.goal.kind === 'seat') a.goal.dur = null;
  } else if (prev !== 'idle') {
    a.nextIdle = now + rnd(1500, 4000);
  }
  renderList();
}

// ---- Actualización -------------------------------------------------------
function update(a, dt) {
  if (a.hidden) return;
  if (a.route.length) {
    const tgt = a.route[0];
    const dx = tgt.x - a.x, dy = tgt.y - a.y, dist = Math.hypot(dx, dy);
    const speed = a.data.state === 'idle' ? 30 : 54;
    if (dist <= speed * dt) {
      a.x = tgt.x; a.y = tgt.y; a.route.shift();
      if (!a.route.length) arrive(a);
    } else {
      a.x += dx / dist * speed * dt; a.y += dy / dist * speed * dt;
    }
    if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 'right' : 'left';
    else if (dist > 0.01) a.dir = dy > 0 ? 'down' : 'up';
    a.walkT += dt;
  } else if (a.data.state === 'idle' && now > a.nextIdle) {
    chooseIdle(a);
  }
}

// ---- Dibujo --------------------------------------------------------------
function drawAgent(a) {
  const x = Math.round(a.x), y = Math.round(a.y);
  const d = a.desk;
  if (a.seated && d) {
    const working = a.data.state === 'working';
    const slow = SLOW_TOOLS.test(a.data.tool || '');
    const ph = Math.floor(now / (slow ? 650 : 140) + a.seed) % 2;
    if (working && !slow && Math.random() < 0.08) sfx.type();
    if (d.face === 'up') {
      const f = working ? a.frames.typeUp[slow ? 0 : ph] : a.frames.down.stand;
      g.drawImage(f, 0, 0, 12, 13, x - 6, y - 18 + (working && slow && ph ? 1 : 0), 12, 13);
    } else {
      const f = working ? a.frames.typeDown[slow ? 0 : ph] : a.frames.down.stand;
      g.drawImage(f, 0, 0, 12, 13, x - 6, y - 9, 12, 13);
    }
    return;
  }
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x - 4, y - 1, 8, 2);
  const moving = a.route.length > 0;
  const ph = moving ? ['a', 'stand', 'b', 'stand'][Math.floor(a.walkT / 0.13) % 4] : 'stand';
  const bob = moving && ph !== 'stand' ? 1 : 0;
  g.drawImage(a.frames[a.dir][ph], x - 6, y - 17 - bob);
}

function headY(a) {
  if (a.seated && a.desk) return a.desk.face === 'up' ? a.y - 18 : a.y - 9;
  return a.y - 17;
}

function frame(t) {
  const dt = Math.min(0.05, (t - now) / 1000); now = t;
  const A = isArena();
  const list = Object.values(agents);
  list.forEach(a => update(a, dt));
  if (A) { arena.setSelected(selected); arena.step(now, dt, list); }

  g.save();
  const [shx, shy] = A ? arena.shakeOffset(now) : [0, 0];
  if (shx || shy) g.translate(shx, shy);
  g.drawImage(bg, 0, 0);
  if (A) arena.draw(g, now);
  else {
    drawLiveWall(g, t);
    const occupant = new Map();
    for (const a of list) if (a.seated && a.desk && !a.hidden) occupant.set(a.desk, a);

    const items = [];
    for (const p of PROPS) items.push({ y: propBaseline(p), draw: () => drawProp(g, p, t) });
    for (const d of [...Object.values(DESKS), ...GUEST_DESKS]) {
      const occ = occupant.get(d);
      const screen = !occ ? { mode: 'off' } : occ.data.state === 'working' ? { mode: 'work', tool: occ.data.tool } : { mode: 'idle' };
      items.push({ y: deskBaseline(d), draw: () => drawDesk(g, d, screen, t, (d.x * 7 + d.y) % 13) });
      items.push({ y: chairBaseline(d), draw: () => drawChair(g, d) });
    }
    for (const a of list) if (!a.hidden) items.push({ y: a.y, draw: () => drawAgent(a) });
    items.sort((p, q) => p.y - q.y).forEach(i => i.draw());

    // Indicador del agente seleccionado
    const sel = selected && agents[selected];
    if (sel && !sel.hidden) {
      const bob = Math.floor(t / 250) % 2;
      const sx = Math.round(sel.x), sy = Math.round(headY(sel)) - 5 - bob;
      g.fillStyle = '#f5d442'; g.fillRect(sx - 3, sy, 7, 1); g.fillRect(sx - 2, sy + 1, 5, 1); g.fillRect(sx - 1, sy + 2, 3, 1); g.fillRect(sx, sy + 3, 1, 1);
    }
  }
  g.restore();
  arena.updateHud(now, A);

  // Globos y etiquetas de la oficina (HTML para que el texto sea nítido); en la arena los gestiona arena/render/hud.js
  for (const a of list) {
    if (A) { a.bub.style.display = 'none'; a.tag.style.display = 'none'; continue; }
    let txt = '';
    if (!a.hidden) {
      if (a.data.state === 'working') txt = a.seated ? toolText(a.data.tool) : '🚶 ' + (a.data.task || 'voy').slice(0, 18);
      else if (a.data.state === 'done') txt = '✓ listo';
      else if (a.bubble && !a.route.length) txt = a.bubble;
    }
    a.bub.textContent = txt;
    a.bub.className = 'bub' + (a.data.state === 'done' ? ' done' : '') + (txt.length <= 2 ? ' icon' : '');
    a.bub.style.display = txt ? '' : 'none';
    a.bub.style.left = a.x / W * 100 + '%';
    a.bub.style.top = (headY(a) - 2) / H * 100 + '%';
    const showTag = !a.hidden && (a.name === selected || a.name === hovered);
    a.tag.style.display = showTag ? '' : 'none';
    a.tag.style.left = a.x / W * 100 + '%';
    a.tag.style.top = (a.y + 1) / H * 100 + '%';
  }
  if (t - lastTimeline > 500) { lastTimeline = t; timeline.draw(); }
  requestAnimationFrame(frame);
}

// ---- Etiquetas fijas: salas y placas de los escritorios -------------------
const roomLabels = [];
for (const r of ROOMS) {
  const el = Object.assign(document.createElement('div'), { className: 'room', textContent: r.name });
  el.dataset.room = r.id;
  roomLabels.push([r, el]);
  el.style.left = (r.x0 * TS + 2) / W * 100 + '%';
  el.style.top = ((r.face === 1 ? 0 : 11) * TS + 3) / H * 100 + '%';
  stage.append(el);
}
function renderPlates() {
  stage.querySelectorAll('.plate').forEach(el => el.remove());
  const owner = new Map(Object.entries(assigned).map(([n, d]) => [d, n]));
  for (const d of [...Object.values(DESKS), ...GUEST_DESKS]) {
    const name = owner.get(d) || (GUEST_DESKS.includes(d) ? 'invitado' : 'libre');
    const el = Object.assign(document.createElement('div'), { className: 'plate', textContent: name === 'libre' || name === 'invitado' ? name : shortName(name) });
    const y = d.face === 'up' ? (d.seat.y + 1) * TS - 1 : (d.y + 1) * TS;
    el.style.left = d.px.x / W * 100 + '%';
    el.style.top = y / H * 100 + '%';
    el.dataset.n = name;
    stage.append(el);
  }
}

// ---- Interacción ---------------------------------------------------------
let selected = null, hovered = null;
function agentAt(ev) {
  const r = cv.getBoundingClientRect(), { w: sw, h: sh } = sizeOf();
  const mx = (ev.clientX - r.left) / r.width * sw, my = (ev.clientY - r.top) / r.height * sh;
  let best = null;
  if (isArena()) return agents[arena.partyAt(mx, my)] || null;
  for (const a of Object.values(agents)) {
    if (a.hidden) continue;
    const top = headY(a), bottom = a.seated ? top + 13 : a.y;
    if (mx >= a.x - 7 && mx <= a.x + 7 && my >= top - 2 && my <= bottom + 1) if (!best || a.y > best.y) best = a;
  }
  return best;
}
cv.addEventListener('click', ev => { const a = agentAt(ev); if (a) { selected = a.name; renderList(); } });
cv.addEventListener('mousemove', ev => { const a = agentAt(ev); hovered = a ? a.name : null; cv.style.cursor = a ? 'pointer' : 'default'; });

const STATE_TXT = { idle: 'libre', working: 'trabajando', done: 'terminó ✓' };
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function renderList() {
  const order = Object.values(agents).sort((p, q) =>
    (q.data.state === 'working') - (p.data.state === 'working') || p.name.localeCompare(q.name));
  document.getElementById('list').innerHTML = order.map(a => `
    <div class="row ${selected === a.name ? 'sel' : ''}" data-n="${esc(a.name)}">
      <span class="dot" style="background:${a.color}"></span>
      <span class="n">${esc(a.name)}</span>
      <span class="st ${a.data.state}">${STATE_TXT[a.data.state] || esc(a.data.state)}</span>
    </div>`).join('');
  const a = selected && agents[selected];
  const el = document.getElementById('log');
  if (a) editor.open(baseOf(a.name)); else editor.close();
  document.getElementById('btn-goto-editor').hidden = !a;
  if (!a) { el.textContent = 'Haz clic en un agente (en la lista o en la oficina) para ver su actividad y editar su aspecto.'; return; }
  const lines = a.data.log.map(l => `${new Date(l.t).toLocaleTimeString()} ${esc(l.text)}`).join('<br>') || 'Sin actividad todavía.';
  const party = isArena() ? arena.info(a.name) : '';
  const foe = party ? `<br>${party}` : '';
  el.innerHTML = `<b>${esc(a.name)}</b>${a.data.task ? '<br>Tarea: ' + esc(a.data.task) : ''}${foe}<br><br>${lines}`;
}
// Botón fijo (fuera del log, que se repinta a menudo) para ir al editor
document.getElementById('btn-goto-editor').addEventListener('click', () =>
  document.getElementById('editor').scrollIntoView({ behavior: 'smooth', block: 'start' }));
document.getElementById('list').addEventListener('click', e => {
  const r = e.target.closest('.row'); if (!r) return;
  selected = r.dataset.n; renderList();
});

// ---- Editor de aspecto ------------------------------------------------------
const editor = createEditor(document.getElementById('editor'), {
  lookOf,
  isCustom: name => !!customLooks[name],
  labelOf: name => name,
  onPreview: (name, look) => applyLook(name, look),          // se ve al momento en la oficina
  onSave: async (name, look) => {
    const r = await postJson('/api/looks', { name, look });
    if (!r.ok) alert((await r.json()).error || 'No se pudo guardar');
  },
  onReset: async name => {
    if (!confirm(`¿Volver al aspecto original de ${name}?`)) return;
    await postJson('/api/looks', { name, look: null });
  },
});
editor.onClose = () => { selected = null; renderList(); };

function setLooks(looks) {
  customLooks = looks || {};
  for (const base of new Set(Object.keys(agents).map(baseOf))) {
    if (base !== editor.name) applyLook(base);            // el que se edita conserva la vista previa
  }
  editor.refresh();
}
function postJson(url, data) {
  return fetch(url, { method: 'POST', headers: { 'X-Oficina': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

// ---- Conexión con el servidor --------------------------------------------
function connect() {
  const es = new EventSource('/stream');
  const conn = document.getElementById('conn');
  es.onopen = () => { conn.textContent = '● en vivo'; conn.className = 'on'; };
  es.onerror = () => { conn.textContent = '● desconectado'; conn.className = ''; };
  es.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'snapshot') {
      const names = new Set(msg.agents.map(a => a.name));
      for (const a of Object.values(agents)) if (!names.has(a.name)) { arena.forget(a.name); a.bub.remove(); a.tag.remove(); delete agents[a.name]; }
      assignDesks(msg.roster);
      arena.noteSnapshot(now);
      setLooks(msg.looks);
      timeline.setHistory(msg.hist);
      msg.agents.forEach(a => upsert(a, true));
      renderList();
    }
    if (msg.type === 'agent') upsert(msg.agent);
    if (msg.type === 'remove') {
      const a = agents[msg.name];
      timeline.remove(msg.name);
      arena.forget(msg.name);
      if (a) { a.leaving = true; a.data = { ...a.data, state: 'idle' }; if (a.hidden) arrive(Object.assign(a, { goal: { kind: 'exit' } })); else chooseIdle(a); }
    }
    if (msg.type === 'replay') showReplay(msg.replay);
    if (msg.type === 'looks') setLooks(msg.looks);
  };
}

// ---- Línea de tiempo ---------------------------------------------------------
let lastTimeline = 0;
const timeline = createTimeline(document.getElementById('tl'), {
  order: () => [...roster, ...Object.keys(agents).filter(n => !roster.includes(n)).sort()],
  colorOf: n => colorOf(baseOf(n)),
  labelOf: shortName,
  onPick: n => { selected = n; renderList(); },
});
document.getElementById('tl-legend').innerHTML = CATEGORIES.map(c =>
  `<span><i style="background:${c.color}"></i>${c.label}</span>`).join('') + '<span><i style="background:#5fd068;width:3px"></i>terminó</span>';
document.querySelectorAll('[data-win]').forEach(b => b.addEventListener('click', () => {
  timeline.setWindow(Number(b.dataset.win) * 60e3);
  document.querySelectorAll('[data-win]').forEach(o => o.classList.toggle('on', o === b));
  timeline.draw();
}));

// ---- Sonido --------------------------------------------------------------------
function pref(key, val) {
  try { if (val === undefined) return localStorage.getItem(key) === '1'; localStorage.setItem(key, val ? '1' : '0'); } catch { return false; }
}
function soundButton(id, key, setter, on, off) {
  const b = document.getElementById(id);
  let state = false;
  const apply = v => { state = v; setter(v); b.textContent = v ? on : off; b.classList.toggle('on', v); pref(key, v); };
  b.addEventListener('click', () => apply(!state));
  // Los navegadores solo permiten audio tras un clic: se reactiva en el primer clic de la página
  if (pref(key)) window.addEventListener('pointerdown', () => { if (!state) apply(true); }, { once: true });
}
soundButton('btn-sfx', 'oficina.sfx', setSfx, '🔊 efectos', '🔈 efectos');
soundButton('btn-music', 'oficina.music', setMusic, '♫ música', '♪ música');

// ---- Tema: oficina o arena --------------------------------------------------------------------------------
// Animación completa o reducida: por defecto manda la preferencia del sistema; si el usuario la cambia, manda su elección.
// Es la misma bandera (render/vfx.js) que leen la batalla, el campamento y el fondo, así que el cambio es inmediato.
const motionBtn = document.getElementById('btn-motion');
(() => { try { const v = localStorage.getItem('oficina.motion'); if (v === 'full' || v === 'reduced') setReduced(v === 'reduced'); } catch { /* sin almacenamiento */ } })();
function paintMotion() {
  const r = motionReduced();
  motionBtn.textContent = r ? '🎬 animación: reducida' : '🎬 animación: completa';
  motionBtn.classList.toggle('on', !r);
  motionBtn.setAttribute('aria-pressed', String(!r));
}
motionBtn.addEventListener('click', () => {
  const next = !motionReduced();
  setReduced(next);
  try { localStorage.setItem('oficina.motion', next ? 'reduced' : 'full'); } catch { /* sin almacenamiento */ }
  paintMotion();
});
paintMotion();

const themeBtn = document.getElementById('btn-theme');
function applyTheme(t) {
  const was = isArena();
  theme = t;
  try { localStorage.setItem('oficina.theme', t); } catch { /* sin almacenamiento */ }
  applySize();
  paintBackground();
  themeBtn.textContent = isArena() ? '⚔ arena' : '🏢 oficina';
  themeBtn.classList.toggle('on', isArena());
  themeBtn.title = isArena() ? 'Volver a la oficina' : 'Pasar a la arena del Rey Demonio';
  stage.classList.toggle('theme-arena', isArena());
  if (was && !isArena()) arena.reset();
  if (isArena()) arena.noteSnapshot(now);        // los agentes que ya trabajan entran sin caminar
  renderList();
}
// Pestaña oculta: la arena vacía sus colas y no acumula acciones; al volver sigue desde el estado actual
document.addEventListener('visibilitychange', () => { if (document.hidden) arena.pause(); else arena.resume(); });
themeBtn.addEventListener('click', () => applyTheme(isArena() ? 'office' : 'arena'));
applyTheme(theme);

// ---- Repeticiones --------------------------------------------------------------
const dlg = document.getElementById('dlg');
const banner = document.getElementById('replay');
document.getElementById('btn-replay').addEventListener('click', async () => {
  dlg.showModal();
  const list = document.getElementById('sessions');
  list.innerHTML = '<p class="muted">Cargando sesiones…</p>';
  try {
    const sessions = await (await fetch('/api/sessions')).json();
    list.innerHTML = sessions.length ? sessions.map(s => `
      <button class="sess" data-id="${esc(s.id)}">
        <span class="proj">${esc(s.project)}</span>
        <span class="title">${esc(s.title)}</span>
        <span class="meta">${new Date(s.updated).toLocaleString()} · ${s.sizeKb} KB${s.subagents ? ` · ${s.subagents} subagente${s.subagents > 1 ? 's' : ''}` : ''}</span>
      </button>`).join('') : '<p class="muted">No hay sesiones guardadas.</p>';
  } catch { list.innerHTML = '<p class="muted">No se pudieron cargar las sesiones.</p>'; }
});
document.getElementById('sessions').addEventListener('click', async e => {
  const b = e.target.closest('.sess'); if (!b) return;
  const speed = document.getElementById('speed').value;
  const r = await post(`/api/replay?id=${encodeURIComponent(b.dataset.id)}&speed=${speed}`);
  if (r.ok) dlg.close(); else alert((await r.json()).error || 'No se pudo repetir la sesión');
});
document.getElementById('dlg-close').addEventListener('click', () => dlg.close());
document.getElementById('btn-live').addEventListener('click', () => post('/api/replay/stop'));

// Las acciones llevan una cabecera propia que el servidor exige (protección frente a otras webs)
function post(url) { return fetch(url, { method: 'POST', headers: { 'X-Oficina': '1' } }); }

// ---- Conexión con Claude Code (hooks) -------------------------------------------
const hooksDlg = document.getElementById('dlg-hooks');
const hooksBanner = document.getElementById('hooks-banner');
async function refreshHooks() {
  let s;
  try { s = await (await fetch('/api/hooks')).json(); } catch { return; }
  const ok = s.installed && s.current;
  document.getElementById('btn-hooks').classList.toggle('warn', !ok);
  hooksBanner.hidden = ok;
  document.getElementById('hooks-banner-text').textContent = s.installed
    ? 'La conexión con Claude Code es de una versión anterior o de otro puerto.'
    : 'La oficina todavía no está conectada a Claude Code: no verás a tus agentes trabajar.';
  document.getElementById('hooks-state').innerHTML = s.error ? esc(s.error)
    : ok ? `<b class="ok">● Conectada</b> en el puerto ${s.port}.`
    : s.installed ? '<b class="warn">● Conexión desactualizada</b>: pulsa «Conectar» para repararla.'
    : '<b class="warn">● No conectada</b>.';
  document.getElementById('hooks-file').textContent = s.settings;
  document.getElementById('btn-hooks-off').disabled = !s.installed;
}
async function hooksAction(path) {
  const r = await post(path);
  if (!r.ok) alert((await r.json()).error || 'No se pudo cambiar la configuración');
  refreshHooks();
}
document.getElementById('btn-hooks').addEventListener('click', () => { refreshHooks(); hooksDlg.showModal(); });
document.getElementById('btn-hooks-on').addEventListener('click', () => hooksAction('/api/hooks/install'));
document.getElementById('btn-hooks-off').addEventListener('click', () => hooksAction('/api/hooks/uninstall'));
document.getElementById('btn-hooks-banner').addEventListener('click', () => hooksAction('/api/hooks/install'));
document.getElementById('dlg-hooks-close').addEventListener('click', () => hooksDlg.close());
refreshHooks();
assignDesks(['claude']);

function showReplay(r) {
  arena.setReplay(r);
  banner.hidden = !r;
  if (!r) return;
  document.getElementById('replay-title').textContent = r.title;
  document.getElementById('replay-progress').textContent = r.finished ? 'terminada' : `${r.i}/${r.total} · x${r.speed}`;
  document.getElementById('replay-bar').style.width = (r.total ? r.i / r.total * 100 : 0) + '%';
}
connect();
requestAnimationFrame(t => { now = t; requestAnimationFrame(frame); });
