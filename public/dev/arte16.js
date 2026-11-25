// Visor de arte 16 bits: reproduce héroes (maniquí o raza), reyes, élites y secuaces con el registro real y ejecuta las
// comprobaciones automáticas de estilo y de presupuesto del documento de arquitectura (sección 6.2).
// Abrir con ?auto=1 para ejecutar todas las comprobaciones al cargar (window.__arteOk, window.__resultado).
import * as reg from '../js/arena/art/registry.js';
import { bakeHeroStrip, bakeKingStrip, bakeEnemyStrip, runSync } from '../js/arena/art/kit16/bake.js';
import { HERO_ANIMS, HERO_FRAME_TOTAL, KING_ANIMS, ELITE_ANIMS, MINION_ANIMS } from '../js/arena/art/kit16/poses.js';
import { BODY_TYPES } from '../js/arena/art/kit16/rig.js';
import { buildPalette } from '../js/arena/art/kit16/ramps.js';

const { RACE_ART, KING_ART, maniqui } = reg._internals;
const $ = id => document.getElementById(id);
const ALL = { maniqui, ...RACE_ART };
// Presupuestos de horneado por fotograma (ms) y de memoria. Se miden varias veces y se juzga la mediana, no una muestra.
const LIM = { heroMs: 2, kingMs: 12, eliteMs: 4, minionMs: 1, setBytes: 1.6 * 1048576, kingFormBytes: 16 * 1048576, reps: 5 };
// Anclas que el combate usa como origen de proyectiles, rayos y especiales
const ANCLAS_REY = ['hands', 'eyes', 'core', 'mouth'];
const ANCLA_ELITE = { verdugo: 'blade', brujo: 'orb', cancerbero: 'jaw', heraldo: 'bell' };
const ANCLA_MINION = { ojo: 'muzzle' };
const ENEMIGOS = { elite: reg._internals.elites, minion: reg._internals.minions };
const mediana = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

// ---- selectores ------------------------------------------------------------------------------
for (const id of Object.keys(ALL)) $('raza').add(new Option(id + (ALL[id].ready ? '' : ' (maniquí tintado)'), id));
for (const id of Object.keys(KING_ART)) $('rey').add(new Option(id, id));
const modo = () => $('modo').value;
const kindEnemigo = () => (modo() === 'elite' ? 'elite' : 'minion');
const animsDe = art => [...Object.keys(HERO_ANIMS), ...Object.keys(art.extraAnims || {})];
function animsModo() {
  if (modo() === 'rey') return Object.keys(KING_ANIMS);
  if (modo() === 'elite') return Object.keys(ELITE_ANIMS);
  if (modo() === 'minion') return Object.keys(MINION_ANIMS);
  return animsDe(ALL[$('raza').value]);
}
function rellenar() {
  const m = modo(), a = $('anim').value;
  document.querySelectorAll('[data-modo]').forEach(l => { l.hidden = !l.dataset.modo.split(' ').includes(m === 'elite' || m === 'minion' ? 'enemigo' : m); });
  if (m === 'heroe') { const art = ALL[$('raza').value]; $('clase').length = 0; art.classes.forEach((c, i) => $('clase').add(new Option(c.name || c.id, i))); }
  if (m === 'elite' || m === 'minion') { const t = $('tipo').value; $('tipo').length = 0; ENEMIGOS[m].types.forEach(x => $('tipo').add(new Option(x.id, x.id))); if (t) $('tipo').value = t; if (!$('tipo').value) $('tipo').selectedIndex = 0; }
  $('anim').length = 0; animsModo().forEach(x => $('anim').add(new Option(x, x)));
  if (a) $('anim').value = a; if (!$('anim').value) $('anim').value = 'idle';
  frame = 0;
}
let frame = 0;
$('modo').onchange = rellenar; $('raza').onchange = rellenar; $('tipo').onchange = () => { frame = 0; };
rellenar();
$('zoom').oninput = () => { $('zoomv').textContent = $('zoom').value; };
$('vel').oninput = () => { $('velv').textContent = $('vel').value; };

