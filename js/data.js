// Игровые данные «Лаковый участок» — этап 1
export const RES = {
  money:       { name: 'Деньги',        short: 'Деньги' },
  electricity: { name: 'Электричество', short: 'Энергия' },
  fuel:        { name: 'Топливо',       short: 'Топливо' },
  ammo:        { name: 'Боеприпасы',    short: 'Патроны' },
  materials:   { name: 'Материалы',     short: 'Материалы' },
  crystals:    { name: 'Кристаллы',     short: 'Кристаллы' },
};
export const RES_ORDER = ['money', 'electricity', 'fuel', 'materials', 'ammo', 'crystals'];

// с какого целевого уровня ресурс входит в стоимость улучшений
export const RES_FROM_LEVEL = { money: 1, materials: 2, electricity: 4, fuel: 5, ammo: 6 };

export const HQ_STAGES = [
  { from: 1,  to: 5,  name: 'Районный участок' },
  { from: 6,  to: 10, name: 'Оборудованное управление' },
  { from: 11, to: 20, name: 'Современное здание' },
  { from: 21, to: 30, name: 'Элитный полицейский комплекс' },
  { from: 31, to: 40, name: 'Технологичный штаб' },
  { from: 41, to: 50, name: 'Центральное управление мегаполиса' },
];
export function hqStage(lvl) {
  for (let i = 0; i < HQ_STAGES.length; i++) if (lvl <= HQ_STAGES[i].to) return i;
  return HQ_STAGES.length - 1;
}

// Оформление комнаты: 0 — базовое (ур.1–9), 1 — элитное (ур.10+). Отделка рамки меняется на 5/20/30/40.
export function roomArtTier(lvl) { return lvl >= 10 ? 1 : 0; }
export function roomTrimTier(lvl) { return lvl >= 40 ? 4 : lvl >= 30 ? 3 : lvl >= 20 ? 2 : lvl >= 5 ? 1 : 0; }
export const TRIM_NAMES = ['Стандартная отделка', 'Полированная отделка', 'Серебряная отделка', 'Лаковая отделка', 'Платиновая отделка'];

export const MAX_LEVEL = 50;

// Сетка здания: 7 этажей по 3 помещения (сверху вниз)
export const LAYOUT = [
  ['command',       'chief',     'dispatch'],
  ['detective',     'reception', 'patrol'],
  ['interrogation', 'cells',     'warehouse'],
  ['armory',        'comms',     'garage'],
  ['lounge',        'archive',   'academy'],
  ['research',      'hospital',  'training'],
  ['lab',           'lobby',     'k9'],
];

const pct = (v) => `${Math.round(v)}%`;

