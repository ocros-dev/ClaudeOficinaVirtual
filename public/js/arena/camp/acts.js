// Actividades del campamento (paquete CAMP-L): recorrido de cada héroe, pesos por raza, frases y animaciones del kit 16 bits.
// Una actividad es una lista de «paradas» por héroe: [x, y, mirada (1 derecha, -1 izquierda), postura], relativas al puesto
// de la party (lienzo 960×608). Cada `beat` ms el héroe pasa a su siguiente parada caminando (con un desfase `stag` entre
// héroes para que no se muevan todos a la vez). Los tres héroes son: vanguardia, distancia o magia, y apoyo.
//   turn: 'talk' (todos miran a quien habla) | 'speaker' (los que están quietos miran al que habla un momento)
//   hop:  [periodo, inicio, duración, 'all' | 'watch', 'h0'] salto de ánimo (todos o solo los que miran) sincronizado con el golpe
//         o el brindis; con 'h0' el reloj es el de la vanguardia, que es el que marca el golpe en el mobiliario
//   speed: velocidad de desplazamiento (px/s) cuando no es la normal
import { reduced } from '../util.js';

export const ACTS = {
  fire: {
    name: 'Cenando junto a la fogata', beat: 7000, stag: 2300, turn: 'speaker',
    route: [
      [[-36, 4, 1, 'eat'], [-36, 4, 1, 'eat'], [-58, 12, 1, 'stand']],
      [[36, 4, -1, 'eat'], [54, -4, -1, 'stand'], [36, 4, -1, 'eat']],
      [[0, -18, 1, 'drink'], [0, -18, 1, 'drink'], [16, -28, -1, 'watch']],
    ],
  },
  table: {
    name: 'Banquete con jarras', beat: 6000, stag: 0, turn: 'speaker', hop: [4800, 4200, 360, 'all'],
    route: [
      [[-40, 0, 1, 'drink']],
      [[40, 0, -1, 'eat']],
      [[0, -18, 1, 'drink'], [0, -18, 1, 'drink'], [-14, -26, 1, 'watch']],
    ],
  },
  talk: {
    name: 'Conversando', beat: 5200, stag: 1700, turn: 'talk',
    route: [
      [[-38, 6, 1, 'stand'], [-28, 10, 1, 'stand'], [-48, 4, 1, 'stand']],
      [[38, 6, -1, 'stand'], [46, 2, -1, 'stand'], [30, 10, -1, 'stand']],
      [[0, -16, 1, 'stand'], [-8, -14, 1, 'stand'], [10, -20, 1, 'stand']],
    ],
  },
  dummy: {
    name: 'Entrenando con el muñeco', beat: 6000, stag: 1900, hop: [2700, 2000, 320, 'watch', 'h0'],
    route: [
      [[12, 6, 1, 'swing']],
      [[-48, 4, 1, 'watch'], [-30, 12, 1, 'watch']],
      [[-26, -16, 1, 'watch'], [-8, -22, 1, 'watch']],
    ],
  },
  archery: {
    name: 'Practicando puntería', beat: 6000, stag: 2000, hop: [4000, 880, 320, 'watch'],
    route: [
      [[-8, 6, 1, 'shoot']],
      [[-72, 4, 1, 'watch'], [-54, 12, 1, 'watch']],
      [[-42, -16, 1, 'watch'], [-26, -20, 1, 'watch']],
    ],
  },
  meditate: {
    name: 'Meditando', alt: { tempestarios: 'Meditando entre chispas', astrales: 'Meditando bajo las estrellas' }, beat: 9000, stag: 0,
    route: [[[-36, 6, 1, 'sit']], [[36, 6, -1, 'sit']], [[0, -14, 1, 'sit']]],
  },
  spells: {
    name: 'Practicando hechizos', alt: { tempestarios: 'Practicando relámpagos' }, beat: 4800, stag: 0,
    route: [[[-32, 6, 1, 'cast']], [[32, 6, -1, 'cast']], [[0, -16, 1, 'stand'], [0, -16, 1, 'cast']]],
  },
  sleep: {
    name: 'Durmiendo', beat: 9000, stag: 0,
    route: [[[-44, 2, 1, 'nap']], [[44, 2, -1, 'nap']], [[0, -10, 1, 'lie']]],
  },
  spar: {
    name: 'Combate de práctica', beat: 5600, stag: 0, hop: [2800, 1000, 340, 'watch', 'h0'],
    route: [[[-34, 6, 1, 'spar']], [[36, 6, -1, 'spar']], [[0, -20, 1, 'watch']]],
  },
  stormspar: {                                        // Tempestarios: sparring a la velocidad del rayo
    name: 'Sparring relámpago', beat: 1500, stag: 0, speed: 380,
    route: [
      [[-34, 6, 1, 'dash'], [34, 6, -1, 'dash']],
      [[34, 6, -1, 'dash'], [-34, 6, 1, 'dash']],
      [[0, -20, 1, 'sit']],
    ],
  },
  forge: {
    name: 'Trabajando en la forja', beat: 6500, stag: 2200,
    route: [
      [[-16, 6, 1, 'hammer']],
      [[-54, -6, 1, 'drink'], [-54, -6, 1, 'drink'], [40, -8, 1, 'stand']],       // el segundo trae carbón del horno
      [[36, -18, -1, 'drink'], [14, -22, 1, 'watch']],
    ],
  },
  read: {
    name: 'Leyendo a la luz del farol', beat: 8000, stag: 2700, turn: 'speaker',
    route: [
      [[-36, 6, 1, 'read']],
      [[36, 6, -1, 'read'], [36, 6, -1, 'read'], [54, -2, -1, 'stand']],
      [[0, -18, 1, 'read']],
    ],
  },
  lift: {                                             // se turnan para levantar la barra mientras los otros la aseguran
    name: 'Levantando pesas', beat: 7200, stag: 0,
    route: [
      [[0, 6, 1, 'lift'], [-46, -4, 1, 'watch'], [46, -4, -1, 'watch']],
      [[-46, -4, 1, 'watch'], [46, -4, -1, 'watch'], [0, 6, 1, 'lift']],
      [[46, -4, -1, 'watch'], [0, 6, 1, 'lift'], [-46, -4, 1, 'watch']],
    ],
  },
  gears: {
    name: 'Ajustando engranajes', beat: 4500, stag: 1500,
    route: [
      [[-38, 6, 1, 'tinker'], [-24, -8, 1, 'tinker']],
      [[38, 6, -1, 'tinker'], [24, -8, -1, 'tinker']],
      [[0, -20, 1, 'tinker']],
    ],
  },
  play: { name: 'Jugando a la pilla', beat: 1e9, stag: 0, route: [[[0, 0, 1, 'play']], [[0, 0, 1, 'play']], [[0, 0, 1, 'play']]] },
};
for (const a of Object.values(ACTS)) a.pos = a.route.map(r => r[0]);        // primera parada de cada héroe

