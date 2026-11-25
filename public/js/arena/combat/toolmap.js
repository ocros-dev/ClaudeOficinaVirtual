// Herramienta → acción (dueño: N3; tabla 4.7 del documento de arquitectura).
// `tool` llega tal cual desde el servidor: el nombre de la herramienta o los valores especiales
// "Delegar" (PreToolUse de Task/Agent), "Empezando" (SubagentStart) y "Pensando" (UserPromptSubmit).
// No llega el resultado de la herramienta, así que no existe «error de herramienta».

// Cada entrada: [acción, rol que actúa]. 'team' lo resuelve party.js (los 3 héroes)
const BY_NAME = {
  Read: ['probe', 'vanguard'], Grep: ['probe', 'vanguard'], Glob: ['probe', 'vanguard'], LS: ['probe', 'vanguard'],
  Edit: ['combo', 'vanguard'], Write: ['combo', 'vanguard'], MultiEdit: ['combo', 'vanguard'], NotebookEdit: ['combo', 'vanguard'],
  Bash: ['beam', 'ranged'], PowerShell: ['beam', 'ranged'],
  WebFetch: ['longshot', 'ranged'], WebSearch: ['longshot', 'ranged'],
  TodoWrite: ['buff', 'support'], ExitPlanMode: ['buff', 'support'], Pensando: ['buff', 'support'],
  Delegar: ['team', 'all'],
};
export const ROLES = ['vanguard', 'ranged', 'support'];
export const ROLE_INDEX = { vanguard: 0, ranged: 1, support: 2 };
const CYCLE = [['probe', 'vanguard'], ['combo', 'vanguard'], ['beam', 'ranged']];

// → { action, role } | null (ninguna acción). cyc: contador de la party para el ciclo sin dato de herramienta
export function classify(tool, cyc = 0) {
  if (tool === 'Empezando') return null;                             // la entrada de combate ya es la acción
  if (tool == null || tool === '') { const [action, role] = CYCLE[cyc % CYCLE.length]; return { action, role, cycled: true }; }
  const e = BY_NAME[tool];
  if (e) return { action: e[0], role: e[1] };
  if (/^mcp__/i.test(tool) || /browser|navigate|fetch|search/i.test(tool)) return { action: 'longshot', role: 'ranged' };
  return { action: 'probe', role: 'vanguard' };
}

// Parties de solo vanguardia: todo lo hace la vanguardia (beam y longshot pasan a combo, buff a probe y team a combo)
export function forVanguardOnly(c) {
  if (!c) return c;
  const map = { beam: 'combo', longshot: 'combo', buff: 'probe', team: 'combo' };
  return { ...c, action: map[c.action] || c.action, role: 'vanguard' };
}
