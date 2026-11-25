// Planificador de horneado: cola con prioridades y presupuesto de tiempo por fotograma de pantalla.
// Prioridades: 0 = lo pedido para dibujar ahora, 1 = prehorneado inmediato, 2 = especulativo.
// Cada trabajo es un generador que cede el control tras cada fotograma horneado. Nunca bloquea:
// con una pestaña oculta se para y retoma al volver.

const now = () => performance.now();
const queue = [], byKey = new Map();
let seqN = 0;
let budget = { combat: 4, idle: 8 }, inCombat = false, manual = false, rafId = 0, frameNo = 0;
export const stats = { jobsDone: 0, longestStep: 0, lastPump: 0, errors: 0, dropped: 0 };
const MAX_SPEC = 100, MAX_SOON = 240;

export const setCombat = v => { inCombat = !!v; };
export const setBudgets = (combat, idle) => { budget = { combat, idle }; };
/** manual = true: nadie arranca el bucle propio; el que llame debe invocar pump() cada fotograma. */
export const setManual = v => { manual = !!v; };
export const frameCounter = () => frameNo;
export const pending = () => queue.length;
export const has = key => byKey.has(key);

/** Encola (o sube de prioridad) un trabajo. make() devuelve un generador; onDone(valor); onError(error). */
export function request(key, prio, make, onDone, onError) {
  const cur = byKey.get(key);
  if (cur) { if (prio < cur.prio) { cur.prio = prio; sort(); } return cur; }
  // La cola está acotada: el prehorneado especulativo se descarta si ya hay mucho en espera (lo urgente, prio ≤ 0, siempre entra)
  if ((prio >= 2 && queue.length >= MAX_SPEC) || (prio === 1 && queue.length >= MAX_SOON)) { stats.dropped++; return null; }
  const job = { key, prio, make, gen: null, onDone, onError, seq: seqN++ };
  byKey.set(key, job); queue.push(job); sort(); ensureLoop();
  return job;
}
export function cancel(prefix) {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].key.startsWith(prefix)) { byKey.delete(queue[i].key); queue.splice(i, 1); }
}
const sort = () => queue.sort((a, b) => a.prio - b.prio || a.seq - b.seq);

/** Avanza la cola durante `ms` milisegundos (como mínimo da un paso). Devuelve los trabajos acabados. */
export function pump(ms = inCombat ? budget.combat : budget.idle) {
  const t0 = now(); let done = 0;
  while (queue.length) {
    const job = queue[0];
    try {
      if (!job.gen) job.gen = job.make();
      const s0 = now(), r = job.gen.next(), d = now() - s0;
      if (d > stats.longestStep) stats.longestStep = d;
      if (r.done) { queue.shift(); byKey.delete(job.key); stats.jobsDone++; done++; if (job.onDone) job.onDone(r.value); }
    } catch (e) {
      queue.shift(); byKey.delete(job.key); stats.errors++;
      if (job.onError) job.onError(e); else console.error('kit16: error de horneado', job.key, e);
    }
    if (now() - t0 >= ms) break;
  }
  stats.lastPump = now() - t0;
  return done;
}

function loop() {
  rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { ensureLoop(); return; }
  pump();
  if (queue.length) ensureLoop();
}
function ensureLoop() {
  if (manual || rafId || typeof requestAnimationFrame !== 'function') return;
  rafId = requestAnimationFrame(loop);
}
// El contador de fotogramas avanza también sin cola para limitar los horneados síncronos (1 por fotograma)
if (typeof requestAnimationFrame === 'function') { const tick = () => { frameNo++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) ensureLoop(); });
