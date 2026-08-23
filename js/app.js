// Assemblage : état, sauvegarde, effets de scène, jeu en direct, démarrage.
import {
  TRACKS, STYLES, STEPS, MAX_DEGREE, PHRASES, TRACK_ROOT, KEYS,
  getStyle, clonePatterns, emptyPatterns,
} from './patterns.js';
import { AudioEngine, degreeToMidi } from './audio.js';
import { Sequencer } from './sequencer.js';
import { UI } from './ui.js';
import { icon } from './icons.js';

const SAVE_KEY = 'kid-groovebox-v2';
const engine = new AudioEngine();

// --- État -------------------------------------------------------------------

function makeState(styleId) {
  const style = getStyle(styleId);
  const state = {
    styleId: style.id,
    tempo: style.tempo,
    keyIndex: 0,
    mode: style.mode,
    transpose: 0,
    swing: style.swing,
    filter: style.fx.filter,
    delay: style.fx.delay,
    space: style.fx.space,
    enabled: Object.fromEntries(TRACKS.map((t) => [t.id, true])),
    phrases: [clonePatterns(style), ...Array.from({ length: PHRASES - 1 }, emptyPatterns)],
    phraseIndex: 0,
    queuedPhrase: null,
    chain: false,
    lastDegree: { bass: 0, chord: 0, lead: 4 },
    view: 'motif',
    liveTrack: 'lead',
    octave: 0,
  };
  // Raccourci vers la phrase en cours : tout le reste du code lit « state.patterns ».
  Object.defineProperty(state, 'patterns', {
    get() { return this.phrases[this.phraseIndex]; },
    enumerable: false,
  });
  return state;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!saved) return null;
    const state = makeState(saved.styleId);
    for (const key of ['tempo', 'keyIndex', 'mode', 'transpose', 'swing', 'filter', 'delay', 'space',
                       'view', 'liveTrack', 'octave', 'chain']) {
      if (typeof saved[key] === typeof state[key]) state[key] = saved[key];
    }
    for (const t of TRACKS) {
      if (typeof saved.enabled?.[t.id] === 'boolean') state.enabled[t.id] = saved.enabled[t.id];
    }
    // Une sauvegarde abîmée ne doit jamais empêcher l'appli de démarrer.
    if (Array.isArray(saved.phrases)) {
      saved.phrases.slice(0, PHRASES).forEach((phrase, i) => {
        for (const t of TRACKS) {
          const steps = phrase?.[t.id];
          if (Array.isArray(steps) && steps.length === STEPS) state.phrases[i][t.id] = steps;
        }
      });
    }
    if (Number.isInteger(saved.phraseIndex)) {
      state.phraseIndex = Math.min(Math.max(saved.phraseIndex, 0), PHRASES - 1);
    }
    return state;
  } catch {
    return null;
  }
}

const state = load() || makeState(STYLES[0].id);

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* stockage plein */ }
  }, 400);
}

// --- Réglages appliqués au moteur -------------------------------------------

function applySound() {
  engine.setSound(getStyle(state.styleId).sound);
}

function applyMix() {
  engine.setFilter(state.filter);
  engine.setDelay(state.delay);
  engine.setSpace(state.space);
  engine.syncDelay(state.tempo);
  for (const t of TRACKS) engine.setTrackEnabled(t.id, state.enabled[t.id]);
}

// --- Génération aléatoire ----------------------------------------------------

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function randomPattern(trackId) {
  const drum = ['kick', 'snare', 'hat'].includes(trackId);
  const out = new Array(STEPS).fill(drum ? 0 : null);
  if (trackId === 'kick') {
    out[0] = 1;
    for (let i = 2; i < STEPS; i += 2) if (Math.random() < 0.28) out[i] = 1;
    out[pick([4, 8, 10])] = 1;
  } else if (trackId === 'snare') {
    out[4] = 1; out[12] = 1;
    if (Math.random() < 0.4) out[pick([7, 10, 14, 15])] = 1;
  } else if (trackId === 'hat') {
    const every = pick([2, 2, 4, 1]);
    for (let i = 0; i < STEPS; i += every) if (Math.random() < 0.85) out[i] = 1;
  } else {
    const count = trackId === 'chord' ? pick([2, 2, 3]) : pick([3, 4, 5, 6]);
    const low = trackId === 'bass' ? 0 : 2;
    const high = trackId === 'bass' ? 4 : MAX_DEGREE;
    for (let i = 0; i < count; i++) {
      const step = Math.floor(Math.random() * STEPS);
      out[step] = Math.random() < 0.35 ? 0 : low + Math.floor(Math.random() * (high - low + 1));
    }
    if (out[0] === null && Math.random() < 0.7) out[0] = 0;
  }
  return out;
}

