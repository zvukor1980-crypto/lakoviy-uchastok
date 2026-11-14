// Интерактивный участок: разрез здания на canvas, жесты pinch/pan, анимированные сотрудницы
import { ROOMS, LAYOUT, HQ_STAGES, hqStage, roomArtTier, roomTrimTier } from './data.js';
import { G, lvl, chiefLvl, isUnlocked, upgradingOf, collectable, PRODUCERS } from './state.js';
import { drawWoman, makeLook, mulberry } from './figures.js';
import { iconImage } from './icons.js';

const CW = 304, CH = 228, GAP = 8, WALL = 24, SLAB = 10;
const FACADE = { x: 24, y: 40, w: 928, h: 522 };
const ROOF_Y = 590, FLOORS_Y = 640;
export const WORLD_W = WALL * 2 + CW * 3 + GAP * 2; // 976
const GROUND_Y = FLOORS_Y + LAYOUT.length * (CH + SLAB);
export const WORLD_H = GROUND_Y + 170;

const STAGE_STYLE = [
  { wall: '#8a7f72', wallHi: '#a39888', slab: '#6c645a', roof: '#5b544c', trim: '#4a4a55' },
  { wall: '#7a5a52', wallHi: '#94706a', slab: '#5e4640', roof: '#4b3a35', trim: '#7a2a3a' },
  { wall: '#5d6170', wallHi: '#7b8090', slab: '#474a56', roof: '#3a3d48', trim: '#9aa0b4' },
  { wall: '#2a2b33', wallHi: '#4a4c58', slab: '#1d1e24', roof: '#18191e', trim: '#c9c9d2' },
  { wall: '#33303f', wallHi: '#56506a', slab: '#252230', roof: '#1c1a25', trim: '#8a6ab8' },
  { wall: '#d8d5d0', wallHi: '#f2f0ec', slab: '#a9a6a2', roof: '#2a2a32', trim: '#c9c9d2' },
];
const TRIM = [
  ['#45444f', '#5a5966'], ['#6d6d7a', '#9a9aa8'], ['#b9bcc8', '#eef0f6'], ['#6a1a2c', '#b04a5e'], ['#d9dbe6', '#a98ae0'],
];

const images = {};
function img(src) { if (!images[src]) { const i = new Image(); i.decoding = 'async'; i.src = src; images[src] = i; } return images[src]; }
export function preloadAll() {
  const list = [];
  for (const row of LAYOUT) for (const id of row) if (id !== 'lobby') { list.push(`assets/rooms/${id}_a.webp`, `assets/rooms/${id}_b.webp`); }
  for (let i = 1; i <= 6; i++) list.push(`assets/facade/facade_${i}.webp`);
  return Promise.all(list.map((s) => new Promise((res) => { const i = img(s); if (i.complete) res(); else { i.onload = res; i.onerror = res; } })));
}

export function cellRect(id) {
  for (let r = 0; r < LAYOUT.length; r++) for (let c = 0; c < 3; c++) if (LAYOUT[r][c] === id)
    return { x: WALL + c * (CW + GAP), y: FLOORS_Y + r * (CH + SLAB), w: CW, h: CH, r, c };
  return null;
}

