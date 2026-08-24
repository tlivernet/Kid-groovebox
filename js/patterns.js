// Définition des pistes, des gammes et des styles musicaux.
// Les notes disponibles sont toujours celles de la tonalité : rien ne peut
// sonner faux, quoi que l'enfant appuie.

export const STEPS = 16;

export const TRACKS = [
  { id: 'kick',  icon: 'elephant', label: 'Grosse caisse', type: 'drum',  color: '#ff5470' },
  { id: 'snare', icon: 'frog',     label: 'Caisse claire', type: 'drum',  color: '#ff9f43' },
  { id: 'hat',   icon: 'bird',     label: 'Charleston',    type: 'drum',  color: '#ffd23f' },
  { id: 'bass',  icon: 'whale',    label: 'Basse',         type: 'pitch', color: '#3ec9ff' },
  { id: 'chord', icon: 'octopus',  label: 'Accords',       type: 'pitch', color: '#b57bff' },
  { id: 'lead',  icon: 'cat',      label: 'Mélodie',       type: 'pitch', color: '#3ce88b' },
];

/** Nombre de phrases (motifs A, B, C, D) que l'on peut enchaîner. */
export const PHRASES = 4;
export const PHRASE_NAMES = ['A', 'B', 'C', 'D'];

/** Pistes jouables au clavier du mode live. */
export const LIVE_TRACKS = ['bass', 'chord', 'lead'];

/**
 * Gammes.
 *
 * Par défaut, pentatonique (5 notes) : impossible de faire une fausse note,
 * c'est ce qui permet à un enfant d'appuyer n'importe où. Les styles qui
 * portent un thème connu ont besoin des sept notes (le « fa » de Frère
 * Jacques, le « si » d'Alouette) : ils déclarent « fullScale ». Toutes les
 * notes restent dans la tonalité, donc rien ne peut sonner faux non plus.
 */
export const SCALES = {
  major: [0, 2, 4, 7, 9],              // ☀️ joyeux
  minor: [0, 3, 5, 7, 10],             // 🌙 mystérieux
  majorFull: [0, 2, 4, 5, 7, 9, 11],   // do ré mi fa sol la si
  minorFull: [0, 2, 3, 5, 7, 8, 10],   // gamme mineure naturelle
};

/** Nom de la gamme à utiliser, selon le mode et le style. */
export function scaleName(mode, full) {
  return full ? `${mode}Full` : mode;
}

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

// Nombre de degrés disponibles sur un pad mélodique (une dizaine de notes,
// soit deux octaves en pentatonique, une octave et demie en gamme complète).
export const MAX_DEGREE = 9;

/**
 * Notation des motifs, un caractère par pas (16 pas = une mesure).
 *
 *   percussions : « x » = frappe, « - » = silence
 *   mélodies    : « 0 » à « 9 » = degré de la gamme, « - » = silence
 *
 * Écrire les motifs sous cette forme permet de les lire d'un coup d'œil et
 * d'en composer beaucoup sans se tromper.
 */
function beat(str) {
  const out = new Array(STEPS).fill(0);
  for (let i = 0; i < Math.min(str.length, STEPS); i++) out[i] = str[i] === '-' ? 0 : 1;
  return out;
}

function melody(str) {
  const out = new Array(STEPS).fill(null);
  for (let i = 0; i < Math.min(str.length, STEPS); i++) {
    const c = str[i];
    if (c >= '0' && c <= '9') out[i] = Number(c);
  }
  return out;
}

/** Construit une phrase complète à partir des six lignes écrites en clair. */
function phrase(lines) {
  const out = {};
  for (const track of TRACKS) {
    const line = lines[track.id] || '';
    out[track.id] = track.type === 'drum' ? beat(line) : melody(line);
  }
  return out;
}

/**
 * Chaque style est un petit morceau de quatre phrases :
 *   A = couplet (le groove de base)
 *   B = variation (même harmonie, ça bouge un peu plus)
 *   C = le thème (une mélodie connue, arrangée dans le style)
 *   D = la suite du thème, en version complète
 * En mode chaîne, A → B → C → D s'enchaînent tout seuls : c'est une chanson.
 *
 * Les thèmes sont des mélodies du domaine public (traditionnels et classiques) :
 * un enfant les reconnaît, et elles peuvent être reprises librement.
 *
 * Les mélodies s'écrivent en degrés de gamme : le degré 0 est la tonique.
 * Basse et accords posent les mêmes degrés aux mêmes instants, pour que
 * l'harmonie tienne debout.
 */