// --- Notes ------------------------------------------------------------------

/** Note MIDI d'un degré, pour une piste donnée, dans la tonalité courante. */
function midiFor(trackId, degree, extraOctaves = 0) {
  const root = TRACK_ROOT[trackId] + KEYS[state.keyIndex].semitone + state.transpose + extraOctaves * 12;
  return degreeToMidi(degree, root, state.mode);
}

function chordMidis(degree, extraOctaves = 0) {
  return [degree, degree + 2, degree + 4].map((d) => midiFor('chord', d, extraOctaves));
}

function preview(trackId, degree) {
  if (!engine.ctx) return;
  const t = engine.ctx.currentTime + 0.01;
  if (trackId === 'kick') engine.kick(t);
  else if (trackId === 'snare') engine.snare(t);
  else if (trackId === 'hat') engine.hat(t);
  else if (trackId === 'bass') engine.bass(midiFor('bass', degree), t, 0.3);
  else if (trackId === 'lead') engine.lead(midiFor('lead', degree), t, 0.3);
  else if (trackId === 'chord') engine.chord(chordMidis(degree), t, 0.6);
}

// --- Effets de scène (tenus) --------------------------------------------------

const fxActive = {};
let brakeFrame = null;

function setFx(id, active) {
  fxActive[id] = active;
  switch (id) {
    case 'filter':
      if (active) engine.setFilter(0.12, 9);
      else engine.setFilter(state.filter, 1);
      break;
    case 'hyper':  sequencer.setStutter(active ? 1 : 0); break;
    case 'repeat': sequencer.setStutter(active ? 2 : 0); break;
    case 'loop':   sequencer.setStutter(active ? 4 : 0); break;
    case 'slow':   sequencer.rate = active ? 2 : 1; break;
    case 'turbo':  sequencer.rate = active ? 0.5 : 1; break;
    case 'echo':
      engine.setDelay(active ? 0.9 : state.delay);
      engine.setDelayFeedback(active ? 0.62 : 0.35);
      break;
    case 'space':
      engine.setSpace(active ? 1 : state.space);
      engine.setDelayFeedback(active ? 0.6 : 0.35);
      break;
    case 'robot': engine.setCrush(active); break;
    case 'drop':  engine.setSoloKick(active, state.enabled); break;
    case 'rise':
      if (active) engine.startRise();
      else engine.stopRise(true);
      break;
    case 'brake': brake(active); break;
  }
}

/** Frein : la musique ralentit jusqu'à s'arrêter, puis repart d'un coup. */
function brake(active) {
  cancelAnimationFrame(brakeFrame);
  if (!active) {
    sequencer.rate = 1;
    engine.setFilter(state.filter, 1);
    return;
  }
  const start = performance.now();
  const step = () => {
    const t = Math.min((performance.now() - start) / 900, 1);
    sequencer.rate = 1 + t * t * 11;
    engine.setFilter(state.filter * (1 - t * 0.85), 1 + t * 4);
    if (t < 1) brakeFrame = requestAnimationFrame(step);
  };
  brakeFrame = requestAnimationFrame(step);
}

// --- Jeu au clavier ----------------------------------------------------------

const heldNotes = new Map();  // identifiant de doigt -> voix en cours

function keyDown(degree, pointerId) {
  const track = state.liveTrack;
  const midis = track === 'chord'
    ? chordMidis(degree, state.octave)
    : [midiFor(track, degree, state.octave)];
  heldNotes.set(pointerId, engine.noteOn(track, midis));
}

function keyUp(pointerId) {
  const handle = heldNotes.get(pointerId);
  if (!handle) return;
  engine.noteOff(handle);
  heldNotes.delete(pointerId);
}

// --- Câblage -----------------------------------------------------------------

const root = document.body;
let sequencer = null;
let ui = null;

