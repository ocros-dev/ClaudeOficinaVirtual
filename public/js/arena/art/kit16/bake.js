// Horneado del kit 16 bits: partes + pose -> raster indexado -> líneas internas y contorno -> tira.
// bake*Strip son generadores (function*) que ceden el control tras cada fotograma para que el
// planificador los trocee. La parte de índices no toca el DOM; solo colorStrip crea un lienzo.

import { Raster, ellipse, polygon, capsule, strip as stripPrim, line as linePrim, fold as foldPrim, smoothPts, plot } from './raster.js';
import { innerLines, outline, bounds } from './outline.js';
import { solve, SEGMENTS } from './rig.js';
import { HERO_ANIMS, KING_ANIMS, ELITE_ANIMS, MINION_ANIMS, heroPose, kingPose, elitePose, minionPose } from './poses.js';

const D = Math.PI / 180;
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/**
 * Crea el pintor P que reciben las funciones draw(P, ctx) de razas, reyes y enemigos.
 * Las coordenadas son del mundo del fotograma: (0,0) = centro de los pies en el suelo, y hacia arriba es negativo.
 */
export function makePainter(r, ox, oy, rig, ctx, materials) {
  const { J, A, L } = rig;
  const mi = {}; materials.forEach((m, i) => { mi[m] = i; });
  const anchors = {};
  let far = false, defLine = false;
  const mat = m => {
    if (typeof m === 'number') return m;
    if (m === 'emit') return -1;
    if (m === 'white') return -2;
    if (!(m in mi)) throw new Error(`kit16: material desconocido «${m}»`);
    return mi[m];
  };
  const T = p => [p[0] + ox, p[1] + oy];
  const TT = pts => pts.map(T);
  const opt = (o, shade) => ({ shade, ...o, far: o && o.far !== undefined ? o.far : far, line: o && o.line !== undefined ? o.line : defLine, on: o && o.on !== undefined ? mat(o.on) : undefined });
  const P = {
    J, A, L, ctx, r,
    layer(name) { far = name === 'far'; defLine = name === 'near' || name === 'top'; return P; },
    j(name, dx = 0, dy = 0) {
      const p = J[name];
      if (!p) { if (name === 'origin') return [dx, dy]; throw new Error(`kit16: articulación desconocida «${name}»`); }
      return [p[0] + dx, p[1] + dy];
    },
    ang: seg => A[seg],
    /** Vector unitario de un segmento (de la articulación inicial a la final). */
    dir(seg) { const [a, b] = SEGMENTS[seg]; const dx = J[b][0] - J[a][0], dy = J[b][1] - J[a][1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; },
    group(line = false) { return r.newGroup(line, -9); },
    limb(seg, m, w0, w1 = w0, o = {}) {
      const s = SEGMENTS[seg]; if (!s) throw new Error(`kit16: segmento desconocido «${seg}»`);
      return capsule(r, T(J[s[0]]), T(J[s[1]]), w0 / 2, w1 / 2, mat(m), opt(o, 'cyl'));
    },
    cap(a, b, w0, w1, m, o = {}) { return capsule(r, T(a), T(b), w0 / 2, w1 / 2, mat(m), opt(o, 'cyl')); },
    blob(pt, rx, ry, m, o = {}) { const c = T(pt); return ellipse(r, c[0], c[1], rx, ry, mat(m), opt(o, 'vol')); },
    poly(pts, m, o = {}) { return polygon(r, TT(pts), mat(m), opt(o, 'vol')); },
    smooth(pts, m, o = {}) { return polygon(r, smoothPts(TT(pts), o.n || 4, true), mat(m), opt(o, 'vol')); },
    strip(pts, w0, w1, m, o = {}) { const q = TT(pts); return stripPrim(r, o.smooth ? smoothPts(q, 4, false) : q, w0, w1, mat(m), opt(o, 'cyl')); },
    /** Mechón de pelo: arranca en root con ángulo ang (0 = hacia abajo, + hacia delante), longitud len, ancho w, curva y vaivén. */
    lock(root, { ang = -30, len = 10, w = 4, w1 = 1, curve = 0, sway = 0, n = 6 } = {}, m, o = {}) {
      const pts = [root.slice()]; let p = root.slice();
      for (let i = 0; i < n; i++) {
        const k = (i + 1) / n, a = (ang + curve * k + sway * Math.sin(ctx.phase * Math.PI * 2 + k * 2.4) * k) * D;
        p = [p[0] + Math.sin(a) * len / n, p[1] + Math.cos(a) * len / n]; pts.push(p);
      }
      return stripPrim(r, smoothPts(TT(pts), 3, false), w, w1, mat(m), opt(o, 'cyl'));
    },
    /** Cinta curva que se afina (cuernos, colas, bufandas): suaviza la polilínea y la dibuja como tira de w0 a w1 px. */
    ribbon(pts, w0, w1, m, o = {}) { return stripPrim(r, smoothPts(TT(pts), o.n || 3, false), w0, w1, mat(m), opt(o, 'cyl')); },
    fold(pts, m) { foldPrim(r, TT(pts), mat(m)); },
    line(pts, m, tone = 2, o = {}) { return linePrim(r, TT(pts), mat(m), tone, opt(o, 'flat')); },
    /** Ojo de 2-3 px con brillo blanco puro. lid: párpado a medias (solo la línea). */
    eye(pt, { iris = 'iris', size = 3, lid = false } = {}) {
      const [x, y] = T(pt), m = mat(iris), g = r.newGroup(false, m), X = Math.round(x), Y = Math.round(y);
      const put = (px, py, v, t) => { if (px >= 0 && py >= 0 && px < r.w && py < r.h) { const i = py * r.w + px; r.idx[i] = v === 'c' ? 255 : v === 'w' ? 253 : 1 + m * 5 + t; r.grp[i] = g; } };
      put(X, Y, 'c'); put(X + 1, Y, 'c');
      if (lid) return;
      put(X, Y + 1, 'i', 3); put(X + 1, Y + 1, 'i', 2);
      if (size >= 3) { put(X, Y + 2, 'i', 2); put(X + 1, Y + 2, 'i', 1); }
      put(X, Y + 1, 'w');
    },
    /** Píxeles emisivos: { line: pts } | { poly: pts } | { blob: [pt, rx, ry] } | { px: [[x,y],...] } */
    emit(f) {
      if (f.line) return linePrim(r, TT(f.line), -1, 2, {});
      if (f.poly) return polygon(r, TT(f.poly), -1, { shade: 'flat' });
      if (f.blob) { const c = T(f.blob[0]); return ellipse(r, c[0], c[1], f.blob[1], f.blob[2], -1, { shade: 'flat' }); }
      if (f.px) for (const q of f.px) plot(r, q[0] + ox, q[1] + oy, -1, 2, 0);
    },
    anchor(name, pt) { anchors[name] = [pt[0], pt[1]]; },
    mat,
  };
  P.anchors = anchors;
  return P;
}

function sizeFor(L, extra = 0) {
  const w = Math.round(L.H * 2.6) + 4 + extra, h = Math.round(L.H * 2.2) + 4 + extra;
  return { w, h, gy: Math.round(h * .72) };
}

/** Rasteriza un fotograma con una función draw. Devuelve { idx, w, h, bx, by, anchors, topY }. */
function rasterFrame(r, size, rig, ctx, materials, draw, eight) {
  r.clear();
  const ox = size.gx ?? (r.w >> 1), oy = size.gy;
  const P = makePainter(r, ox, oy, rig, ctx, materials);
  const res = draw(P, ctx);
  if (res && typeof res.next === 'function') for (;;) { const s = res.next(); if (s.done) break; }
  innerLines(r);
  outline(r, eight);
  const b = bounds(r);
  return { P, ox, oy, b };
}

// Ensambla los fotogramas recortados en una tira con celda común (caja unión de todos).
function assemble(frames, ox, oy, ms) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const f of frames) if (f.b) { x0 = Math.min(x0, f.b.x0); y0 = Math.min(y0, f.b.y0); x1 = Math.max(x1, f.b.x1); y1 = Math.max(y1, f.b.y1); }
  if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, n = frames.length, W = cw * n, idx = new Uint8Array(W * ch);
  const pts = [], top = [];
  frames.forEach((f, k) => {
    if (f.b) for (let y = f.b.y0; y <= f.b.y1; y++) {
      const src = y * f.rw + f.b.x0, dst = (y - y0) * W + k * cw + (f.b.x0 - x0);
      idx.set(f.idx.subarray(src, src + (f.b.x1 - f.b.x0 + 1)), dst);
    }
    const q = {};
    for (const name in f.anchors) q[name] = [f.anchors[name][0], f.anchors[name][1]];
    pts.push(q); top.push(f.b ? oy - f.b.y0 : 0);
  });
  return { w: cw, h: ch, n, W, idx, ax: ox - x0, ay: oy - y0, pts, top, bytes: W * ch, ms };
}

