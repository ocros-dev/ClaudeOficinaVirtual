// Editor del aspecto de un agente: peinado, colores y accesorios, con vista previa animada.
import { makeCharacter, HAIR_STYLES, ACCESSORY_LIST } from './sprites.js';
import { PRESETS } from './presets.js';

const HAIR_COLORS = ['#1a1a1a', '#2b1d14', '#6b3e1e', '#a0522d', '#d9b26a', '#f0dc8c', '#8a2a1a', '#e05d3a',
                     '#c8c8c8', '#f4f4f4', '#4a2a5a', '#3d7bff', '#45d4c8', '#5fd068', '#f08fd0', '#7a2430'];
const EYE_COLORS = ['#1b1426', '#6b3e1e', '#3d7bff', '#2a5ad0', '#45d4c8', '#5fd068', '#e02020', '#9b6cf0'];
const SKIN_COLORS = ['#ffd0a8', '#ffe0c8', '#f1c7a3', '#e0b088', '#c08a60', '#8a5a3a', '#5a3a24'];
const CLOTH_COLORS = ['#1b1426', '#2d2a40', '#3a4a6a', '#4a3a2a', '#7a2430', '#e84545', '#d97757', '#f5a142',
                      '#f5d442', '#5fd068', '#2f7a3c', '#45d4c8', '#4fb0ff', '#3d7bff', '#9b6cf0', '#f08fd0',
                      '#e8e8ee', '#8a8aa0'];

const FIELDS = [
  { key: '_preset',   label: 'PERSONAJE', type: 'preset' },
  { key: 'hairStyle', label: 'PEINADO', type: 'choice', options: Object.entries(HAIR_STYLES).map(([id, s]) => ({ id, label: s.label })) },
  { key: 'hair',      label: 'PELO',     type: 'color', palette: HAIR_COLORS },
  { key: 'skin',      label: 'PIEL',     type: 'color', palette: SKIN_COLORS, noCustom: false },
  { key: 'eyes',      label: 'OJOS',     type: 'color', palette: EYE_COLORS },
  { key: 'shirt',     label: 'CAMISA',   type: 'color', palette: CLOTH_COLORS },
  { key: 'pants',     label: 'PANTALÓN', type: 'color', palette: CLOTH_COLORS },
  { key: 'shoes',     label: 'ZAPATOS',  type: 'color', palette: CLOTH_COLORS },
  { key: 'accessory', label: 'ACCESORIOS', type: 'multi', options: ACCESSORY_LIST },
  { key: 'accent',    label: 'COLOR DEL ACCESORIO', type: 'color', palette: CLOTH_COLORS },
  { key: 'accent2',   label: 'COLOR 2 (bandana, cinturón, falda...)', type: 'color', palette: CLOTH_COLORS },
];
const DIRS = [['left', '◄'], ['up', '▲'], ['down', '▼'], ['right', '►']];
const ANIMS = [['stand', 'quieto'], ['walk', 'caminar'], ['type', 'teclear']];

const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const pickKeys = (o, keys) => Object.fromEntries(Object.keys(keys).map(k => [k, o[k]]));

