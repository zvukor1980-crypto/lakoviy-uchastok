import {
  ROOMS, RES, RES_ORDER, HQ_STAGES, hqStage, MISSIONS, SHOP, SPEEDUPS, CHAIN, BONUS, prodRate, buildersFor,
  storageCap, offlineCapHours, roomArtTier, roomTrimTier, TRIM_NAMES, MAX_LEVEL, ROOM_IDS, repRequired,
} from './data.js';
import {
  G, lvl, chiefLvl, isUnlocked, upgradingOf, builders, freeBuilders, nextCost, nextTime, requirements, canAfford,
  missingFor, startUpgrade, speedupCost, speedupWithCrystals, useSpeedItem, collect, collectable, prodPerHour,
  chainRates, nextMilestone, missionProgress, claimable, claimMission, buy, capFor, settings, saveSettings, saveGame, bonus, PRODUCERS,
} from './state.js';
import { icon } from './icons.js';
import { focusRoom, focusFacade, setSelected, floatText, fmtTime } from './station.js';
import { sfx } from './audio.js';
import { drawPortrait, makeLook } from './figures.js';

const $ = (s, el = document) => el.querySelector(s);
export const fmt = (n) => {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace('.', ',') + ' млрд';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' млн';
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
};
const costHtml = (cost) => Object.entries(cost).map(([r, v]) => `<span class="cost ${G.s.res[r] >= v ? '' : 'lack'}">${icon(r)}${fmt(v)}</span>`).join('');

// ---------- Тосты ----------
export function toast(text, kind = '') {
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = text;
  const box = $('#toasts'); box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => el.classList.add('out'), 2200); setTimeout(() => el.remove(), 2700);
}

// ---------- HUD ----------
let portraitDone = false;
export function renderHud() {
  const s = G.s;
  $('#hud-level').textContent = chiefLvl();
  for (const r of RES_ORDER) {
    const el = $(`#res-${r} b`); if (!el) continue;
    el.textContent = fmt(s.res[r]);
    el.parentElement.classList.toggle('full', r !== 'crystals' && s.res[r] >= capFor(r));
  }
  $('#hud-builders').innerHTML = `${icon('hammer')}<b>${s.upgrades.length}/${builders()}</b>`;
  const n = claimable().length;
  const b = $('#btn-tasks .badge'); b.textContent = n; b.hidden = n === 0;
  if (!portraitDone) {
    const cv = $('#portrait'); const c = cv.getContext('2d');
    cv.width = cv.height = 128; drawPortrait(c, 128, makeLook('chief', 7)); portraitDone = true;
  }
}