// kind: hq | chain | prod | bonus
// w — веса стоимости, f — множитель стоимости, unlock — уровень кабинета, req — требования к другим комнатам для постройки
export const ROOMS = {
  chief: {
    name: 'Кабинет начальницы', kind: 'hq', unlock: 1, start: 1, f: 1.6, tf: 1.5,
    w: { money: 1, materials: 0.6, electricity: 0.3, fuel: 0.2, ammo: 0.15 },
    desc: 'Сердце участка. Уровень кабинета открывает новые помещения и ограничивает уровень остальных комнат.',
    prod: { money: 300 },
    staff: ['chief', 'secretary', 'officer'],
  },
  reception: {
    name: 'Приёмная', kind: 'chain', unlock: 1, start: 1, f: 0.8,
    w: { money: 1, materials: 0.4, electricity: 0.2 },
    desc: 'Гражданки подают заявления. Это начало цепочки дел.',
    staff: ['clerk', 'clerk', 'officer'],
  },
  detective: {
    name: 'Детективный отдел', kind: 'chain', unlock: 1, start: 1, f: 0.9,
    w: { money: 1, materials: 0.45, electricity: 0.25 },
    desc: 'Детективы превращают заявления в ордера на задержание.',
    staff: ['detective', 'detective', 'analyst'],
  },
  patrol: {
    name: 'Патрульный отдел', kind: 'chain', unlock: 1, start: 0, f: 0.9,
    w: { money: 1, materials: 0.4, fuel: 0.3 },
    desc: 'Патрульные выезжают по ордерам и задерживают подозреваемых.',
    staff: ['patrol', 'patrol', 'patrol'],
  },
  cells: {
    name: 'Камеры', kind: 'chain', unlock: 1, start: 0, f: 1.0,
    w: { money: 1, materials: 0.5, electricity: 0.2 },
    desc: 'Осуждённые отбывают срок, участок получает финансирование за каждую занятую койку.',
    staff: ['guard', 'guard', 'guard'],
  },
  interrogation: {
    name: 'Допросная', kind: 'chain', unlock: 2, start: 0, f: 1.0, req: { patrol: 1 },
    w: { money: 1, materials: 0.45, electricity: 0.25 },
    desc: 'Допрос задержанных. Каждое закрытое дело приносит репутацию.',
    staff: ['detective', 'detective', 'officer'],
  },
  warehouse: {
    name: 'Склад', kind: 'prod', unlock: 2, start: 0, f: 0.9,
    w: { money: 1, materials: 0.3, fuel: 0.2 },
    desc: 'Поставки материалов и хранилище. Увеличивает вместимость ресурсов.',
    prod: { materials: 200 },
    staff: ['logistic', 'logistic', 'logistic'],
  },
  armory: {
    name: 'Оружейная', kind: 'prod', unlock: 3, start: 0, f: 1.0, req: { patrol: 2 },
    w: { money: 1, materials: 0.5, electricity: 0.2 },
    desc: 'Производит боеприпасы для улучшений и будущих операций.',
    prod: { ammo: 120 },
    staff: ['armorer', 'armorer', 'officer'],
  },
  comms: {
    name: 'Центр связи', kind: 'prod', unlock: 3, start: 0, f: 1.0, req: { warehouse: 1 },
    w: { money: 1, materials: 0.5 },
    desc: 'Генераторы и связь. Производит электричество.',
    prod: { electricity: 150 },
    staff: ['engineer', 'engineer', 'operator'],
  },
  garage: {
    name: 'Гараж', kind: 'prod', unlock: 4, start: 0, f: 1.0, req: { patrol: 3 },
    w: { money: 1, materials: 0.5, electricity: 0.3 },
    desc: 'Техника участка и топливный пост. Производит топливо.',
    prod: { fuel: 120 },
    staff: ['mechanic', 'mechanic', 'patrol'],
  },
  dispatch: {
    name: 'Диспетчерская', kind: 'bonus', unlock: 4, start: 0, f: 1.0, req: { reception: 3 },
    w: { money: 1, materials: 0.4, electricity: 0.4 },
    desc: 'Координирует вызовы — ускоряет всю цепочку дел.',
    staff: ['operator', 'operator', 'operator'],
  },
  lounge: {
    name: 'Комната отдыха', kind: 'bonus', unlock: 5, start: 0, f: 0.8,
    w: { money: 1, materials: 0.4, fuel: 0.1 },
    desc: 'Отдохнувшие сотрудницы работают лучше — больше денег от камер.',
    staff: ['officer', 'clerk', 'detective'],
  },
  command: {
    name: 'Командный центр', kind: 'bonus', unlock: 5, start: 0, f: 1.2, req: { dispatch: 2 },
    w: { money: 1, materials: 0.5, electricity: 0.4, fuel: 0.2 },
    desc: 'Планирование работ. Даёт дополнительных строительниц.',
    staff: ['commander', 'operator', 'analyst'],
  },
  archive: {
    name: 'Архив', kind: 'prod', unlock: 6, start: 0, f: 1.0, req: { detective: 4 },
    w: { money: 1, materials: 0.5, electricity: 0.2 },
    desc: 'Закрытые дела. Приносит кристаллы и продлевает накопление в офлайне.',
    prod: { crystals: 0.5 },
    staff: ['archivist', 'archivist', 'clerk'],
  },
  academy: {
    name: 'Академия', kind: 'bonus', unlock: 7, start: 0, f: 1.1, req: { patrol: 5 },
    w: { money: 1, materials: 0.5, electricity: 0.2, ammo: 0.2 },
    desc: 'Обучение кадров — улучшения стоят дешевле.',
    staff: ['instructor', 'cadet', 'cadet'],
  },
  research: {
    name: 'Исследовательский центр', kind: 'bonus', unlock: 8, start: 0, f: 1.2, req: { comms: 5 },
    w: { money: 1, materials: 0.5, electricity: 0.5 },
    desc: 'Новые методы работы — улучшения идут быстрее.',
    staff: ['scientist', 'scientist', 'engineer'],
  },
  hospital: {
    name: 'Госпиталь', kind: 'bonus', unlock: 9, start: 0, f: 1.1, req: { lounge: 3 },
    w: { money: 1, materials: 0.5, electricity: 0.3 },
    desc: 'Здоровый персонал — выше производство всех ресурсов.',
    staff: ['medic', 'medic', 'officer'],
  },
  training: {
    name: 'Тренировочный зал', kind: 'bonus', unlock: 10, start: 0, f: 1.1, req: { academy: 3 },
    w: { money: 1, materials: 0.5, ammo: 0.3 },
    desc: 'Подготовка к допросам — больше репутации за каждое дело.',
    staff: ['instructor', 'patrol', 'patrol'],
  },
  lab: {
    name: 'Лаборатория', kind: 'bonus', unlock: 12, start: 0, f: 1.2, req: { detective: 8 },
    w: { money: 1, materials: 0.5, electricity: 0.4 },
    desc: 'Криминалистика — детективы работают быстрее.',
    staff: ['scientist', 'detective', 'scientist'],
  },
  k9: {
    name: 'Кинологический центр', kind: 'bonus', unlock: 14, start: 0, f: 1.2, req: { patrol: 10 },
    w: { money: 1, materials: 0.5, fuel: 0.3 },
    desc: 'Служебные собаки — патруль задерживает быстрее.',
    staff: ['k9', 'k9', 'patrol'],
  },
};
export const ROOM_IDS = Object.keys(ROOMS);