const handlers = {
  onStyle(id) {
    const style = getStyle(id);
    // On charge le style dans la phrase en cours : les autres phrases sont conservées.
    Object.assign(state, {
      styleId: style.id,
      tempo: style.tempo,
      mode: style.mode,
      swing: style.swing,
      filter: style.fx.filter,
      delay: style.fx.delay,
      space: style.fx.space,
    });
    state.phrases[state.phraseIndex] = clonePatterns(style);
    applySound();
    applyMix();
    ui.refreshAll();
    save();
  },
  onKey(index) { state.keyIndex = index; ui.refreshChips(); save(); },
  onToggleMode() {
    state.mode = state.mode === 'major' ? 'minor' : 'major';
    ui.refreshChips();
    save();
  },
  onView(view) { state.view = view; ui.refreshView(); save(); },
  onPhraseSelect(index) {
    if (index === state.phraseIndex && state.queuedPhrase === null) return;
    if (sequencer.playing) state.queuedPhrase = index;   // le changement tombe sur la mesure
    else { state.phraseIndex = index; ui.refreshPads(); }
    ui.refreshPhrases();
    save();
  },
  onPhraseCopy(index) {
    if (index === state.phraseIndex) return;
    state.phrases[index] = JSON.parse(JSON.stringify(state.patterns));
    handlers.onPhraseSelect(index);
    ui.refreshPhrases();
    save();
  },
  onChainToggle() { state.chain = !state.chain; ui.refreshPhrases(); save(); },
  onToggleTrack(id) {
    state.enabled[id] = !state.enabled[id];
    engine.setTrackEnabled(id, state.enabled[id]);
    ui.refreshTracks();
    save();
  },
  onSetPad(trackId, step, value) {
    const track = TRACKS.find((t) => t.id === trackId);
    if (track.type === 'drum') {
      state.patterns[trackId][step] = value === null ? 0 : 1;
    } else {
      state.patterns[trackId][step] = value;
      if (value !== null) state.lastDegree[trackId] = value;
    }
    ui.refreshPads();
    ui.refreshPhrases();
    save();
  },
  onPreview: preview,
  onRandomTrack(id) {
    state.patterns[id] = randomPattern(id);
    ui.refreshPads();
    ui.refreshPhrases();
    save();
  },
  onClear() {
    state.phrases[state.phraseIndex] = emptyPatterns();
    ui.refreshPads();
    ui.refreshPhrases();
    save();
  },
  onSurprise() {
    handlers.onStyle(pick(STYLES).id);
    for (const t of TRACKS) state.patterns[t.id] = randomPattern(t.id);
    state.keyIndex = Math.floor(Math.random() * KEYS.length);
    state.mode = Math.random() < 0.5 ? 'major' : 'minor';
    ui.refreshAll();
    save();
  },
  onLiveTrack(id) { state.liveTrack = id; ui.refreshLive(); save(); },
  onOctave(delta) {
    state.octave = Math.max(-1, Math.min(1, state.octave + delta));
    ui.refreshLive();
    save();
  },
  onKeyDown: keyDown,
  onKeyUp: keyUp,
  onTempo(v) { state.tempo = v; engine.syncDelay(v); save(); },
  onTranspose(v) { state.transpose = v; save(); },
  onFilter(v) { state.filter = v; if (!fxActive.filter) engine.setFilter(v); save(); },
  onDelay(v) { state.delay = v; if (!fxActive.echo) engine.setDelay(v); save(); },
  onSpace(v) { state.space = v; if (!fxActive.space) engine.setSpace(v); save(); },
  onFx: setFx,
  onPlayToggle() {
    if (sequencer.playing) sequencer.stop();
    else sequencer.start();
    ui.setPlaying(sequencer.playing);
  },
};

// --- Démarrage ---------------------------------------------------------------

async function boot() {
  await engine.start();
  applySound();
  applyMix();
  sequencer = new Sequencer(engine, state, {
    onStep: (step) => ui.setPlayhead(step),
    onPhrase: () => { ui.refreshPads(); ui.refreshPhrases(); },
  });
  ui = new UI(root, state, handlers);
  document.getElementById('start-screen').classList.add('hidden');
  sequencer.start();
  ui.setPlaying(true);
  keepScreenAwake();
  // Poignée de débogage : pratique pour inspecter l'état depuis la console.
  window.groovebox = { state, engine, sequencer, handlers, ui };
}

async function keepScreenAwake() {
  try {
    if ('wakeLock' in navigator) await navigator.wakeLock.request('screen');
  } catch { /* pas grave si refusé */ }
}

document.querySelector('#start-btn .start-icon').innerHTML = icon('play');
document.getElementById('start-btn').addEventListener('click', boot, { once: true });

// Confort tablette : pas de zoom accidentel, pas de menu contextuel.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (!engine.ctx) return;
  if (document.hidden) engine.ctx.suspend();
  else engine.ctx.resume();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* hors ligne indisponible */ });
  });
}