// ---- reproducción ---------------------------------------------------------------------------
let playing = true, tLast = 0, tAcc = 0;
$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pausar' : 'Reproducir'; $('play').setAttribute('aria-pressed', playing); };
const n = () => {
  const m = modo(), an = $('anim').value;
  if (m === 'heroe') return reg.frameCount('hero', reg.resolveAnim($('raza').value, an), $('raza').value);
  return reg.frameCount(m === 'rey' ? 'king' : m, an);
};
$('prev').onclick = () => { playing = false; $('play').textContent = 'Reproducir'; frame = (frame + n() - 1) % n(); };
$('next').onclick = () => { playing = false; $('play').textContent = 'Reproducir'; frame = (frame + 1) % n(); };
$('anim').onchange = () => { frame = 0; };

const cv = $('escena'), g = cv.getContext('2d');
const cvs = [];
// Fotograma según el modo (el registro hornea en segundo plano; hasta entonces devuelve el último bueno o nada)
function frameActual(fr) {
  const m = modo(), an = $('anim').value;
  if (m === 'rey') return reg.kingFrame($('rey').value, +$('forma').value, an, fr);
  if (m === 'elite' || m === 'minion') return reg.enemyFrame(m, $('tipo').value, $('rey').value, an, fr);
  return reg.heroFrame($('raza').value, +$('clase').value, +$('etapa').value, +$('variante').value, an, fr);
}
function dibujar(g2, w, h, z, race, cls, fr, overlay, face) {
  g2.clearRect(0, 0, w, h);
  g2.fillStyle = '#2f5040'; g2.fillRect(0, h - 40 * z / 4 - 2, w, 1);
  const f = race === null ? frameActual(fr) : reg.heroFrame(race, cls, +$('etapa').value, +$('variante').value, $('anim').value, fr);
  const fx = w / 2, fy = h - 40 * z / 4;
  g2.save(); g2.translate(fx, fy); g2.scale(z, z);
  reg.drawFrame(g2, f, 0, 0, { face });
  if (overlay) {
    g2.fillStyle = '#ff0'; g2.fillRect(-1, -1, 2, 2);
    g2.fillStyle = '#f0f'; for (const k in f.pts) { const p = f.pts[k]; g2.fillRect(Math.round(face * p[0]) - 1, Math.round(p[1]) - 1, 2, 2); }
  }
  g2.restore();
  return f;
}
function bucle(t) {
  const fps = +$('vel').value;
  if (playing) { tAcc += t - tLast; const step = 1000 / fps; while (tAcc >= step) { tAcc -= step; frame = (frame + 1) % n(); } }
  tLast = t;
  const m = modo(), z = Math.min(+$('zoom').value, m === 'rey' ? 1 : m === 'elite' ? 3 : 6), face = $('flip').checked ? -1 : 1, ov = $('ov').checked;
  const f = dibujar(g, cv.width, cv.height, z, null, 0, frame, ov, face);
  const quien = m === 'rey' ? `${$('rey').value} forma ${$('forma').value}` : m === 'heroe' ? $('raza').value : `${m} ${$('tipo').value} (${$('rey').value})`;
  $('estado').textContent = `${quien} · ${$('anim').value} ${frame + 1}/${n()}` + (f.ready ? '' : ' · sustituto (horneando)');
  cvs.forEach(c => dibujar(c.g, c.w, c.h, 2, 'maniqui', c.i, frame % reg.frameCount('hero', $('anim').value, 'maniqui'), false, 1));
  requestAnimationFrame(bucle);
}
// galería de los 6 cuerpos
BODY_TYPES.forEach((b, i) => {
  const fig = document.createElement('figure'), c = document.createElement('canvas');
  c.width = 150; c.height = 190; c.setAttribute('aria-label', 'Maniquí ' + b);
  fig.append(c, b); $('galeria').append(fig); cvs.push({ g: c.getContext('2d'), w: 150, h: 190, i });
});

// ---- comprobaciones ---------------------------------------------------------------------------
const filas = [];
function fila(nombre, ok, detalle) {
  filas.push({ nombre, ok, detalle });
  const tr = document.createElement('tr');
  tr.innerHTML = `<td></td><td class="${ok ? 'ok' : 'mal'}">${ok ? 'OK' : 'FALLA'}</td><td></td>`;
  tr.cells[0].textContent = nombre; tr.cells[2].textContent = detalle; $('res').tBodies[0].append(tr);
}

