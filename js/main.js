import { G, newState, loadGame, saveGame, hasSave, wipeSave, tick, emit } from './state.js';
import { initStation, frame, preloadAll, feedChain, setPads, cellRect, cam } from './station.js';
import { renderHud, renderSheet, isSheetOpen, bindUi, showModal, hideModal, openSettings, onUpgradesDone, switchTab, closeSheet, currentTab, renderShop, toast, fmt, doCollect, openRoomSheet, openBuilding } from './ui.js';
import { RES } from './data.js';
import { icon } from './icons.js';
import { unlockAudio, sfx } from './audio.js';

const $ = (s) => document.querySelector(s);
let running = false, stationInited = false;

function showMenu() {
  running = false;
  $('#menu').hidden = false;
  $('#btn-continue').hidden = !hasSave();
}
function startGame(state, offlineReport = true) {
  G.s = state;
  $('#menu').hidden = true;
  const r = tick();
  if (!stationInited) { initStation($('#station'), onStationTap); stationInited = true; }
  updatePads();
  running = true;
  renderHud();
  switchTab('station');
  if (offlineReport && r.dt > 120 && r.sim) showOffline(r);
  else if (!G.s.seenIntro) showIntro();
  if (r.done.length) onUpgradesDone(r.done);
  saveGame();
}
function showIntro() {
  G.s.seenIntro = true;
  showModal(`<h2>Добро пожаловать, начальница!</h2>
    <p>Вам доверили маленький районный участок. Гражданки приходят в <b>Приёмную</b>, детективы оформляют ордера, патруль задерживает, допрос закрывает дела, а <b>Камеры</b> приносят финансирование.</p>
    <p>Нажимайте на комнаты, чтобы строить и улучшать их. Двигайте участок пальцем, приближайте двумя пальцами. Задания слева подскажут, с чего начать.</p>
    <div class="row"><button class="btn primary" data-close>Начать</button></div>`);
}
function showOffline(r) {
  const s = r.sim, hrs = r.dt / 3600;
  const t = hrs >= 1 ? `${Math.floor(hrs)} ч ${Math.floor((r.dt % 3600) / 60)} мин` : `${Math.floor(r.dt / 60)} мин`;
  showModal(`<h2>С возвращением!</h2>
    <p>Вас не было ${t}. Участок работал без вас${r.capped ? ' (накопление ограничено вместимостью Архива)' : ''}:</p>
    <div class="kv"><span>Закрыто дел</span><b>${fmt(s.cases)}</b></div>
    <div class="kv"><span>${icon('rep')} Репутация</span><b>+${fmt(s.rep)}</b></div>
    <p class="small muted">Ресурсы ждут в комнатах — собирайте их, нажимая на пузыри.</p>
    <div class="row"><button class="btn primary" data-close>Отлично</button></div>`);
}
function onStationTap(ev) {
  if (ev.type === 'collect') doCollect(ev.id);
  else if (ev.type === 'room') openRoomSheet(ev.id);
  else if (ev.type === 'building') openBuilding();
  else if (ev.type === 'none' && isSheetOpen()) closeSheet();
}
function updatePads() {
  const hud = $('#hud').getBoundingClientRect(), nav = $('#nav').getBoundingClientRect();
  setPads({ top: hud.bottom + 6, bottom: window.innerHeight - nav.top + 6 });
}

// игровой цикл
let acc = 0, lastSave = Date.now(), lastT = performance.now();
function loop() {
  requestAnimationFrame(loop);
  if (!running) return;
  const now = performance.now(); acc += now - lastT; lastT = now;
  if (acc >= 1000) {
    acc = 0;
    const r = tick();
    feedChain(r.sim);
    if (r.sim && r.sim.milestoneCrystals) toast(`Веха: закрыто ${fmt(G.s.stats.cases)} дел! +${r.sim.milestoneCrystals} кристаллов`, 'good');
    if (r.done.length) onUpgradesDone(r.done);
    renderHud();
    if (isSheetOpen()) renderSheet();
    if (currentTab() === 'shop') renderShop();
    if (G.dirty || Date.now() - lastSave > 15000) { saveGame(); lastSave = Date.now(); }
  }
  if (currentTab() === 'station') frame();
}

function boot() {
  window.__APP_VERSION__ = document.documentElement.dataset.version || 'dev';
  bindUi({
    toMenu: () => { saveGame(); closeSheet(); showMenu(); },
    reset: () => { wipeSave(); G.s = null; closeSheet(); showMenu(); toast('Прогресс удалён'); },
  });
  $('#btn-new').onclick = () => {
    unlockAudio(); sfx('tap');
    if (hasSave()) {
      showModal(`<h2>Начать заново?</h2><p>Текущий прогресс будет заменён новой игрой.</p><div class="row"><button class="btn" data-close>Отмена</button><button class="btn danger" data-act="ok">Новая игра</button></div>`,
        (a) => { if (a === 'ok') { hideModal(); wipeSave(); startGame(newState(), false); } });
    } else startGame(newState(), false);
  };
  $('#btn-continue').onclick = () => {
    unlockAudio(); sfx('tap');
    const s = loadGame();
    if (!s) { toast('Сохранение не найдено', 'warn'); showMenu(); return; }
    if (s._loadedFrom === 'backup') toast('Основное сохранение повреждено — загружена резервная копия', 'warn');
    startGame(s, true);
  };
  $('#btn-menu-settings').onclick = () => { unlockAudio(); openSettings(true, {}); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && G.s) saveGame(); else if (G.s && running) { const r = tick(); if (r.done.length) onUpgradesDone(r.done); renderHud(); } });
  window.addEventListener('pagehide', () => { if (G.s) saveGame(); });
  window.addEventListener('resize', () => { if (running) updatePads(); });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  preloadAll().then(() => { $('#loading').hidden = true; showMenu(); });
  requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
// для автотестов
window.__game = {
  G, saveGame, loadGame, tick, cam,
  screenOf(id, fx = 0.5, fy = 0.5) { const r = cellRect(id); return { x: (r.x + r.w * fx - cam.x) * cam.s, y: (r.y + r.h * fy - cam.y) * cam.s }; },
  bubbleOf(id) { const r = cellRect(id); return { x: (r.x + r.w - 40 - cam.x) * cam.s, y: (r.y + 58 - cam.y) * cam.s }; },
};
