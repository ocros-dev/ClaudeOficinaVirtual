// Esqueleto del kit 16 bits: tipos de cuerpo, cinemática directa y apoyo de pies (IK de dos huesos).
// Funciones puras. Vista lateral mirando a la derecha; el suelo es y = 0 y hacia arriba es y negativo.
// El centro de los pies es x = 0. N = lado cercano al observador, F = lado lejano.
//
// Convención de ángulos de la pose (grados):
//  - Extremidades: ángulo ABSOLUTO desde «recto hacia abajo»; positivo = hacia delante (derecha).
//    Brazo colgando 0, brazo al frente 90, brazo arriba 180. Codo (el*): flexión extra, positiva hacia
//    delante y arriba. Rodilla (kn*): flexión que lleva la espinilla hacia atrás.
//  - Tronco: lean = inclinación hacia delante desde la vertical; sp = curva extra del pecho; nk = cabeza.
//  - rot gira todo el cuerpo (lanzado por los aires, tumbado); z eleva (fracción de la altura).

export const BODY_TYPES = ['atleta', 'robusto', 'menudo', 'fiera', 'draco', 'etereo'];

// Proporciones como fracción de la altura total H. Anchuras en vista lateral (diámetros).
export const BODIES = {
  atleta:  { thigh: .215, shin: .200, ankle: .035, foot: .105, torso: .27, neck: .030, head: .222, upper: .165, lower: .150, hand: .040, torsoW: .160, hipW: .150, thighW: .095, shinW: .072, upperW: .066, lowerW: .056, shOff: .020, shDrop: .040, tail: 0 },
  robusto: { thigh: .185, shin: .165, ankle: .030, foot: .115, torso: .30, neck: .020, head: .235, upper: .180, lower: .160, hand: .050, torsoW: .235, hipW: .200, thighW: .135, shinW: .105, upperW: .105, lowerW: .088, shOff: .030, shDrop: .045, tail: 0 },
  menudo:  { thigh: .170, shin: .150, ankle: .030, foot: .115, torso: .26, neck: .020, head: .300, upper: .150, lower: .130, hand: .045, torsoW: .200, hipW: .170, thighW: .110, shinW: .085, upperW: .080, lowerW: .068, shOff: .020, shDrop: .040, tail: 0 },
  fiera:   { thigh: .190, shin: .190, ankle: .035, foot: .125, torso: .30, neck: .030, head: .225, upper: .190, lower: .180, hand: .050, torsoW: .210, hipW: .170, thighW: .120, shinW: .088, upperW: .090, lowerW: .075, shOff: .030, shDrop: .040, tail: .09 },
  draco:   { thigh: .200, shin: .200, ankle: .035, foot: .115, torso: .28, neck: .040, head: .220, upper: .160, lower: .150, hand: .045, torsoW: .180, hipW: .160, thighW: .105, shinW: .078, upperW: .072, lowerW: .062, shOff: .025, shDrop: .040, tail: .13 },
  etereo:  { thigh: .210, shin: .200, ankle: .030, foot: .090, torso: .27, neck: .030, head: .222, upper: .165, lower: .150, hand: .040, torsoW: .140, hipW: .130, thighW: .080, shinW: .060, upperW: .058, lowerW: .050, shOff: .020, shDrop: .040, tail: 0 },
};

export const SEGMENTS = {
  'torso': ['root', 'chest'], 'torso.lower': ['root', 'spine'], 'torso.upper': ['spine', 'chest'],
  'neck': ['chest', 'neck'], 'headSeg': ['neck', 'head'],
  'armN.upper': ['shN', 'elN'], 'armN.lower': ['elN', 'haN'], 'armF.upper': ['shF', 'elF'], 'armF.lower': ['elF', 'haF'],
  'legN.upper': ['hipN', 'knN'], 'legN.lower': ['knN', 'ftN'], 'legF.upper': ['hipF', 'knF'], 'legF.lower': ['knF', 'ftF'],
  'footN': ['ftN', 'toeN'], 'footF': ['ftF', 'toeF'],
  'tail.1': ['root', 'tail1'], 'tail.2': ['tail1', 'tail2'], 'tail.3': ['tail2', 'tail3'],
};