// ---------- Сотрудницы ----------
const crews = {}; // id -> [{look,x,y,tx,ty,mode,timer,dir}]
const FLOOR = { cx: 0.5, cy: 0.67, hw: 0.25, hh: 0.14 };
function randFloor(rnd) {
  for (;;) { const dx = (rnd() * 2 - 1), dy = (rnd() * 2 - 1); if (Math.abs(dx) + Math.abs(dy) <= 1) return [FLOOR.cx + dx * FLOOR.hw, FLOOR.cy + dy * FLOOR.hh]; }
}
function wantedCrew(id) {
  const L = lvl(id); if (L <= 0) return 0;
  return Math.min(3, 1 + (L >= 3 ? 1 : 0) + (L >= 8 ? 1 : 0));
}
function syncCrew(id) {
  const n = wantedCrew(id), list = crews[id] || (crews[id] = []);
  const staff = id === 'lobby' ? ['clerk', 'officer'] : ROOMS[id].staff;
  while (list.length < n) {
    const i = list.length, seed = hash(id) * 7 + i * 131;
    const rnd = mulberry(seed);
    const [x, y] = randFloor(rnd);
    list.push({ look: makeLook(staff[i % staff.length], seed), x, y, tx: x, ty: y, mode: i === 0 ? 'work' : 'idle', timer: 1 + rnd() * 4, dir: rnd() < 0.5 ? -1 : 1, rnd, phase: rnd() * 10 });
  }
  if (list.length > n) list.length = n;
  // строительница во время улучшения
  const u = upgradingOf(id);
  if (u && !list.builder) list.builder = { look: makeLook('mechanic', hash(id) + 999), x: 0.72, y: 0.8, phase: 0 };
  if (!u && list.builder) list.builder = null;
  return list;
}
function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return Math.abs(h) % 100000; }
function updateCrew(list, dt) {
  for (const f of list) {
    f.timer -= dt;
    if (f.mode === 'walk') {
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy), sp = 0.07 * dt;
      if (d <= sp) { f.x = f.tx; f.y = f.ty; f.mode = f.rnd() < 0.55 ? 'work' : 'talk'; f.timer = 2 + f.rnd() * 5; }
      else { f.x += dx / d * sp; f.y += dy / d * sp; f.dir = dx >= 0 ? 1 : -1; }
    } else if (f.timer <= 0) {
      const [x, y] = randFloor(f.rnd); f.tx = x; f.ty = y; f.mode = 'walk'; f.timer = 10;
    }
  }
}

// ---------- Жетоны дел (визуализация цепочки) ----------
const tokens = [];
const acc = { apps: 0, warrants: 0, arrests: 0, cases: 0 };
const ROUTES = { apps: ['reception', 'detective', '#d9d2c0'], warrants: ['detective', 'patrol', '#c9707f'], arrests: ['patrol', 'interrogation', '#9aa3b8'], cases: ['interrogation', 'cells', '#a98ae0'] };
export function feedChain(sim) {
  if (!sim) return;
  for (const k of Object.keys(acc)) {
    acc[k] += sim[k] || 0;
    while (acc[k] >= 1) { acc[k] -= 1; if (tokens.length < 14 && !tokens.some((t) => t.k === k && t.p < 0.25)) spawnToken(k); }
  }
}
function spawnToken(k) {
  const [a, b, col] = ROUTES[k];
  if (lvl(a) <= 0 || lvl(b) <= 0) return;
  const ra = cellRect(a), rb = cellRect(b);
  tokens.push({ k, col, p: 0, x0: ra.x + ra.w * 0.5, y0: ra.y + ra.h * 0.55, x1: rb.x + rb.w * 0.5, y1: rb.y + rb.h * 0.55 });
}

// ---------- Камера и ввод ----------
export const cam = { x: 0, y: 0, s: 0.4, tx: null, ty: null, ts: null };
let canvas, ctx, W = 0, H = 0, dpr = 1, pads = { top: 120, bottom: 90 };
let onTap = () => {}, selected = null;
export function setSelected(id) { selected = id; }
export function setPads(p) { pads = p; clampCam(); }
function minScale() { return Math.min(W / WORLD_W, 1) * 0.92; }
function maxScale() { return 1.5; }
function clampCam() {
  const s = cam.s, viewW = W / s, viewH = H / s;
  const extraX = Math.max(0, (viewW - WORLD_W) / 2);
  cam.x = viewW >= WORLD_W ? -extraX : Math.max(-40 / s * 0, Math.min(WORLD_W - viewW, cam.x));
  const top = -pads.top / s, bottom = WORLD_H - viewH + pads.bottom / s;
  cam.y = Math.max(top, Math.min(Math.max(top, bottom), cam.y));
}
export function initStation(cv, tapHandler) {
  canvas = cv; ctx = cv.getContext('2d'); onTap = tapHandler;
  resize();
  window.addEventListener('resize', resize);
  cam.s = Math.min(W / WORLD_W, 1);
  cam.y = ROOF_Y - 30 - pads.top / cam.s; cam.x = 0; clampCam();
  const pts = new Map(); let tapStart = null, pinch = null, moved = 0, vel = { x: 0, y: 0 }, lastMove = 0;
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cam.tx = cam.ty = cam.ts = null; vel = { x: 0, y: 0 };
    if (pts.size === 1) { tapStart = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = 0; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s }; tapStart = null; }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (pts.size === 1) {
      cam.x -= dx / cam.s; cam.y -= dy / cam.s; moved += Math.abs(dx) + Math.abs(dy);
      const now = performance.now(), dtm = Math.max(1, now - lastMove); lastMove = now;
      vel = { x: dx / dtm, y: dy / dtm };
    }
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(pinch.s * d / pinch.d, mx, my);
      // панорамирование двумя пальцами
      if (pinch.mx != null) { cam.x -= (mx - pinch.mx) / cam.s; cam.y -= (my - pinch.my) / cam.s; }
      pinch.mx = mx; pinch.my = my;
    }
    clampCam();
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 0 && tapStart) {
      const dt = performance.now() - tapStart.t;
      if (moved < 10 && dt < 500) handleTap(e.clientX, e.clientY);
      else if (performance.now() - lastMove < 60) fling = { x: vel.x * 16, y: vel.y * 16 };
      tapStart = null;
    }
    if (pts.size === 1) { const p = [...pts.values()][0]; tapStart = null; void p; }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(cam.s * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); clampCam(); }, { passive: false });
}
let fling = null;
function zoomAt(ns, sx, sy) {
  ns = Math.max(minScale(), Math.min(maxScale(), ns));
  const r = canvas.getBoundingClientRect();
  const wx = cam.x + (sx - r.left) / cam.s, wy = cam.y + (sy - r.top) / cam.s;
  cam.s = ns; cam.x = wx - (sx - r.left) / ns; cam.y = wy - (sy - r.top) / ns;
}
export function zoomBy(f) { zoomAt(cam.s * f, W / 2, H / 2); clampCam(); }
function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = r.width; H = r.height;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  if (cam.s < minScale()) cam.s = minScale();
  clampCam();
}
function toWorld(sx, sy) { const r = canvas.getBoundingClientRect(); return { x: cam.x + (sx - r.left) / cam.s, y: cam.y + (sy - r.top) / cam.s }; }

