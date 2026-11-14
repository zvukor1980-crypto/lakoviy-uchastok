// Синтезированные звуки (WebAudio, без файлов)
import { settings } from './state.js';
let ac = null;
function ctx() {
  if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
export function unlockAudio() { if (settings().sound) ctx(); }
function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slide = 0) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
export function sfx(name) {
  if (!settings().sound) return;
  switch (name) {
    case 'tap': tone(520, 0.06, 'triangle', 0.06); break;
    case 'open': tone(420, 0.08, 'sine', 0.07); tone(640, 0.09, 'sine', 0.05, 0.05); break;
    case 'coin': tone(880, 0.08, 'triangle', 0.09); tone(1320, 0.12, 'triangle', 0.08, 0.06); break;
    case 'build': tone(220, 0.08, 'square', 0.05); tone(330, 0.1, 'square', 0.05, 0.09); break;
    case 'done': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.08)); break;
    case 'error': tone(200, 0.15, 'sawtooth', 0.05, 0, 0.7); break;
    case 'buy': tone(700, 0.08, 'sine', 0.08); tone(1050, 0.14, 'sine', 0.07, 0.07); break;
  }
}