const D = Math.PI / 180;
const dirUp = a => [Math.sin(a), -Math.cos(a)];     // dirección «hacia arriba» del tronco inclinado a grados
const dirDown = a => [Math.sin(a), Math.cos(a)];    // dirección de una extremidad desde «recto hacia abajo»

/** Dimensiones en píxeles de un tipo de cuerpo y una construcción (build) a una escala. */
export function dims(body, build = {}, scale = 1) {
  const b = BODIES[body] || BODIES.atleta, H = (build.height || 60) * scale;
  const leg = build.leg || 1, arm = build.arm || 1, sh = build.shoulder || 1, hp = build.hip || 1, hs = build.headScale || 1;
  const L = {
    H, scale, body,
    thigh: b.thigh * H * leg, shin: b.shin * H * leg, ankle: b.ankle * H, foot: b.foot * H,
    torso: b.torso * H, neck: b.neck * H, head: b.head * H * hs,
    upper: b.upper * H * arm, lower: b.lower * H * arm, hand: b.hand * H,
    torsoW: b.torsoW * H * sh, hipW: b.hipW * H * hp, thighW: b.thighW * H, shinW: b.shinW * H,
    upperW: b.upperW * H, lowerW: b.lowerW * H, shOff: b.shOff * H * sh, shDrop: b.shDrop * H,
    tail: b.tail * H,
  };
  L.legLen = L.thigh + L.shin;
  L.legFull = L.legLen + L.ankle;
  return L;
}

/**
 * Cinemática directa de una pose. Devuelve { J, A, L }:
 *  J: posición de cada articulación { root, spine, chest, neck, head, shN, elN, haN, tipN, ..., toeN, heelN, tail1.. }
 *  A: ángulo absoluto (grados, convención de extremidades) de cada segmento de SEGMENTS
 *  L: dimensiones en píxeles
 */