// ---------- Шторка комнаты ----------
let openRoom = null;
export function closeSheet() {
  $('#sheet').classList.remove('open'); openRoom = null; setSelected(null);
}
export function isSheetOpen() { return !!openRoom; }
export function openRoomSheet(id) {
  openRoom = id; setSelected(id); sfx('open');
  renderSheet(); $('#sheet').classList.add('open');
  focusRoom(id);
}
function statRows(id, L) {
  const n = L + 1, rows = [];
  const pr = (lv) => prodRate(id, lv);
  const hosp = 1 + bonus('hospital') / 100;
  const k = ROOMS[id].kind;
  const per = (v) => `${fmt(v)}/ч`;
  switch (id) {
    case 'chief':
      rows.push(['Доход денег', per(pr(L).money * hosp || 0), per(pr(n).money * hosp)]);
      rows.push(['Макс. уровень комнат', L, n]);
      break;
    case 'reception': rows.push(['Заявлений', per(L ? CHAIN.reception(L) : 0), per(CHAIN.reception(n))]); break;
    case 'detective': rows.push(['Ордеров', per(L ? CHAIN.detective(L) : 0), per(CHAIN.detective(n))]); break;
    case 'patrol': rows.push(['Задержаний', per(L ? CHAIN.patrol(L) : 0), per(CHAIN.patrol(n))]); break;
    case 'interrogation': rows.push(['Закрытых дел', per(L ? CHAIN.interrogation(L) : 0), per(CHAIN.interrogation(n))]); rows.push(['Репутация за дело', (2 + bonus('training')).toFixed(1), (2 + bonus('training')).toFixed(1)]); break;
    case 'cells':
      rows.push(['Мест в камерах', L ? CHAIN.cellsCap(L) : 0, CHAIN.cellsCap(n)]);
      rows.push(['Деньги за заключённую', per(L ? CHAIN.moneyPerPrisoner(L) : 0), per(CHAIN.moneyPerPrisoner(n))]);
      break;
    case 'warehouse':
      rows.push(['Материалы', per((pr(L).materials || 0) * hosp), per(pr(n).materials * hosp)]);
      rows.push(['Вместимость ресурсов', fmt(storageCap(L)), fmt(storageCap(n))]);
      break;
    case 'archive':
      rows.push(['Кристаллы', per(pr(L).crystals || 0), per(pr(n).crystals)]);
      rows.push(['Накопление офлайн', `${offlineCapHours(L)} ч`, `${offlineCapHours(n)} ч`]);
      break;
    case 'command': rows.push(['Строительниц', buildersFor(L), buildersFor(n)]); break;
    case 'dispatch': rows.push(['Скорость цепочки дел', `+${BONUS.dispatch(L)}%`, `+${BONUS.dispatch(n)}%`]); break;
    case 'lounge': rows.push(['Деньги от камер', `+${BONUS.lounge(L)}%`, `+${BONUS.lounge(n)}%`]); break;
    case 'hospital': rows.push(['Производство ресурсов', `+${BONUS.hospital(L)}%`, `+${BONUS.hospital(n)}%`]); break;
    case 'research': rows.push(['Время улучшений', `−${BONUS.research(L)}%`, `−${BONUS.research(n)}%`]); break;
    case 'academy': rows.push(['Стоимость улучшений', `−${BONUS.academy(L)}%`, `−${BONUS.academy(n)}%`]); break;
    case 'training': rows.push(['Репутация за дело', `+${BONUS.training(L).toFixed(1)}`, `+${BONUS.training(n).toFixed(1)}`]); break;
    case 'lab': rows.push(['Скорость детективов', `+${BONUS.lab(L)}%`, `+${BONUS.lab(n)}%`]); break;
    case 'k9': rows.push(['Скорость патруля', `+${BONUS.k9(L)}%`, `+${BONUS.k9(n)}%`]); break;
    default:
      if (k === 'prod') for (const r of Object.keys(ROOMS[id].prod)) rows.push([RES[r].name, per((pr(L)[r] || 0) * hosp), per(pr(n)[r] * hosp)]);
  }
  return rows;
}
function visualNote(id, L) {
  const n = L + 1, notes = [];
  if (roomArtTier(n) !== roomArtTier(Math.max(1, L)) && L > 0) notes.push('Новое элитное оформление комнаты');
  else if (L < 10) notes.push(`Элитное оформление комнаты — на ур. 10`);
  if (roomTrimTier(n) !== roomTrimTier(L)) notes.push(TRIM_NAMES[roomTrimTier(n)]);
  const crew = (lv) => (lv <= 0 ? 0 : Math.min(3, 1 + (lv >= 3) + (lv >= 8)));
  if (crew(n) > crew(L)) notes.push(`Сотрудниц в комнате: ${crew(n)}`);
  if (id === 'chief') {
    const opens = ROOM_IDS.filter((r) => ROOMS[r].unlock === n).map((r) => ROOMS[r].name);
    if (opens.length) notes.push('Откроется: ' + opens.join(', '));
    if (hqStage(n) !== hqStage(L)) notes.push(`Новый этап здания: «${HQ_STAGES[hqStage(n)].name}»`);
  }
  return notes;
}
export function renderSheet() {
  const id = openRoom; if (!id) return;
  const def = ROOMS[id], L = lvl(id), u = upgradingOf(id), el = $('#sheet-body');
  const unlocked = isUnlocked(id);
  let h = `<div class="sh-head"><div><h2>${def.name}</h2><div class="sh-lvl">${L > 0 ? `Уровень ${L}` : unlocked ? 'Не построено' : 'Закрыто'}${L < MAX_LEVEL ? ` <span class="arrow">→</span> <span class="next">${L + 1}</span>` : ' · максимум'}</div></div>
    <button class="icon-btn" data-act="close" aria-label="Закрыть">${icon('close')}</button></div>
    <p class="sh-desc">${def.desc}</p>`;
  if (u) {
    const rem = Math.max(0, (u.end - G.now()) / 1000), total = (u.end - u.start) / 1000, p = Math.min(100, (1 - rem / Math.max(1, total)) * 100);
    const c = speedupCost(u);
    h += `<div class="sh-progress"><div class="bar"><i style="width:${p}%"></i></div><div class="t">${icon('clock')} ${fmtTime(rem)} до ур. ${u.target}</div></div>
      <div class="sh-actions">
        <button class="btn primary" data-act="speed">${c === 0 ? 'Завершить бесплатно' : `Ускорить ${icon('crystals')} ${c}`}</button>
      </div>`;
    const items = Object.keys(SPEEDUPS).filter((k) => G.s.inv[k] > 0);
    if (items.length) h += `<div class="sh-items">${items.map((k) => `<button class="btn small" data-act="item" data-item="${k}">${icon(k)} ${SPEEDUPS[k].name} ×${G.s.inv[k]}</button>`).join('')}</div>`;
  }
  if (L > 0 || unlocked) {
    const rows = statRows(id, L);
    if (rows.length) h += `<table class="stats"><tr><th></th><th>Сейчас</th><th>Ур. ${Math.min(MAX_LEVEL, L + 1)}</th></tr>${rows.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td class="next">${L < MAX_LEVEL ? c : '—'}</td></tr>`).join('')}</table>`;
  }
  if (PRODUCERS.includes(id) && L > 0) {
    const st = G.s.rooms[id].stock, parts = Object.entries(st).filter(([, v]) => v >= 1).map(([r, v]) => `${icon(r)}${fmt(v)}`);
    h += `<div class="sh-collect"><span>Накоплено: ${parts.length ? parts.join(' ') : 'пока пусто'}</span>${collectable(id) ? '<button class="btn small gold" data-act="collect">Собрать</button>' : ''}</div>`;
  }
  if (!u && L < MAX_LEVEL) {
    const notes = visualNote(id, L);
    if (notes.length && unlocked) h += `<ul class="notes">${notes.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    const reqs = requirements(id);
    if (reqs.length) h += `<div class="reqs">${reqs.map((r) => `<span class="req ${r.ok ? 'ok' : 'no'}" ${r.room && !r.ok ? `data-act="goto" data-room="${r.room}"` : ''}>${r.ok ? '✓' : '✗'} ${r.text}${r.room && !r.ok ? ' ›' : ''}</span>`).join('')}</div>`;
    if (unlocked) {
      const cost = nextCost(id), time = nextTime(id);
      h += `<div class="sh-cost">${costHtml(cost)}<span class="cost time">${icon('clock')}${fmtTime(time)}</span></div>
        <div class="sh-actions"><button class="btn primary big ${reqs.some((r) => !r.ok) || !canAfford(cost) || freeBuilders() <= 0 ? 'dim' : ''}" data-act="upgrade">${L === 0 ? 'Построить' : 'Улучшить'}</button></div>`;
    }
  }
  el.innerHTML = h;
}
function sheetAction(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, id = openRoom;
  if (act === 'close') { sfx('tap'); closeSheet(); return; }
  if (act === 'goto') { sfx('tap'); openRoomSheet(b.dataset.room); return; }
  if (act === 'collect') { doCollect(id); renderSheet(); return; }
  if (act === 'upgrade') {
    const reqs = requirements(id).filter((r) => !r.ok);
    if (reqs.length) { sfx('error'); toast('Нужно: ' + reqs.map((r) => r.text).join(', '), 'warn'); return; }
    if (freeBuilders() <= 0) { sfx('error'); toast('Все строительницы заняты. Дождитесь окончания или ускорьте стройку.', 'warn'); return; }
    const miss = missingFor(nextCost(id));
    if (Object.keys(miss).length) { sfx('error'); toast('Не хватает: ' + Object.entries(miss).map(([r, v]) => `${RES[r].name} ${fmt(v)}`).join(', '), 'warn'); return; }
    const r = startUpgrade(id);
    if (r.ok) { sfx('build'); toast(lvl(id) === 0 ? 'Строительство началось' : 'Улучшение началось'); }
    else { sfx('error'); toast(r.msg, 'warn'); }
    renderSheet(); renderHud(); return;
  }
  if (act === 'speed') {
    const r = speedupWithCrystals(id);
    if (!r.ok) { sfx('error'); toast(r.msg || 'Нельзя ускорить', 'warn'); }
    else onUpgradesDone(r.done);
    renderSheet(); renderHud(); return;
  }
  if (act === 'item') {
    const r = useSpeedItem(id, b.dataset.item);
    if (r.ok) { sfx('tap'); toast('Ускоритель применён'); onUpgradesDone(r.done); }
    renderSheet(); renderHud(); return;
  }
}
export function onUpgradesDone(done) {
  if (!done || !done.length) return;
  sfx('done');
  for (const u of done) {
    const name = ROOMS[u.room].name;
    toast(u.target === 1 ? `Построено: ${name}` : `${name} — уровень ${u.target}!`, 'good');
    floatText(u.room, `Ур. ${u.target}`, '#cdb8ff');
    if (u.room === 'chief') {
      const opens = ROOM_IDS.filter((r) => ROOMS[r].unlock === u.target).map((r) => ROOMS[r].name);
      if (opens.length) setTimeout(() => toast('Открыто: ' + opens.join(', '), 'good'), 600);
      if (hqStage(u.target) !== hqStage(u.target - 1)) setTimeout(() => { showModal(`<h2>Новый этап здания</h2><p>Участок вырос: <b>«${HQ_STAGES[hqStage(u.target)].name}»</b>. Посмотрите на фасад — он изменился.</p><div class="row"><button class="btn primary" data-close data-facade>Показать фасад</button></div>`); }, 900);
    }
  }
  saveGame();
}
export function doCollect(id) {
  const got = collect(id);
  const keys = Object.keys(got);
  if (!keys.length) {
    if (collectable(id)) { sfx('error'); toast('Хранилище заполнено — улучшите Склад', 'warn'); }
    return;
  }
  sfx('coin');
  floatText(id, keys.map((r) => `+${fmt(got[r])}`).join(' '), keys[0] === 'crystals' ? '#cdb8ff' : '#f3d77a');
  renderHud(); saveGame();
}

