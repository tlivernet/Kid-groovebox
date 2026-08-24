// Jeu d'icônes dessinées à la main (SVG 24x24, trait arrondi).
// Aucune police d'icônes, aucun émoji : le rendu est identique sur toutes les tablettes.

const P = {
  // --- Instruments ---------------------------------------------------------
  kick: '<circle cx="11.4" cy="12" r="7.6"/><circle cx="11.4" cy="12" r="2.6" fill="currentColor" stroke="none"/><path d="M19.4 19.6v-4.2l-4.4-2.6"/><path d="M4.4 19.6h14.6"/>',
  snare: '<rect x="3.2" y="7.4" width="17.6" height="9.2" rx="3"/><path d="M3.2 12h17.6"/><path d="M7.4 16.6 5.8 20.4M16.6 16.6l1.6 3.8"/>',
  hat: '<path d="M3.6 10q8.4-4.4 16.8 0"/><path d="M4.8 13.4q7.2 3.6 14.4 0"/><path d="M12 7.8v12.6"/><path d="M9.4 20.4h5.2"/>',
  bass: '<path d="M7.4 11.8c2 0 2.5 1.1 3.5 1.1s1.5-1.1 3.5-1.1c2 0 3.4 1.8 3.4 4.2s-1.6 4.4-3.5 4.4c-1.5 0-2-1-3.4-1s-1.9 1-3.4 1c-1.9 0-3.5-2-3.5-4.4s1.4-4.2 3.4-4.2z"/><circle cx="10.9" cy="16" r="1.4"/><path d="m13.6 11.6 4.6-5.4"/><path d="m17.1 4.9 2.9 2.4-1.5 1.8-2.9-2.4z"/>',
  chord: '<rect x="2.6" y="6.4" width="18.8" height="11.2" rx="2"/><path d="M8.9 6.4v11.2M15.1 6.4v11.2"/><path d="M6.6 6.4h2.6v6.2H6.6zM12.8 6.4h2.6v6.2h-2.6zM19 6.4h-2.6v6.2H19z" fill="currentColor" stroke="none"/>',
  lead: '<circle cx="8.6" cy="16.6" r="3.3" fill="currentColor" stroke="none"/><path d="M11.9 16.6V4.2c4 .8 6.6 2.5 6.6 5.3"/>',

  // --- Styles --------------------------------------------------------------
  robot: '<rect x="4.5" y="7.5" width="15" height="12" rx="3.5"/><path d="M12 7.5V4.5"/><circle cx="12" cy="3.4" r="1.4" fill="currentColor" stroke="none"/><circle cx="9.2" cy="13.2" r="1.35" fill="currentColor" stroke="none"/><circle cx="14.8" cy="13.2" r="1.35" fill="currentColor" stroke="none"/>',
  pick: '<path d="M13.8 2.6 5.4 13.8h5.2l-1.4 7.6 9.4-11.8h-5.2z"/>',
  mic: '<rect x="9" y="2.8" width="6" height="10" rx="3"/><path d="M5.8 11a6.2 6.2 0 0012.4 0"/><path d="M12 17.2v3.4M9 20.6h6"/>',
  palm: '<path d="M12.4 20.6c0-4.2.4-7.2 1.2-9.4"/><path d="M13.6 11.2C11.4 8.4 7.6 7.8 4.8 10M13.6 11.2c1-3.4 4.2-5.2 7.6-4.2M13.6 11.2c2.2 0 4.2 1.4 5.2 3.6M13.6 11.2C12.4 8.6 12.8 6 14.4 4"/><circle cx="13.6" cy="11.2" r="1.3" fill="currentColor" stroke="none"/>',
  disco: '<circle cx="12" cy="13.5" r="7"/><path d="M5 13.5h14M12 6.5v14M7.3 8.7c2.6 3.2 6.8 3.2 9.4 0M7.3 18.3c2.6-3.2 6.8-3.2 9.4 0"/><path d="M12 6.5V3"/>',
  cloud: '<path d="M7.6 18h8.8a4.1 4.1 0 000-8.2 5.6 5.6 0 00-10.7 1.7A3.3 3.3 0 007.6 18z"/>',
  maracas: '<path d="M7.6 3.8c2 0 3.6 1.8 3.6 4s-1.6 4-3.6 4S4 10 4 7.8s1.6-4 3.6-4z"/><path d="M8.6 11.6 10.6 19.8"/><path d="M17.4 8.4c1.6 0 2.9 1.5 2.9 3.3s-1.3 3.3-2.9 3.3-2.9-1.5-2.9-3.3 1.3-3.3 2.9-3.3z"/><path d="M18.2 14.9 19.6 20.4"/>',
  gamepad: '<rect x="2.5" y="7.5" width="19" height="10" rx="4"/><path d="M7 10.4v4.2M4.9 12.5h4.2"/><circle cx="16" cy="11.4" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.4" cy="14" r="1.3" fill="currentColor" stroke="none"/>',

  // --- Tonalité ------------------------------------------------------------
  sun: '<circle cx="12" cy="12" r="4.4"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.3 5.3 7.1 7.1M16.9 16.9l1.8 1.8M18.7 5.3 16.9 7.1M7.1 16.9l-1.8 1.8"/>',
  moon: '<path d="M20.2 14.8A8.4 8.4 0 019.4 4a8.6 8.6 0 1010.8 10.8z"/>',

  // --- Transport et actions -------------------------------------------------
  play: '<path d="M8.5 5.4 19 12 8.5 18.6z" fill="currentColor"/>',
  stop: '<rect x="6.6" y="6.6" width="10.8" height="10.8" rx="2.6" fill="currentColor" stroke="none"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  trash: '<path d="M4.5 7h15M9.8 7V4.8h4.4V7M6.8 7l1 12.2h8.4L17.2 7"/>',
  magic: '<path d="M4 20 14.5 9.5"/><path d="m13 7.4 2.4-2.4 4 4-2.4 2.4z"/><path d="M6.2 4.4v3.4M4.5 6.1h3.4M17.6 14.4v2.8M16.2 15.8H19"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="3"/><path d="M15.8 8.5V6.6A2.6 2.6 0 0013.2 4H6.6A2.6 2.6 0 004 6.6v6.6a2.6 2.6 0 002.6 2.6h1.9"/>',
  link: '<path d="M9.4 14.6 14.6 9.4"/><path d="M13.6 7.6 15.3 6a3.7 3.7 0 015.2 5.2l-1.6 1.7"/><path d="M10.4 16.4 8.7 18a3.7 3.7 0 01-5.2-5.2l1.6-1.7"/>',
  grid: '<rect x="3" y="4.5" width="18" height="15" rx="3.2"/><path d="M9 4.5v15M15 4.5v15M3 12h18"/>',
  keys: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.6"/><path d="M8.2 5.5v13M13.6 5.5v13"/><path d="M6.3 5.5h2.6v6.4H6.3zM11.7 5.5h2.6v6.4h-2.6zM17.1 5.5h2.6v6.4h-2.6z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  songs: '<path d="M3.6 18.4V6.9a1.9 1.9 0 011.9-1.9h3.8l2 2.5h7.2a1.9 1.9 0 011.9 1.9v9a1.9 1.9 0 01-1.9 1.9H5.5a1.9 1.9 0 01-1.9-1.9z"/><circle cx="10.4" cy="15.6" r="1.7"/><path d="M12.1 15.6v-4.2l3.6 1.1"/>',
  save: '<path d="M12 3.6v9.8"/><path d="m7.9 9.4 4.1 4.2 4.1-4.2"/><path d="M4.6 15.4v2.5a2.4 2.4 0 002.4 2.4h10a2.4 2.4 0 002.4-2.4v-2.5"/>',
  open: '<path d="M12 13.4V3.6"/><path d="m7.9 7.8 4.1-4.2 4.1 4.2"/><path d="M4.6 15.4v2.5a2.4 2.4 0 002.4 2.4h10a2.4 2.4 0 002.4-2.4v-2.5"/>',
  close: '<path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/>',
  minus: '<path d="M5.5 12h13"/>',

  // --- Potards --------------------------------------------------------------
  speed: '<path d="M3.6 17.5a8.4 8.4 0 1116.8 0"/><path d="m12 17.5 4.6-5.2"/><circle cx="12" cy="17.5" r="1.5" fill="currentColor" stroke="none"/>',
  pitch: '<path d="m7.8 9.4 4.2-4.6 4.2 4.6M12 4.8v14.4M7.8 14.6l4.2 4.6 4.2-4.6"/>',
  filter: '<path d="M3 7.6h8.4c3.6 0 3 8.8 9.6 8.8"/><path d="M3 16.4h4"/>',
  echo: '<path d="M5.5 5.5v13M10.5 7.6v8.8M15.5 9.6v4.8M20 11v2"/>',
  space: '<path d="m12 3.4 1.9 4.7 4.7 1.9-4.7 1.9-1.9 4.7-1.9-4.7L5.4 10l4.7-1.9z"/><path d="M5.5 18.6c3.4 1.7 9.6 1.7 13 0"/>',

  // --- Effets (punch-in) -----------------------------------------------------
  repeat: '<path d="M5 9.2h10.6a4.2 4.2 0 010 8.4H8.6"/><path d="m11.4 5.4-3.8 3.8 3.8 3.8"/>',
  fast: '<path d="M3.6 7.6h11M6.6 12h11M3.6 16.4h11"/><path d="m17.4 8.6 3.4 3.4-3.4 3.4"/>',
  loop: '<path d="M19.8 12a7.8 7.8 0 11-2.7-5.9"/><path d="M20.2 4v4.4h-4.4"/>',
  brake: '<path d="M5.4 5.4v13.2"/><path d="M9.4 12h9.2"/><path d="m14.8 8 4 4-4 4"/>',
  rise: '<path d="M3.6 18.4h4v-4h4v-4h4v-4h4"/><path d="m17.6 4.4 2.6 2-2.6 2"/>',
  drop: '<path d="M12 4v9.6"/><path d="m7.8 9.4 4.2 4.2 4.2-4.2"/><path d="M4.5 18.5h15"/>',
};

// Icônes composées de texte (lisibles comme sur la sérigraphie d'une machine).
const TEXTS = { half: '½', double: '×2', quarter: '¼' };

/** Renvoie le balisage SVG d'une icône. */
export function icon(name, extraClass = '') {
  const cls = `ic ${extraClass}`.trim();
  if (TEXTS[name]) {
    return `<svg class="${cls} ic-text" viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="17" text-anchor="middle">${TEXTS[name]}</text></svg>`;
  }
  const body = P[name];
  if (!body) return '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export const ICON_NAMES = [...Object.keys(P), ...Object.keys(TEXTS)];