export function solve(body, build, pose = {}, scale = 1) {
  const L = dims(body, build, scale);
  const rot = (pose.rot || 0) * D, lean = (pose.lean || 0) * D, sp = (pose.sp || 0) * D, nk = (pose.nk || 0) * D;
  const aT = lean + rot;                                // ángulo del tronco
  const limb = deg => (deg || 0) * D - rot;             // una rotación rígida del cuerpo gira las extremidades al revés
  const fwd = [Math.cos(aT), Math.sin(aT)];
  const J = {};
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const sq = 1 + (pose.sq || 0);

  // Tronco y cabeza respecto a la pelvis (0,0); luego se desplaza todo
  const root = [0, 0];
  const spine = add(root, dirUp(aT), L.torso * .45 * sq);
  const chest = add(spine, dirUp(aT + sp), L.torso * .55 * sq);
  const neck = add(chest, dirUp(aT + sp + nk * .5), L.neck);
  const head = add(neck, dirUp(aT + sp + nk), L.head * .42);
  Object.assign(J, { root, spine, chest, neck, head });
  J.hipN = add(root, fwd, L.hipW * .10); J.hipF = add(root, fwd, -L.hipW * .14);
  const shBase = add(chest, dirUp(aT + sp), -L.shDrop);
  J.shN = add(shBase, fwd, L.shOff); J.shF = add(shBase, fwd, -L.shOff * 1.3);

  // Brazos
  const arm = (s, su, el) => {
    const th = limb(pose[su]), th2 = th + (pose[el] || 0) * D;
    J['el' + s] = add(J['sh' + s], dirDown(th), L.upper);
    J['ha' + s] = add(J['el' + s], dirDown(th2), L.lower);
    J['tip' + s] = add(J['ha' + s], dirDown(th2), L.hand);
    return [th / D, th2 / D];
  };
  const aN = arm('N', 'shN', 'elN'), aF = arm('F', 'shF', 'elF');

  // Piernas: FK, o apoyo de los pies en el suelo con IK de dos huesos
  const planted = { N: false, F: false };
  const pl = pose.pl || '';
  const useIK = pl && rot === 0;
  const cr = pose.cr ?? .08;
  const fk = (s, hipKey, knKey) => {
    const th = limb(pose[hipKey]), th2 = th - (pose[knKey] || 0) * D;
    J['kn' + s] = add(J['hip' + s], dirDown(th), L.thigh);
    J['ft' + s] = add(J['kn' + s], dirDown(th2), L.shin);
    return [th, th2];
  };
  let legsA = { N: fk('N', 'hipN', 'knN'), F: fk('F', 'hipF', 'knF') };
  let shift;   // desplazamiento vertical de la pelvis respecto al suelo
  if (useIK) {
    shift = -(L.ankle + L.legLen * (1 - cr)) + (pose.dy || 0);
    for (const s of ['N', 'F']) {
      if (!pl.includes(s)) continue;
      planted[s] = true;
      const hip = J['hip' + s], tx = J['ft' + s][0], ty = -L.ankle - shift;   // ankle a la altura del suelo en coordenadas de la pelvis
      let dx = tx - hip[0], dy = ty - hip[1], d = Math.hypot(dx, dy);
      const max = L.legLen * .998, min = Math.abs(L.thigh - L.shin) + .5;
      if (d > max) { dx *= max / d; dy *= max / d; d = max; } else if (d < min) { d = min; }
      const beta = Math.atan2(dx, dy), al = Math.acos(Math.max(-1, Math.min(1, (L.thigh * L.thigh + d * d - L.shin * L.shin) / (2 * L.thigh * d))));
      const th = beta + al, kn = add(hip, dirDown(th), L.thigh), ft = [hip[0] + dx, hip[1] + dy];
      const th2 = Math.atan2(ft[0] - kn[0], ft[1] - kn[1]);
      J['kn' + s] = kn; J['ft' + s] = ft; legsA[s] = [th, th2];
    }
  }

  // Pies: la punta sigue a la espinilla; los apoyados van planos
  for (const s of ['N', 'F']) {
    const th2 = legsA[s][1];
    const f = planted[s] ? (pose['ft' + s] || 0) * D : ((pose['ft' + s] || 0) * D - th2 * .35);
    const ft = J['ft' + s], c = [Math.cos(f), Math.sin(f)];
    J['toe' + s] = add(ft, c, L.foot);
    J['heel' + s] = add(ft, c, -L.foot * .3);
    J['footA' + s] = f / D;
  }

  // Altura de la pelvis cuando no hay IK
  if (!useIK) {
    if (pose.z !== undefined) shift = -(rot ? 0 : L.legFull) - pose.z * L.H + (pose.dy || 0);
    else {
      let low = -1e9;
      for (const s of ['N', 'F']) low = Math.max(low, J['ft' + s][1] + L.ankle, J['toe' + s][1] + 1);
      shift = -low + (pose.dy || 0);
    }
  }
  if (pose.z !== undefined && useIK) shift -= pose.z * L.H;

  // Cola (fiera y draco): tres tramos con ángulos absolutos
  if (L.tail) {
    const tl = pose.tl || [-100, -110, -120];
    let p = add(root, fwd, -L.hipW * .2);
    for (let k = 0; k < 3; k++) { p = add(p, dirDown(limb(tl[k])), L.tail); J['tail' + (k + 1)] = p; }
  }
  J.wing = add(add(chest, dirUp(aT + sp), -L.torso * .12), fwd, -L.torsoW * .35);

  // Aplicar el desplazamiento y la posición horizontal
  const ox = pose.x || 0;
  for (const k in J) J[k] = [J[k][0] + ox, J[k][1] + shift];

  const A = {};
  const ang = (a, b) => Math.atan2(J[b][0] - J[a][0], J[b][1] - J[a][1]) / D;
  for (const k in SEGMENTS) { const [a, b] = SEGMENTS[k]; if (J[a] && J[b]) A[k] = ang(a, b); }
  A.torsoLean = aT / D; A.headAng = (aT + sp + nk) / D; A.armN = aN; A.armF = aF;
  return { J, A, L };
}

/** Longitud de una polilínea (utilidad para tiras). */
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