// ---------- Модальные окна ----------
let hideTimer = null;
export function showModal(html, onAction) {
  const m = $('#modal');
  clearTimeout(hideTimer);
  $('#modal-card').innerHTML = html;
  m.hidden = false; requestAnimationFrame(() => m.classList.add('show'));
  m.onclick = (e) => {
    const b = e.target.closest('[data-close],[data-act]');
    if (e.target === m) { hideModal(); return; }
    if (!b) return;
    if (b.hasAttribute('data-facade')) { closeSheet(); focusFacade(); }
    if (b.dataset.act && onAction) onAction(b.dataset.act, b);
    if (b.hasAttribute('data-close')) hideModal();
  };
}
export function hideModal() { const m = $('#modal'); m.classList.remove('show'); clearTimeout(hideTimer); hideTimer = setTimeout(() => { m.hidden = true; }, 180); }

export function openTasks() {
  sfx('open');
  const render = () => {
    const firstOpen = MISSIONS.find((m) => !G.s.missions.claimed.includes(m.id));
    const list = MISSIONS.map((m) => {
      const claimed = G.s.missions.claimed.includes(m.id), p = missionProgress(m), done = p.cur >= p.need;
      const rw = Object.entries(m.reward).map(([r, v]) => `${icon(r)}${fmt(v)}`).join(' ');
      return `<li class="task ${claimed ? 'claimed' : done ? 'done' : ''} ${m === firstOpen ? 'current' : ''}">
        <div class="tt">${m.text}<div class="tbar"><i style="width:${(p.cur / p.need) * 100}%"></i></div><small>${fmt(p.cur)} / ${fmt(p.need)} · ${rw}</small></div>
        ${claimed ? '<span class="chk">✓</span>' : done ? `<button class="btn small gold" data-act="claim" data-id="${m.id}">Забрать</button>` : m.room ? `<button class="btn small" data-act="go" data-room="${m.room}">Перейти</button>` : ''}
      </li>`;
    }).join('');
    const doneN = G.s.missions.claimed.length;
    return `<div class="m-head"><h2>Глава 1. Новый участок</h2><button class="icon-btn" data-close aria-label="Закрыть">${icon('close')}</button></div>
      <div class="chapter"><div class="tbar big"><i style="width:${(doneN / MISSIONS.length) * 100}%"></i></div><small>Выполнено ${doneN} из ${MISSIONS.length}</small></div>
      <ul class="tasks">${list}</ul>${doneN === MISSIONS.length ? '<p class="center">Глава 1 пройдена! Следующие главы появятся в новых этапах разработки.</p>' : ''}`;
  };
  showModal(render(), (act, b) => {
    if (act === 'claim') {
      if (claimMission(b.dataset.id)) { sfx('coin'); toast('Награда получена', 'good'); renderHud(); }
      $('#modal-card').innerHTML = render();
    }
    if (act === 'go') { hideModal(); switchTab('station'); openRoomSheet(b.dataset.room); }
  });
}