// ---------- Формулы ----------
export function costValue(id, target) {
  return 150 * Math.pow(1.24, target - 1) * ROOMS[id].f;
}
export function upgradeCost(id, target, discountPct = 0) {
  const def = ROOMS[id];
  const v = costValue(id, target) * (1 - discountPct / 100);
  const out = {};
  for (const [r, w] of Object.entries(def.w)) {
    if (target >= (RES_FROM_LEVEL[r] || 1)) out[r] = roundNice(v * w);
  }
  return out;
}
export function upgradeTimeSec(id, target, speedPct = 0) {
  const base = 6 * Math.pow(target, 2.3) * (ROOMS[id].tf || 1);
  return Math.max(3, Math.round(base * (1 - speedPct / 100)));
}
export function roundNice(v) {
  if (v < 100) return Math.ceil(v);
  if (v < 1000) return Math.ceil(v / 5) * 5;
  if (v < 10000) return Math.ceil(v / 50) * 50;
  return Math.ceil(v / 500) * 500;
}
export function prodRate(id, lvl) { // в час, без бонусов
  const p = ROOMS[id].prod; if (!p || lvl <= 0) return {};
  const o = {};
  for (const [r, b] of Object.entries(p)) o[r] = r === 'crystals' ? b * (lvl + 1) : b * Math.pow(lvl, 1.25);
  return o;
}
// Репутация, нужная для улучшения кабинета до уровня n
export function repRequired(n) { return n <= 2 ? 0 : Math.round(60 * Math.pow(n - 1, 1.6) / 10) * 10; }
// Требования к комнатам для улучшения кабинета до уровня n
export function chiefReqs(n) {
  const r = {};
  if (n >= 2) r.reception = n - 1;
  if (n >= 3) r.detective = n - 2;
  if (n >= 4) r.cells = n - 3;
  if (n >= 5) r.warehouse = n - 3;
  if (n >= 7) r.interrogation = n - 4;
  return r;
}

export const CHAIN = {
  reception: (L) => 240 * (1 + 0.3 * (L - 1)),     // заявлений/ч
  detective: (L) => 180 * (1 + 0.3 * (L - 1)),     // ордеров/ч
  patrol:    (L) => 180 * (1 + 0.3 * (L - 1)),     // задержаний/ч
  interrogation: (L) => 150 * (1 + 0.3 * (L - 1)), // дел/ч
  cellsCap:  (L) => 15 + 8 * (L - 1),
  moneyPerPrisoner: (L) => 40 * (1 + 0.2 * (L - 1)), // в час
  stayMin: 10,
};

// Бонусы комнат (проценты)
export const BONUS = {
  dispatch: (L) => 4 * L,                 // скорость всей цепочки
  lounge:   (L) => 3 * L,                 // деньги от камер
  hospital: (L) => 2 * L,                 // производство ресурсов
  research: (L) => Math.min(40, 2 * L),   // время улучшений
  academy:  (L) => Math.min(30, 1.5 * L), // стоимость улучшений
  training: (L) => 0.2 * L,               // +репутация за дело
  lab:      (L) => 5 * L,                 // скорость детективов
  k9:       (L) => 5 * L,                 // скорость патруля
};
export function buildersFor(commandLvl) { return 1 + (commandLvl >= 1 ? 1 : 0) + (commandLvl >= 15 ? 1 : 0); }
export function storageCap(whLvl) { return Math.round(8000 * Math.pow(1.22, whLvl)); }
export function offlineCapHours(archiveLvl) { return Math.min(12, 8 + archiveLvl * 0.25); }

