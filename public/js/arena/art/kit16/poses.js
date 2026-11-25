// Biblioteca de poses del kit 16 bits: héroes (49 fotogramas), rey (21), élites (12) y secuaces (7).
// Funciones puras. Las poses de héroe usan el formato de rig.js (ángulos en grados).
// Cada animación es determinista: heroPose(tipoDeCuerpo, anim, fotograma) siempre da lo mismo.

export const HERO_ANIMS = {
  idle: 4, walk: 6, run: 4, atk1: 3, atk2: 3, atk3: 3, charge: 3, fire: 2, sit: 2, eat: 2,
  cast: 4, hit: 2, block: 1, launched: 2, victory: 3, transform: 3, sleep: 2,
};
export const HERO_FRAME_TOTAL = Object.values(HERO_ANIMS).reduce((a, b) => a + b, 0);   // 49
/** Fotograma «activo» (donde se dispara el impacto) de cada animación. */
export const ACTIVE_FRAME = { atk1: 1, atk2: 1, atk3: 1, fire: 0, cast: 2, charge: 2, kick: 1 };
export const KING_ANIMS = { idle: 4, hit: 2, lean: 1, claw: 3, lunge: 2, roar: 2, charge: 2, beam: 2, cast: 3 };
export const ELITE_ANIMS = { idle: 2, move: 4, atk: 3, hit: 1, special: 2 };
export const MINION_ANIMS = { idle: 2, move: 2, atk: 2, launched: 1 };

/** Animación de reserva cuando una raza no la tiene: kick → atk3, atk* → atk1, y por último idle. */
export function fallbackAnim(anim, has) {
  if (has(anim)) return anim;
  if (anim === 'kick' && has('atk3')) return 'atk3';
  if (/^atk/.test(anim) && has('atk1')) return 'atk1';
  return 'idle';
}

const T = Math.PI * 2, S = Math.sin, C = Math.cos, pos = v => (v > 0 ? v : 0);
const guardLegs = { hipN: 24, knN: 22, hipF: -20, knF: 26 };
const arms = (shN, elN, shF, elF) => ({ shN, elN, shF, elF });