export function openCases() {
  sfx('open');
  const render = () => {
    const cr = chainRates(), c = G.s.chain;
    const stage = (room, title, count, rate, unit, perHour = true) => {
      const L = lvl(room), built = L > 0;
      return `<div class="chain-step ${built ? '' : 'off'}" data-act="room" data-room="${room}">
        <b>${title}</b><span class="cnt">${built ? fmt(count) : '—'}</span><small>${built ? `${fmt(rate)} ${unit}${perHour ? '/ч' : ''}` : isUnlocked(room) ? 'нужно построить' : `кабинет ур. ${ROOMS[room].unlock}`}</small></div>`;
    };
    let hint = '';
    if (lvl('patrol') === 0) hint = 'Постройте Патрульный отдел, чтобы задерживать по ордерам.';
    else if (lvl('cells') === 0) hint = 'Постройте Камеры — без них некуда помещать осуждённых.';
    else if (lvl('interrogation') === 0) hint = 'Постройте Допросную (откроется на ур. 2 кабинета) — тогда дела начнут закрываться и приносить деньги.';
    else {
      const rates = [['Приёмная', cr.reception], ['Детективы', cr.detective], ['Патруль', cr.patrol], ['Допросная', cr.interrogation]];
      const min = rates.reduce((a, b) => (b[1] < a[1] ? b : a));
      hint = c.prisoners >= cr.cellsCap - 0.5 ? 'Камеры заполнены — улучшите Камеры, чтобы получать больше денег.' : `Самое узкое место: ${min[0]} (${fmt(min[1])}/ч). Улучшите её, чтобы ускорить поток дел.`;
    }
    return `<div class="m-head"><h2>Цепочка дел</h2><button class="icon-btn" data-close aria-label="Закрыть">${icon('close')}</button></div>
      <div class="chain">
        ${stage('reception', 'Заявления', c.apps, cr.reception, 'шт')}<i class="ch-arrow">›</i>
        ${stage('detective', 'Ордера', c.warrants, cr.detective, 'шт')}<i class="ch-arrow">›</i>
        ${stage('patrol', 'Задержаны', c.arrested, cr.patrol, 'чел')}<i class="ch-arrow">›</i>
        ${stage('interrogation', 'Допрос', 0, cr.interrogation, 'дел')}<i class="ch-arrow">›</i>
        ${stage('cells', 'В камерах', c.prisoners, cr.cellsCap, 'мест', false)}
      </div>
      <p class="hint">${hint}</p>
      <div class="kv"><span>${icon('rep')} Репутация</span><b>${fmt(G.s.rep)}</b></div>
      <div class="kv"><span>Закрыто дел</span><b>${fmt(G.s.stats.cases)}</b></div>
      <div class="kv"><span>${icon('money')} Доход камер</span><b>${fmt(prodPerHour('cells').money || 0)}/ч</b></div>
      <p class="small muted">Следующая веха: ${fmt(nextMilestone())} закрытых дел — +5 кристаллов. Репутация нужна для улучшения кабинета начальницы.</p>`;
  };
  showModal(render(), (act, b) => { if (act === 'room') { hideModal(); openRoomSheet(b.dataset.room); } });
}

