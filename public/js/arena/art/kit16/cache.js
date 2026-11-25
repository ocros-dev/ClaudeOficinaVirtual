// Caché LRU con contabilidad de bytes del kit 16 bits. Dos niveles de instancia:
// índices (Uint8Array, 8 MB) y lienzos RGBA (56 MB, 4 B/px contabilizados).
// No expulsa nada usado en los últimos `protectMs` (2 s): si todo es reciente, se admite pasarse un poco.

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class LruCache {
  constructor(maxBytes, { protectMs = 2000, onEvict = null } = {}) {
    this.max = maxBytes; this.protectMs = protectMs; this.onEvict = onEvict;
    this.map = new Map();      // clave -> { value, bytes, last }
    this.bytes = 0; this.hits = 0; this.misses = 0; this.evictions = 0;
  }
  get(key) {
    const e = this.map.get(key);
    if (!e) { this.misses++; return undefined; }
    this.hits++; e.last = now();
    this.map.delete(key); this.map.set(key, e);          // el más reciente al final
    return e.value;
  }
  peek(key) { const e = this.map.get(key); return e && e.value; }
  has(key) { return this.map.has(key); }
  set(key, value, bytes) {
    this.delete(key, true);
    this.map.set(key, { value, bytes, last: now() });
    this.bytes += bytes;
    this.trim();
  }
  delete(key, silent = false) {
    const e = this.map.get(key);
    if (!e) return false;
    this.map.delete(key); this.bytes -= e.bytes;
    if (this.onEvict && !silent) this.onEvict(key, e.value);
    return true;
  }
  /** Expulsa los menos usados hasta caber en el tope, respetando lo usado hace menos de protectMs. */
  trim() {
    if (this.bytes <= this.max) return;
    const t = now();
    for (const [key, e] of this.map) {
      if (this.bytes <= this.max) break;
      if (t - e.last < this.protectMs) continue;
      this.map.delete(key); this.bytes -= e.bytes; this.evictions++;
      if (this.onEvict) this.onEvict(key, e.value);
    }
  }
  /** Borra todas las entradas cuya clave empiece por el prefijo. */
  dropPrefix(prefix) { for (const key of [...this.map.keys()]) if (key.startsWith(prefix)) this.delete(key); }
  clear() { for (const key of [...this.map.keys()]) this.delete(key); }
  stats() { return { entries: this.map.size, bytes: this.bytes, mb: +(this.bytes / 1048576).toFixed(2), max: this.max, hits: this.hits, misses: this.misses, evictions: this.evictions }; }
}
