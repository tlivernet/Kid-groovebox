// Assemblage : état de l'application, sauvegarde, effets, démarrage.
import { TRACKS, STYLES, STEPS, MAX_DEGREE, getStyle, clonePatterns } from './patterns.js';
import { AudioEngine, degreeToMidi } from './audio.js';
import { Sequencer } from './sequencer.js';
import { UI } from './ui.js';
import { TRACK_ROOT } from './patterns.js';

const SAVE_KEY = 'kid-groovebox-v1';

const engine = new AudioEngine();

function stateFromStyle(styleId) {
  const style = getStyle(styleId);
  return {
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
    patterns: clonePatterns(style),
    lastDegree: { bass: 0, chord: 0, lead: 4 },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const base = stateFromStyle(saved.styleId);
    // On ne garde que les champs connus : une sauvegarde abîmée ne casse rien.
    for (const key of ['tempo', 'keyIndex', 'mode', 'transpose', 'swing', 'filter', 'delay', 'space']) {
      if (typeof saved[key] === typeof base[key]) base[key] = saved[key];
    }
    for (const t of TRACKS) {
      if (typeof saved.enabled?.[t.id] === 'boolean') base.enabled[t.id] = saved.enabled[t.id];
      const p = saved.patterns?.[t.id];
      if (Array.isArray(p) && p.length === STEPS) base.patterns[t.id] = p;
    }
    return base;
  } catch {
    return null;
  }
}

const state = load() || stateFromStyle(STYLES[0].id);

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* stockage plein */ }
  }, 400);
}

// --- Application des réglages au moteur -----------------------------------

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

// --- Génération aléatoire --------------------------------------------------

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function randomPattern(trackId) {
  const out = new Array(STEPS).fill(trackId === 'kick' || trackId === 'snare' || trackId === 'hat' ? 0 : null);
  if (trackId === 'kick') {
    out[0] = 1;
    for (let i = 2; i < STEPS; i += 2) if (Math.random() < 0.3) out[i] = 1;
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

// --- Prévisualisation d'une note en édition -------------------------------

function preview(trackId, degree) {
  if (!engine.ctx) return;
  const t = engine.ctx.currentTime + 0.01;
  const shift = state.transpose;
  if (trackId === 'kick') engine.kick(t);
  else if (trackId === 'snare') engine.snare(t);
  else if (trackId === 'hat') engine.hat(t);
  else if (trackId === 'bass') engine.bass(degreeToMidi(degree, TRACK_ROOT.bass + shift, state.mode), t, 0.3);
  else if (trackId === 'lead') engine.lead(degreeToMidi(degree, TRACK_ROOT.lead + shift, state.mode), t, 0.3);
  else if (trackId === 'chord') {
    const root = TRACK_ROOT.chord + shift;
    engine.chord([degree, degree + 2, degree + 4].map((d) => degreeToMidi(d, root, state.mode)), t, 0.6);
  }
}

// --- Câblage ---------------------------------------------------------------

const root = document.body;
let sequencer = null;
let ui = null;

const handlers = {
  onStyle(id) {
    const fresh = stateFromStyle(id);
    Object.assign(state, fresh, { keyIndex: state.keyIndex, transpose: state.transpose });
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
    save();
  },
  onPreview: preview,
  onRandomTrack(id) {
    state.patterns[id] = randomPattern(id);
    ui.refreshPads();
    save();
  },
  onClear() {
    for (const t of TRACKS) {
      state.patterns[t.id] = new Array(STEPS).fill(t.type === 'drum' ? 0 : null);
    }
    ui.refreshPads();
    save();
  },
  onSurprise() {
    handlers.onStyle(pick(STYLES).id);
    for (const t of TRACKS) state.patterns[t.id] = randomPattern(t.id);
    state.keyIndex = Math.floor(Math.random() * 7);
    state.mode = Math.random() < 0.5 ? 'major' : 'minor';
    ui.refreshAll();
    save();
  },
  onTempo(v) { state.tempo = v; engine.syncDelay(v); save(); },
  onTranspose(v) { state.transpose = v; save(); },
  onFilter(v) { state.filter = v; if (!fxActive.sweep) engine.setFilter(v); save(); },
  onDelay(v) { state.delay = v; engine.setDelay(v); save(); },
  onSpace(v) { state.space = v; if (!fxActive.space) engine.setSpace(v); save(); },
  onFx(id, active) { setFx(id, active); },
  onPlayToggle() {
    if (sequencer.playing) sequencer.stop();
    else sequencer.start();
    ui.setPlaying(sequencer.playing);
  },
};

const fxActive = { sweep: false, repeat: false, space: false, slow: false };

function setFx(id, active) {
  fxActive[id] = active;
  if (id === 'sweep') {
    if (active) engine.setFilter(0.12, 9);
    else engine.setFilter(state.filter, 1);
  } else if (id === 'repeat') {
    sequencer.setStutter(active ? 2 : 0);
  } else if (id === 'space') {
    engine.setSpace(active ? 1 : state.space);
    engine.setDelayFeedback(active ? 0.72 : 0.35);
  } else if (id === 'slow') {
    sequencer.halfTime = active;
  }
}

// --- Démarrage -------------------------------------------------------------

async function boot() {
  await engine.start();
  applySound();
  applyMix();
  sequencer = new Sequencer(engine, state, (step) => ui.setPlayhead(step));
  ui = new UI(root, state, handlers);
  document.getElementById('start-screen').classList.add('hidden');
  sequencer.start();
  ui.setPlaying(true);
  keepScreenAwake();
}

async function keepScreenAwake() {
  try {
    if ('wakeLock' in navigator) await navigator.wakeLock.request('screen');
  } catch { /* pas grave si refusé */ }
}

document.getElementById('start-btn').addEventListener('click', boot, { once: true });

// Confort tablette : pas de zoom accidentel, pas de menu contextuel.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.hidden && engine.ctx) engine.ctx.suspend();
  else if (engine.ctx) engine.ctx.resume();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* hors ligne indisponible */ });
  });
}