// Píxeles opacos (que no sean contorno) pegados a un píxel transparente o al borde de la celda. Devuelve { n, donde } con
// las primeras posiciones para localizar el fallo: «fotograma:x,y».
function contornoOk(st) {
  const { w, h, n: nf, W, idx } = st; let malos = 0; const donde = [];
  for (let k = 0; k < nf; k++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = idx[y * W + k * w + x]; if (!v || v === 255) continue;
    const at = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : idx[yy * W + k * w + xx]; };
    if (!at(1, 0) || !at(-1, 0) || !at(0, 1) || !at(0, -1)) { malos++; if (donde.length < 4) donde.push(`f${k}:${x},${y}`); }
  }
  return { n: malos, donde };
}
// Píxeles con un material fuera de la lista de la raza
function indicesMalos(st, nMat) { let m = 0; for (let i = 0; i < st.idx.length; i++) { const v = st.idx[i]; if (v && v < 253 && ((v - 1) / 5 | 0) >= nMat) m++; } return m; }

// Mide `fn` varias veces tras un calentamiento y devuelve { med, min, max } en ms. La mediana descarta el ruido (GC, JIT).
function medir(fn, reps = LIM.reps) {
  fn();
  const t = []; let st;
  for (let i = 0; i < reps; i++) { const t0 = performance.now(); st = fn(); t.push(performance.now() - t0); }
  return { med: mediana(t), min: Math.min(...t), max: Math.max(...t), st };
}

function comprobarJuego(raceId, ci, stage, variant, etiqueta) {
  const art = ALL[raceId], cls = art.classes[ci], build = cls.build || {}, H = build.height || 60;
  const gs = art.geomStage ? art.geomStage(stage) : stage, scale = (art.stageScale && art.stageScale[Math.min(art.stageScale.length, gs) - 1]) || 1;
  let frames = 0, bytes = 0, peor = 0, contorno = 0, donde = [], faltan = [], indices = 0, ms = 0, topIdle = 0, sinAncla = 0;
  const anims = animsDe(art), nMat = art.materials.length;
  for (const an of anims) {
    runSync(bakeHeroStrip(art, ci, gs, an, scale, variant));       // calentamiento (JIT)
    const t0 = performance.now(), st = runSync(bakeHeroStrip(art, ci, gs, an, scale, variant)), d = performance.now() - t0;
    const esperado = (art.extraAnims && art.extraAnims[an]) || HERO_ANIMS[an];
    if (st.n !== esperado) faltan.push(an);
    ms += d; frames += st.n; peor = Math.max(peor, d / st.n); bytes += st.W * st.h * 4;
    const c = contornoOk(st); contorno += c.n; if (c.n && donde.length < 4) donde.push(`${an} ${c.donde[0]}`);
    indices += indicesMalos(st, nMat);
    if (an === 'idle') topIdle = st.top[0];
    if (!st.pts.every(p => p.haN || p.muzzle || p.rod)) sinAncla++;
  }
  const alturaOk = topIdle >= H * scale * .85 && topIdle <= H * scale * 1.3;
  const medio = ms / frames;
  const base = `${etiqueta} · ${raceId}/${cls.id} e${stage} ${variant ? 'B' : 'A'}`;
  fila(`${base}: animaciones`, !faltan.length && frames >= HERO_FRAME_TOTAL, `${frames} fotogramas (mín. ${HERO_FRAME_TOTAL})` + (faltan.length ? ' · mal: ' + faltan : ''));
  fila(`${base}: ≤ 5 tonos por material`, !indices, indices ? `${indices} píxeles con material fuera de la lista` : 'índices material×tono (5 tonos por construcción)');
  fila(`${base}: contorno #0a0810`, !contorno, contorno ? `${contorno} píxeles de borde sin contorno (p. ej. ${donde.join('; ')})` : 'todo el borde cubierto');
  fila(`${base}: altura`, alturaOk, `idle ${topIdle} px, esperado ${(H * scale * .85) | 0}-${(H * scale * 1.3) | 0}`);
  fila(`${base}: ancla de disparo (haN/muzzle)`, !sinAncla, sinAncla ? `${sinAncla} tiras con fotogramas sin ancla` : 'todos los fotogramas');
  fila(`${base}: horneado ≤ ${LIM.heroMs} ms/fotograma`, medio <= LIM.heroMs, `media ${medio.toFixed(2)} ms, peor tira ${peor.toFixed(2)} ms`);
  fila(`${base}: bytes ≤ 1,6 MB`, bytes <= LIM.setBytes, `${(bytes / 1048576).toFixed(2)} MB`);
  return { medio, bytes, frames, ok: !faltan.length && !contorno && !indices && alturaOk && !sinAncla && medio <= LIM.heroMs && bytes <= LIM.setBytes };
}