export function createEditor(root, { lookOf, isCustom, labelOf, onPreview, onSave, onReset }) {
  let name = null, saved = null, draft = null, frames = null;
  let dir = 'down', anim = 'walk', raf = 0;

  root.innerHTML = `
    <div class="ed-head"><h2>EDITAR <span class="ed-name"></span></h2><button class="btn sm ed-close" title="Cerrar">✕</button></div>
    <div class="ed-top">
      <canvas class="ed-preview" width="20" height="24"></canvas>
      <div class="ed-view">
        <div class="ed-row">${DIRS.map(([d, s]) => `<button class="btn sm" data-dir="${d}" title="Girar">${s}</button>`).join('')}</div>
        <div class="ed-row">${ANIMS.map(([a, s]) => `<button class="btn sm" data-anim="${a}">${s}</button>`).join('')}</div>
        <div class="ed-row">
          <button class="btn sm ed-random" title="Combinación al azar">🎲 azar</button>
          <button class="btn sm ed-reset" title="Volver al aspecto original">↺ original</button>
        </div>
      </div>
    </div>
    <div class="ed-fields"></div>
    <div class="ed-actions">
      <span class="ed-status"></span>
      <button class="btn ed-discard">descartar</button>
      <button class="btn ed-save">✓ guardar</button>
    </div>`;
  const $ = s => root.querySelector(s);
  const cv = $('.ed-preview'), g = cv.getContext('2d');

  function fieldHtml(f) {
    const v = draft[f.key];
    if (f.type === 'preset') return Object.entries(PRESETS).map(([id, p]) =>
      `<button class="chip ${same(p.look, pickKeys(draft, p.look)) ? 'on' : ''}" data-preset="${id}">${esc(p.label)}</button>`).join('');
    if (f.type === 'choice') return f.options.map(o =>
      `<button class="chip ${v === o.id ? 'on' : ''}" data-k="${f.key}" data-v="${o.id}">${o.label}</button>`).join('');
    if (f.type === 'multi') return f.options.map(o =>
      `<button class="chip ${(v || []).includes(o.id) ? 'on' : ''}" data-k="${f.key}" data-toggle="${o.id}">${o.label}</button>`).join('');
    const lc = String(v || '').toLowerCase();
    return f.palette.map(c => `<button class="sw ${lc === c ? 'on' : ''}" style="background:${c}" data-k="${f.key}" data-v="${c}" title="${c}"></button>`).join('')
      + `<label class="sw custom ${f.palette.includes(lc) ? '' : 'on'}" title="Otro color" style="background:${esc(v || '#000000')}">
           <input type="color" data-k="${f.key}" value="${esc(v || '#000000')}"></label>`;
  }

  function render() {
    if (!name) return;
    $('.ed-name').textContent = labelOf(name);
    $('.ed-fields').innerHTML = FIELDS.map(f => `<div class="ed-field"><h3>${f.label}</h3><div class="ed-opts">${fieldHtml(f)}</div></div>`).join('');
    root.querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('on', b.dataset.dir === dir));
    root.querySelectorAll('[data-anim]').forEach(b => b.classList.toggle('on', b.dataset.anim === anim));
    const dirty = !same(draft, saved);
    $('.ed-save').disabled = !dirty;
    $('.ed-discard').disabled = !dirty;
    $('.ed-reset').disabled = !isCustom(name) && !dirty;
    $('.ed-status').textContent = dirty ? 'sin guardar' : isCustom(name) ? 'personalizado' : 'aspecto original';
  }

  function change(key, value) {
    draft[key] = value;
    frames = makeCharacter(draft);
    onPreview(name, draft);
    render();
  }

  function draw(t) {
    raf = requestAnimationFrame(draw);
    if (!frames) return;
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(6, 21, 8, 2);
    let f;
    if (anim === 'type') f = frames.typeDown[Math.floor(t / 140) % 2];
    else if (anim === 'walk') f = frames[dir][['a', 'stand', 'b', 'stand'][Math.floor(t / 130) % 4]];
    else f = frames[dir].stand;
    g.drawImage(f, 2, 1);
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !name) return;
    if (b.dataset.dir) { dir = b.dataset.dir; if (anim === 'type') anim = 'stand'; render(); }
    else if (b.dataset.anim) { anim = b.dataset.anim; render(); }
    else if (b.dataset.preset) {
      draft = { ...draft, ...clone(PRESETS[b.dataset.preset].look) };
      change('hairStyle', draft.hairStyle);
    }
    else if (b.dataset.toggle) {
      const id = b.dataset.toggle, opt = ACCESSORY_LIST.find(o => o.id === id);
      let acc = [...(draft.accessory || [])];
      if (acc.includes(id)) acc = acc.filter(a => a !== id);
      else {
        if (opt.hat) acc = acc.filter(a => !ACCESSORY_LIST.find(o => o.id === a).hat);   // solo un sombrero
        acc.push(id);
      }
      change('accessory', acc);
    }
    else if (b.dataset.k) change(b.dataset.k, b.dataset.v);
    else if (b.classList.contains('ed-random')) {
      draft = {
        ...draft, hairStyle: pick(Object.keys(HAIR_STYLES)), hair: pick(HAIR_COLORS), skin: pick(SKIN_COLORS),
        shirt: pick(CLOTH_COLORS), pants: pick(CLOTH_COLORS), shoes: pick(CLOTH_COLORS), accent: pick(CLOTH_COLORS), accent2: pick(CLOTH_COLORS), eyes: pick(EYE_COLORS),
        accessory: Math.random() < 0.6 ? [pick(ACCESSORY_LIST).id] : [],
      };
      change('hairStyle', draft.hairStyle);
    }
    else if (b.classList.contains('ed-reset')) { onReset(name); }
    else if (b.classList.contains('ed-discard')) { draft = clone(saved); change('hairStyle', draft.hairStyle); }
    else if (b.classList.contains('ed-save')) { onSave(name, clone(draft)); }
    else if (b.classList.contains('ed-close')) { close(); onClose(); }
  });
  root.addEventListener('input', e => {
    if (e.target.type === 'color') change(e.target.dataset.k, e.target.value.toLowerCase());
  });

  let onClose = () => {};
  function open(n) {
    if (n === name) return;
    if (name && draft && !same(draft, saved)) onPreview(name, saved);   // descarta lo no guardado
    name = n;
    saved = clone(lookOf(n));
    draft = clone(saved);
    frames = makeCharacter(draft);
    root.hidden = false;
    if (!raf) raf = requestAnimationFrame(draw);
    render();
  }
  function close() {
    if (name && draft && !same(draft, saved)) onPreview(name, saved);
    name = null; root.hidden = true;
    cancelAnimationFrame(raf); raf = 0;
  }
  // Llamar cuando cambian los aspectos guardados (por ejemplo, desde otra ventana)
  function refresh() {
    if (!name) return;
    const dirty = !same(draft, saved);
    saved = clone(lookOf(name));
    if (!dirty) { draft = clone(saved); frames = makeCharacter(draft); }
    onPreview(name, draft);
    render();
  }
  return { open, close, refresh, get name() { return name; }, set onClose(fn) { onClose = fn; } };
}