// ---- Poses base del cuerpo «atleta» ------------------------------------------------------------
function base(anim, k) {
  switch (anim) {
    case 'idle': {
      const b = [0, .5, 1, .5][k];
      return { pl: 'NF', cr: .10 + b * .012, lean: 5 + b, sp: 2, nk: 2 - b, sq: b * .03, ...guardLegs, hipN: 24 + b * 1.5, ...arms(56 + b * 3, 84 - b * 3, 30 + b * 2, 102 - b * 3) };
    }
    case 'walk': {
      const p = k / 6 * T, h = 28 * S(p), a = -S(p);
      return { lean: 5, nk: 1, sp: 1, hipN: h, hipF: -h, knN: 10 + 46 * pos(C(p)), knF: 10 + 46 * pos(-C(p)), ...arms(8 + 24 * a, 20 + 22 * pos(a), 8 - 24 * a, 20 + 22 * pos(-a)) };
    }
    case 'run': {
      const p = k / 4 * T, h = 52 * S(p), a = -S(p);
      return { lean: 20, nk: -4, sp: 3, hipN: h, hipF: -h, knN: 28 + 80 * pos(C(p - .4)), knF: 28 + 80 * pos(-C(p - .4)), ...arms(20 + 55 * a, 90 + 12 * a, 20 - 55 * a, 90 - 12 * a) };
    }
    case 'atk1': return [
      { pl: 'NF', cr: .13, lean: -4, sp: -3, nk: 0, hipN: 28, knN: 24, hipF: -26, knF: 22, ...arms(-22, 125, 42, 100) },
      { pl: 'NF', cr: .19, lean: 16, sp: 5, nk: 3, hipN: 40, knN: 40, hipF: -34, knF: 8, ...arms(88, 4, 26, 110) },
      { pl: 'NF', cr: .15, lean: 9, sp: 2, nk: 1, hipN: 32, knN: 30, hipF: -28, knF: 14, ...arms(68, 32, 34, 104) },
    ][k];
    case 'atk2': return [
      { pl: 'NF', cr: .15, lean: -8, sp: -6, nk: -2, hipN: 26, knN: 26, hipF: -30, knF: 20, ...arms(-48, 70, 36, 105) },
      { pl: 'NF', cr: .18, lean: 13, sp: 7, nk: 2, hipN: 38, knN: 38, hipF: -32, knF: 12, ...arms(122, 28, 20, 112) },
      { pl: 'NF', cr: .14, lean: 7, sp: 3, nk: 0, hipN: 30, knN: 28, hipF: -26, knF: 16, ...arms(156, 12, 30, 108) },
    ][k];
    case 'atk3': return [
      { pl: 'NF', cr: .10, lean: -10, sp: -8, nk: -4, hipN: 20, knN: 14, hipF: -20, knF: 14, ...arms(160, 22, 150, 30) },
      { pl: 'NF', cr: .22, lean: 24, sp: 8, nk: 6, hipN: 46, knN: 50, hipF: -38, knF: 6, ...arms(98, 4, 88, 10) },
      { pl: 'NF', cr: .16, lean: 14, sp: 3, nk: 2, hipN: 34, knN: 30, hipF: -28, knF: 14, ...arms(60, 44, 54, 48) },
    ][k];
    case 'kick': return [
      { pl: 'NF', cr: .14, lean: -6, sp: -4, hipN: 20, knN: 40, hipF: -10, knF: 10, ...arms(30, 100, 50, 100) },
      { pl: 'F', cr: .12, lean: -22, sp: -6, nk: 2, hipN: 92, knN: 4, hipF: -8, knF: 8, ...arms(-30, 70, 70, 90) },
      { pl: 'NF', cr: .14, lean: 4, hipN: 30, knN: 36, hipF: -16, knF: 14, ...arms(40, 95, 40, 100) },
    ][k];
    case 'charge': return [
      { pl: 'NF', cr: .15, lean: -2, sp: -2, nk: 3, sq: .01, hipN: 26, knN: 22, hipF: -24, knF: 22, ...arms(-26, 44, -36, 46) },
      { pl: 'NF', cr: .17, lean: -4, sp: -5, nk: -3, sq: .03, hipN: 28, knN: 24, hipF: -26, knF: 24, ...arms(78, 18, 74, 22) },
      { pl: 'NF', cr: .19, lean: 2, sp: 2, nk: 2, sq: .04, hipN: 30, knN: 28, hipF: -28, knF: 26, ...arms(86, 72, 78, 82) },
    ][k];
    case 'fire': return [
      { pl: 'NF', cr: .16, lean: 9, sp: 3, nk: 0, hipN: 30, knN: 30, hipF: -32, knF: 12, ...arms(90, 2, 84, 8) },
      { pl: 'NF', cr: .13, lean: 3, sp: 0, nk: 0, hipN: 22, knN: 20, hipF: -38, knF: 8, ...arms(98, 4, 92, 6) },
    ][k];
    case 'cast': return [
      { pl: 'NF', cr: .12, lean: 2, sp: 0, nk: 0, hipN: 20, knN: 18, hipF: -18, knF: 18, ...arms(30, 50, 22, 56) },
      { pl: 'NF', cr: .12, lean: 0, sp: -2, nk: -2, sq: .02, hipN: 20, knN: 18, hipF: -18, knF: 18, ...arms(140, 24, 62, 70) },
      { pl: 'NF', cr: .14, lean: -7, sp: -6, nk: -7, sq: .04, hipN: 22, knN: 22, hipF: -20, knF: 20, ...arms(172, 8, 160, 14) },
      { pl: 'NF', cr: .14, lean: 6, sp: 3, nk: 1, hipN: 26, knN: 24, hipF: -24, knF: 14, ...arms(98, 6, 90, 10) },
    ][k];
    case 'hit': return [
      { pl: 'NF', cr: .12, lean: -24, sp: -9, nk: -11, hipN: 14, knN: 14, hipF: -32, knF: 20, ...arms(-34, 44, 24, 56) },
      { pl: 'NF', cr: .15, lean: -14, sp: -5, nk: -3, hipN: 16, knN: 20, hipF: -30, knF: 24, ...arms(-8, 40, 12, 50) },
    ][k];
    case 'block': return { pl: 'NF', cr: .16, lean: 9, sp: 4, nk: 5, hipN: 26, knN: 26, hipF: -22, knF: 22, ...arms(72, 108, 62, 114) };
    case 'launched': return [
      { rot: -58, z: .22, lean: 0, sp: -4, nk: -6, hipN: 14, knN: 40, hipF: -4, knF: 55, ...arms(-100, 30, -84, 40) },
      { rot: -84, z: .20, lean: 0, sp: -6, nk: -10, hipN: 30, knN: 60, hipF: 12, knF: 70, ...arms(-130, 20, -110, 30) },
    ][k];
    case 'victory': return [
      { pl: 'NF', cr: .10, lean: -2, sp: -3, nk: -3, hipN: 16, knN: 12, hipF: -14, knF: 14, ...arms(164, 12, 30, 60) },
      { z: .045, lean: -4, sp: -4, nk: -5, hipN: 12, knN: 36, hipF: -16, knF: 40, ...arms(150, 14, 146, 18) },
      { pl: 'NF', cr: .12, lean: -2, sp: -3, nk: -4, hipN: 18, knN: 14, hipF: -14, knF: 14, ...arms(170, 6, 24, 70) },
    ][k];
    case 'transform': return [
      { pl: 'NF', cr: .30, lean: 12, sp: 8, nk: 12, sq: -.03, hipN: 34, knN: 50, hipF: -30, knF: 50, ...arms(-18, 56, -24, 58) },
      { z: .035, lean: -4, sp: -5, nk: -5, hipN: 8, knN: 24, hipF: -8, knF: 30, ...arms(112, 14, 108, 18) },
      { z: .09, lean: -8, sp: -8, nk: -9, sq: .04, hipN: 6, knN: 12, hipF: -6, knF: 14, ...arms(150, 2, 146, 4) },
    ][k];
    case 'sit': {
      const b = k;
      return { lean: 3 - b, sp: 2, nk: 3, sq: b * .02, hipN: 84, knN: 86, hipF: 80, knF: 84, ...arms(34 + b * 3, 46, 22, 44) };
    }
    case 'sleep': {
      const b = k;
      return { rot: -90, z: .082, lean: 0, sp: 0, nk: 5, sq: b * .03, hipN: 6, knN: 4, hipF: 2, knF: 6, ...arms(8, 12, 14, 10) };
    }
    case 'eat': return [
      { pl: 'NF', cr: .05, lean: 3, sp: 2, nk: 4, hipN: 8, knN: 8, hipF: -6, knF: 8, ...arms(42, 86, 12, 20) },
      { pl: 'NF', cr: .05, lean: 2, sp: 1, nk: -2, hipN: 8, knN: 8, hipF: -6, knF: 8, ...arms(34, 132, 12, 20) },
    ][k];
    default: return base('idle', 0);
  }
}