// ---------- Задания: Глава 1 ----------
export const MISSIONS = [
  { id: 'm1',  text: 'Постройте Патрульный отдел', goal: { built: 'patrol' }, reward: { money: 200, crystals: 10 }, room: 'patrol' },
  { id: 'm2',  text: 'Постройте Камеры', goal: { built: 'cells' }, reward: { money: 300, crystals: 10 }, room: 'cells' },
  { id: 'm3',  text: 'Соберите деньги в Камерах или Кабинете', goal: { stat: 'collects', n: 1 }, reward: { materials: 200 }, room: 'cells' },
  { id: 'm4',  text: 'Улучшите Кабинет начальницы до ур. 2', goal: { level: ['chief', 2] }, reward: { crystals: 20 }, room: 'chief' },
  { id: 'm5',  text: 'Постройте Допросную', goal: { built: 'interrogation' }, reward: { money: 500 }, room: 'interrogation' },
  { id: 'm6',  text: 'Ускорьте любое улучшение', goal: { stat: 'speedups', n: 1 }, reward: { crystals: 10 }, room: null },
  { id: 'm7',  text: 'Закройте 10 дел', goal: { stat: 'cases', n: 10 }, reward: { crystals: 15 }, room: 'interrogation' },
  { id: 'm8',  text: 'Постройте Склад', goal: { built: 'warehouse' }, reward: { money: 300 }, room: 'warehouse' },
  { id: 'm9',  text: 'Улучшите Приёмную до ур. 3', goal: { level: ['reception', 3] }, reward: { materials: 400 }, room: 'reception' },
  { id: 'm10', text: 'Улучшите Кабинет начальницы до ур. 3', goal: { level: ['chief', 3] }, reward: { crystals: 25 }, room: 'chief' },
  { id: 'm11', text: 'Постройте Центр связи', goal: { built: 'comms' }, reward: { money: 1000 }, room: 'comms' },
  { id: 'm12', text: 'Постройте Оружейную', goal: { built: 'armory' }, reward: { money: 1000, materials: 300 }, room: 'armory' },
  { id: 'm13', text: 'Наберите 300 репутации', goal: { stat: 'rep', n: 300 }, reward: { crystals: 30 }, room: null },
  { id: 'm14', text: 'Улучшите Кабинет начальницы до ур. 4', goal: { level: ['chief', 4] }, reward: { crystals: 30, materials: 500 }, room: 'chief' },
  { id: 'm15', text: 'Постройте Гараж', goal: { built: 'garage' }, reward: { materials: 500, electricity: 300 }, room: 'garage' },
  { id: 'm16', text: 'Закройте 100 дел', goal: { stat: 'cases', n: 100 }, reward: { crystals: 40 }, room: 'interrogation' },
  { id: 'm17', text: 'Постройте Диспетчерскую', goal: { built: 'dispatch' }, reward: { money: 2000 }, room: 'dispatch' },
  { id: 'm18', text: 'Улучшите Кабинет начальницы до ур. 5', goal: { level: ['chief', 5] }, reward: { crystals: 50, money: 3000 }, room: 'chief' },
  { id: 'm19', text: 'Постройте Командный центр', goal: { built: 'command' }, reward: { crystals: 30 }, room: 'command' },
  { id: 'm20', text: 'Улучшите Кабинет начальницы до ур. 6 — новый этап здания', goal: { level: ['chief', 6] }, reward: { crystals: 80, money: 5000 }, room: 'chief' },
];