export function focusRoom(id, zoom = true) {
  const rc = cellRect(id); if (!rc) return;
  const s = zoom ? Math.max(cam.s, Math.min(1.0, W / (CW * 1.6))) : cam.s;
  const visH = H - pads.top - pads.bottom - 300; // место под шторку
  cam.ts = s;
  cam.tx = rc.x + rc.w / 2 - W / 2 / s;
  cam.ty = rc.y + rc.h / 2 - (pads.top + Math.max(120, visH / 2)) / s;
}
export function focusFacade() {
  cam.ts = Math.min(W / WORLD_W, 1); cam.tx = 0; cam.ty = FACADE.y - pads.top / cam.ts + 10;
}

function handleTap(sx, sy) {
  const p = toWorld(sx, sy);
  // пузыри производства
  for (const id of PRODUCERS) {
    if (lvl(id) <= 0) continue;
    const c = collectable(id); if (!c) continue;
    const b = bubblePos(id);
    if (Math.hypot(p.x - b.x, p.y - b.y) < 34) { onTap({ type: 'collect', id }); return; }
  }
  for (let r = 0; r < LAYOUT.length; r++) for (let c = 0; c < 3; c++) {
    const id = LAYOUT[r][c], rc = cellRect(id);
    if (p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h) { onTap({ type: id === 'lobby' ? 'building' : 'room', id }); return; }
  }
  if (p.x >= FACADE.x && p.x <= FACADE.x + FACADE.w && p.y >= FACADE.y && p.y <= ROOF_Y + 40) { onTap({ type: 'building' }); return; }
  onTap({ type: 'none' });
}
function bubblePos(id) { const rc = cellRect(id); return { x: rc.x + rc.w - 40, y: rc.y + 58 }; }

