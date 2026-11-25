// Registro de los ataques firma de los 4 reyes (dueño: N3; no se toca después).
import kazgorath from './kazgorath.js';
import vhel from './vhel.js';
import ysgrim from './ysgrim.js';
import tzar from './tzar.js';

export const KING_MOVES = { kazgorath, vhel, ysgrim, tzar };
export const signatureOf = kingId => (KING_MOVES[kingId] || kazgorath).signature;
export const kingColor = kingId => (KING_MOVES[kingId] || kazgorath).color;
