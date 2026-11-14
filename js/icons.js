// Оригинальные SVG-иконки (рисованные кодом)
const S = (body, vb = '0 0 32 32') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
const defs = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;

export const ICONS = {
  money: S(defs('gm', '#f3d77a', '#b8862c') + '<circle cx="16" cy="16" r="13" fill="url(#gm)" stroke="#7a5418" stroke-width="1.5"/><circle cx="16" cy="16" r="9" fill="none" stroke="#8a6220" stroke-width="1.2" opacity=".7"/><path d="M16 9.5l1.9 4 4.3.5-3.2 2.9.9 4.3-3.9-2.2-3.9 2.2.9-4.3-3.2-2.9 4.3-.5z" fill="#fff3c4" opacity=".9"/><ellipse cx="11" cy="9" rx="4" ry="2" fill="#fff" opacity=".35"/>'),
  electricity: S(defs('ge', '#ffe08a', '#e0a020') + '<path d="M18.5 2 6 18h8l-2.5 12L26 13h-8.5z" fill="url(#ge)" stroke="#8a5a10" stroke-width="1.3" stroke-linejoin="round"/><path d="M17 5l-7 10" stroke="#fff" stroke-width="1.2" opacity=".5"/>'),
  fuel: S(defs('gf', '#9fd08a', '#4f8a3a') + '<rect x="6" y="5" width="15" height="23" rx="3" fill="url(#gf)" stroke="#2f5a22" stroke-width="1.3"/><rect x="9" y="8.5" width="9" height="6" rx="1.2" fill="#e8f5df" opacity=".85"/><path d="M21 10h3l2 3v10a2 2 0 0 1-4 0v-6h-1" fill="none" stroke="#2f5a22" stroke-width="1.6" stroke-linecap="round"/><path d="M8 7v18" stroke="#fff" stroke-width="1" opacity=".35"/>'),
  materials: S(defs('gx', '#c9ccd6', '#7d8090') + '<path d="M4 12l12-6 12 6v11l-12 6-12-6z" fill="url(#gx)" stroke="#4a4c58" stroke-width="1.3" stroke-linejoin="round"/><path d="M4 12l12 6 12-6M16 18v11" fill="none" stroke="#4a4c58" stroke-width="1.2"/><path d="M7 12.5l9-4.5" stroke="#fff" stroke-width="1.2" opacity=".55"/>'),
  ammo: S(defs('ga', '#e7c48a', '#a8733a') + '<g stroke="#5a3a18" stroke-width="1.1"><rect x="5" y="13" width="6" height="15" rx="1" fill="url(#ga)"/><path d="M5 13c0-5 3-8 3-8s3 3 3 8z" fill="#c9cbd3"/><rect x="13" y="11" width="6" height="17" rx="1" fill="url(#ga)"/><path d="M13 11c0-5 3-8 3-8s3 3 3 8z" fill="#c9cbd3"/><rect x="21" y="13" width="6" height="15" rx="1" fill="url(#ga)"/><path d="M21 13c0-5 3-8 3-8s3 3 3 8z" fill="#c9cbd3"/></g>'),
  crystals: S(defs('gc', '#c9a8ff', '#6a3fc0') + '<path d="M16 2 26 11 16 30 6 11z" fill="url(#gc)" stroke="#3e2280" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 11h20M16 2l-4 9 4 19 4-19z" fill="none" stroke="#e9dcff" stroke-width=".9" opacity=".7"/>'),
  rep: S(defs('gr', '#e8e8f0', '#9a9ab0') + '<path d="M16 3l11 4v8c0 7-5 12-11 14C10 27 5 22 5 15V7z" fill="url(#gr)" stroke="#55556a" stroke-width="1.3"/><path d="M16 9.5l1.9 4 4.3.5-3.2 2.9.9 4.3-3.9-2.2-3.9 2.2.9-4.3-3.2-2.9 4.3-.5z" fill="#7a2a3a"/>'),
  sp5: S('<circle cx="16" cy="17" r="11" fill="#2d2a3e" stroke="#9b7fd6" stroke-width="2"/><path d="M16 10v7l5 3" stroke="#e9dcff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="13" y="2" width="6" height="4" rx="1" fill="#9b7fd6"/>'),
  sp60: S('<circle cx="16" cy="17" r="11" fill="#3a1f2a" stroke="#c9707f" stroke-width="2"/><path d="M16 10v7l5 3" stroke="#ffe" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="13" y="2" width="6" height="4" rx="1" fill="#c9707f"/>'),
  // UI
  station: S('<path d="M4 28V12l12-7 12 7v16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 16h4v4H9zM19 16h4v4h-4zM13 28v-5h6v5" fill="none" stroke="currentColor" stroke-width="2"/>'),
  heroines: S('<circle cx="11" cy="10" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="22" cy="10" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 27c0-5 3.5-8 8-8s8 3 8 8M14 27c0-5 3.5-8 8-8s7 3 7 8" fill="none" stroke="currentColor" stroke-width="2"/>'),
  map: S('<path d="M3 7l8-3 10 3 8-3v21l-8 3-10-3-8 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M11 4v21M21 7v21" stroke="currentColor" stroke-width="2"/>'),
  battle: S('<circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 2v6M16 24v6M2 16h6M24 16h6" stroke="currentColor" stroke-width="2"/>'),
  shop: S('<path d="M3 5h4l3 15h15l3-10H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="25" r="2.2" fill="currentColor"/><circle cx="23" cy="25" r="2.2" fill="currentColor"/>'),
  tasks: S('<rect x="6" y="5" width="20" height="24" rx="3" fill="#7a5bc0" stroke="#e9dcff" stroke-width="1.5"/><rect x="11" y="3" width="10" height="5" rx="1.5" fill="#d9c9ff"/><path d="M10 14h12M10 19h12M10 24h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'),
  cases: S('<path d="M4 9h9l2 3h13v15H4z" fill="#7a2a3a" stroke="#f0d0d6" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 17h16M8 21h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>'),
  gear: S('<path d="M16 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" fill="none" stroke="#e9e6f3" stroke-width="2"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" stroke="#e9e6f3" stroke-width="2.4" stroke-linecap="round"/>'),
  lock: S('<rect x="7" y="14" width="18" height="14" rx="3" fill="#3b3a48" stroke="#b9b6c9" stroke-width="1.8"/><path d="M11 14v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#b9b6c9" stroke-width="2.2"/><circle cx="16" cy="21" r="2" fill="#b9b6c9"/>'),
  hammer: S('<path d="M5 26l12-12" stroke="#c9a46a" stroke-width="3.5" stroke-linecap="round"/><path d="M14 6l6-2 8 8-3 3-4-3-3 3-4-4 3-3z" fill="#9aa0b4" stroke="#3b3e4c" stroke-width="1.3" stroke-linejoin="round"/>'),
  clock: S('<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 9v7l5 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  builder: S('<circle cx="16" cy="10" r="5" fill="#e8bf9f"/><path d="M10 9a6 6 0 0 1 12 0z" fill="#d9a22c"/><path d="M7 29c0-7 4-11 9-11s9 4 9 11z" fill="#3a3550"/>'),
  close: S('<path d="M8 8l16 16M24 8L8 24" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  sound: S('<path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/><path d="M21 11c2 2 2 8 0 10M24 8c4 4 4 12 0 16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
};
export function icon(name, cls = '') { return `<span class="ic ${cls}">${ICONS[name] || ''}</span>`; }

const imgCache = {};
export function iconImage(name) {
  if (imgCache[name]) return imgCache[name];
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONS[name]);
  imgCache[name] = img; return img;
}