// Parada de un héroe t ms después de empezar la actividad
export function stopOf(kind, i, t) {
  const A = ACTS[kind], r = A.route[i];
  return r.length === 1 ? r[0] : r[Math.floor(Math.max(0, t + i * (A.stag || 0)) / A.beat) % r.length];
}
export const actLabel = (kind, race) => { const A = ACTS[kind]; return (A.alt && race && A.alt[race.id]) || A.name; };

// Pesos por raza: lo común a todas y lo propio de cada una (sustituye al peso común)
const WEIGHTS = {
  base: { fire: 2, table: 2, talk: 2.4, dummy: 1.2, archery: 1, meditate: 1, spells: 1, sleep: 1.2 },
  humanos: { spar: 3, play: 1 }, elfos: { read: 3.5, archery: 3 }, enanos: { forge: 4, table: 4 }, orcos: { lift: 3.5, dummy: 2.5, table: 3 },
  gnomos: { gears: 4, play: 1.5 }, bestiales: { play: 3, sleep: 2.5 }, draconios: { fire: 4, spells: 1.8 }, astrales: { meditate: 4, spells: 3 },
  tempestarios: { meditate: 3, stormspar: 3.5, spells: 2.2 },
};
export const CHAT = {
  fire: ['¡Ñam, ñam!', '¡Qué rico!', '¿Más sopa?', '🍖', '🍲', 'Está caliente'], table: ['¡Salud!', '¿Otra ronda?', '🍺', '¡Qué banquete!', '🍖'],
  talk: ['💬', '¿Viste al rey?', '¡Jajaja!', '¿Y tú qué tal?', '¡No me digas!', '💬', 'Mañana más', '¡Qué batalla!', 'Yo lo vi venir'],
  dummy: ['¡Hah!', '¡Otra vez!', '¡Toma!', '¡Buen golpe!'],
  archery: ['¡En el blanco!', '¡Casi!', '¡Diana!', '🎯'], meditate: ['…', 'Om…', '✨', '☯'], spells: ['✨', '¡Mira esto!', '¡Chispa!', '¡Abracadabra!'],
  sleep: ['Zzz…', '💤', 'Zzz…'], spar: ['¡En guardia!', '¡Otra!', '¡Bien parado!', '¡Toma ya!'], stormspar: ['⚡', '¡Muy lento!', '¡Zas!', '¡Ni lo vi!'],
  forge: ['¡Clang!', '¡Más fuego!', '⚒', '¡Salud!'],
  read: ['📖', 'Shh…', '¡Qué capítulo!', 'Mmm…'], lift: ['¡Uno más!', '¡Fuerza!', '💪', '¡Grrr!'], gears: ['¡Ajustando!', '⚙', '¡Funciona!', '¡Clic, clac!'],
  play: ['¡Te pillé!', '¡Corre!', '¡Jaja!', '😄'],
};
export function pickAct(race, avoid) {
  const w = { ...WEIGHTS.base, ...(WEIGHTS[race.id] || {}) };
  if (reduced()) delete w.play;                                 // sin movimiento continuo en pantalla
  const keys = Object.keys(w).filter(k => k !== avoid);
  let r = Math.random() * keys.reduce((s, k) => s + w[k], 0);
  for (const k of keys) { r -= w[k]; if (r <= 0) return k; }
  return keys[0];
}

// ---- Animaciones de la biblioteca de poses (3.7) con la que se pinta a cada héroe ------------------------------------------
// Fotogramas por animación y milisegundos por fotograma
export const ANIM = {
  idle: [4, 450], walk: [6, 130], run: [4, 100], atk1: [3, 130], atk2: [3, 130], atk3: [3, 130], kick: [3, 130], charge: [3, 260], fire: [2, 300],
  sit: [2, 700], eat: [2, 600], sleep: [2, 1100], cast: [4, 220], hit: [2, 150], block: [1, 200], victory: [3, 200],
};
// Postura de reposo → animación
export const POSE_ANIM = {
  stand: 'idle', watch: 'idle', tinker: 'idle', breath: 'idle', sit: 'sit', read: 'sit', nap: 'sleep', lie: 'sleep', eat: 'eat', drink: 'eat',
  swing: 'atk1', hammer: 'atk1', spar: 'atk2', dash: 'idle', shoot: 'fire', cast: 'cast', lift: 'charge', play: 'run',
};
export const frameOf = (anim, now, seed = 0) => { const [n, ms] = ANIM[anim] || ANIM.idle; return reduced() ? 0 : Math.floor((now + seed) / ms) % n; };
