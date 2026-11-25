// Maniquí: raza de respaldo animada y referencia viva del rig. Un solo dibujo (cabeza con pelo en masas,
// túnica con pliegues, mangas, botas y un arma sencilla) que sirve a los 6 tipos de cuerpo y se tiñe con
// los colores de la raza. Las razas con ready:false se ven con él (ADR-A5). Solo importa del kit.
import { ramp5, tintRamps, MANIQUI_MATERIALS } from './kit16/ramps.js';
import { BODY_TYPES } from './kit16/rig.js';

const D = Math.PI / 180;

const ALTURA = { atleta: 60, robusto: 58, menudo: 44, fiera: 58, draco: 64, etereo: 60 };

function draw(P, ctx) {
  const { J, L, A } = P, look = (ctx.clsDef && ctx.clsDef.look) || {}, hairStyle = look.hair || 'largo', wpn = (ctx.clsDef && ctx.clsDef.weapon) ?? (ctx.cls % 3);
  const ph = ctx.phase * Math.PI * 2, s = L.H / 60;
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const aT = A.torsoLean * D, up = [Math.sin(aT), -Math.cos(aT)], fwd = [Math.cos(aT), Math.sin(aT)];
  const sw = (amp, off = 0) => Math.sin(ph + off) * amp * s;

  // ---- capa lejana: cola, pierna y brazo del lado lejano (un tono más oscuro) ----
  P.layer('far');
  if (L.tail) {
    P.strip([J.root, J.tail1, J.tail2, J.tail3], L.thighW * .8, 1.2, 'cloth2', { smooth: true });
  }
  const leg = (S, layerName) => {
    P.layer(layerName);
    P.limb('leg' + S + '.upper', 'cloth2', L.thighW, L.thighW * .8);
    P.limb('leg' + S + '.lower', 'cloth2', L.shinW * 1.05, L.shinW * .85);
    // bota: caña, empeine y puntera
    const bootTop = [J['ft' + S][0] + (J['kn' + S][0] - J['ft' + S][0]) * .28, J['ft' + S][1] + (J['kn' + S][1] - J['ft' + S][1]) * .28];
    P.cap(bootTop, J['ft' + S], L.shinW * 1.2, L.shinW * 1.0, 'leather');
    P.cap(J['heel' + S], J['toe' + S], L.ankle * 1.9, L.ankle * 1.35, 'leather', { shade: 'cyl' });
  };
  const arm = (S, layerName) => {
    P.layer(layerName);
    P.limb('arm' + S + '.upper', 'cloth', L.upperW * 1.15, L.upperW * 1.0);
    P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.05, L.lowerW * .85);
    P.cap(add(J['el' + S], P.dir('arm' + S + '.lower'), L.lower * .28), J['el' + S], L.lowerW * 1.3, L.lowerW * 1.2, 'trim', { shade: 'cyl' });   // brazalete
    P.blob(J['ha' + S], L.lowerW * .62, L.lowerW * .62, 'skin', { shade: 'sphere' });
  };
  leg('F', 'far');
  arm('F', 'far');

  // ---- tronco ----
  P.layer('body');
  if (look.wings) P.poly([J.wing, add(J.wing, [-L.H * .35, -L.H * .25]), add(J.wing, [-L.H * .3, L.H * .05])], 'cloth2', { shade: 'vol' });
  const hw = L.hipW / 2, tw = L.torsoW / 2, shape = [
    add(J.root, fwd, -hw), add(J.spine, fwd, -tw * .82), add(J.chest, fwd, -tw * 1.0), add(add(J.chest, up, L.neck * .5), fwd, -tw * .25),
    add(add(J.chest, up, L.neck * .5), fwd, tw * .3), add(J.chest, fwd, tw * 1.08), add(J.spine, fwd, tw * .78), add(J.root, fwd, hw * 1.05), add(J.root, up, -hw * .5),
  ];
  P.smooth(shape, 'cloth', { n: 3 });
  // cinturón y faldón con vaivén
  const waist = add(J.spine, up, -L.torso * .14);
  P.poly([add(waist, fwd, -tw * .9), add(waist, fwd, tw * .86), add(add(waist, up, -L.torso * .08), fwd, tw * .86), add(add(waist, up, -L.torso * .08), fwd, -tw * .9)], 'leather', { shade: 'flat', tone: 2, on: 'cloth' });
  const hem = add(J.root, [0, 1], L.thigh * .62);
  P.poly([add(J.root, fwd, -hw * 1.15), add(J.root, fwd, hw * 1.25), [hem[0] + hw * 1.5 + sw(1.2), hem[1]], [hem[0] - hw * 1.5 + sw(1.6, 1), hem[1] + 1 * s]], 'cloth', { shade: 'vol', line: false });
  // pliegues del torso y del faldón
  P.fold([add(J.spine, fwd, -tw * .3), add(J.root, fwd, -tw * .1)], 'cloth');
  P.fold([add(J.chest, fwd, tw * .35), add(J.spine, fwd, tw * .25)], 'cloth');
  P.fold([add(J.root, fwd, hw * .1), [hem[0] + sw(1), hem[1] - 1]], 'cloth');
  // pierna cercana tras el faldón no; delante de él
  leg('N', 'near');

  // ---- cuello y cabeza ----
  P.layer('body');
  P.cap(J.chest, J.head, L.head * .26, L.head * .24, 'skin');
  const ha = A.headAng * D, hu = [Math.sin(ha), -Math.cos(ha)], hf = [Math.cos(ha), Math.sin(ha)];
  const R = L.head * .40;                                           // radio base de la cabeza
  const hp = (x, y) => [J.head[0] + hf[0] * x * R - hu[0] * y * R, J.head[1] + hf[1] * x * R - hu[1] * y * R];
  const hairMat = 'hair';
  if (hairStyle !== 'calvo') {
    // masa trasera del pelo (detrás de la cara)
    P.smooth([hp(-.1, -1.15), hp(-1.0, -.95), hp(-1.4, -.2), hp(-1.3, .6), hp(-.8, .95), hp(-.15, .5), hp(.1, -.3)], hairMat, { n: 3 });
    if (hairStyle === 'largo') {
      P.lock(hp(-.9, -.1), { ang: -62, len: R * 3.0, w: R * .95, w1: 1.2, curve: 50, sway: 12 }, hairMat);
      P.lock(hp(-.7, .15), { ang: -75, len: R * 2.3, w: R * .8, w1: 1.2, curve: 55, sway: 16 }, hairMat);
    } else if (hairStyle === 'puntas') {
      P.poly([hp(-.6, -1.0), hp(-1.7, -1.7 + Math.sin(ph) * .1), hp(-1.0, -.4)], hairMat, {});
      P.poly([hp(-.1, -1.1), hp(-.5, -2.0), hp(.4, -1.0)], hairMat, {});
    }
  }
  // cabeza, mandíbula y cuello visible
  P.layer('body');
  P.blob(J.head, R * 1.0, R * 1.12, 'skin', { shade: 'sphere' });
  P.blob(hp(.28, .55), R * .72, R * .58, 'skin', { shade: 'vol' });
  P.layer('top');
  if (hairStyle !== 'calvo') {
    // flequillo y gorro de pelo con mechones propios
    const cap = P.smooth([hp(-1.05, -.3), hp(-.9, -.95), hp(-.2, -1.3), hp(.7, -1.15), hp(1.1, -.55), hp(.9, -.3), hp(.45, -.62), hp(.05, -.35), hp(-.4, -.05)], hairMat, { n: 3, line: true });
    P.lock(hp(.85, -.8), { ang: 18, len: R * 1.5, w: R * .7, w1: 1, curve: 18, sway: 6 }, hairMat, { line: false });
    P.lock(hp(.2, -1.1), { ang: 40, len: R * 1.2, w: R * .6, w1: 1, curve: 14, sway: 5 }, hairMat, { line: false });
    void cap;
  }
  // rostro: ojo con brillo, nariz y boca
  const e = hp(.55, -.02);
  P.eye([e[0] - .5, e[1] - .5], { iris: 'iris', size: 3 });
  const nose = hp(1.0, .22); P.line([nose, nose], 'skin', 3);
  const mouth = hp(.78, .62); P.line([mouth, [mouth[0] + 1, mouth[1]]], 'skin', 0);

  // ---- brazo cercano y arma ----
  arm('N', 'near');
  P.layer('top');
  const hd = P.dir('armN.lower'), h0 = J.haN;
  if (wpn === 0) {                                  // espada
    const tip = add(h0, hd, L.H * .42);
    P.cap(add(h0, hd, -L.H * .05), add(h0, hd, L.H * .03), 2.2 * s, 2.2 * s, 'leather', { shade: 'flat', tone: 2 });
    P.cap(add(h0, [-hd[1], hd[0]], -2.5 * s), add(h0, [-hd[1], hd[0]], 2.5 * s), 1.6 * s, 1.6 * s, 'trim', { shade: 'flat', tone: 3 });
    P.cap(add(h0, hd, L.H * .05), tip, 3 * s, 1.4 * s, 'metal', { shade: 'cyl', line: true });
    P.anchor('muzzle', tip);
  } else if (wpn === 1) {                           // bastón con orbe
    const tip = add(h0, hd, L.H * .38), tail = add(h0, hd, -L.H * .22);
    P.cap(tail, tip, 1.8 * s, 1.8 * s, 'leather', { shade: 'cyl' });
    P.blob(add(tip, hd, 1.5 * s), 2.8 * s, 2.8 * s, 'trim', { shade: 'sphere' });
    P.emit({ blob: [add(tip, hd, 1.5 * s), 1.2 * s, 1.2 * s] });
    P.anchor('muzzle', add(tip, hd, 2 * s));
  } else {                                          // vara corta con gema
    const tip = add(h0, hd, L.H * .26);
    P.cap(add(h0, hd, -L.H * .08), tip, 2 * s, 2 * s, 'metal', { shade: 'cyl' });
    P.blob(tip, 2.4 * s, 2.4 * s, 'trim', { shade: 'sphere' });
    P.anchor('muzzle', add(tip, hd, 2 * s));
  }
  P.anchor('head', J.head);
}

export default {
  id: 'maniqui', kit: 1, ready: true,
  materials: MANIQUI_MATERIALS,
  ramps: () => tintRamps({ sk: '#e0b090', h: '#4a3a30', m: '#5a6a9a', t: '#3a3a52', a: '#d0a840', iris: '#3a6ac0' }),
  emit: () => '#e0f0ff',
  geomStage: () => 1,
  classes: BODY_TYPES.map(b => ({ id: b, name: 'Maniquí ' + b, build: { body: b, height: ALTURA[b] }, look: { hair: 'largo' }, anchors: ['haN', 'haF', 'head', 'chest'] })),
  stageScale: [1, 1, 1, 1],
  draw,
};
export { draw as maniquiDraw, MANIQUI_MATERIALS, ramp5 };