// ---- Variaciones por tipo de cuerpo -----------------------------------------------------------
const tailWave = (anim, k, n) => {
  const w = S(k / n * T) * (/^atk|kick/.test(anim) ? 22 : anim === 'run' ? 8 : 12);
  return [-96 + w * .4, -106 + w * .8, -116 + w * 1.2];
};

/** n: número de fotogramas de la animación (las de extraAnims, como kick, lo traen de la raza). */
export function heroPose(body, anim, k = 0, nFrames) {
  const n = nFrames || HERO_ANIMS[anim] || (anim === 'kick' ? 3 : 1);
  let p = { ...base(anim, Math.max(0, Math.min(n - 1, k))) };
  if (body === 'fiera') {
    p.lean = (p.lean || 0) + 14; p.nk = (p.nk || 0) - 6; if (p.cr !== undefined) p.cr += .06;
    if (p.shN !== undefined && p.rot === undefined) { p.shN += 6; p.shF += 8; }
  } else if (body === 'robusto') {
    if (p.cr !== undefined) p.cr += .02;
    for (const key of ['hipN', 'hipF']) if (p[key] !== undefined) p[key] *= 1.08;
  } else if (body === 'etereo') {
    // flotan: sin apoyo y con las piernas relajadas y colgando
    const bob = S((k / n + .1) * T) * .012, walk = anim === 'walk' || anim === 'run';
    const keepZ = p.z !== undefined && p.rot !== undefined;
    delete p.pl; delete p.cr;
    if (!keepZ) p.z = Math.max(p.z || 0, .075) + bob;
    p.hipN = (p.hipN || 0) * .3 + 6; p.hipF = (p.hipF || 0) * .3 - 4;
    p.knN = (p.knN || 0) * .45 + 14; p.knF = (p.knF || 0) * .45 + 22;
    if (walk) { p.lean = (p.lean || 0) + 8; p.hipN -= 12; p.hipF -= 16; }
    if (anim === 'sit' || anim === 'sleep') { p.z = anim === 'sit' ? .06 : p.z; }
  }
  if (body === 'draco' || body === 'fiera') p.tl = tailWave(anim, k, n);
  return p;
}

