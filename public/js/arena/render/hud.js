// Interfaz HTML de la arena: barra de vida del rey, placas de las parties, globos, banners y resumen.
// Lee el estado de las reglas y las cajas de la escena; no cambia nada de la lógica (salvo cerrar el resumen).
// Las placas se crean y se retiran aquí: las reglas no tocan el DOM.
import { S, workingCount, inCampState } from '../rules.js';
import { CFG, AW, AH, CX, KING_Y } from '../config.js';
import { kingFrame } from './links.js';
import { viewOf } from './scene.js';
import { enemyViews } from '../combat/index.js';

let hud = null, stageEl = null;
const eliteBars = new Map();       // id de élite → { box, fill }
const plates = new Map();          // party o grupo en reposo → { plate, ball, em, n, st, last }
const el = (tag, cls, html = '') => Object.assign(document.createElement(tag), { className: cls, innerHTML: html });
const setText = (o, k, e, v) => { if (o[k] !== v) { o[k] = v; e.textContent = v; } };
let env = { shortName: s => s };
export const initHud = e => { env = { ...env, ...e }; };

export function mountHud(stage) {
  stageEl = stage;
  hud = {
    bar: el('div', 'arena-hud', '<span class="ah-king"></span><span class="ah-form" title="Forma del rey"></span><span class="ah-track" role="progressbar" aria-label="Vida del Rey Demonio" aria-valuemin="0" aria-valuemax="100"><i class="ah-fill"></i><b class="ah-mark" data-f="2" title="Transformación al 60 %"></b><b class="ah-mark" data-f="3" title="Transformación al 25 %"></b></span><span class="ah-pct"></span><span class="ah-more"></span>'),
    banner: el('div', 'arena-banner'), shout: el('div', 'bub villain arena-shout'), summary: el('div', 'arena-summary'),
    empty: el('div', 'arena-empty', 'La arena espera…'), more: el('div', 'camp-more'), last: {},
  };
  hud.bar.hidden = hud.banner.hidden = hud.shout.hidden = hud.summary.hidden = hud.empty.hidden = hud.more.hidden = true;
  hud.banner.setAttribute('role', 'status'); hud.banner.setAttribute('aria-live', 'polite');
  hud.summary.addEventListener('click', () => { S.summary = null; });
  stage.append(hud.bar, hud.banner, hud.shout, hud.summary, hud.empty, hud.more);
}
// Placa con el nombre del agente y su globo de texto; rest = grupo en el campamento
function plateFor(o, rest) {
  let e = plates.get(o);
  if (!e) {
    const plate = el('div', 'aplate' + (rest ? ' rest' : ''), '<span class="ap-em" aria-hidden="true"></span><span class="ap-n"></span><span class="ap-st"></span>');
    const ball = el('div', rest ? 'bub rest' : 'bub hero');
    plate.hidden = ball.hidden = true;
    stageEl.append(plate, ball);
    plates.set(o, e = { plate, ball, em: plate.children[0], n: plate.children[1], st: plate.children[2], last: {} });
  }
  return e;
}
const pct = (x, total) => x / total * 100 + '%';

