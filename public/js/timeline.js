// Línea de tiempo: una fila por agente con bloques de color según la herramienta.

export const CATEGORIES = [
  { id: 'edit',     label: 'editar',     color: '#4f8cff', test: t => /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(t) },
  { id: 'bash',     label: 'terminal',   color: '#5fd068', test: t => t === 'Bash' || t === 'PowerShell' },
  { id: 'read',     label: 'leer',       color: '#c8c8d8', test: t => t === 'Read' },
  { id: 'search',   label: 'buscar',     color: '#f5c542', test: t => /^(Grep|Glob)$/.test(t) },
  { id: 'web',      label: 'web',        color: '#b48cff', test: t => /^Web(Search|Fetch)$/.test(t) },
  { id: 'browser',  label: 'navegador',  color: '#45d4c8', test: t => /Browser|chrome/.test(t) },
  { id: 'delegate', label: 'coordinar',  color: '#d97757', test: t => /^(Delegar|Pensando|Empezando|SubagentHandback|Agent|Task|TodoWrite)$/.test(t) || /ccd_turn/.test(t) },
  { id: 'other',    label: 'otras',      color: '#f08fd0', test: () => true },
];
const catOf = tool => CATEGORIES.find(c => c.test(tool || '')) || CATEGORIES.at(-1);

export function createTimeline(canvas, { order, colorOf, onPick, labelOf = n => n }) {
  const g = canvas.getContext('2d');
  const hist = {};          // nombre -> [{ t, state, tool }]
  let windowMs = 10 * 60 * 1000;
  let rows = [];
  const LABEL = 118, ROW = 16, PAD = 6;

  function setHistory(obj) { for (const k of Object.keys(hist)) delete hist[k]; Object.assign(hist, obj || {}); }
  function push(agent) {
    const h = hist[agent.name] = hist[agent.name] || [];
    const last = h[h.length - 1];
    if (last && last.t === agent.updatedAt && last.state === agent.state && last.tool === agent.tool) return;
    h.push({ t: agent.updatedAt, state: agent.state, tool: agent.tool });
    if (h.length > 600) h.splice(0, h.length - 600);
  }
  function remove(name) { delete hist[name]; }
  function setWindow(ms) { windowMs = ms; }

  function draw() {
    const now = Date.now(), from = now - windowMs;
    // Solo los agentes con actividad en la ventana (o trabajando ahora)
    rows = order().filter(n => (hist[n] || []).some((e, i, arr) =>
      e.state !== 'idle' && ((arr[i + 1] ? arr[i + 1].t : now) >= from)));
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth, cssH = Math.max(1, rows.length) * ROW + PAD * 2 + 14;
    canvas.style.height = cssH + 'px';
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#17141f'; g.fillRect(0, 0, cssW, cssH);
    const plotW = cssW - LABEL - PAD;
    const xOf = t => LABEL + (t - from) / windowMs * plotW;

    // Marcas de tiempo
    g.font = '7px "Press Start 2P", monospace'; g.textBaseline = 'top';
    const stepMin = windowMs <= 3 * 60e3 ? 0.5 : windowMs <= 15 * 60e3 ? 2 : 5;
    for (let m = 0; m * 60e3 <= windowMs; m += stepMin) {
      const x = Math.round(xOf(now - m * 60e3));
      g.fillStyle = '#2a2538'; g.fillRect(x, PAD, 1, cssH - PAD * 2 - 10);
      g.fillStyle = '#6a6284'; g.fillText(m === 0 ? 'ahora' : `-${m}m`, Math.min(x - 2, cssW - 40), cssH - 12);
    }
    if (!rows.length) {
      g.fillStyle = '#6a6284'; g.fillText('Sin actividad en este intervalo.', LABEL, PAD + 4);
      return;
    }
    rows.forEach((name, r) => {
      const y = PAD + r * ROW;
      g.fillStyle = r % 2 ? '#1c1826' : '#1f1b2b'; g.fillRect(0, y, cssW, ROW);
      g.fillStyle = colorOf(name); g.fillRect(6, y + 5, 6, 6);
      const label = labelOf(name);
      g.fillStyle = '#d8d0ee'; g.fillText(label.length > 12 ? label.slice(0, 11) + '…' : label, 16, y + 4);
      const h = hist[name] || [];
      for (let i = 0; i < h.length; i++) {
        const e = h[i], end = h[i + 1] ? h[i + 1].t : now;
        if (end < from) continue;
        if (e.state === 'working') {
          const x0 = Math.max(LABEL, xOf(e.t)), x1 = Math.max(x0 + 1, xOf(end));
          const c = catOf(e.tool).color;
          g.fillStyle = c; g.fillRect(Math.round(x0), y + 3, Math.max(1, Math.round(x1 - x0)), ROW - 6);
          g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(Math.round(x0), y + 3, Math.max(1, Math.round(x1 - x0)), 1);
        } else if (e.state === 'done' && e.t >= from) {
          const x = Math.round(xOf(e.t));
          g.fillStyle = '#5fd068'; g.fillRect(x - 1, y + 2, 3, ROW - 4); g.fillRect(x - 3, y + 2, 7, 2);
        }
      }
    });
  }

  canvas.addEventListener('click', ev => {
    const r = canvas.getBoundingClientRect();
    const row = Math.floor((ev.clientY - r.top - PAD) / ROW);
    if (rows[row]) onPick(rows[row]);
  });

  return { setHistory, push, remove, setWindow, draw };
}