// Rey: por forma y animación. Mide el horneado por fotograma (mediana de varias tiras), el contorno, los materiales,
// el número de fotogramas y las anclas que usa el combate (hands, eyes, core, mouth).
function comprobarRey(id, form, anims = Object.keys(KING_ANIMS)) {
  const art = KING_ART[id], etq = `rey ${id} forma ${form}`;
  if (!art.ready) { fila(etq, true, 'pendiente (ready:false)'); return { ok: true }; }
  let contorno = 0, donde = [], indices = 0, bytes = 0, peor = { ms: 0, an: '' }, faltan = [], sinAncla = new Set();
  for (const an of anims) {
    const m = medir(() => runSync(bakeKingStrip(art, form, an))), st = m.st, porFot = m.med / st.n;
    if (porFot > peor.ms) peor = { ms: porFot, an, min: m.min / st.n, max: m.max / st.n };
    if (st.n !== KING_ANIMS[an]) faltan.push(an);
    bytes += st.W * st.h * 4;
    const c = contornoOk(st); contorno += c.n; if (c.n && donde.length < 4) donde.push(`${an} ${c.donde[0]}`);
    indices += indicesMalos(st, art.materials.length);
    for (const p of st.pts) for (const nom of ANCLAS_REY) if (!p[nom]) sinAncla.add(nom);
  }
  const okMs = peor.ms <= LIM.kingMs;
  fila(`${etq}: horneado ≤ ${LIM.kingMs} ms/fotograma`, okMs, `peor animación ${peor.an}: mediana ${peor.ms.toFixed(2)} ms (mín. ${(peor.min ?? 0).toFixed(2)}, máx. ${(peor.max ?? 0).toFixed(2)}, ${LIM.reps} mediciones)`);
  fila(`${etq}: animaciones (${anims.length})`, !faltan.length, faltan.length ? 'fotogramas mal en: ' + faltan : `${anims.reduce((a, b) => a + KING_ANIMS[b], 0)} fotogramas`);
  fila(`${etq}: contorno`, !contorno, contorno ? `${contorno} píxeles de borde sin contorno (p. ej. ${donde.join('; ')})` : 'todo el borde cubierto');
  fila(`${etq}: materiales`, !indices, indices ? `${indices} píxeles con material fuera de la lista` : 'índices válidos');
  fila(`${etq}: anclas ${ANCLAS_REY.join('/')}`, !sinAncla.size, sinAncla.size ? 'faltan: ' + [...sinAncla] : 'presentes en todos los fotogramas');
  fila(`${etq}: memoria ≤ ${LIM.kingFormBytes >> 20} MB`, bytes <= LIM.kingFormBytes, `${(bytes / 1048576).toFixed(2)} MB (todas las animaciones, RGBA)`);
  return { ok: okMs && !faltan.length && !contorno && !indices && !sinAncla.size && bytes <= LIM.kingFormBytes, ms: peor.ms, bytes };
}