// ---------- Магазин (только игровая валюта) ----------
export const SHOP = [
  { id: 'mat_s',  tab: 'res',  name: 'Партия материалов', give: { materials: 500 },  price: { money: 1200 } },
  { id: 'el_s',   tab: 'res',  name: 'Аккумуляторы',      give: { electricity: 400 }, price: { money: 1500 } },
  { id: 'fuel_s', tab: 'res',  name: 'Канистры топлива',  give: { fuel: 400 },        price: { money: 1500 } },
  { id: 'ammo_s', tab: 'res',  name: 'Ящик боеприпасов',  give: { ammo: 300 },        price: { money: 1500 } },
  { id: 'mat_l',  tab: 'res',  name: 'Грузовик материалов', give: { materials: 5000 }, price: { crystals: 60 } },
  { id: 'money_l',tab: 'res',  name: 'Федеральный грант', give: { money: 10000 },     price: { crystals: 60 } },
  { id: 'sp5',    tab: 'speed', name: 'Ускоритель 5 мин',  give: { sp5: 1 },          price: { crystals: 4 },  desc: 'Сокращает любое улучшение на 5 минут' },
  { id: 'sp60',   tab: 'speed', name: 'Ускоритель 1 час',  give: { sp60: 1 },         price: { crystals: 40 }, desc: 'Сокращает любое улучшение на 1 час' },
  { id: 'sp5m',   tab: 'speed', name: 'Ускоритель 5 мин',  give: { sp5: 1 },          price: { money: 2500 },  desc: 'Тот же ускоритель, но за деньги' },
  { id: 'sp60m',  tab: 'speed', name: 'Ускоритель 1 час',  give: { sp60: 1 },         price: { money: 25000 }, desc: 'Тот же ускоритель, но за деньги' },
];
export const SPEEDUPS = { sp5: { name: 'Ускоритель 5 мин', sec: 300 }, sp60: { name: 'Ускоритель 1 час', sec: 3600 } };

// ---------- Внешность сотрудниц ----------
// Все — взрослые женщины в профессиональной форме из лаковой кожи
export const LOOKS = {
  chief:     { outfit: '#5a1424', trim: '#c9c9d2', bottom: 'skirt', cap: false, hairStyle: 'bun' },
  secretary: { outfit: '#1d1d24', trim: '#8a6ab8', bottom: 'skirt', cap: false, hairStyle: 'long' },
  officer:   { outfit: '#1b2233', trim: '#c9c9d2', bottom: 'pants', cap: true,  hairStyle: 'pony' },
  clerk:     { outfit: '#2a2440', trim: '#c9c9d2', bottom: 'skirt', cap: false, hairStyle: 'bob' },
  detective: { outfit: '#3a1220', trim: '#1a1a1f', bottom: 'pants', cap: false, hairStyle: 'long', coat: true },
  analyst:   { outfit: '#23232b', trim: '#8a6ab8', bottom: 'pants', cap: false, hairStyle: 'bob', glasses: true },
  patrol:    { outfit: '#161a26', trim: '#9aa3b8', bottom: 'pants', cap: true,  hairStyle: 'pony' },
  guard:     { outfit: '#20202a', trim: '#7a2a3a', bottom: 'pants', cap: true,  hairStyle: 'bun' },
  logistic:  { outfit: '#3a3a44', trim: '#8a6ab8', bottom: 'pants', cap: false, hairStyle: 'pony' },
  armorer:   { outfit: '#1a1a20', trim: '#7a2a3a', bottom: 'pants', cap: false, hairStyle: 'bun' },
  engineer:  { outfit: '#2b2a3f', trim: '#c9c9d2', bottom: 'pants', cap: false, hairStyle: 'pony' },
  operator:  { outfit: '#1d2030', trim: '#8a6ab8', bottom: 'skirt', cap: false, hairStyle: 'long', headset: true },
  mechanic:  { outfit: '#2a2630', trim: '#7a2a3a', bottom: 'pants', cap: false, hairStyle: 'bun' },
  commander: { outfit: '#121218', trim: '#b9a46a', bottom: 'pants', cap: true,  hairStyle: 'bob' },
  archivist: { outfit: '#3b2a30', trim: '#c9c9d2', bottom: 'skirt', cap: false, hairStyle: 'bun', glasses: true },
  instructor:{ outfit: '#1a1a22', trim: '#7a2a3a', bottom: 'pants', cap: false, hairStyle: 'pony' },
  cadet:     { outfit: '#232838', trim: '#c9c9d2', bottom: 'skirt', cap: true,  hairStyle: 'bob' },
  scientist: { outfit: '#e4e4ea', trim: '#6a5a8a', bottom: 'pants', cap: false, hairStyle: 'bun', glasses: true },
  medic:     { outfit: '#ececf1', trim: '#7a2a3a', bottom: 'skirt', cap: false, hairStyle: 'pony' },
  k9:        { outfit: '#1c2028', trim: '#8a6ab8', bottom: 'pants', cap: true,  hairStyle: 'long' },
};
export const SKINS = ['#f3d2bd', '#e8bf9f', '#d9a37e', '#b97f5a', '#8e5a3c', '#f6dccb'];
export const HAIRS = ['#2a1a14', '#4a2a1a', '#6b3f22', '#a8743c', '#d8c08a', '#1a1a1e', '#7a2a2a', '#9a9aa4'];
