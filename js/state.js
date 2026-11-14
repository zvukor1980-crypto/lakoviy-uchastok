import {
  ROOMS, ROOM_IDS, upgradeCost, upgradeTimeSec, prodRate, CHAIN, BONUS, buildersFor,
  storageCap, offlineCapHours, repRequired, chiefReqs, MAX_LEVEL, MISSIONS, SHOP, SPEEDUPS, RES_ORDER,
} from './data.js';

const SAVE_KEY = 'lakoviy_uchastok_save_v1';
const BACKUP_KEY = 'lakoviy_uchastok_save_v1_backup';
const SETTINGS_KEY = 'lakoviy_uchastok_settings';

export const G = { s: null, listeners: new Set(), dirty: false, now: () => Date.now() };

export function newState() {
  const rooms = {};
  for (const id of ROOM_IDS) rooms[id] = { lvl: ROOMS[id].start, stock: {} };
  const t = G.now();
  return {
    v: 1, created: t, lastTick: t, saveCount: 0,
    res: { money: 2000, electricity: 0, fuel: 0, ammo: 0, materials: 500, crystals: 100 },
    rep: 0,
    rooms,
    upgrades: [], // {room, target, start, end}
    chain: { apps: 0, warrants: 0, arrested: 0, prisoners: 0 },
    stats: { cases: 0, collects: 0, speedups: 0, upgrades: 0, purchases: 0, caseMilestone: 0 },
    missions: { claimed: [] },
    inv: { sp5: 0, sp60: 0 },
    seenIntro: false,
  };
}

export function settings() {
  try { return Object.assign({ sound: true }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch { return { sound: true }; }
}
export function saveSettings(st) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(st)); }

