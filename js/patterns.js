// Définition des pistes, des gammes et des styles musicaux.
// Tout est pensé "gamme pentatonique" : aucune note ne peut sonner faux.

export const STEPS = 16;

export const TRACKS = [
  { id: 'kick',  icon: 'kick',  label: 'Grosse caisse', type: 'drum',  color: '#ff5470' },
  { id: 'snare', icon: 'snare', label: 'Caisse claire', type: 'drum',  color: '#ff9f43' },
  { id: 'hat',   icon: 'hat',   label: 'Charleston',    type: 'drum',  color: '#ffd23f' },
  { id: 'bass',  icon: 'bass',  label: 'Basse',         type: 'pitch', color: '#3ec9ff' },
  { id: 'chord', icon: 'chord', label: 'Accords',       type: 'pitch', color: '#b57bff' },
  { id: 'lead',  icon: 'lead',  label: 'Mélodie',       type: 'pitch', color: '#3ce88b' },
];

/** Nombre de phrases (motifs A, B, C, D) que l'on peut enchaîner. */
export const PHRASES = 4;
export const PHRASE_NAMES = ['A', 'B', 'C', 'D'];

/** Pistes jouables au clavier du mode live. */
export const LIVE_TRACKS = ['bass', 'chord', 'lead'];

// Gammes pentatoniques (5 notes) : impossible de faire une fausse note.
export const SCALES = {
  major: [0, 2, 4, 7, 9],   // ☀️ joyeux
  minor: [0, 3, 5, 7, 10],  // 🌙 mystérieux
};

// Notes affichées à l'écran (do, ré, mi...) et leur décalage en demi-tons.
export const KEYS = [
  { name: 'do',  semitone: 0 },
  { name: 'ré',  semitone: 2 },
  { name: 'mi',  semitone: 4 },
  { name: 'fa',  semitone: 5 },
  { name: 'sol', semitone: 7 },
  { name: 'la',  semitone: 9 },
  { name: 'si',  semitone: 11 },
];

// Octave de base de chaque piste mélodique (en numéro de note MIDI).
export const TRACK_ROOT = { bass: 36, chord: 48, lead: 60 };

// Nombre de degrés disponibles sur un pad mélodique (2 octaves de pentatonique).
export const MAX_DEGREE = 9;

/** "x--x" -> [1,0,0,1] (complété jusqu'à 16 pas). */
function d(str) {
  const out = new Array(STEPS).fill(0);
  for (let i = 0; i < Math.min(str.length, STEPS); i++) out[i] = str[i] === '-' ? 0 : 1;
  return out;
}

/** Écrit des degrés mélodiques : m({0:0, 4:2}) -> pas 0 = degré 0, pas 4 = degré 2. */
function m(obj) {
  const out = new Array(STEPS).fill(null);
  for (const [k, v] of Object.entries(obj)) out[Number(k)] = v;
  return out;
}

