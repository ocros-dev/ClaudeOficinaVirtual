// Dibujo de los actores de combate (dueño: N3): sombra, imágenes residuales, sprite (vía drawFrame de links.js),
// destello, carga de rayo, halo, aparición y muerte del rey. No decide nada de coreografía.
import * as vfx from '../render/vfx.js';
import { reduced } from '../render/vfx.js';
import { heroFrame, kingFrame, enemyFrame, drawFrame } from '../render/links.js';
import { KING_Y, CFG } from '../config.js';
import { anchorPt } from './actor.js';
import * as D from './director.js';
import * as KA from './king-ai.js';

// Destello de golpe: un pico de luz que decae, no una silueta blanca. Cuanto mayor es el actor, más breve y suave:
// el rey ≤ 0,22 de opacidad y 80 ms (así su color se lee siempre) (drawFrame lo acota además por el tamaño del sprite). Con movimiento reducido,
// un destello fijo y corto (el limitador del director cuenta igualmente ≤ 3 por segundo).
const FLASH = { king: [80, .22], elite: [100, .38], minion: [110, .7], hero: [130, .85] };
function flashOf(a, now) {
  const [ms, peak] = FLASH[a.kind] || FLASH.hero, age = now - a.flashAt;
  if (age < 0 || age >= ms) return 0;
  return reduced() ? peak * .6 : peak * (1 - age / ms);
}

function shadow(g, x, y, w, z = 0) {
  const k = 1 - Math.min(.5, z / 140), rw = Math.max(6, w * .32 * k);
  g.fillStyle = 'rgba(0,0,0,.30)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y) + 1, rw, rw * .26, 0, 0, Math.PI * 2); g.fill();
}
// Medidas del sprite que se dibuja: ancho de la celda, alto sobre los pies, anclas y desplazamiento del centro de la celda
// respecto de los pies (cxo, mirando a la derecha). Los élites y el rey no están centrados en sus pies (arma, cola, alas).
function noteFrame(a, f) {
  if (!f || !f.w) return;
  a.fw = f.w; a.fh = f.top || f.h || a.fh; a.ftop = f.top || f.h; a.pts = f.pts || null; a.ready = f.ready; a.cxo = f.w / 2 - (f.ax || f.w / 2);
}
const midX = a => a.x + a.recoil.dx + a.face * (a.cxo || 0);

function drawGhosts(g, a, now, getFrame, tint) {
  for (const gh of a.ghosts) {
    const age = now - gh.t0; if (age < 0 || age > gh.life) continue;
    const f = getFrame(gh.anim, gh.frame);
    drawFrame(g, f, gh.x, gh.y, { face: gh.face, z: gh.z, alpha: gh.alpha * (1 - age / gh.life), tint });
  }
}
// Efectos que cuelgan del actor: carga de rayo y halo de potenciación
function drawAura(g, a, now, A) {
  if (a.charge) {
    const c = a.charge, k = Math.min(1, (now - c.t0) / c.ms), m = A.muzzleOf(a, c.from);
    vfx.drawCharge(g, m.x, m.y, reduced() ? 1 : k, { style: c.style, color: c.color, color2: c.color2, size: c.size, lite: a.lite });
  }
  if (a.halo) {
    const k = (now - a.halo.t0) / a.halo.ms;
    if (k <= 1.05) vfx.drawHalo(g, a.x + a.recoil.dx, a.y, a.fh || 60, k, { color: a.halo.color }); else a.halo = null;
  }
  if (a.buffUntil > now) vfx.glow(g, '#e0d0ff', midX(a), a.y - a.z - (a.fh || 60) * .5, (a.fw || 48) * 1.5, (a.fh || 60) * 1.2, now, .25);
}

export function drawHero(g, a, p, A, now) {
  if (!a.visible) return;
  const gf = (anim, frame) => heroFrame(a.ref.race, a.ref.ci, p.stage, a.ref.variant, anim, frame);
  const f = gf(a.anim, a.frame); noteFrame(a, f);
  const x = a.x + a.recoil.dx;
  shadow(g, a.x, a.y, a.fw, a.z);
  drawGhosts(g, a, now, gf, p.style && p.style.spark);
  drawFrame(g, f, x, a.y, { face: a.face, z: a.z, alpha: a.alpha, flash: flashOf(a, now) });
  drawAura(g, a, now, A);
}

