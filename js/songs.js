// Sauvegarde : reprise automatique du morceau en cours + 6 emplacements « mes morceaux ».
import { TRACKS, STEPS, PHRASES } from './patterns.js';

export const SLOTS = 6;
const SONGS_KEY = 'kid-groovebox-songs-v1';

// Réglages simples enregistrés tels quels (le reste est validé à part).
const FIELDS = ['styleId', 'tempo', 'keyIndex', 'mode', 'fullScale', 'transpose', 'swing',
                'filter', 'delay', 'space', 'view', 'liveTrack', 'octave', 'chain'];

/** Photo du morceau, prête à passer par JSON. */
export function serialize(state) {
  const data = { version: 2 };
  for (const key of FIELDS) data[key] = state[key];
  data.enabled = { ...state.enabled };
  data.volumes = { ...state.volumes };
  data.phrases = state.phrases.map((phrase) => {
    const copy = {};
    for (const t of TRACKS) copy[t.id] = [...phrase[t.id]];
    return copy;
  });
  data.phraseIndex = state.phraseIndex;
  return data;
}

/**
 * Recharge un morceau dans l'état existant. Tout est vérifié champ par champ :
 * une sauvegarde abîmée ne doit jamais empêcher l'appli de démarrer.
 */
export function applySong(state, data) {
  if (!data || typeof data !== 'object') return false;
  for (const key of FIELDS) {
    if (typeof data[key] === typeof state[key]) state[key] = data[key];
  }
  for (const t of TRACKS) {
    if (typeof data.enabled?.[t.id] === 'boolean') state.enabled[t.id] = data.enabled[t.id];
    const volume = data.volumes?.[t.id];
    if (typeof volume === 'number' && volume >= 0 && volume <= 2) state.volumes[t.id] = volume;
  }
  if (Array.isArray(data.phrases)) {
    data.phrases.slice(0, PHRASES).forEach((phrase, i) => {
      for (const t of TRACKS) {
        const steps = phrase?.[t.id];
        if (Array.isArray(steps) && steps.length === STEPS) state.phrases[i][t.id] = [...steps];
      }
    });
  }
  if (Number.isInteger(data.phraseIndex)) {
    state.phraseIndex = Math.min(Math.max(data.phraseIndex, 0), PHRASES - 1);
  }
  state.queuedPhrase = null;
  return true;
}

/** Les 6 emplacements, dans l'ordre ; une case vide vaut null. */
export function readSlots() {
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(SONGS_KEY) || 'null'); } catch { stored = null; }
  const list = Array.isArray(stored) ? stored : [];
  return Array.from({ length: SLOTS }, (_, i) => {
    const slot = list[i];
    return slot && slot.data ? slot : null;
  });
}

export function writeSlot(index, state) {
  const slots = readSlots();
  slots[index] = { savedAt: Date.now(), data: serialize(state) };
  try {
    localStorage.setItem(SONGS_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;   // stockage plein
  }
}

export function clearSlot(index) {
  const slots = readSlots();
  slots[index] = null;
  try { localStorage.setItem(SONGS_KEY, JSON.stringify(slots)); } catch { /* stockage plein */ }
}
