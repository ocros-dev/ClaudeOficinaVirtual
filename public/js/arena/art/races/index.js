// Registro de las 9 razas. No se toca después de la fase 1: cada paquete de arte solo edita su archivo.
import tempestarios from './tempestarios.js';
import humanos from './humanos.js';
import elfos from './elfos.js';
import enanos from './enanos.js';
import orcos from './orcos.js';
import gnomos from './gnomos.js';
import bestiales from './bestiales.js';
import draconios from './draconios.js';
import astrales from './astrales.js';

export const RACE_ART = { tempestarios, humanos, elfos, enanos, orcos, gnomos, bestiales, draconios, astrales };
export const RACE_IDS = Object.keys(RACE_ART);
export default RACE_ART;