const keep = (r, res, anchors) => ({ idx: r.idx.slice(), rw: r.w, b: res.b, anchors });
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Hornea la tira de índices de una animación de héroe. art = raza (o maniquí), clsIdx = clase.
 * variant (0 = A, 1 = B) llega a ctx.variant; el registro solo la pasa (y la incluye en la clave de caché) si la raza declara geomVariant.
 */
export function* bakeHeroStrip(art, clsIdx, geomStage, anim, scale = 1, variant = 0) {
  const t0 = now();
  const cls = art.classes[clsIdx], build = cls.build || {}, body = build.body || 'atleta';
  const n = (art.extraAnims && art.extraAnims[anim]) || HERO_ANIMS[anim] || 1;
  const rig0 = solve(body, build, {}, scale), size = sizeFor(rig0.L), r = new Raster(size.w, size.h);
  const frames = [];
  const extra = art.extraPoses && art.extraPoses[body] && art.extraPoses[body][anim];
  const seed = hashStr(`${art.id}|${cls.id}|${geomStage}|${anim}` + (variant ? '|B' : ''));
  for (let k = 0; k < n; k++) {
    let pose = heroPose(body, anim, k, n);
    if (extra && extra[k]) pose = { ...pose, ...extra[k] };
    if (cls.pose) { const o = cls.pose(anim, k, pose); if (o) pose = { ...pose, ...o }; }
    const rig = solve(body, build, pose, scale);
    const ctx = { stage: geomStage, variant: variant ? 1 : 0, anim, frame: k, n, phase: k / n, cls: clsIdx, clsDef: cls, build, face: 1, rng: mulberry32(seed + k), s: scale, pose, J: rig.J, A: rig.A, L: rig.L, body };
    const res = rasterFrame(r, size, rig, ctx, art.materials, cls.draw || art.draw, !!(cls.outline8 || art.outline8));
    const anchors = { ...res.P.anchors };
    for (const a of ['haN', 'haF', 'tipN', 'head', 'chest', ...(cls.anchors || [])]) if (rig.J[a] && !anchors[a]) anchors[a] = rig.J[a];
    frames.push(keep(r, res, anchors));
    yield;
  }
  return assemble(frames, size.gx ?? (size.w >> 1), size.gy, now() - t0);
}