export const STYLES = [
  {
    id: 'techno', icon: 'robot', label: 'Techno', tempo: 126, mode: 'minor', swing: 0, fullScale: true,
    sound: {
      kick:  { tune: 158, drop: 44, decay: 0.42, click: 0.3 },
      snare: { kind: 'clap', decay: 0.16 },
      hat:   { decay: 0.045, metal: true, hp: 8200, level: 0.26 },
      bass:  { wave: 'sawtooth', sub: 0.4, cutoff: 620, decay: 1.1, level: 0.42 },
      chord: { wave: 'sawtooth', detune: 12, cutoff: 1700, attack: 0.01, hold: 3.5, level: 0.1 },
      lead:  { wave: 'square', detune: 7, cutoff: 3800, decay: 1.1, level: 0.13 },
    },
    fx: { filter: 0.85, delay: 0.25, space: 0.2 },
    phrases: [
      phrase({ // A — la machine se met en route
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   '--x---x---x---x-',
        bass:  '0-0-3---0-0-2---',
        chord: '0---------------',
        lead:  '----------------',
      }),
      phrase({ // B — la basse se met à bouger
        kick:  'x---x---x---x---',
        snare: '----x-------x-x-',
        hat:   'x-x-x-x-x-x-xxx-',
        bass:  '0---0-3-2---2-0-',
        chord: '0-------3-------',
        lead:  '--5---4---2-----',
      }),
      phrase({ // C — le thème : « Dans l'antre du roi de la montagne » (Grieg, 1875)
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   '--x---x---x---x-',
        bass:  '0---0---0---0---',
        chord: '0---------------',
        lead:  '0-1-2-4-3-2-4-3-',
      }),
      phrase({ // D — le thème monte d'un cran, tout est là
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0-0-0-0-4-4-4-4-',
        chord: '0-------4-------',
        lead:  '0-1-2-4-3-2-1-0-',
      }),
    ],
  },
  {
    id: 'rock', icon: 'pick', label: 'Rock', tempo: 118, mode: 'major', swing: 0, fullScale: true,
    sound: {
      kick:  { tune: 172, drop: 55, decay: 0.28, click: 0.35 },
      snare: { kind: 'snare', tone: 205, decay: 0.22, noise: 0.45 },
      hat:   { decay: 0.05, hp: 6800, level: 0.3 },
      bass:  { wave: 'square', sub: 0.3, cutoff: 900, decay: 1.4, level: 0.4 },
      chord: { wave: 'sawtooth', detune: 14, cutoff: 2100, attack: 0.006, hold: 2.6, level: 0.12 },
      lead:  { wave: 'sawtooth', detune: 10, cutoff: 3000, decay: 1.5, level: 0.21 },
    },
    fx: { filter: 1, delay: 0.1, space: 0.15 },
    phrases: [
      phrase({ // A — le riff
        kick:  'x-----x-x-------',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0---0---0---3---',
        chord: '0---------------',
        lead:  '----------------',
      }),
      phrase({ // B — le riff se complète
        kick:  'x-----x-x---x---',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0-0-3---2-2-3---',
        chord: '0-------3-------',
        lead:  '--2-3---2-------',
      }),
      phrase({ // C — le thème : « Ode à la joie » (Beethoven, 1824)
        kick:  'x-----x-x-------',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0-------4-------',
        chord: '0-------4-------',
        lead:  '2-2-3-4-4-3-2-1-',
      }),
      phrase({ // D — la réponse du thème, pied au plancher
        kick:  'x-----x-x---x-x-',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-xxx-',
        bass:  '0---0---4---0---',
        chord: '0---0---4---0---',
        lead:  '0-0-1-2-2-1-1---',
      }),
    ],
  },
  {
    id: 'hiphop', icon: 'mic', label: 'Hip-Hop', tempo: 88, mode: 'major', swing: 0.18,
    sound: {
      kick:  { tune: 124, drop: 36, decay: 0.85, click: 0.18 },
      snare: { kind: 'snare', tone: 180, decay: 0.19, noise: 0.5 },
      hat:   { decay: 0.04, hp: 8000, level: 0.24 },
      bass:  { wave: 'triangle', sub: 0.65, cutoff: 430, decay: 2.2, level: 0.46, glide: 0.05 },
      chord: { wave: 'triangle', detune: 6, cutoff: 1500, attack: 0.05, hold: 4.5, level: 0.13 },
      lead:  { wave: 'square', detune: 4, cutoff: 2200, decay: 1.6, level: 0.15 },
    },
    fx: { filter: 0.8, delay: 0.2, space: 0.25 },
    phrases: [
      phrase({ // A — la boucle qui balance
        kick:  'x-----x--x------',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0------2--0-----',
        chord: '0---------------',
        lead:  '----------------',
      }),
      phrase({ // B — le clavier répond
        kick:  'x-----x--x----x-',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0------2--0---4-',
        chord: '0-------2-------',
        lead:  '----4-5---4-----',
      }),
      phrase({ // C — le thème : « Au clair de la lune » (traditionnel)
        kick:  'x-----x--x------',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0------2--0-----',
        chord: '0---------------',
        lead:  '0-0-0-1-2---1---',
      }),
      phrase({ // D — la suite du thème, arrangement complet
        kick:  'x-----x--x--x---',
        snare: '----x-------x---',
        hat:   'x-xxx-x-x-xxx-x-',
        bass:  '0-0----2--0-3---',
        chord: '0-------3-------',
        lead:  '0-2-1-1-0-------',
      }),
    ],
  },
  {
    id: 'reggae', icon: 'palm', label: 'Reggae', tempo: 78, mode: 'major', swing: 0.1, fullScale: true,
    sound: {
      kick:  { tune: 130, drop: 42, decay: 0.5, click: 0.1 },
      snare: { kind: 'rim', tone: 400, decay: 0.12, noise: 0.35 },
      hat:   { decay: 0.2, hp: 7200, level: 0.22 },
      bass:  { wave: 'sine', sub: 0.5, cutoff: 380, decay: 1.8, level: 0.5, glide: 0.06 },
      chord: { wave: 'square', detune: 5, cutoff: 1900, attack: 0.004, hold: 0.9, level: 0.11 },
      lead:  { wave: 'triangle', detune: 5, cutoff: 2400, decay: 1.7, level: 0.11 },
    },
    fx: { filter: 0.75, delay: 0.45, space: 0.35 },
    phrases: [
      phrase({ // A — le one-drop et le skank
        kick:  '--------x-------',
        snare: '--------x-------',
        hat:   '--x---x---x---x-',
        bass:  '0--2----0--4----',
        chord: '--0---0---0---0-',
        lead:  '----------------',
      }),
      phrase({ // B — la basse se promène
        kick:  '--------x-------',
        snare: '--------x-------',
        hat:   '--x---x---x---x-',
        bass:  '0--2--3-0--4--2-',
        chord: '--0---0---3---3-',
        lead:  '------------5-4-',
      }),
      phrase({ // C — le thème : « Frère Jacques » (traditionnel)
        kick:  '--------x-------',
        snare: '--------x-------',
        hat:   '--x---x---x---x-',
        bass:  '0--2----0--4----',
        chord: '--0---0---0---0-',
        lead:  '0-1-2-0-0-1-2-0-',
      }),
      phrase({ // D — « Dormez-vous ? », tout le monde joue
        kick:  '--------x---x---',
        snare: '--------x-------',
        hat:   '--x---x---x-x-x-',
        bass:  '2--4----2--0----',
        chord: '--2---2---4---4-',
        lead:  '2-3-4---2-3-4---',
      }),
    ],
  },
  {
    id: 'disco', icon: 'disco', label: 'Disco', tempo: 116, mode: 'major', swing: 0, fullScale: true,
    sound: {
      kick:  { tune: 165, drop: 50, decay: 0.3, click: 0.28 },
      snare: { kind: 'clap', decay: 0.18 },
      hat:   { decay: 0.2, metal: true, hp: 7600, level: 0.26 },
      bass:  { wave: 'sawtooth', sub: 0.25, cutoff: 1100, decay: 0.9, level: 0.4 },
      chord: { wave: 'sawtooth', detune: 16, cutoff: 2600, attack: 0.008, hold: 2.2, level: 0.12 },
      lead:  { wave: 'square', detune: 8, cutoff: 4200, decay: 1.2, level: 0.13 },
    },
    fx: { filter: 0.9, delay: 0.2, space: 0.25 },
    phrases: [
      phrase({ // A — la basse qui saute d'octave
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   '--x---x---x---x-',
        bass:  '0-5-0-5-0-5-0-5-',
        chord: '----------------',
        lead:  '----------------',
      }),
      phrase({ // B — les cordes entrent
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   '--x---x---x---x-',
        bass:  '0-5-0-5-3-8-3-8-',
        chord: '----2-------4---',
        lead:  '--------7-5-----',
      }),
      phrase({ // C — le thème : le galop d'Offenbach, alias le french cancan (1858)
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0-4-0-4-0-4-0-4-',
        chord: '0-------4-------',
        lead:  '4-4-5-4-3-2-1-2-',
      }),
      phrase({ // D — la remontée, paillettes comprises
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   '--x-x-x---x-x-x-',
        bass:  '0-5-0-5-4-9-3-8-',
        chord: '0---2---4---3---',
        lead:  '2-1-0-1-2-3-4---',
      }),
    ],
  },
  {
    id: 'chill', icon: 'cloud', label: 'Doux', tempo: 72, mode: 'major', swing: 0.16, fullScale: true,
    sound: {
      kick:  { tune: 112, drop: 44, decay: 0.4, click: 0.05, level: 0.95 },
      snare: { kind: 'brush', decay: 0.14, noise: 0.35 },
      hat:   { decay: 0.05, hp: 9000, level: 0.26 },
      bass:  { wave: 'sine', sub: 0.55, cutoff: 400, decay: 2.4, level: 0.46 },
      chord: { wave: 'triangle', detune: 8, cutoff: 1300, attack: 0.12, hold: 6, level: 0.11 },
      lead:  { wave: 'sine', detune: 3, cutoff: 2000, decay: 2, level: 0.09 },
    },
    fx: { filter: 0.6, delay: 0.3, space: 0.5 },
    phrases: [
      phrase({ // A — on flotte
        kick:  'x-------x-------',
        snare: '----x-------x---',
        hat:   '--x---x---x---x-',
        bass:  '0-------4-------',
        chord: '0---------------',
        lead:  '----------------',
      }),
      phrase({ // B — une petite phrase se pose
        kick:  'x-------x-------',
        snare: '----x-------x---',
        hat:   '--x---x---x---x-',
        bass:  '0-------4-------',
        chord: '0-------4-------',
        lead:  '----5---4-------',
      }),
      phrase({ // C — le thème : « Ah ! vous dirai-je, maman » (traditionnel)
        kick:  'x-------x-------',
        snare: '----x-------x---',
        hat:   '--x---x---x---x-',
        bass:  '0-------4-------',
        chord: '0-------4-------',
        lead:  '0-0-4-4-5-5-4---',
      }),
      phrase({ // D — la descente : fa fa mi mi ré ré do
        kick:  'x-------x---x---',
        snare: '----x-------x---',
        hat:   '--x---x---x---x-',
        bass:  '3-------4-------',
        chord: '3-------4-------',
        lead:  '3-3-2-2-1-1-0---',
      }),
    ],
  },
  {
    id: 'latino', icon: 'maracas', label: 'Latino', tempo: 104, mode: 'major', swing: 0, fullScale: true,
    sound: {
      kick:  { tune: 150, drop: 52, decay: 0.26, click: 0.22 },
      snare: { kind: 'rim', tone: 480, decay: 0.1, noise: 0.4 },
      hat:   { decay: 0.035, metal: true, hp: 8600, level: 0.2 },
      bass:  { wave: 'triangle', sub: 0.4, cutoff: 700, decay: 1.2, level: 0.44 },
      chord: { wave: 'square', detune: 7, cutoff: 2300, attack: 0.005, hold: 1.2, level: 0.11 },
      lead:  { wave: 'triangle', detune: 6, cutoff: 2800, decay: 1.3, level: 0.25 },
    },
    fx: { filter: 0.95, delay: 0.15, space: 0.2 },
    phrases: [
      phrase({ // A — la clave
        kick:  'x-----x---x-x---',
        snare: '--x---x-----x---',
        hat:   'x-xxx-xxx-xxx-xx',
        bass:  '0--0--3---2-----',
        chord: '--0-------0-----',
        lead:  '----------------',
      }),
      phrase({ // B — le piano entre
        kick:  'x-----x---x-x---',
        snare: '--x---x-----x-x-',
        hat:   'x-xxx-xxx-xxx-xx',
        bass:  '0--0--3---2--4--',
        chord: '--0-2---0-2-----',
        lead:  '--------5-4-----',
      }),
      phrase({ // C — le thème : « La Cucaracha » (traditionnel)
        kick:  'x-----x---x-x---',
        snare: '--x---x-----x---',
        hat:   'x-xxx-xxx-xxx-xx',
        bass:  '0--0--4---0-----',
        chord: '--0-------3-----',
        lead:  '0-0-0---3---5---',
      }),
      phrase({ // D — la réponse qui redescend, tout le monde danse
        kick:  'x-----x---x-x-x-',
        snare: '--x---x-----x---',
        hat:   'x-xxx-xxx-xxxxxx',
        bass:  '0--0--4---3--0--',
        chord: '--4-------0-----',
        lead:  '5---4-3-2---1-0-',
      }),
    ],
  },
  {
    id: 'jeuvideo', icon: 'gamepad', label: 'Jeu vidéo', tempo: 140, mode: 'major', swing: 0, fullScale: true,
    sound: {
      kick:  { tune: 180, drop: 60, decay: 0.16, click: 0.4 },
      snare: { kind: 'snare', tone: 240, decay: 0.12, noise: 0.6, hp: 2200 },
      hat:   { decay: 0.03, hp: 9500, level: 0.2 },
      bass:  { wave: 'square', sub: 0, cutoff: 4000, decay: 0.8, level: 0.3 },
      chord: { wave: 'square', detune: 0, cutoff: 5000, attack: 0.002, hold: 1.6, level: 0.08 },
      lead:  { wave: 'square', detune: 0, cutoff: 6000, decay: 0.7, level: 0.22 },
    },
    fx: { filter: 1, delay: 0.18, space: 0.1 },
    phrases: [
      phrase({ // A — l'écran-titre
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0-0-4-4-2-2-3-3-',
        chord: '0-------2-------',
        lead:  '----------------',
      }),
      phrase({ // B — le thème démarre
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0-0-4-4-2-2-3-3-',
        chord: '0-------2-------',
        lead:  '5-7-9-7-5-4-2---',
      }),
      phrase({ // C — le thème : « Alouette » (traditionnel)
        kick:  'x---x---x---x---',
        snare: '----x-------x---',
        hat:   'x-x-x-x-x-x-x-x-',
        bass:  '0-0-4-4-0-0-4-4-',
        chord: '0-------4-------',
        lead:  '4-4-4-5-6---5-4-',
      }),
      phrase({ // D — deuxième ligne du thème, grand final
        kick:  'x---x---x-x-x---',
        snare: '----x-------x-x-',
        hat:   'xxxxxxxxxxxxxxxx',
        bass:  '0-0-0-4-2-2-3-3-',
        chord: '0---2---4---0---',
        lead:  '4-4-4-5-6-6-5-4-',
      }),
    ],
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

/** Copie d'une phrase d'un style (pour ne jamais modifier le préréglage). */
export function clonePhrase(style, index = 0) {
  const source = style.phrases[index % style.phrases.length];
  const out = {};
  for (const track of TRACKS) out[track.id] = [...source[track.id]];
  return out;
}

/** Les quatre phrases d'un style : le petit morceau complet. */
export function cloneSong(style) {
  return Array.from({ length: PHRASES }, (_, i) => clonePhrase(style, i));
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