export function drawKing(g, a, A, now) {
  if (a.hidden) return;
  const id = a.ref.kingId, form = a.ref.form || 1;
  let anim = a.anim, frame = a.frame;
  if (!a.script && !a.dying && now < a.hitUntil) { anim = 'hit'; frame = Math.floor(now / 90) % 2; }
  const gf = (an, fr) => kingFrame(id, form, an, fr);
  const f = gf(anim, frame); noteFrame(a, f);
  const t = now - a.appearAt, ak = Math.min(1, t / (CFG.SPAWN_MS || 2000));
  let y = a.y, alpha = 1, flash = flashOf(a, now);
  if (t < (CFG.SPAWN_MS || 2000)) {                                   // aparición: surge del suelo o desciende
    const e = 1 - (1 - ak) ** 2;
    if (a.appear === 'descend') y = a.y - (1 - e) * 360; else y = a.y + (1 - e) * (a.fh || 240) * .8;
    alpha = Math.min(1, ak * 1.6);
    if (ak > .94 && a.appear === 'descend' && !a.landed) { a.landed = true; vfx.shockwave(a.x, a.y, { r: 160, color: '#e8dcc0', double: true }); vfx.shake(3, 260); }
  }
  let dk = 0;
  if (a.dying) {                                                       // muerte: parpadeo (≤ 3 por segundo), chispas y fundido
    dk = Math.min(1, (now - a.dying) / (CFG.DYING_MS || 2000));
    // muerte: pulso de luz suave cada 340 ms (≈ 3 por segundo), nunca la silueta entera en blanco
    const ph = (now - a.dying) % 340;
    alpha = 1 - dk * dk; flash = dk < .9 && ph < 110 ? .22 * (1 - ph / 110) : 0;
    if (!reduced() && Math.floor(now / 140) !== a.lastBurst) { a.lastBurst = Math.floor(now / 140); vfx.spark(a.x + (vfx.rnd() - .5) * (a.fw || 200) * .6, a.y - vfx.rnd() * (a.fh || 240), { color: '#ffffff', color2: '#ffc040', n: 6, speed: 130, size: 3 }); }
  }
  const x = a.x + a.recoil.dx, yy = y;
  shadow(g, a.x, a.y, (a.fw || 220) * 1.1, 0);
  drawGhosts(g, a, now, gf, KA.kingStyle() && KA.kingStyle().spark);
  drawFrame(g, f, x, yy, { face: 1, z: 0, alpha, flash });
  drawAura(g, a, now, A);
}

export function drawEnemy(g, a, kingId, glow, now) {
  if (a.dead && a.kind === 'minion') return;
  const kind = a.kind, type = a.ref.type;
  const gf = (anim, frame) => enemyFrame(kind, type, kingId, anim, frame);
  const f = gf(a.anim, a.frame); noteFrame(a, f);
  const grow = Math.min(1, (now - a.born) / (kind === 'elite' ? 500 : 400));
  const x = a.x + a.recoil.dx, alpha = (a.alpha ?? 1) * grow;
  if (type !== 'murcielago') shadow(g, a.x, a.y, a.fw, a.z);
  const mx = midX(a);
  if (glow && type !== 'ojo') vfx.glow(g, glow, mx, a.y - a.z - (a.fh || 30) * .5, (a.fw || 30) * 1.5, (a.fh || 30) * 1.15, now, kind === 'elite' ? .3 : .28);
  drawGhosts(g, a, now, gf, glow);
  if (a.shield && now < a.shield) { g.strokeStyle = '#7a38b8'; g.lineWidth = 2; g.globalAlpha = .7; g.beginPath(); g.ellipse(Math.round(mx), Math.round(a.y - a.z - (a.fh || 50) * .5), (a.fw || 50) * .6, (a.fh || 50) * .6, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  drawFrame(g, f, x, a.y, { face: a.face, z: a.z, alpha, flash: Math.max(flashOf(a, now), a.dying && now - a.dying < 110 ? .38 * (1 - (now - a.dying) / 110) : 0) });
  if (a.charge) { const c = a.charge, m = anchorPt(a, c.from, 'orb', 'blade', 'muzzle', 'jaw', 'bell') || { x: mx, y: a.y - a.z - (a.fh || 40) * .6 }; vfx.drawCharge(g, m.x, m.y, Math.min(1, (now - c.t0) / c.ms), { style: c.style, color: c.color, color2: c.color2, size: c.size, lite: true }); }
}