// ---------- Отрисовка ----------
let last = performance.now(), T = 0;
const floats = []; // всплывающие числа
export function floatText(id, text, color = '#f3d77a') {
  const rc = cellRect(id); if (!rc) return;
  floats.push({ x: rc.x + rc.w - 40, y: rc.y + 50, text, color, t: 0 });
}
export function frame() {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  if (!G.s || !ctx) return;
  // плавная камера
  if (cam.ts != null) {
    const k = 1 - Math.pow(0.0015, dt);
    cam.s += (cam.ts - cam.s) * k; cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k;
    if (Math.abs(cam.ts - cam.s) < 0.002 && Math.abs(cam.tx - cam.x) < 1 && Math.abs(cam.ty - cam.y) < 1) cam.tx = cam.ty = cam.ts = null;
    clampCam();
  } else if (fling) {
    cam.x -= fling.x / cam.s; cam.y -= fling.y / cam.s; fling.x *= 0.92; fling.y *= 0.92;
    if (Math.abs(fling.x) + Math.abs(fling.y) < 0.3) fling = null; clampCam();
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // фон: ночное небо → улица
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1c1c24'); bg.addColorStop(1, '#25242e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, -cam.x * cam.s * dpr, -cam.y * cam.s * dpr);

  const st = hqStage(chiefLvl()), sty = STAGE_STYLE[st];
  drawFacade(st);
  drawShell(sty, st);
  for (let r = 0; r < LAYOUT.length; r++) for (let c = 0; c < 3; c++) drawCell(LAYOUT[r][c], dt, sty);
  drawTokens(dt);
  drawGround(sty, st);
  // всплывающие числа
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.t += dt; if (f.t > 1.4) { floats.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - f.t / 1.4; ctx.font = '700 26px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(f.text, f.x, f.y - f.t * 50);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - f.t * 50); ctx.globalAlpha = 1;
  }
}

function drawFacade(st) {
  const im = img(`assets/facade/facade_${st + 1}.webp`);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(FACADE.x, FACADE.y, FACADE.w, FACADE.h, 26); ctx.clip();
  ctx.fillStyle = '#2b2b2f'; ctx.fillRect(FACADE.x, FACADE.y, FACADE.w, FACADE.h);
  if (im.complete && im.naturalWidth) ctx.drawImage(im, FACADE.x, FACADE.y, FACADE.w, FACADE.h);
  // мягкое затемнение снизу — переход к зданию
  const g = ctx.createLinearGradient(0, FACADE.y + FACADE.h - 120, 0, FACADE.y + FACADE.h);
  g.addColorStop(0, 'rgba(28,28,36,0)'); g.addColorStop(1, 'rgba(28,28,36,0.9)');
  ctx.fillStyle = g; ctx.fillRect(FACADE.x, FACADE.y + FACADE.h - 120, FACADE.w, 120);
  ctx.restore();
  ctx.strokeStyle = 'rgba(200,190,230,0.18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(FACADE.x, FACADE.y, FACADE.w, FACADE.h, 26); ctx.stroke();
  // подпись этапа
  const label = `Этап ${st + 1}/6 · ${HQ_STAGES[st].name}`;
  ctx.font = '700 26px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center';
  const tw = ctx.measureText(label).width + 44;
  ctx.fillStyle = 'rgba(22,22,30,0.85)'; ctx.beginPath(); ctx.roundRect(WORLD_W / 2 - tw / 2, FACADE.y + FACADE.h - 62, tw, 44, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(169,138,224,0.55)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#ece8f6'; ctx.fillText(label, WORLD_W / 2, FACADE.y + FACADE.h - 31);
}

function drawShell(sty, st) {
  // крыша
  ctx.fillStyle = sty.roof;
  ctx.beginPath(); ctx.roundRect(8, ROOF_Y, WORLD_W - 16, FLOORS_Y - ROOF_Y, [14, 14, 0, 0]); ctx.fill();
  ctx.fillStyle = sty.wallHi; ctx.fillRect(8, ROOF_Y, WORLD_W - 16, 6);
  // детали крыши по этапам
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  if (st >= 2) for (let i = 0; i < 6; i++) { ctx.fillStyle = '#2a3550'; ctx.fillRect(60 + i * 46, ROOF_Y + 16, 38, 22); ctx.strokeStyle = '#5a6a90'; ctx.strokeRect(60 + i * 46, ROOF_Y + 16, 38, 22); }
  if (st >= 3) { ctx.strokeStyle = '#c9c9d2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(WORLD_W - 150, ROOF_Y + 26, 18, 0, Math.PI * 2); ctx.stroke(); ctx.font = '700 22px system-ui'; ctx.fillStyle = '#c9c9d2'; ctx.textAlign = 'center'; ctx.fillText('H', WORLD_W - 150, ROOF_Y + 34); }
  if (st >= 4) { ctx.strokeStyle = '#9aa0b4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(WORLD_W - 60, ROOF_Y); ctx.lineTo(WORLD_W - 60, ROOF_Y - 50); ctx.moveTo(WORLD_W - 75, ROOF_Y - 35); ctx.lineTo(WORLD_W - 45, ROOF_Y - 35); ctx.stroke(); ctx.fillStyle = '#c9707f'; ctx.beginPath(); ctx.arc(WORLD_W - 60, ROOF_Y - 52, 4 + Math.sin(T * 3) * 1, 0, Math.PI * 2); ctx.fill(); }
  // вывеска
  ctx.font = '800 24px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ece8f6';
  ctx.fillText('ЛАКОВЫЙ УЧАСТОК', WORLD_W / 2, FLOORS_Y - 14);
  // стены
  const top = FLOORS_Y - 2, bot = GROUND_Y;
  const wg = ctx.createLinearGradient(0, 0, WORLD_W, 0);
  wg.addColorStop(0, sty.wall); wg.addColorStop(0.5, sty.wallHi); wg.addColorStop(1, sty.wall);
  ctx.fillStyle = wg;
  ctx.fillRect(0, top, WALL, bot - top); ctx.fillRect(WORLD_W - WALL, top, WALL, bot - top);
  for (let c = 1; c < 3; c++) ctx.fillRect(WALL + c * (CW + GAP) - GAP, top, GAP, bot - top);
  for (let r = 0; r <= LAYOUT.length; r++) {
    ctx.fillStyle = sty.slab; ctx.fillRect(0, FLOORS_Y + r * (CH + SLAB) - SLAB, WORLD_W, SLAB);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, FLOORS_Y + r * (CH + SLAB) - SLAB, WORLD_W, 2);
  }
  // лаковый блик по краю
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(4, top, 4, bot - top); ctx.fillRect(WORLD_W - 10, top, 4, bot - top);
}

function drawGround(sty, st) {
  const y = GROUND_Y;
  ctx.fillStyle = '#34333b'; ctx.fillRect(-400, y, WORLD_W + 800, 34); // тротуар
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-400, y, WORLD_W + 800, 3);
  ctx.fillStyle = '#26252c'; ctx.fillRect(-400, y + 34, WORLD_W + 800, 136); // дорога
  ctx.fillStyle = '#6a6876';
  for (let x = -380 + ((T * 0) % 80); x < WORLD_W + 400; x += 90) ctx.fillRect(x, y + 98, 46, 6);
  // патрульные машины по этапу
  const cars = Math.min(4, 1 + st);
  for (let i = 0; i < cars; i++) drawCar(120 + i * 200, y + 66, i);
  // проезжающая машина
  const px = ((T * 90) % (WORLD_W + 600)) - 300;
  drawCar(px, y + 128, 7, true);
}
function drawCar(x, y, i, civil) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 18, 62, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = civil ? '#4a3f5c' : '#141418'; ctx.beginPath(); ctx.roundRect(-60, -6, 120, 24, 8); ctx.fill();
  ctx.fillStyle = civil ? '#5a4f6c' : '#ecebf0'; ctx.beginPath(); ctx.roundRect(-34, -24, 66, 22, [10, 12, 2, 2]); ctx.fill();
  if (!civil) { ctx.fillStyle = '#ecebf0'; ctx.fillRect(-26, -4, 52, 18); }
  ctx.fillStyle = '#3a4258'; ctx.fillRect(-28, -20, 26, 14); ctx.fillRect(2, -20, 26, 14);
  if (!civil) { const on = Math.sin(T * 8 + i) > 0; ctx.fillStyle = on ? '#5a7ad0' : '#2a3460'; ctx.fillRect(-10, -30, 9, 6); ctx.fillStyle = on ? '#4a2028' : '#c04a5a'; ctx.fillRect(1, -30, 9, 6); }
  ctx.fillStyle = '#0a0a0c'; ctx.beginPath(); ctx.arc(-36, 18, 10, 0, Math.PI * 2); ctx.arc(36, 18, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-56, -3, 40, 2);
  ctx.restore();
}

function drawCell(id, dt, sty) {
  const rc = cellRect(id), x = rc.x, y = rc.y;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, CW, CH); ctx.clip();
  ctx.fillStyle = '#2a2930'; ctx.fillRect(x, y, CW, CH);
  if (id === 'lobby') { drawLobby(rc, dt); ctx.restore(); drawLabel(rc, 'Вход', null, false); return; }
  const L = lvl(id), unlocked = isUnlocked(id), u = upgradingOf(id);
  const im = img(`assets/rooms/${id}_${roomArtTier(Math.max(1, L)) ? 'b' : 'a'}.webp`);
  if (im.complete && im.naturalWidth) ctx.drawImage(im, x - 6, y - 6, CW + 12, CH + 12);
  // сотрудницы
  if (L > 0) {
    const list = syncCrew(id); updateCrew(list, dt);
    const sorted = [...list].sort((a, b) => a.y - b.y);
    for (const f of sorted) drawWoman(ctx, x + f.x * CW, y + f.y * CH, 0.78, f.look, f.mode === 'walk' ? 'walk' : f.mode, T + f.phase, f.dir);
  }
  if (u) {
    const list = syncCrew(id);
    if (list.builder) drawWoman(ctx, x + 0.78 * CW, y + 0.86 * CH, 0.78, list.builder.look, 'work', T, -1);
  }
  if (!unlocked || L === 0) {
    ctx.fillStyle = unlocked ? 'rgba(18,18,24,0.45)' : 'rgba(14,14,18,0.62)'; ctx.fillRect(x, y, CW, CH);
  }
  ctx.restore();

  // рамка отделки
  const tt = TRIM[roomTrimTier(L)];
  const tg = ctx.createLinearGradient(x, y, x + CW, y + CH); tg.addColorStop(0, tt[1]); tg.addColorStop(0.5, tt[0]); tg.addColorStop(1, tt[1]);
  ctx.strokeStyle = tg; ctx.lineWidth = L >= 5 ? 5 : 3; ctx.strokeRect(x + 1.5, y + 1.5, CW - 3, CH - 3);
  if (selected === id) {
    ctx.strokeStyle = `rgba(169,138,224,${0.7 + Math.sin(T * 5) * 0.3})`; ctx.lineWidth = 6; ctx.strokeRect(x + 3, y + 3, CW - 6, CH - 6);
  }

  if (!unlocked) {
    const lk = iconImage('lock'); if (lk.complete) ctx.drawImage(lk, x + CW / 2 - 26, y + CH / 2 - 40, 52, 52);
    ctx.font = '700 21px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center';
    const lt = `Кабинет ур. ${ROOMS[id].unlock}`, lw = ctx.measureText(lt).width + 28;
    ctx.fillStyle = 'rgba(16,15,22,0.85)'; ctx.beginPath(); ctx.roundRect(x + CW / 2 - lw / 2, y + CH / 2 + 18, lw, 34, 17); ctx.fill();
    ctx.fillStyle = '#d6d2e4'; ctx.fillText(lt, x + CW / 2, y + CH / 2 + 42);
  } else if (L === 0 && !u) {
    pill(x + CW / 2, y + CH / 2 + 10, 'Построить', '#6a4aa8', '#ffffff');
  }
  if (u) drawProgress(rc, u);
  drawLabel(rc, ROOMS[id].name, L, unlocked);
  // пузырь сбора
  if (PRODUCERS.includes(id) && L > 0) {
    const c = collectable(id);
    if (c) {
      const b = bubblePos(id), bob = Math.sin(T * 3 + rc.c) * 4;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 30, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(b.x - 8, b.y - 10 + bob, 4, b.x, b.y + bob, 30);
      g.addColorStop(0, '#fbfaff'); g.addColorStop(1, c.frac > 0.95 ? '#e8b8c4' : '#cfc6ea');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y + bob, 27, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6a4aa8'; ctx.lineWidth = 3; ctx.stroke();
      const ic = iconImage(c.res); if (ic.complete) ctx.drawImage(ic, b.x - 17, b.y - 17 + bob, 34, 34);
    }
  }
}
function drawProgress(rc, u) {
  const now = G.now(), p = Math.min(1, (now - u.start) / Math.max(1, u.end - u.start));
  const x = rc.x + 20, y = rc.y + rc.h - 42, w = rc.w - 40;
  ctx.fillStyle = 'rgba(14,14,20,0.85)'; ctx.beginPath(); ctx.roundRect(x, y, w, 30, 15); ctx.fill();
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#6a4aa8'); g.addColorStop(1, '#a98ae0');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + 3, y + 3, Math.max(24, (w - 6) * p), 24, 12); ctx.fill();
  const hm = iconImage('hammer'); if (hm.complete) ctx.drawImage(hm, x - 8, y - 6, 40, 40);
  ctx.font = '700 18px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.fillText(fmtTime(Math.max(0, (u.end - now) / 1000)), x + w / 2 + 10, y + 21);
}
function drawLabel(rc, name, L, unlocked) {
  const text = L == null ? name : L > 0 ? `${name} · Ур. ${L}` : name;
  ctx.font = '700 19px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center';
  const tw = Math.min(rc.w - 16, ctx.measureText(text).width + 26);
  const cx = rc.x + rc.w / 2, y = rc.y + 10;
  ctx.fillStyle = unlocked === false ? 'rgba(20,20,26,0.8)' : 'rgba(22,21,32,0.88)';
  ctx.beginPath(); ctx.roundRect(cx - tw / 2, y, tw, 32, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(169,138,224,0.6)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = unlocked === false ? '#9a97a8' : '#f1eef8';
  ctx.fillText(text, cx, y + 23, rc.w - 30);
}
function pill(cx, cy, text, bg, fg) {
  ctx.font = '700 22px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width + 40;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(cx - tw / 2, cy - 22, tw, 44, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = fg; ctx.fillText(text, cx, cy + 8);
}
const visitors = [];
function drawLobby(rc, dt) {
  const { x, y } = rc;
  // пол и стены
  ctx.fillStyle = '#3a3844'; ctx.fillRect(x, y, CW, CH);
  ctx.fillStyle = '#4a4756'; ctx.fillRect(x, y, CW, CH * 0.48);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 8; i++) ctx.fillRect(x + i * 40, y + CH * 0.48, 2, CH);
  // стеклянные двери
  ctx.fillStyle = '#20263a'; ctx.fillRect(x + CW / 2 - 56, y + 44, 112, CH * 0.48 - 44);
  ctx.fillStyle = 'rgba(160,180,230,0.25)'; ctx.fillRect(x + CW / 2 - 52, y + 48, 50, CH * 0.48 - 50); ctx.fillRect(x + CW / 2 + 2, y + 48, 50, CH * 0.48 - 50);
  ctx.strokeStyle = '#c9c9d2'; ctx.lineWidth = 3; ctx.strokeRect(x + CW / 2 - 56, y + 44, 112, CH * 0.48 - 44);
  // ковёр
  ctx.fillStyle = '#5a2a3a'; ctx.beginPath(); ctx.ellipse(x + CW / 2, y + CH * 0.74, 90, 26, 0, 0, Math.PI * 2); ctx.fill();
  // растения
  for (const px of [x + 30, x + CW - 30]) { ctx.fillStyle = '#5a4a40'; ctx.fillRect(px - 10, y + CH * 0.42, 20, 22); ctx.fillStyle = '#4f7a4a'; ctx.beginPath(); ctx.arc(px, y + CH * 0.38, 18, 0, Math.PI * 2); ctx.fill(); }
  // посетительницы идут в приёмную (налево)
  if (lvl('reception') > 0) {
    if (visitors.length < 2 && Math.random() < dt * 0.35) {
      const seed = Math.floor(Math.random() * 1e6);
      visitors.push({ look: makeLook(['secretary', 'clerk', 'detective', 'analyst'][seed % 4], seed), x: 0.42 + Math.random() * 0.16, y: 1.05, t: 0, ph: Math.random() * 9 });
    }
    for (let i = visitors.length - 1; i >= 0; i--) {
      const v = visitors[i]; v.t += dt;
      v.y = 1.05 - v.t * 0.13; // идут от улицы к дверям
      if (v.y < 0.5) { visitors.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, (v.y - 0.5) * 6);
      drawWoman(ctx, x + v.x * CW, y + v.y * CH, 0.74, v.look, 'walk', T + v.ph, 1);
      ctx.globalAlpha = 1;
    }
  }
}
function drawTokens(dt) {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]; t.p += dt / 1.8; if (t.p >= 1) { tokens.splice(i, 1); continue; }
    const e = t.p < 0.5 ? 2 * t.p * t.p : 1 - Math.pow(-2 * t.p + 2, 2) / 2;
    const xx = t.x0 + (t.x1 - t.x0) * e, yy = t.y0 + (t.y1 - t.y0) * e - Math.sin(Math.PI * t.p) * 60;
    ctx.globalAlpha = Math.min(1, (1 - t.p) * 4, t.p * 6);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(xx - 15, yy - 9, 34, 26, 5); ctx.fill();
    ctx.fillStyle = t.col; ctx.beginPath(); ctx.roundRect(xx - 17, yy - 12, 34, 26, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,40,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xx - 10, yy - 3); ctx.lineTo(xx + 10, yy - 3); ctx.moveTo(xx - 10, yy + 4); ctx.lineTo(xx + 5, yy + 4); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
export function fmtTime(sec) {
  sec = Math.ceil(sec);
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`;
  if (m > 0) return `${m}м ${String(s).padStart(2, '0')}с`;
  return `${s}с`;
}