export function hasSave() { return !!(readSlot(SAVE_KEY) || readSlot(BACKUP_KEY)); }
function readSlot(key) {
  try {
    const raw = localStorage.getItem(key); if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !s.rooms || !s.res) return null;
    return s;
  } catch { return null; }
}
export function loadGame() {
  let s = readSlot(SAVE_KEY), from = 'main';
  if (!s) { s = readSlot(BACKUP_KEY); from = 'backup'; }
  if (!s) return null;
  // миграция/починка: недостающие поля
  const base = newState();
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  for (const id of ROOM_IDS) if (!s.rooms[id]) s.rooms[id] = base.rooms[id];
  for (const r of RES_ORDER) if (typeof s.res[r] !== 'number' || !isFinite(s.res[r])) s.res[r] = 0;
  s._loadedFrom = from;
  return s;
}
export function saveGame() {
  if (!G.s) return;
  G.s.saveCount++;
  const data = JSON.stringify(G.s, (k, v) => (k.startsWith('_') ? undefined : v));
  try {
    const prev = localStorage.getItem(SAVE_KEY);
    if (prev) {
      // резервная копия — предыдущая корректная запись
      try { JSON.parse(prev); localStorage.setItem(BACKUP_KEY, prev); } catch {}
    }
    localStorage.setItem(SAVE_KEY, data);
    G.dirty = false;
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
}
export function wipeSave() { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(BACKUP_KEY); }

export function markDirty() { G.dirty = true; emit(); }
export function emit() { for (const f of G.listeners) f(); }

// ---------- Вспомогательные ----------
export const lvl = (id) => G.s.rooms[id].lvl;
export const chiefLvl = () => G.s.rooms.chief.lvl;
export function isUnlocked(id) { return chiefLvl() >= ROOMS[id].unlock; }
export function upgradingOf(id) { return G.s.upgrades.find((u) => u.room === id); }
export function builders() { return buildersFor(lvl('command')); }
export function freeBuilders() { return builders() - G.s.upgrades.length; }
export function cap() { return storageCap(lvl('warehouse')); }
export function capFor(r) { return r === 'crystals' ? Infinity : r === 'money' ? cap() * 3 : cap(); }
export function bonus(id) { const L = lvl(id); return L > 0 ? BONUS[id](L) : 0; }
export function discountPct() { return bonus('academy'); }
export function speedPct() { return bonus('research'); }

export function nextCost(id) { return upgradeCost(id, lvl(id) + 1, discountPct()); }
export function nextTime(id) { return upgradeTimeSec(id, lvl(id) + 1, speedPct()); }

// Список невыполненных условий для следующего уровня
export function requirements(id) {
  const L = lvl(id), target = L + 1, out = [];
  const def = ROOMS[id];
  if (!isUnlocked(id)) { out.push({ ok: false, text: `Кабинет начальницы ур. ${def.unlock}` }); return out; }
  if (target > MAX_LEVEL) { out.push({ ok: false, text: 'Максимальный уровень' }); return out; }
  if (id !== 'chief') {
    out.push({ ok: chiefLvl() >= target, text: `Кабинет начальницы ур. ${target}` });
    if (L === 0 && def.req) for (const [r, n] of Object.entries(def.req)) out.push({ ok: lvl(r) >= n, text: `${ROOMS[r].name} ур. ${n}`, room: r });
  } else {
    for (const [r, n] of Object.entries(chiefReqs(target))) out.push({ ok: lvl(r) >= n, text: `${ROOMS[r].name} ур. ${n}`, room: r });
    const rr = repRequired(target);
    if (rr > 0) out.push({ ok: G.s.rep >= rr, text: `Репутация ${rr}` });
  }
  return out;
}
export function canAfford(cost) { return Object.entries(cost).every(([r, v]) => G.s.res[r] >= v); }
export function missingFor(cost) { const m = {}; for (const [r, v] of Object.entries(cost)) if (G.s.res[r] < v) m[r] = v - G.s.res[r]; return m; }

export function startUpgrade(id) {
  if (upgradingOf(id)) return { ok: false, msg: 'Уже улучшается' };
  const reqs = requirements(id);
  if (reqs.some((r) => !r.ok)) return { ok: false, msg: 'Не выполнены условия' };
  if (freeBuilders() <= 0) return { ok: false, msg: 'Все строительницы заняты' };
  const cost = nextCost(id);
  if (!canAfford(cost)) return { ok: false, msg: 'Не хватает ресурсов' };
  for (const [r, v] of Object.entries(cost)) G.s.res[r] -= v;
  const t = G.now(), dur = nextTime(id) * 1000;
  G.s.upgrades.push({ room: id, target: lvl(id) + 1, start: t, end: t + dur });
  markDirty(); saveGame();
  return { ok: true };
}
export function speedupCost(u) {
  const rem = Math.max(0, (u.end - G.now()) / 1000);
  if (rem <= 30) return 0;
  return Math.ceil(rem / 60);
}
export function speedupWithCrystals(id) {
  const u = upgradingOf(id); if (!u) return { ok: false };
  const c = speedupCost(u);
  if (G.s.res.crystals < c) return { ok: false, msg: 'Не хватает кристаллов' };
  G.s.res.crystals -= c; u.end = G.now(); G.s.stats.speedups++;
  const done = processUpgrades(); markDirty(); saveGame();
  return { ok: true, done };
}
export function useSpeedItem(id, item) {
  const u = upgradingOf(id); if (!u || !G.s.inv[item]) return { ok: false };
  G.s.inv[item]--; u.end -= SPEEDUPS[item].sec * 1000; G.s.stats.speedups++;
  const done = processUpgrades(); markDirty(); saveGame();
  return { ok: true, done };
}
export function processUpgrades() {
  const t = G.now(), done = [];
  G.s.upgrades = G.s.upgrades.filter((u) => {
    if (u.end <= t) {
      G.s.rooms[u.room].lvl = Math.max(G.s.rooms[u.room].lvl, u.target);
      G.s.stats.upgrades++; done.push(u); return false;
    }
    return true;
  });
  if (done.length) markDirty();
  return done;
}

// ---------- Производство ----------
export function prodPerHour(id) {
  const L = lvl(id); if (L <= 0) return {};
  const base = prodRate(id, L), mul = 1 + bonus('hospital') / 100, o = {};
  for (const [r, v] of Object.entries(base)) o[r] = r === 'crystals' ? v : v * mul;
  if (id === 'cells') {
    o.money = G.s.chain.prisoners * CHAIN.moneyPerPrisoner(L) * (1 + bonus('lounge') / 100);
  }
  return o;
}
export function stockCap(id, r) {
  const ph = id === 'cells' ? CHAIN.cellsCap(lvl('cells')) * CHAIN.moneyPerPrisoner(lvl('cells')) * (1 + bonus('lounge') / 100) : (prodPerHour(id)[r] || 0);
  return Math.max(10, ph * offlineCapHours(lvl('archive')));
}
export const PRODUCERS = ['chief', 'cells', 'warehouse', 'armory', 'comms', 'garage', 'archive'];

export function chainRates() {
  const d = 1 + bonus('dispatch') / 100;
  const L = (id) => lvl(id);
  return {
    reception: L('reception') > 0 ? CHAIN.reception(L('reception')) * d : 0,
    detective: L('detective') > 0 ? CHAIN.detective(L('detective')) * d * (1 + bonus('lab') / 100) : 0,
    patrol: L('patrol') > 0 ? CHAIN.patrol(L('patrol')) * d * (1 + bonus('k9') / 100) : 0,
    interrogation: L('interrogation') > 0 ? CHAIN.interrogation(L('interrogation')) * d : 0,
    cellsCap: L('cells') > 0 ? CHAIN.cellsCap(L('cells')) : 0,
    repPer: 2 + bonus('training'),
  };
}
export function queueCap(id) { return 20 + 10 * Math.max(1, lvl(id)); }

// Симуляция dt секунд. Возвращает статистику для анимации.
export function simulate(dtSec) {
  const s = G.s, out = { apps: 0, warrants: 0, arrests: 0, cases: 0, rep: 0, released: 0 };
  let left = dtSec;
  while (left > 0) {
    const dt = Math.min(left, 30); left -= dt;
    const h = dt / 3600, cr = chainRates(), c = s.chain;
    // цепочка дел
    const a = Math.min(cr.reception * h, Math.max(0, queueCap('detective') - c.apps)); c.apps += a; out.apps += a;
    const w = Math.min(c.apps, cr.detective * h, Math.max(0, queueCap('patrol') - c.warrants)); c.apps -= w; c.warrants += w; out.warrants += w;
    const ar = Math.min(c.warrants, cr.patrol * h, Math.max(0, queueCap('interrogation') - c.arrested)); c.warrants -= ar; c.arrested += ar; out.arrests += ar;
    const free = Math.max(0, cr.cellsCap - c.prisoners);
    const cv = Math.min(c.arrested, cr.interrogation * h, free); c.arrested -= cv; c.prisoners += cv;
    out.cases += cv; s.stats.cases += cv; const rep = cv * cr.repPer; s.rep += rep; out.rep += rep;
    // освобождение по окончании срока
    const rel = c.prisoners * Math.min(1, dt / (CHAIN.stayMin * 60)); c.prisoners -= rel; out.released += rel;
    // производство в «пузыри»
    for (const id of PRODUCERS) {
      if (lvl(id) <= 0) continue;
      const p = prodPerHour(id), st = s.rooms[id].stock;
      for (const [r, v] of Object.entries(p)) {
        st[r] = Math.min(stockCap(id, r), (st[r] || 0) + v * h);
      }
    }
  }
  // вехи дел: 50, 200, 450, 800… (50·k²) — по 5 кристаллов
  let n = 0;
  while (s.stats.cases >= nextMilestone()) { s.stats.caseMilestone++; n++; }
  if (n) { s.res.crystals += 5 * n; out.milestoneCrystals = 5 * n; }
  return out;
}

export function nextMilestone() { return 50 * Math.pow(G.s.stats.caseMilestone + 1, 2); }

export function tick() {
  const t = G.now();
  let dt = (t - G.s.lastTick) / 1000;
  if (dt < 0) dt = 0; // часы переведены назад — не начисляем
  G.s.lastTick = t;
  const done = processUpgrades();
  const capSec = offlineCapHours(lvl('archive')) * 3600;
  const sim = dt > 0 ? simulate(Math.min(dt, capSec)) : null;
  return { dt, done, sim, capped: dt > capSec };
}

export function collect(id) {
  const st = G.s.rooms[id].stock, got = {};
  let any = false;
  for (const [r, v] of Object.entries(st)) {
    const amt = Math.floor(v); if (amt <= 0) continue;
    const space = Math.max(0, capFor(r) - G.s.res[r]);
    const take = Math.min(amt, space);
    if (take > 0) { G.s.res[r] += take; st[r] -= take; got[r] = take; any = true; }
  }
  if (any) { G.s.stats.collects++; markDirty(); }
  return got;
}
export function collectable(id) {
  const st = G.s.rooms[id].stock; let best = null, frac = 0;
  for (const [r, v] of Object.entries(st)) {
    const thr = r === 'crystals' ? 1 : Math.max(5, (prodPerHour(id)[r] || 60) / 60); // минимум ~1 минута производства
    if (v >= thr) { const f = v / stockCap(id, r); if (!best || f > frac) { best = r; frac = f; } }
  }
  return best ? { res: best, amount: Math.floor(st[best]), frac } : null;
}

// ---------- Задания ----------
export function missionProgress(m) {
  const g = m.goal, s = G.s;
  if (g.built) return { cur: s.rooms[g.built].lvl > 0 ? 1 : 0, need: 1 };
  if (g.level) return { cur: Math.min(g.level[1], s.rooms[g.level[0]].lvl), need: g.level[1] };
  if (g.stat === 'rep') return { cur: Math.min(g.n, Math.floor(s.rep)), need: g.n };
  if (g.stat) return { cur: Math.min(g.n, Math.floor(s.stats[g.stat] || 0)), need: g.n };
  return { cur: 0, need: 1 };
}
export function missionDone(m) { const p = missionProgress(m); return p.cur >= p.need; }
export function claimable() { return MISSIONS.filter((m) => !G.s.missions.claimed.includes(m.id) && missionDone(m)); }
export function claimMission(id) {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m || G.s.missions.claimed.includes(id) || !missionDone(m)) return false;
  for (const [r, v] of Object.entries(m.reward)) G.s.res[r] = (G.s.res[r] || 0) + v;
  G.s.missions.claimed.push(id); markDirty(); saveGame(); return true;
}

// ---------- Магазин ----------
export function buy(itemId) {
  const it = SHOP.find((x) => x.id === itemId); if (!it) return { ok: false };
  if (!canAfford(it.price)) return { ok: false, msg: 'Не хватает средств' };
  for (const [r, v] of Object.entries(it.give)) {
    if (r in G.s.res && r !== 'crystals' && G.s.res[r] + v > capFor(r)) return { ok: false, msg: 'Склад переполнен — улучшите Склад' };
  }
  for (const [r, v] of Object.entries(it.price)) G.s.res[r] -= v;
  for (const [r, v] of Object.entries(it.give)) { if (r in G.s.res) G.s.res[r] += v; else G.s.inv[r] = (G.s.inv[r] || 0) + v; }
  G.s.stats.purchases++; markDirty(); saveGame();
  return { ok: true };
}
