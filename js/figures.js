// Рисованные «чиби»-фигурки взрослых сотрудниц в лаковой форме (canvas, без растровых файлов)
import { LOOKS, SKINS, HAIRS } from './data.js';

function shade(hex, k) { // k>0 светлее, k<0 темнее
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export function makeLook(role, seed) {
  const base = LOOKS[role] || LOOKS.officer;
  const rnd = mulberry(seed);
  return {
    ...base,
    role,
    skin: SKINS[Math.floor(rnd() * SKINS.length)],
    hair: base.hairColor || HAIRS[Math.floor(rnd() * HAIRS.length)],
    hairStyle: rnd() < 0.7 ? base.hairStyle : ['bun', 'pony', 'bob', 'long'][Math.floor(rnd() * 4)],
    tall: 0.94 + rnd() * 0.12,
    lips: ['#9a3a4a', '#7a2a3a', '#b0505a', '#8a3a5a'][Math.floor(rnd() * 4)],
  };
}
export function mulberry(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// pose: 'idle' | 'walk' | 'work' | 'talk'; t — секунды; dir: 1 вправо, -1 влево
export function drawWoman(ctx, x, y, s, look, pose = 'idle', t = 0, dir = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir * look.tall, s * look.tall);
  const walk = pose === 'walk';
  const ph = t * (walk ? 9 : 2.2);
  const bob = walk ? Math.abs(Math.sin(ph)) * 1.6 : Math.sin(ph) * 0.5;
  const legA = walk ? Math.sin(ph) * 5 : 0;
  const O = look.outfit, light = O === '#e4e4ea' || O === '#ececf1';

  // тень
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -bob);

  // ноги + лаковые сапоги
  const boot = '#111116';
  for (const side of [-1, 1]) {
    const off = side * legA;
    const lx = side * 4.2 + off * 0.4;
    // нога (колготы/брюки)
    ctx.fillStyle = look.bottom === 'pants' ? shade(O, -0.25) : shade(look.skin, -0.12);
    rr(ctx, lx - 3.2, -34, 6.4, 22, 3); ctx.fill();
    // сапог
    ctx.fillStyle = boot;
    rr(ctx, lx - 3.6, -16 + Math.max(0, -off) * 0.15, 7.2, 15, 3); ctx.fill();
    ctx.fillRect(lx + side * 0 - 3.6, -2.2, 8.6 * (side > 0 ? 1 : 1), 2.2);
    // блик
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx - 1.6, -14); ctx.lineTo(lx - 1.6, -5); ctx.stroke();
  }

  // юбка или пояс брюк
  const g1 = ctx.createLinearGradient(-12, -46, 12, -30);
  g1.addColorStop(0, shade(O, light ? -0.1 : 0.15)); g1.addColorStop(0.5, O); g1.addColorStop(1, shade(O, -0.35));
  ctx.fillStyle = look.bottom === 'skirt' ? shade(O, -0.15) : shade(O, -0.2);
  ctx.beginPath();
  if (look.bottom === 'skirt') { ctx.moveTo(-8, -44); ctx.lineTo(8, -44); ctx.lineTo(11, -30); ctx.lineTo(-11, -30); }
  else { ctx.moveTo(-8, -44); ctx.lineTo(8, -44); ctx.lineTo(8.5, -33); ctx.lineTo(-8.5, -33); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-5, -42); ctx.lineTo(-7, -32); ctx.stroke();

  // длинный плащ детектива
  if (look.coat) {
    ctx.fillStyle = shade(O, -0.1);
    ctx.beginPath(); ctx.moveTo(-10, -62); ctx.lineTo(10, -62); ctx.lineTo(13, -24); ctx.lineTo(-13, -24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(-8, -58); ctx.lineTo(-11, -27); ctx.stroke();
  }

  // руки (за корпусом — дальняя)
  const armSwing = walk ? Math.sin(ph) * 0.5 : pose === 'work' ? -0.9 + Math.sin(t * 14) * 0.12 : pose === 'talk' ? -0.4 + Math.sin(t * 3) * 0.35 : 0.08;
  drawArm(ctx, -9, -62, armSwing * (walk ? -1 : 1) + (walk ? 0 : 0.1), O, look, light, true);

  // корпус — жакет с талией
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.moveTo(-10.5, -64); ctx.quadraticCurveTo(0, -67, 10.5, -64);
  ctx.lineTo(7.5, -50); ctx.quadraticCurveTo(9.5, -46, 9, -43);
  ctx.lineTo(-9, -43); ctx.quadraticCurveTo(-9.5, -46, -7.5, -50);
  ctx.closePath(); ctx.fill();
  // пояс
  ctx.fillStyle = '#0d0d10'; ctx.fillRect(-8.6, -46, 17.2, 2.4);
  ctx.fillStyle = look.trim; ctx.fillRect(-1.4, -46.2, 2.8, 2.8);
  // лацканы / вырез воротника
  ctx.fillStyle = light ? '#cfd0d8' : '#e8e4ea';
  ctx.beginPath(); ctx.moveTo(-3, -65); ctx.lineTo(0, -58); ctx.lineTo(3, -65); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(O, -0.45); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4, -65); ctx.lineTo(0, -56); ctx.lineTo(4, -65); ctx.stroke();
  // погоны / отделка
  ctx.fillStyle = look.trim; ctx.fillRect(-10.5, -64.5, 4, 1.6); ctx.fillRect(6.5, -64.5, 4, 1.6);
  // значок
  ctx.fillStyle = '#c9c9d2'; ctx.beginPath(); ctx.arc(-5, -58, 1.5, 0, Math.PI * 2); ctx.fill();
  // лаковые блики
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-7.5, -61); ctx.quadraticCurveTo(-8.5, -54, -6, -48); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(5, -62); ctx.quadraticCurveTo(6.5, -56, 5.5, -50); ctx.stroke();

  // ближняя рука
  drawArm(ctx, 9, -62, pose === 'work' ? -1.0 + Math.sin(t * 14 + 1.5) * 0.12 : walk ? -armSwing : -armSwing * 0.6 - 0.05, O, look, light, false);

  // шея
  ctx.fillStyle = shade(look.skin, -0.08); ctx.fillRect(-2.2, -70, 4.4, 6);

  // голова
  const hy = -84;
  const hair = look.hair;
  // волосы сзади
  ctx.fillStyle = shade(hair, -0.1);
  if (look.hairStyle === 'long') { rr(ctx, -14, hy - 8, 28, 30, 10); ctx.fill(); }
  if (look.hairStyle === 'pony') {
    ctx.beginPath(); ctx.moveTo(10, hy - 6); ctx.quadraticCurveTo(22, hy + 4 + Math.sin(ph) * 1.5, 13, hy + 20); ctx.quadraticCurveTo(14, hy + 6, 8, hy); ctx.fill();
  }
  if (look.hairStyle === 'bob') { rr(ctx, -15, hy - 10, 30, 22, 11); ctx.fill(); }
  // лицо
  ctx.fillStyle = look.skin;
  ctx.beginPath(); ctx.ellipse(0, hy, 12.5, 13.5, 0, 0, Math.PI * 2); ctx.fill();
  // челка/верх волос
  const hg = ctx.createLinearGradient(-12, hy - 16, 12, hy);
  hg.addColorStop(0, shade(hair, 0.18)); hg.addColorStop(1, hair);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-13.5, hy + 2);
  ctx.quadraticCurveTo(-15, hy - 16, 0, hy - 16);
  ctx.quadraticCurveTo(15, hy - 16, 13.5, hy + 2);
  ctx.quadraticCurveTo(10, hy - 7, 2, hy - 8);
  ctx.quadraticCurveTo(-6, hy - 4, -13.5, hy + 2);
  ctx.fill();
  if (look.hairStyle === 'bun') { ctx.beginPath(); ctx.arc(0, hy - 17, 6, 0, Math.PI * 2); ctx.fill(); }
  // блик волос
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(-2, hy - 6, 10, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();

  // глаза (взрослый разрез, ресницы)
  const blink = (Math.sin(t * 1.3 + look.tall * 40) > 0.985);
  ctx.fillStyle = '#1a1418';
  for (const ex of [-4.6, 4.6]) {
    if (blink) { ctx.fillRect(ex - 2.2, hy + 1.5, 4.4, 0.9); continue; }
    ctx.beginPath(); ctx.ellipse(ex, hy + 1.6, 1.8, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 0.6, hy + 0.9, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1418';
    ctx.strokeStyle = '#1a1418'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex - 2.6, hy - 0.4); ctx.quadraticCurveTo(ex, hy - 1.6, ex + 2.8, hy - 0.8); ctx.stroke();
  }
  // брови
  ctx.strokeStyle = shade(hair, -0.2); ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-6.5, hy - 3.2); ctx.lineTo(-2.6, hy - 3.8); ctx.moveTo(2.6, hy - 3.8); ctx.lineTo(6.5, hy - 3.2); ctx.stroke();
  // губы
  ctx.fillStyle = look.lips; ctx.beginPath(); ctx.ellipse(0, hy + 7.4, 2.2, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  // румянец
  ctx.fillStyle = 'rgba(210,110,120,0.18)';
  ctx.beginPath(); ctx.arc(-7.5, hy + 5, 2.2, 0, Math.PI * 2); ctx.arc(7.5, hy + 5, 2.2, 0, Math.PI * 2); ctx.fill();
  if (look.glasses) {
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(-4.6, hy + 1.6, 3.3, 0, Math.PI * 2); ctx.moveTo(7.9, hy + 1.6); ctx.arc(4.6, hy + 1.6, 3.3, 0, Math.PI * 2); ctx.moveTo(-1.3, hy + 1.4); ctx.lineTo(1.3, hy + 1.4); ctx.stroke();
  }
  if (look.headset) {
    ctx.strokeStyle = '#18181c'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, hy - 2, 14, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = '#18181c'; rr(ctx, -15.5, hy - 2, 3.5, 6, 1.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-13, hy + 3); ctx.quadraticCurveTo(-10, hy + 9, -4, hy + 8); ctx.stroke();
  }
  // фуражка
  if (look.cap) {
    ctx.fillStyle = '#121218';
    ctx.beginPath(); ctx.ellipse(0, hy - 12, 14.5, 5.5, 0, Math.PI, 0); ctx.fill();
    rr(ctx, -12, hy - 17, 24, 6, 3); ctx.fill();
    ctx.fillStyle = '#0a0a0d'; ctx.beginPath(); ctx.ellipse(2, hy - 10.5, 13, 2.6, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = look.trim; ctx.fillRect(-11, hy - 12.8, 22, 1.4);
    ctx.fillStyle = '#c9c9d2'; ctx.beginPath(); ctx.arc(0, hy - 14.5, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, hy - 16); ctx.lineTo(4, hy - 16.5); ctx.stroke();
  }
  ctx.restore();
}

function drawArm(ctx, sx, sy, ang, O, look, light, back) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ang * (sx < 0 ? -1 : 1) * -1);
  ctx.fillStyle = back ? shade(O, -0.3) : shade(O, light ? -0.05 : 0.05);
  rr(ctx, -2.8, 0, 5.6, 16, 2.8); ctx.fill();
  // перчатка (лак)
  ctx.fillStyle = '#121216'; ctx.beginPath(); ctx.arc(0, 17.5, 2.9, 0, Math.PI * 2); ctx.fill();
  if (!back) { ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-1.3, 2); ctx.lineTo(-1.3, 13); ctx.stroke(); }
  ctx.restore();
}

// Портрет для HUD
export function drawPortrait(ctx, size, look) {
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  const g = ctx.createRadialGradient(size / 2, size * 0.4, 4, size / 2, size / 2, size * 0.7);
  g.addColorStop(0, '#4a4560'); g.addColorStop(1, '#1d1c25');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  drawWoman(ctx, size / 2, size * 1.62, size / 46, look, 'idle', 0.3, 1);
  ctx.restore();
}