// Élites y secuaces: por tipo y animación (la geometría es común a los 4 reyes; se comprueba además cada paleta de rey).
function comprobarEnemigo(kind, tipo, anims) {
  const art = ENEMIGOS[kind], set = kind === 'elite' ? ELITE_ANIMS : MINION_ANIMS, lim = kind === 'elite' ? LIM.eliteMs : LIM.minionMs;
  anims = anims || Object.keys(set);
  const etq = `${kind === 'elite' ? 'élite' : 'secuaz'} ${tipo}`, ancla = (kind === 'elite' ? ANCLA_ELITE : ANCLA_MINION)[tipo];
  let contorno = 0, donde = [], indices = 0, peor = { ms: 0, an: '' }, faltan = [], anclaOk = true;
  for (const an of anims) {
    const m = medir(() => runSync(bakeEnemyStrip(art, kind, tipo, an))), st = m.st, porFot = m.med / st.n;
    if (porFot > peor.ms) peor = { ms: porFot, an, min: m.min / st.n, max: m.max / st.n };
    if (st.n !== set[an]) faltan.push(an);
    const c = contornoOk(st); contorno += c.n; if (c.n && donde.length < 4) donde.push(`${an} ${c.donde[0]}`);
    indices += indicesMalos(st, art.materials.length);
    if (ancla && !st.pts.every(p => p[ancla])) anclaOk = false;
  }
  // paletas de los 4 reyes: ninguna rampa ausente (material sin color)
  const sinRampa = [];
  for (const kid of Object.keys(KING_ART)) { const rp = art.ramps(kid); for (const mat of art.materials) if (!rp[mat]) sinRampa.push(`${kid}:${mat}`); }
  const okMs = peor.ms <= lim;
  fila(`${etq}: horneado ≤ ${lim} ms/fotograma`, okMs, `peor animación ${peor.an}: mediana ${peor.ms.toFixed(2)} ms (mín. ${(peor.min ?? 0).toFixed(2)}, máx. ${(peor.max ?? 0).toFixed(2)})`);
  fila(`${etq}: animaciones`, !faltan.length, faltan.length ? 'mal: ' + faltan : `${anims.reduce((a, b) => a + set[b], 0)} fotogramas`);
  fila(`${etq}: contorno`, !contorno, contorno ? `${contorno} píxeles de borde sin contorno (p. ej. ${donde.join('; ')})` : 'todo el borde cubierto');
  fila(`${etq}: materiales y paletas de rey`, !indices && !sinRampa.length, indices || sinRampa.length ? `${indices} fuera de lista; sin rampa: ${sinRampa}` : 'índices válidos, 4 paletas completas');
  if (ancla) fila(`${etq}: ancla ${ancla}`, anclaOk, anclaOk ? 'presente en todos los fotogramas' : 'falta en algún fotograma');
  return { ok: okMs && !faltan.length && !contorno && !indices && !sinRampa.length && anclaOk, ms: peor.ms };
}

function limpiar() { $('res').tBodies[0].textContent = ''; filas.length = 0; }
function comprobarActual() {
  limpiar();
  const m = modo(); let r;
  if (m === 'rey') r = comprobarRey($('rey').value, +$('forma').value);
  else if (m === 'elite' || m === 'minion') r = comprobarEnemigo(m, $('tipo').value);
  else r = comprobarJuego($('raza').value, +$('clase').value, +$('etapa').value, +$('variante').value, 'actual');
  info();
  return r;
}
function comprobarTodos() {
  limpiar();
  let todo = true;
  BODY_TYPES.forEach((b, i) => { todo = comprobarJuego('maniqui', i, 1, 0, 'cuerpo ' + b).ok && todo; });
  for (const id of Object.keys(RACE_ART)) {
    const art = RACE_ART[id];
    if (art.ready) art.classes.forEach((c, i) => { for (let s = 1; s <= (art.stageScale || [1, 1, 1]).length; s++) for (const v of [0, 1]) todo = comprobarJuego(id, i, s, v, 'raza').ok && todo; });
  }
  for (const id of Object.keys(KING_ART)) for (const form of [1, 2, 3]) todo = comprobarRey(id, form).ok && todo;
  for (const kind of ['elite', 'minion']) for (const t of ENEMIGOS[kind].types) todo = comprobarEnemigo(kind, t.id).ok && todo;
  info();
  const malas = filas.filter(f => !f.ok);
  window.__arteOk = !malas.length && !window.__errores.length;
  window.__resultado = { filas: filas.length, filasTodas: filas, malas: malas.map(f => f.nombre + ': ' + f.detalle), errores: window.__errores };
  $('estado').textContent = window.__arteOk ? `Todas las comprobaciones pasan (${filas.length})` : `Fallan ${malas.length} de ${filas.length}`;
  return todo;
}
$('check').onclick = comprobarActual;
$('checkAll').onclick = comprobarTodos;

function info() {
  const s = reg.stats();
  $('info').textContent = `caché de índices: ${s.idxMB} MB (${s.idxStrips} tiras)\nlienzos RGBA: ${s.canvasMB} MB (${s.strips} tiras)\ncola de horneado: ${s.queue}\nhorneado: ${s.bakes} tiras, media ${s.avgBakeMs} ms\nmayor coste por fotograma: ${s.longestBakeMsPerFrame} ms\npaso más largo del planificador: ${s.longestStepMs} ms`;
}
setInterval(info, 500);

reg.prewarm({ race: 'maniqui', group: 'open', stage: 1, variant: 0 });
requestAnimationFrame(t => { tLast = t; bucle(t); });
if (new URLSearchParams(location.search).get('auto')) setTimeout(comprobarTodos, 300);