export function openBuilding() {
  sfx('open');
  const L = chiefLvl(), st = hqStage(L);
  const rows = HQ_STAGES.map((s, i) => `<li class="${i === st ? 'cur' : i < st ? 'past' : ''}"><b>${i + 1}. ${s.name}</b><small>кабинет ур. ${s.from}–${s.to}</small></li>`).join('');
  const next = HQ_STAGES[st + 1];
  showModal(`<div class="m-head"><h2>Здание участка</h2><button class="icon-btn" data-close aria-label="Закрыть">${icon('close')}</button></div>
    <p>Уровень кабинета начальницы: <b>${L}</b> из ${MAX_LEVEL}. ${next ? `Следующий этап — на ур. ${next.from}.` : 'Достигнут высший этап.'}</p>
    <ul class="stages">${rows}</ul>
    <div class="row"><button class="btn" data-close data-facade>Показать фасад</button><button class="btn primary" data-act="chief">Кабинет начальницы</button></div>`,
  (act) => { if (act === 'chief') { hideModal(); openRoomSheet('chief'); } });
}

export function openBuilders() {
  sfx('open');
  const ups = G.s.upgrades;
  const list = ups.length ? ups.map((u) => `<li class="task"><div class="tt">${ROOMS[u.room].name} → ур. ${u.target}<small>${fmtTime(Math.max(0, (u.end - G.now()) / 1000))}</small></div><button class="btn small" data-act="go" data-room="${u.room}">Открыть</button></li>`).join('') : '<li class="muted">Все строительницы свободны. Выберите комнату и нажмите «Улучшить».</li>';
  showModal(`<div class="m-head"><h2>Строительницы ${ups.length}/${builders()}</h2><button class="icon-btn" data-close aria-label="Закрыть">${icon('close')}</button></div>
    <ul class="tasks">${list}</ul><p class="small muted">Командный центр даёт вторую строительницу (ур. 1) и третью (ур. 15).</p>`,
  (act, b) => { if (act === 'go') { hideModal(); switchTab('station'); openRoomSheet(b.dataset.room); } });
}