/** Tira de un rey: forma 1..3. art.size(form) = { w, h, gx?, gy? }. */
export function* bakeKingStrip(art, form, anim, only = null) {   // only: hornea solo ese fotograma (póster)
  const t0 = now(), n = KING_ANIMS[anim] || 1;
  const size = (art.size && art.size(form)) || { w: 340, h: 360, gy: 340 };
  size.gy = size.gy ?? size.h - 20;
  const r = new Raster(size.w, size.h), frames = [];
  const seed = hashStr(`${art.id}|${form}|${anim}`);
  for (let k = 0; k < n; k++) {
    if (only !== null && k !== only) continue;
    let kp = kingPose(anim, k);
    if (art.poseOverride) kp = { ...kp, ...(art.poseOverride(form, anim, k) || {}) };
    const rig = { J: {}, A: {}, L: { H: size.h, scale: 1 } };
    const ctx = { form, stage: form, anim, frame: k, n, phase: k / n, kp, face: 1, rng: mulberry32(seed + k), s: 1 };
    const res = rasterFrame(r, size, rig, ctx, art.materials, art.draw, true);
    frames.push(keep(r, res, { ...res.P.anchors }));
    yield;
  }
  return assemble(frames, size.gx ?? (size.w >> 1), size.gy, now() - t0);
}

/** Tira de un secuaz o élite (índices; se colorean con la paleta de cada rey). */
export function* bakeEnemyStrip(art, kind, type, anim) {
  const t0 = now(), def = art.types.find(t => t.id === type) || art.types[0];
  const n = (kind === 'elite' ? ELITE_ANIMS : MINION_ANIMS)[anim] || 1;
  const size = { ...def.size }; size.gy = size.gy ?? size.h - 3;
  const r = new Raster(size.w, size.h), frames = [], seed = hashStr(`${kind}|${type}|${anim}`);
  for (let k = 0; k < n; k++) {
    const ep = kind === 'elite' ? elitePose(anim, k) : minionPose(anim, k);
    const rig = { J: {}, A: {}, L: { H: size.h, scale: 1 } };
    const ctx = { kind, type, anim, frame: k, n, phase: k / n, ep, face: 1, rng: mulberry32(seed + k), s: 1 };
    const res = rasterFrame(r, size, rig, ctx, art.materials, def.draw, false);
    frames.push(keep(r, res, { ...res.P.anchors }));
    yield;
  }
  return assemble(frames, size.gx ?? (size.w >> 1), size.gy, now() - t0);
}

/** Colorea una tira de índices con una paleta Uint32 y devuelve su lienzo (generador, por franjas). */
export function* colorStrip(st, pal) {
  const W = st.W, H = st.h;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(W, H);
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'), img = g.createImageData(W, H), out = new Uint32Array(img.data.buffer), idx = st.idx;
  const rows = Math.max(8, Math.floor(262144 / W));
  for (let y0 = 0; y0 < H; y0 += rows) {
    const e = Math.min(H, y0 + rows) * W;
    for (let i = y0 * W; i < e; i++) out[i] = pal[idx[i]];
    if (y0 + rows < H) yield;
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

/** Ejecuta un generador hasta el final (uso síncrono: maniquí, visor y pruebas). */
export function runSync(gen) { for (;;) { const s = gen.next(); if (s.done) return s.value; } }