export function updateHud(now, on) {
  if (!hud) return;
  const b = on ? S.king : null, bar = hud.bar, sw = stageEl.clientWidth;
  bar.hidden = !b || S.phase === 'calm';
  if (b && !bar.hidden) {
    const p = Math.max(0, Math.min(100, Math.ceil(b.hp / b.max * 100)));
    setText(hud.last, 'k', bar.querySelector('.ah-king'), `👑 ${b.def.name}, ${b.def.title}`);
    setText(hud.last, 'f', bar.querySelector('.ah-form'), '◆'.repeat(b.form) + '◇'.repeat(3 - b.form));
    bar.querySelector('.ah-form').setAttribute('aria-label', `Forma ${b.form} de 3`);
    setText(hud.last, 'p', bar.querySelector('.ah-pct'), `${p} %`);
    const fill = bar.querySelector('.ah-fill'), track = bar.querySelector('.ah-track');
    fill.style.width = p + '%'; fill.dataset.lvl = p > 50 ? 'ok' : p > 25 ? 'mid' : 'low';
    track.setAttribute('aria-valuenow', p);
    const m2 = bar.querySelector('[data-f="2"]'), m3 = bar.querySelector('[data-f="3"]');
    m2.style.display = b.form < 2 ? '' : 'none'; m3.style.display = b.form < 3 ? '' : 'none';      // marcas de los umbrales aún no superados
    m2.style.left = CFG.FORM_HP[0] * 100 + '%'; m3.style.left = CFG.FORM_HP[1] * 100 + '%';
    track.classList.toggle('boost', now - b.boostAt < 500);
    const over = [...S.parties.values()].filter(q => q.slot === null && !inCampState(q)).length;
    setText(hud.last, 'm', bar.querySelector('.ah-more'), over ? `+${over} parties` : '');
  }
  stageEl.classList.toggle('arena-live', !!on && !bar.hidden);
  const bn = on ? S.banner : null;
  hud.banner.hidden = !bn;
  if (bn) setText(hud.last, 'bn', hud.banner, bn.text);
  // Sin rey ni nadie luchando: «La arena espera…» si no hay ninguna party, «Los héroes descansan…» si hay alguien en el campamento
  const idleArena = on && S.phase === 'none' && workingCount() === 0;
  hud.empty.hidden = !idleArena;
  if (idleArena) setText(hud.last, 'em', hud.empty, S.camp.size + S.parties.size > 0 ? 'Los héroes descansan…' : 'La arena espera…');
  const hidden = on ? [...S.camp.values()].filter(c => c.cs === null).length : 0;     // en reposo pero sin sitio visible
  hud.more.hidden = !hidden;
  if (hidden) setText(hud.last, 'mo', hud.more, `+${hidden} descansando`);
  // Grito del rey al transformarse
  const showShout = on && b && !b.deadAt && S.phase !== 'calm' && b.form >= 2 && now - b.shoutAt < CFG.KING_SHOUT_MS;
  hud.shout.hidden = !showShout;
  if (showShout) {
    setText(hud.last, 'sh', hud.shout, b.def.shouts[b.form - 2]);
    const half = hud.shout.offsetWidth / 2 + 2, kf = kingFrame(b.def.id, b.form, 'idle', 0);
    hud.shout.style.left = Math.max(half, Math.min(sw - half, (CX + 156) / AW * sw)) + 'px';
    hud.shout.style.top = Math.max(8, KING_Y - (kf.top || kf.h) * .55) / AH * 100 + '%';
  }
  const sm = on ? S.summary : null;
  hud.summary.hidden = !sm;
  if (sm) setText(hud.last, 'sm', hud.summary, `🏆 ${sm.king} · ${Math.round(sm.dur)} s · ${sm.hits} golpes${sm.mvp ? ' · MVP: ' + sm.mvp : ''}`);

  // Placas de las parties y sus gritos: como mucho 2 globos a la vez (los más recientes) y apilados si están cerca
  const alive = new Set(), talking = [];
  const loud = new Set([...S.parties.values()].filter(q => q.stage > 1 && now - q.shoutAt < CFG.PARTY_SHOUT_MS).sort((p, q) => q.shoutAt - p.shoutAt).slice(0, CFG.MAX_BALLOONS));
  const k = AW / sw;
  for (const p of S.parties.values()) {
    alive.add(p);
    const e = plateFor(p, false), v = on ? viewOf(p.name) : null;
    e.plate.hidden = !v;
    if (!v) { e.ball.hidden = true; continue; }
    const camped = inCampState(p), n = p.race.stages.length;
    setText(e.last, 'em', e.em, p.race.emblem[p.variant]);
    setText(e.last, 'n', e.n, env.shortName(p.name));
    setText(e.last, 's', e.st, camped ? '' : '◆'.repeat(p.stage) + '◇'.repeat(n - p.stage));
    e.st.setAttribute('aria-label', `etapa ${p.stage} de ${n}`);
    e.plate.classList.toggle('sel', p.name === S.selected);
    e.plate.classList.toggle('wait', camped);
    e.plate.style.left = pct(Math.max(60, Math.min(AW - 60, v.cx)), AW);
    e.plate.style.top = pct(v.top - 6, AH);
    const shouting = loud.has(p);
    const txt = shouting ? p.race.shouts[p.stage - 2] : (!p.working && now - p.doneAt < CFG.CELEBRATE_MS && p.state !== 'wait') ? '🏆 ¡victoria!' : '';
    e.ball.hidden = !txt;
    if (txt) {
      setText(e.last, 'b', e.ball, txt);
      e.ball.className = 'bub hero' + (shouting ? '' : ' done');
      const half = e.ball.offsetWidth / 2 + 2, hw = half * k, bh = e.ball.offsetHeight * k + 16;
      let cx = v.cx, near = 0;
      if (shouting && b && !b.deadAt && S.phase !== 'calm') {      // el globo no tapa al rey: si cae sobre su silueta, se aparta hacia su lado
        const kf = kingFrame(b.def.id, b.form, 'idle', 0), kl = CX - kf.w * .32 - hw, kr = CX + kf.w * .32 + hw;
        const hitsKing = (v.top - 28) - bh < KING_Y + 20 && v.top - 28 > KING_Y - (kf.top || kf.h);
        if (hitsKing && cx > kl && cx < kr) cx = cx < CX ? kl : kr;
      }
      for (const q of talking) if (Math.abs(q - cx) < hw * 2) near++;      // si hay otro encima, sube un nivel
      talking.push(cx);
      e.ball.style.left = Math.max(half, Math.min(sw - half, cx / AW * sw)) + 'px';
      e.ball.style.top = pct(v.top - 28 - near * 32, AH);
    }
  }
  // Los que descansan: placa con el nombre y, cuando hablan, un globo sobre el héroe que habla (como mucho 2 a la vez)
  const chatty = new Set([...S.camp.values()].filter(c => c.chat && c.cs !== null && !c.rise).sort((p, q) => q.chat.at - p.chat.at).slice(0, CFG.MAX_CHATS));
  for (const c of S.camp.values()) {
    alive.add(c);
    const e = plateFor(c, true), v = on && c.cs !== null && !c.rise ? c.view : null;      // levantándose: la placa es la de su party
    e.plate.hidden = !v;
    if (!v) { e.ball.hidden = true; continue; }
    setText(e.last, 'em', e.em, c.race.emblem[c.variant]);
    setText(e.last, 'n', e.n, env.shortName(c.name));
    e.plate.classList.toggle('sel', c.name === S.selected);
    e.plate.classList.add('wait');
    e.plate.style.left = pct(Math.max(60, Math.min(AW - 60, v.cx)), AW);
    e.plate.style.top = pct(v.top - 6, AH);
    const talk = chatty.has(c) && c.chatPos;
    e.ball.hidden = !talk;
    if (talk) {
      setText(e.last, 'b', e.ball, c.chat.text);
      const half = e.ball.offsetWidth / 2 + 2;
      e.ball.style.left = Math.max(half, Math.min(sw - half, c.chatPos.x / AW * sw)) + 'px';
      e.ball.style.top = pct(v.top - 22, AH);
    }
  }
  // Barras de vida de los élites: la posición viene del combate y la vida de las reglas
  const seen = new Set();
  if (on) for (const v of enemyViews()) {
    const e = S.elites.find(x => x.id === v.id);
    if (!e || e.dyingAt) continue;
    seen.add(v.id);
    let bar = eliteBars.get(v.id);
    if (!bar) {
      const box = el('div', 'elite-bar', '<i></i>'); box.setAttribute('role', 'progressbar'); box.setAttribute('aria-label', 'Vida del élite ' + e.def.name);
      stageEl.append(box); eliteBars.set(v.id, bar = { box, fill: box.firstChild });
    }
    const pctHp = Math.max(0, Math.round(e.hp / e.max * 100));
    bar.fill.style.width = pctHp + '%'; bar.box.setAttribute('aria-valuenow', pctHp);
    bar.box.style.left = pct(Math.max(30, Math.min(AW - 30, v.x)), AW); bar.box.style.top = pct(Math.max(40, v.top - 14), AH);
  }
  for (const [id, bar] of eliteBars) if (!seen.has(id)) { bar.box.remove(); eliteBars.delete(id); }
  for (const [o, e] of plates) if (!alive.has(o)) { e.plate.remove(); e.ball.remove(); plates.delete(o); }   // party o grupo que ya no existe

  const cv = stageEl.querySelector('canvas');
  if (cv) {
    const resting = S.camp.size + [...S.parties.values()].filter(inCampState).length;
    const label = on ? (b ? `Arena: ${b.def.name}, ${b.def.title}, ${Math.ceil(b.hp / b.max * 100)} % de vida, ${workingCount()} parties luchando, ${resting} descansando`
      : resting ? `Arena sin batalla: ${resting} parties descansando en el campamento` : 'Arena vacía: la arena espera') : 'Oficina virtual';
    if (hud.last.cv !== label && (!hud.cvAt || now - hud.cvAt > 3000)) { hud.last.cv = label; hud.cvAt = now; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label); }
  }
}
// Quita todas las placas (al cambiar de tema o reiniciar)
export function clearPlates() { for (const b of eliteBars.values()) b.box.remove(); eliteBars.clear(); for (const e of plates.values()) { e.plate.remove(); e.ball.remove(); } plates.clear(); }