export function openResInfo(r) {
  const src = { money: 'Камеры (финансирование за заключённых) и Кабинет начальницы', electricity: 'Центр связи', fuel: 'Гараж', ammo: 'Оружейная', materials: 'Склад', crystals: 'Задания, Архив и вехи закрытых дел' }[r];
  const capTxt = r === 'crystals' ? 'без ограничения' : fmt(capFor(r));
  toast(`${RES[r].name}: ${fmt(G.s.res[r])}. Источник: ${src}. Вместимость: ${capTxt}.`);
}

export function openProfile() {
  sfx('open');
  const s = G.s;
  showModal(`<div class="m-head"><h2>Начальница участка</h2><button class="icon-btn" data-close aria-label="Закрыть">${icon('close')}</button></div>
    <div class="kv"><span>Уровень кабинета</span><b>${chiefLvl()}</b></div>
    <div class="kv"><span>Этап здания</span><b>${HQ_STAGES[hqStage(chiefLvl())].name}</b></div>
    <div class="kv"><span>${icon('rep')} Репутация</span><b>${fmt(s.rep)}</b></div>
    <div class="kv"><span>Нужно для ур. ${chiefLvl() + 1}</span><b>${fmt(repRequired(chiefLvl() + 1))}</b></div>
    <div class="kv"><span>Закрыто дел</span><b>${fmt(s.stats.cases)}</b></div>
    <div class="kv"><span>Улучшений завершено</span><b>${fmt(s.stats.upgrades)}</b></div>
    <div class="kv"><span>Построено помещений</span><b>${ROOM_IDS.filter((r) => lvl(r) > 0).length} из ${ROOM_IDS.length}</b></div>
    <div class="row"><button class="btn primary" data-act="b">Здание участка</button></div>`, (act) => { if (act === 'b') { hideModal(); openBuilding(); } });
}

