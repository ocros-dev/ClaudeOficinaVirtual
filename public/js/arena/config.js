// Constantes y geometría del tema arena (lienzo 960×608 = 2× la escala de la versión 1.1).
// Todo lo que se pueda querer ajustar vive aquí: reglas, tiempos, puestos y límites de memoria.
// Contrato: docs/arena-v12-arquitectura.md (4.3).

export const AW = 960, AH = 608;                    // lienzo lógico del tema arena
export const SIZE = { w: AW, h: AH };

// ---- Reglas y tiempos --------------------------------------------------------------------------------
export const CFG = {
  HP_BASE: 100, HP_PER_PARTY: 40,                   // vida máxima del rey = 100 + 40 × parties presentes
  POWER_MS: 12000,                                  // 1 punto de poder por cada 12 s trabajando
  PASSIVE_MS: 10000,                                // 1 punto de daño pasivo cada 10 s trabajando
  LATE_POWER: 5,                                    // poder inicial si el rey ya está en forma 2 o 3
  ELITE_POWER: 3,                                   // poder que ganan todas las parties al caer un élite
  FORM_HP: [0.6, 0.25],                             // el rey se transforma al 60 % y al 25 % de vida...
  FORM_MS: [3 * 60e3, 7 * 60e3],                    // ...o a los 3 y 7 minutos
  ELITE_AT: 0.75, ELITE_STOP: 0.1,                  // un élite al 75 % de vida; ninguno por debajo del 10 %
  ELITE_HP_BASE: 12, ELITE_HP_PER_PARTY: 4, ELITE_MIN_PARTIES: 3, ELITE_MAX: 2,
  WAVE_FIRST: 2, WAVE_N: 2, WAVE_MS: 15000, MINIONS_MAX: 10,   // oleadas de secuaces
  COMBO_MS: 30000, COMBO_DMG: 5,                    // golpe combinado de una party en etapa 3 o más
  GRACE_MS: 5000, CELEBRATE_MS: 2000, WALK_MAX_MS: 2000, RETURN_MAX_MS: 2800,
  WALK_SPEED: .44, RETURN_SPEED: .26,               // px por ms (el doble que en la 1.1: el lienzo es 2×)
  SPAWN_MS: 2000, DYING_MS: 2000, CALM_MS: 4000, FINISH_DELAY_MS: 400,
  PARTY_FX_MS: 900, PARTY_FX_LATE_MS: 1400,         // transformación: 0,9 s (hasta la etapa 3) y 1,4 s (3 → 4, más lenta)
  KING_FX_MS: 1200, PARTY_SHOUT_MS: 2200, KING_SHOUT_MS: 2500,
  FULL_PARTIES: 4, VISIBLE_PARTIES: 8,              // 4 completas; de la 5.ª a la 8.ª solo la vanguardia; la 9.ª en adelante, insignia
  MAX_BALLOONS: 2,                                  // gritos de party visibles a la vez
  MAX_CHATS: 2,                                     // globos de conversación visibles a la vez en el campamento
  RECENT: 2, SUMMARY_MS: 6000, SUMMARY_MIN_S: 5, QUICK_MS: 500,
  BURST_MS: 1000,                                   // ventana para numerar las herramientas de una ráfaga (burstIndex)
  MAX_EVENTS: 400,                                  // la cola de eventos hacia combat/ no crece sin límite
};

// ---- Escena ------------------------------------------------------------------------------------------
export const CX = AW / 2;
// Los reyes miden hasta ~370 px (Vhel forma 3: 369, y 380 al rugir) y la barra de vida ocupa hasta y ≈ 28: con los pies en 408 la
// cabeza más alta queda en y ≈ 28-39, justo bajo la barra, y los pies del rey quedan por encima de todas las parties.
export const KING_Y = 408;                          // pies del rey
export const KING_MAX_DX = 80;                      // el rey no se aleja más de 80 px de su puesto
export const MIN_FEET_Y = 414;                      // los pies de un héroe siempre por debajo del rey
export const FLOOR_CY = 404, CIRCLE_CY = 392;       // centros del suelo de piedra y del círculo mágico
export const TORCHES = [[112, 208], [848, 208], [300, 252], [660, 252]];

// Empalizada y puerta del campamento
export const FENCE_Y = 496;
export const GATE_X = 480;
export const GATE_IN = { x: GATE_X, y: 516 };       // lado del campamento
export const GATE_OUT = { x: GATE_X, y: 482 };      // lado de la arena

// Puestos de las parties (pies de la vanguardia). Los 4 primeros son de party completa y los 4 siguientes de solo vanguardia.
export const SLOTS_FULL = [[480, 472], [250, 462], [710, 462], [90, 444]];
export const SLOTS_VANG = [[365, 424], [595, 424], [170, 422], [800, 422]];
export const SLOTS = [...SLOTS_FULL, ...SLOTS_VANG];
export const FORM = [[0, 0], [-36, -16], [36, -16]];   // vanguardia al frente; distancia (o magia) y apoyo detrás
export const EDGE_Y = 472;                          // parties sin puesto: cuentan para el daño pero no se dibujan

// Carriles de movimiento (± px alrededor del puesto) según cuántas parties completas haya
export const laneFor = (fullCount, single) => single ? 60 : fullCount <= 2 ? 120 : 80;

// Campamento: 7 puestos de party en reposo (pies del héroe de referencia). Se ocupan de los más cercanos a la puerta a los más lejanos.
// (Única fuente de verdad: camp/camp.js y camp/props.js leen esta tabla. El puesto central queda justo bajo la puerta pero con los pies
// en 586, así que la cabeza no llega a la empalizada (y = 496) y el sendero de la puerta queda libre; los de fondo no rozan el borde.)
export const CAMP_SLOTS = [[372, 548], [612, 548], [480, 586], [132, 548], [852, 548], [252, 586], [732, 586]];
export const CAMP_MAX = CAMP_SLOTS.length;

// ---- Límites de memoria y horneado (los usa art/; aquí para poder ajustarlos sin tocar el kit) -----------
export const CACHE = { CANVAS_MB: 56, INDEX_MB: 8, BAKE_MS_COMBAT: 4, BAKE_MS_IDLE: 8 };

// Lienzo del tema oficina (se mantiene) para no importar map.js desde aquí
export const OFFICE_SIZE = { w: 480, h: 304 };