// ---- Rey: conjunto de parámetros por fotograma ------------------------------------------------
// lean (grados), armN y armF (grados desde el reposo), mouth 0..1, wing 0..1, breathe -1..1, tail (grados),
// glow 0..1, dx y dy (desplazamiento del cuerpo en píxeles de la forma).
export function kingPose(anim, k = 0) {
  const f = (o) => ({ lean: 0, armN: 0, armF: 0, mouth: 0, wing: .3, breathe: 0, tail: 0, glow: .3, dx: 0, dy: 0, ...o });
  const t = k % 4;
  switch (anim) {
    case 'idle': return f({ breathe: [0, .6, 1, .6][t], wing: [.2, .4, .6, .4][t], tail: [-6, 0, 6, 0][t], armN: [0, 2, 4, 2][t], armF: [0, -2, -3, -2][t], glow: [.3, .5, .7, .5][t] });
    case 'hit': return [f({ lean: -9, armN: -10, armF: 8, mouth: .5, glow: .9, dx: -4 }), f({ lean: -4, armN: -4, armF: 4, mouth: .2, glow: .6, dx: -2 })][k];
    case 'lean': return f({ lean: -14, armN: 10, armF: -8, wing: .7, dx: -8 });
    case 'claw': return [f({ lean: -8, armN: -40, armF: 10, mouth: .3, wing: .6 }), f({ lean: 12, armN: 70, armF: 20, mouth: .7, wing: .5, dx: 8, glow: .8 }), f({ lean: 6, armN: 50, armF: 10, mouth: .4, dx: 4 })][k];
    case 'lunge': return [f({ lean: -6, armN: -20, armF: -20, wing: .8, dy: 4 }), f({ lean: 18, armN: 60, armF: 50, mouth: .6, wing: .2, dx: 14, glow: .8 })][k];
    case 'roar': return [f({ lean: -10, armN: 30, armF: 30, mouth: .8, wing: .9, breathe: 1, glow: .9 }), f({ lean: -14, armN: 44, armF: 44, mouth: 1, wing: 1, breathe: 1, glow: 1 })][k];
    case 'charge': return [f({ lean: -4, armN: 40, armF: 40, mouth: .5, glow: .7, breathe: 1 }), f({ lean: -6, armN: 60, armF: 60, mouth: .7, glow: 1, breathe: 1 })][k];
    case 'beam': return [f({ lean: 6, armN: 80, armF: 80, mouth: 1, glow: 1, wing: .7 }), f({ lean: 8, armN: 84, armF: 84, mouth: 1, glow: 1, wing: .8 })][k];
    case 'cast': return [f({ lean: -6, armN: 50, armF: -20, mouth: .3, glow: .6 }), f({ lean: -10, armN: 90, armF: 70, mouth: .6, wing: .8, glow: .9 }), f({ lean: 4, armN: 40, armF: 30, mouth: .4, glow: 1 })][k];
    default: return f({});
  }
}

// ---- Élites y secuaces ---------------------------------------------------------------------------
// bob (px), step (-1..1, paso o aleteo), atk (0..1 fase del ataque), lean (grados), glow 0..1.
export function elitePose(anim, k = 0) {
  const f = o => ({ bob: 0, step: 0, atk: 0, lean: 0, glow: .3, ...o });
  switch (anim) {
    case 'idle': return f({ bob: [0, 1][k], glow: [.3, .6][k] });
    case 'move': return f({ step: [1, 0, -1, 0][k], bob: [0, -1, 0, -1][k], lean: 6 });
    case 'atk': return f({ atk: [.0, .5, 1][k], lean: [-8, 8, 14][k], glow: [.5, .9, .6][k] });
    case 'hit': return f({ lean: -10, glow: 1 });
    case 'special': return f({ atk: [.5, 1][k], lean: -4, glow: [.8, 1][k], bob: -2 });
    default: return f({});
  }
}
export function minionPose(anim, k = 0) {
  const f = o => ({ step: 0, atk: 0, lean: 0, spin: 0, ...o });
  switch (anim) {
    case 'idle': return f({ step: [0, 1][k] });
    case 'move': return f({ step: [-1, 1][k], lean: 8 });
    case 'atk': return f({ atk: [.4, 1][k], lean: [-8, 14][k] });
    case 'launched': return f({ spin: 1, lean: -30 });
    default: return f({});
  }
}

/** Números de fotogramas de una animación por tipo de ente. */
export const animsOf = kind => (kind === 'king' ? KING_ANIMS : kind === 'elite' ? ELITE_ANIMS : kind === 'minion' ? MINION_ANIMS : HERO_ANIMS);
export const posesOf = (kind, anim, k) => (kind === 'king' ? kingPose(anim, k) : kind === 'elite' ? elitePose(anim, k) : kind === 'minion' ? minionPose(anim, k) : null);