export function openSettings(fromMenu, handlers) {
  sfx('open');
  const render = () => {
    const st = settings();
    return `<div class="m-head"><h2>Настройки</h2><button class="icon-btn" data-close aria-label="Закрыть">${icon('close')}</button></div>
      <div class="kv"><span>${icon('sound')} Звук</span><button class="toggle ${st.sound ? 'on' : ''}" data-act="sound" aria-label="Звук"><i></i></button></div>
      ${fromMenu ? '' : `<div class="row col">
        <button class="btn" data-act="save">Сохранить сейчас</button>
        <button class="btn" data-act="menu">Выйти в главное меню</button>
        <button class="btn danger" data-act="reset">Сбросить прогресс</button></div>`}
      <p class="small muted">«Лаковый участок» · этап 1 · версия ${window.__APP_VERSION__ || 'dev'}<br>Работает без интернета. Прогресс хранится только на этом устройстве. Без рекламы, покупок и регистрации.</p>`;
  };
  showModal(render(), (act) => {
    if (act === 'sound') { const st = settings(); st.sound = !st.sound; saveSettings(st); if (st.sound) sfx('tap'); $('#modal-card').innerHTML = render(); }
    if (act === 'save') { if (saveGame()) toast('Игра сохранена', 'good'); }
    if (act === 'menu') { hideModal(); handlers.toMenu(); }
    if (act === 'reset') {
      showModal(`<h2>Сбросить прогресс?</h2><p>Весь прогресс на этом устройстве будет удалён без возможности восстановления.</p><div class="row"><button class="btn" data-close>Отмена</button><button class="btn danger" data-act="confirm">Удалить</button></div>`,
        (a) => { if (a === 'confirm') { hideModal(); handlers.reset(); } });
    }
  });
}

// ---------- Магазин ----------
let shopTab = 'res';
export function renderShop() {
  const el = $('#shop-body');
  const items = SHOP.filter((i) => i.tab === shopTab);
  el.innerHTML = `<div class="tabs">
      <button class="tab ${shopTab === 'res' ? 'on' : ''}" data-tab="res">Ресурсы</button>
      <button class="tab ${shopTab === 'speed' ? 'on' : ''}" data-tab="speed">Ускорители</button>
    </div>
    <div class="grid">${items.map((it) => {
      const [gr, gv] = Object.entries(it.give)[0];
      const ok = canAfford(it.price);
      return `<div class="card">
        <div class="card-ic">${icon(gr, 'xl')}</div>
        <div class="card-name">${it.name}</div>
        <div class="card-give">${gr in G.s.res ? '+' + fmt(gv) + ' ' + RES[gr].short : it.desc || ''}</div>
        <button class="btn ${ok ? 'primary' : 'dim'} small" data-buy="${it.id}">${Object.entries(it.price).map(([r, v]) => `${icon(r)}${fmt(v)}`).join(' ')}</button>
      </div>`;
    }).join('')}</div>
    ${shopTab === 'speed' ? `<p class="small muted">В наличии: ${Object.keys(SPEEDUPS).map((k) => `${SPEEDUPS[k].name} ×${G.s.inv[k] || 0}`).join(' · ')}. Применяются в окне улучшающейся комнаты.</p>` : ''}
    <p class="small muted">Только игровая валюта. Никаких реальных платежей.</p>`;
}
function shopClick(e) {
  const t = e.target.closest('[data-tab]');
  if (t) { sfx('tap'); shopTab = t.dataset.tab; renderShop(); return; }
  const b = e.target.closest('[data-buy]'); if (!b) return;
  const r = buy(b.dataset.buy);
  if (r.ok) { sfx('buy'); toast('Покупка получена', 'good'); renderHud(); renderShop(); }
  else { sfx('error'); toast(r.msg || 'Недоступно', 'warn'); }
}

// ---------- Вкладки ----------
let tab = 'station';
export function currentTab() { return tab; }
export function switchTab(t) {
  if (t === 'heroines' || t === 'map' || t === 'battle') {
    sfx('error');
    toast({ heroines: 'Героини', map: 'Карта города', battle: 'Бои' }[t] + ' — появятся на следующем этапе разработки', 'warn');
    return;
  }
  tab = t; sfx('tap');
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $('#screen-shop').hidden = t !== 'shop';
  $('#side').hidden = t !== 'station';
  if (t === 'shop') { closeSheet(); renderShop(); }
}

export function bindUi(handlers) {
  $('#sheet').addEventListener('click', sheetAction);
  $('#shop-body').addEventListener('click', shopClick);
  $('#btn-tasks').onclick = openTasks;
  $('#btn-cases').onclick = openCases;
  $('#btn-settings').onclick = () => openSettings(false, handlers);
  $('#hud-builders').onclick = openBuilders;
  $('#avatar').onclick = openProfile;
  for (const r of RES_ORDER) $(`#res-${r}`).onclick = () => openResInfo(r);
  document.querySelectorAll('#nav button').forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
}