// Chaque style décrit : le tempo, la couleur des sons, le swing et les motifs de départ.
export const STYLES = [
  {
    id: 'techno', icon: 'robot', label: 'Techno', tempo: 126, mode: 'minor', swing: 0,
    sound: { kick: 'boom', snare: 'clap', hat: 'tight', bassWave: 'sawtooth', chordWave: 'sawtooth', leadWave: 'square' },
    fx: { filter: 0.85, delay: 0.25, space: 0.2 },
    patterns: {
      kick:  d('x---x---x---x---'),
      snare: d('----x-------x---'),
      hat:   d('--x---x---x-x-x-'),
      bass:  m({ 2: 0, 6: 0, 10: 3, 14: 2 }),
      chord: m({ 0: 0, 8: 3 }),
      lead:  m({ 4: 5, 6: 7, 12: 4, 15: 5 }),
    },
  },
  {
    id: 'rock', icon: 'pick', label: 'Rock', tempo: 118, mode: 'major', swing: 0,
    sound: { kick: 'punch', snare: 'snare', hat: 'tight', bassWave: 'square', chordWave: 'sawtooth', leadWave: 'sawtooth' },
    fx: { filter: 1, delay: 0.1, space: 0.15 },
    patterns: {
      kick:  d('x-----x-x-------'),
      snare: d('----x-------x---'),
      hat:   d('x-x-x-x-x-x-x-x-'),
      bass:  m({ 0: 0, 4: 0, 8: 4, 12: 3 }),
      chord: m({ 0: 0, 8: 4 }),
      lead:  m({ 2: 4, 6: 5, 10: 7, 14: 5 }),
    },
  },
  {
    id: 'hiphop', icon: 'mic', label: 'Hip-Hop', tempo: 88, mode: 'minor', swing: 0.18,
    sound: { kick: 'boom', snare: 'snare', hat: 'tight', bassWave: 'triangle', chordWave: 'triangle', leadWave: 'square' },
    fx: { filter: 0.8, delay: 0.2, space: 0.25 },
    patterns: {
      kick:  d('x-----x--x------'),
      snare: d('----x-------x---'),
      hat:   d('x-x-x-x-x-x-x-x-'),
      bass:  m({ 0: 0, 7: 2, 10: 0, 14: 4 }),
      chord: m({ 0: 2, 8: 0 }),
      lead:  m({ 4: 4, 5: 5, 12: 7 }),
    },
  },
  {
    id: 'reggae', icon: 'palm', label: 'Reggae', tempo: 78, mode: 'major', swing: 0.1,
    sound: { kick: 'boom', snare: 'snare', hat: 'open', bassWave: 'sine', chordWave: 'square', leadWave: 'triangle' },
    fx: { filter: 0.75, delay: 0.45, space: 0.35 },
    patterns: {
      kick:  d('--------x-------'),
      snare: d('--------x-------'),
      hat:   d('--x---x---x---x-'),
      bass:  m({ 0: 0, 3: 2, 8: 0, 11: 4 }),
      chord: m({ 2: 0, 6: 0, 10: 2, 14: 0 }),
      lead:  m({ 12: 5, 14: 4 }),
    },
  },
  {
    id: 'disco', icon: 'disco', label: 'Disco', tempo: 116, mode: 'major', swing: 0,
    sound: { kick: 'punch', snare: 'clap', hat: 'open', bassWave: 'sawtooth', chordWave: 'sawtooth', leadWave: 'square' },
    fx: { filter: 0.9, delay: 0.2, space: 0.25 },
    patterns: {
      kick:  d('x---x---x---x---'),
      snare: d('----x-------x---'),
      hat:   d('--x---x---x---x-'),
      bass:  m({ 0: 0, 2: 5, 4: 0, 6: 5, 8: 3, 10: 8, 12: 3, 14: 8 }),
      chord: m({ 4: 2, 12: 4 }),
      lead:  m({ 6: 7, 7: 5, 14: 4 }),
    },
  },
  {
    id: 'chill', icon: 'cloud', label: 'Doux', tempo: 72, mode: 'major', swing: 0.16,
    sound: { kick: 'soft', snare: 'brush', hat: 'tight', bassWave: 'sine', chordWave: 'triangle', leadWave: 'sine' },
    fx: { filter: 0.6, delay: 0.3, space: 0.5 },
    patterns: {
      kick:  d('x-------x-------'),
      snare: d('----x-------x---'),
      hat:   d('--x---x---x---x-'),
      bass:  m({ 0: 0, 8: 3 }),
      chord: m({ 0: 0, 6: 2, 10: 4 }),
      lead:  m({ 4: 5, 7: 6, 12: 4 }),
    },
  },
  {
    id: 'latino', icon: 'maracas', label: 'Latino', tempo: 104, mode: 'minor', swing: 0,
    sound: { kick: 'punch', snare: 'clap', hat: 'tight', bassWave: 'triangle', chordWave: 'square', leadWave: 'triangle' },
    fx: { filter: 0.95, delay: 0.15, space: 0.2 },
    patterns: {
      kick:  d('x-----x---x-x---'),
      snare: d('---x--x----x--x-'),
      hat:   d('x-xxx-xxx-xxx-xx'),
      bass:  m({ 0: 0, 3: 0, 6: 4, 10: 2, 14: 3 }),
      chord: m({ 2: 2, 6: 0, 12: 3 }),
      lead:  m({ 4: 5, 8: 7, 9: 6, 13: 4 }),
    },
  },
  {
    id: 'jeuvideo', icon: 'gamepad', label: 'Jeu vidéo', tempo: 140, mode: 'major', swing: 0,
    sound: { kick: 'punch', snare: 'snare', hat: 'tight', bassWave: 'square', chordWave: 'square', leadWave: 'square' },
    fx: { filter: 1, delay: 0.18, space: 0.1 },
    patterns: {
      kick:  d('x---x---x---x---'),
      snare: d('----x-------x---'),
      hat:   d('x-x-x-x-x-x-x-x-'),
      bass:  m({ 0: 0, 2: 0, 4: 4, 6: 4, 8: 2, 10: 2, 12: 3, 14: 3 }),
      chord: m({ 0: 0, 8: 2 }),
      lead:  m({ 0: 5, 1: 7, 2: 9, 3: 7, 8: 6, 9: 8, 10: 9, 11: 8 }),
    },
  },
];

// Effets tenus, dans l'esprit des « punch-in effects » de l'OP-Z :
// on appuie, ça change, on relâche, la musique repart comme avant.
export const PUNCH_FX = [
  { id: 'filter',  icon: 'filter', label: 'Filtre' },
  { id: 'repeat',  icon: 'repeat', label: 'Répète' },
  { id: 'hyper',   icon: 'fast',   label: 'Hyper' },
  { id: 'loop',    icon: 'loop',   label: 'Boucle' },
  { id: 'slow',    icon: 'half',   label: 'Ralenti' },
  { id: 'turbo',   icon: 'double', label: 'Turbo' },
  { id: 'echo',    icon: 'echo',   label: 'Écho' },
  { id: 'space',   icon: 'space',  label: 'Espace' },
  { id: 'robot',   icon: 'robot',  label: 'Robot' },
  { id: 'brake',   icon: 'brake',  label: 'Frein' },
  { id: 'rise',    icon: 'rise',   label: 'Montée' },
  { id: 'drop',    icon: 'drop',   label: 'Cassure' },
];

export function getStyle(id) {
  return STYLES.find((s) => s.id === id) || STYLES[0];
}

/** Copie profonde des motifs d'un style (pour ne jamais modifier le préréglage). */
export function clonePatterns(style) {
  const out = {};
  for (const track of TRACKS) out[track.id] = [...style.patterns[track.id]];
  return out;
}

/** Phrase vide : tous les pas éteints. */
export function emptyPatterns() {
  const out = {};
  for (const track of TRACKS) {
    out[track.id] = new Array(STEPS).fill(track.type === 'drum' ? 0 : null);
  }
  return out;
}

/** Une phrase contient-elle au moins une note ? */
export function isEmptyPhrase(phrase) {
  return TRACKS.every((t) => phrase[t.id].every((v) => (t.type === 'drum' ? !v : v === null)));
}

// Noms de notes en français, pour l'affichage du sélecteur agrandi.
const NOTE_NAMES = ['do', 'do♯', 'ré', 'ré♯', 'mi', 'fa', 'fa♯', 'sol', 'sol♯', 'la', 'la♯', 'si'];
export function noteName(midi) {
  return NOTE_NAMES[((Math.round(midi) % 12) + 12) % 12];
}
