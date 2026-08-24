// Interface : barres du haut, grille de motif, mode live (clavier + effets), potards.
import {
  TRACKS, STYLES, KEYS, STEPS, MAX_DEGREE, PHRASES, PHRASE_NAMES, PUNCH_FX,
  LIVE_TRACKS, isEmptyPhrase, getStyle,
} from './patterns.js';
import { icon } from './icons.js';
import { NotePicker, VolumePicker } from './picker.js';
import { SLOTS } from './songs.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** La capture du pointeur peut échouer (doigt déjà relâché) : ça ne doit rien casser. */
function capture(el, pointerId) {
  try { el.setPointerCapture(pointerId); } catch { /* pointeur déjà parti */ }
}
function release(el, pointerId) {
  try {
    if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
  } catch { /* pointeur déjà parti */ }
}
const LIVE_KEYS = 10;        // deux octaves de gamme pentatonique
const LONG_PRESS_MS = 550;

/** Potard rond, réglable au doigt (glisser vers le haut = augmenter). */
export function createKnob({ iconName, label, min, max, value, step = 1, format, onChange }) {
  const el = document.createElement('div');
  el.className = 'knob';
  el.innerHTML = `
    <div class="knob-dial">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="knob-bg" cx="50" cy="50" r="38"></circle>
        <path class="knob-arc" d=""></path>
        <line class="knob-pointer" x1="50" y1="50" x2="50" y2="16"></line>
      </svg>
      <span class="knob-icon">${icon(iconName)}</span>
      <div class="knob-bubble"><span class="bubble-label">${label}</span><span class="bubble-value"></span></div>
    </div>
    <div class="knob-label">${label}</div>
    <div class="knob-value"></div>`;

  const arc = el.querySelector('.knob-arc');
  const pointer = el.querySelector('.knob-pointer');
  const valueEl = el.querySelector('.knob-value');
  const bubbleEl = el.querySelector('.bubble-value');
  let current = value;
  const START = -135, END = 135;

  function render() {
    const t = (current - min) / (max - min);
    const angle = START + t * (END - START);
    const rad = ((angle - 90) * Math.PI) / 180;
    pointer.setAttribute('x1', String(50 + Math.cos(rad) * 21));
    pointer.setAttribute('y1', String(50 + Math.sin(rad) * 21));
    pointer.setAttribute('x2', String(50 + Math.cos(rad) * 33));
    pointer.setAttribute('y2', String(50 + Math.sin(rad) * 33));
    const a0 = ((START - 90) * Math.PI) / 180;
    const large = angle - START > 180 ? 1 : 0;
    arc.setAttribute('d', [
      'M', 50 + Math.cos(a0) * 38, 50 + Math.sin(a0) * 38,
      'A', 38, 38, 0, large, 1, 50 + Math.cos(rad) * 38, 50 + Math.sin(rad) * 38,
    ].join(' '));
    valueEl.textContent = format ? format(current) : String(Math.round(current));
    bubbleEl.textContent = valueEl.textContent;   // même valeur, en très gros
  }

  function set(v, notify = true) {
    const snapped = Math.round(clamp(v, min, max) / step) * step;
    if (Math.abs(snapped - current) < step / 2) return;
    current = snapped;
    render();
    if (notify) onChange(current);
  }

  let startY = 0, startValue = 0, activePointer = null;
  el.addEventListener('pointerdown', (e) => {
    capture(el, e.pointerId);
    el.classList.add('active');
    activePointer = e.pointerId;
    startY = e.clientY;
    startValue = current;
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointer) return;
    set(startValue + ((startY - e.clientY) / 150) * (max - min));
  });
  const end = (e) => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    release(el, e.pointerId);
    el.classList.remove('active');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('dblclick', () => set(value));

  render();
  return { el, set: (v) => set(v, false), get value() { return current; } };
}

/** Petit aperçu d'une phrase : une pastille par note, aux couleurs des pistes. */
function previewSvg(phrase) {
  if (!phrase) return '';
  const marks = [];
  TRACKS.forEach((track, row) => {
    const steps = phrase[track.id] || [];
    steps.forEach((value, i) => {
      const on = track.type === 'drum' ? value === 1 : value !== null && value !== undefined;
      if (on) marks.push(`<rect x="${i + 0.1}" y="${row + 0.15}" width="0.8" height="0.7" rx="0.3" fill="${track.color}"/>`);
    });
  });
  return `<svg viewBox="0 0 16 6" preserveAspectRatio="none">${marks.join('')}</svg>`;
}

export class UI {
  constructor(root, state, handlers) {
    this.root = root;
    this.state = state;
    this.handlers = handlers;
    this.pads = {};
    this.knobs = {};
    this.currentStep = -1;
    this.lastPlayheadStep = -1;
    this.build();
  }

  build() {
    this.picker = new NotePicker(this.root);
    this.volumeGauge = new VolumePicker(this.root);
    this.buildStyles();
    this.buildKeys();
    this.buildViews();
    this.buildPhrases();
    this.buildGrid();
    this.buildFxBank();
    this.buildKeyboard();
    this.buildKnobs();
    this.buildTransport();
    this.buildSongs();
    this.refreshAll();
  }

  // --- Barres du haut --------------------------------------------------------

  buildStyles() {
    const bar = this.root.querySelector('#styles');
    STYLES.forEach((style) => {
      const b = document.createElement('button');
      b.className = 'chip style-chip';
      b.dataset.style = style.id;
      b.innerHTML = `${icon(style.icon)}<span class="chip-label">${style.label}</span>`;
      b.addEventListener('click', () => this.handlers.onStyle(style.id));
      bar.appendChild(b);
    });
  }

  buildKeys() {
    const bar = this.root.querySelector('#keys');
    KEYS.forEach((key, i) => {
      const b = document.createElement('button');
      b.className = 'chip key-chip';
      b.dataset.key = String(i);
      b.textContent = key.name;
      b.addEventListener('click', () => this.handlers.onKey(i));
      bar.appendChild(b);
    });
    this.modeBtn = document.createElement('button');
    this.modeBtn.className = 'chip mode-chip';
    this.modeBtn.addEventListener('click', () => this.handlers.onToggleMode());
    bar.appendChild(this.modeBtn);
  }

  buildViews() {
    const wrap = this.root.querySelector('#views');
    const VIEWS = [
      { id: 'motif', icon: 'grid', label: 'Motif' },
      { id: 'live', icon: 'keys', label: 'Live' },
    ];
    VIEWS.forEach((view) => {
      const b = document.createElement('button');
      b.className = 'view-tab';
      b.dataset.view = view.id;
      b.innerHTML = `${icon(view.icon)}<span>${view.label}</span>`;
      b.addEventListener('click', () => this.handlers.onView(view.id));
      wrap.appendChild(b);
    });
  }

  /** Phrases A à D : appui = enchaîner, appui long = copier la phrase en cours. */
  buildPhrases() {
    const wrap = this.root.querySelector('#phrases');
    for (let i = 0; i < PHRASES; i++) {
      const b = document.createElement('button');
      b.className = 'phrase-btn';
      b.dataset.phrase = String(i);
      b.innerHTML = `<span class="phrase-name">${PHRASE_NAMES[i]}</span><span class="phrase-dot"></span>`;
      let timer = null, longPressed = false;
      b.addEventListener('pointerdown', (e) => {
        capture(b, e.pointerId);
        longPressed = false;
        timer = setTimeout(() => {
          longPressed = true;
          b.classList.add('copied');
          setTimeout(() => b.classList.remove('copied'), 450);
          this.handlers.onPhraseCopy(i);
        }, LONG_PRESS_MS);
      });
      const end = (e) => {
        release(b, e.pointerId);
        clearTimeout(timer);
        if (!longPressed) this.handlers.onPhraseSelect(i);
      };
      b.addEventListener('pointerup', end);
      b.addEventListener('pointercancel', () => clearTimeout(timer));
      wrap.appendChild(b);
    }

    this.chainBtn = document.createElement('button');
    this.chainBtn.className = 'tool-btn';
    this.chainBtn.innerHTML = `${icon('link')}<span>Chaîne</span>`;
    this.chainBtn.addEventListener('click', () => this.handlers.onChainToggle());
    this.root.querySelector('#phrase-tools').appendChild(this.chainBtn);
  }

  // --- Vue « motif » ---------------------------------------------------------

  buildGrid() {
    const grid = this.root.querySelector('#grid');
    // Colonne lumineuse qui suit la musique, par-dessus toute la grille.
    this.playhead = document.createElement('div');
    this.playhead.id = 'playhead';
    grid.appendChild(this.playhead);
    TRACKS.forEach((track) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.setProperty('--c', track.color);
      row.dataset.track = track.id;

      const toggle = document.createElement('button');
      toggle.className = 'track-btn';
      toggle.dataset.track = track.id;
      toggle.setAttribute('aria-label', track.label);
      toggle.innerHTML = `${icon(track.icon)}<span class="track-vol"></span>`;
      this.attachTrackEvents(toggle, track);
      row.appendChild(toggle);

      const padsWrap = document.createElement('div');
      padsWrap.className = 'pads';
      this.pads[track.id] = [];
      for (let step = 0; step < STEPS; step++) {
        const pad = document.createElement('button');
        pad.className = 'pad';
        if (step % 4 === 0) pad.classList.add('beat');
        pad.innerHTML = '<span class="fill"></span>';
        this.attachPadEvents(pad, track, step);
        padsWrap.appendChild(pad);
        this.pads[track.id].push(pad);
      }
      row.appendChild(padsWrap);

      const dice = document.createElement('button');
      dice.className = 'row-btn';
      dice.setAttribute('aria-label', `Motif au hasard : ${track.label}`);
      dice.innerHTML = icon('dice');
      dice.addEventListener('click', () => this.handlers.onRandomTrack(track.id));
      row.appendChild(dice);

      grid.appendChild(row);
    });
  }

  /**
   * Appui court : couper ou rallumer la piste.
   * Appui long : ouvrir la jauge de volume de cette piste.
   */
  attachTrackEvents(btn, track) {
    let timer = null, reglage = false, activePointer = null;

    btn.addEventListener('pointerdown', (e) => {
      capture(btn, e.pointerId);
      activePointer = e.pointerId;
      reglage = false;
      timer = setTimeout(() => {
        reglage = true;
        this.volumeGauge.show({
          rect: btn.getBoundingClientRect(),
          color: track.color,
          volume: this.state.volumes[track.id] ?? 1,
          // Le nom de l'instrument s'affiche ici, là où il ne gêne rien.
          titre: track.label,
        });
      }, LONG_PRESS_MS);
    });

    btn.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activePointer || !reglage) return;
      const volume = this.volumeGauge.volumeAt(e.clientY);
      if (volume !== this.state.volumes[track.id]) {
        this.handlers.onTrackVolume(track.id, volume);
        this.volumeGauge.highlight(this.volumeGauge.indexOf(volume));
      }
    });

    const end = (e) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      clearTimeout(timer);
      release(btn, e.pointerId);
      if (reglage) this.volumeGauge.hide();
      else this.handlers.onToggleTrack(track.id);
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', (e) => {
      clearTimeout(timer);
      if (reglage) this.volumeGauge.hide();
      activePointer = null;
      release(btn, e.pointerId);
    });
  }

  attachPadEvents(pad, track, step) {
    let wasOn = false, moved = false, startY = 0, startDegree = 0, activePointer = null;
    const pitched = track.type === 'pitch';

    pad.addEventListener('pointerdown', (e) => {
      capture(pad, e.pointerId);
      e.preventDefault();
      activePointer = e.pointerId;
      const value = this.state.patterns[track.id][step];
      wasOn = pitched ? value !== null : value === 1;
      moved = false;
      startY = e.clientY;
      startDegree = pitched && wasOn ? value : this.state.lastDegree[track.id] ?? 0;
      if (!wasOn) {
        this.handlers.onSetPad(track.id, step, pitched ? startDegree : 1);
        this.handlers.onPreview(track.id, pitched ? startDegree : 0);
      }
      if (pitched) {
        // La réglette s'ouvre tout de suite : l'enfant voit où sont les notes.
        this.picker.show({
          rect: pad.getBoundingClientRect(),
          color: track.color,
          degree: startDegree,
          names: this.handlers.noteNames(track.id),
        });
      }
    });

    pad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activePointer || !pitched) return;
      // Tant que le doigt n'a pas bougé, un simple appui reste un appui.
      if (!moved && Math.abs(startY - e.clientY) < 12) return;
      moved = true;
      const degree = this.picker.degreeAt(e.clientY);
      this.picker.highlight(degree);
      if (degree !== this.state.patterns[track.id][step]) {
        this.handlers.onSetPad(track.id, step, degree);
        this.handlers.onPreview(track.id, degree);
      }
    });

    const end = (e) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      release(pad, e.pointerId);
      if (pitched) this.picker.hide();
      if (wasOn && !moved) this.handlers.onSetPad(track.id, step, null);
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }

  // --- Vue « live » ----------------------------------------------------------

  buildFxBank() {
    const wrap = this.root.querySelector('#fx');
    PUNCH_FX.forEach((fx) => {
      const b = document.createElement('button');
      b.className = 'fx-btn';
      b.dataset.fx = fx.id;
      b.innerHTML = `${icon(fx.icon)}<span class="fx-label">${fx.label}</span>`;
      const on = (e) => {
        e.preventDefault();
        capture(b, e.pointerId);
        b.classList.add('active');
        this.handlers.onFx(fx.id, true);
      };
      const off = (e) => {
        release(b, e.pointerId);
        if (!b.classList.contains('active')) return;
        b.classList.remove('active');
        this.handlers.onFx(fx.id, false);
      };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      wrap.appendChild(b);
    });
  }

  buildKeyboard() {
    const instruments = this.root.querySelector('#live-instruments');
    LIVE_TRACKS.forEach((id) => {
      const track = TRACKS.find((t) => t.id === id);
      const b = document.createElement('button');
      b.className = 'instr-btn';
      b.dataset.instrument = id;
      b.style.setProperty('--c', track.color);
      b.innerHTML = `${icon(track.icon)}<span>${track.label}</span>`;
      b.addEventListener('click', () => this.handlers.onLiveTrack(id));
      instruments.appendChild(b);
    });

    const octave = this.root.querySelector('#octave');
    [['minus', -1], ['plus', 1]].forEach(([name, delta]) => {
      const b = document.createElement('button');
      b.className = 'oct-btn';
      b.innerHTML = icon(name);
      b.setAttribute('aria-label', delta > 0 ? 'Plus aigu' : 'Plus grave');
      b.addEventListener('click', () => this.handlers.onOctave(delta));
      octave.appendChild(b);
    });
    this.octaveLabel = this.root.querySelector('#octave-value');

    const kb = this.root.querySelector('#keyboard');
    this.keys = [];
    for (let degree = 0; degree < LIVE_KEYS; degree++) {
      const key = document.createElement('button');
      key.className = 'key';
      if (degree % 5 === 0) key.classList.add('root');
      key.innerHTML = '<span class="key-dot"></span>';
      const down = (e) => {
        e.preventDefault();
        capture(key, e.pointerId);
        key.classList.add('down');
        this.handlers.onKeyDown(degree, e.pointerId);
      };
      const up = (e) => {
        release(key, e.pointerId);
        key.classList.remove('down');
        this.handlers.onKeyUp(e.pointerId);
      };
      key.addEventListener('pointerdown', down);
      key.addEventListener('pointerup', up);
      key.addEventListener('pointercancel', up);
      kb.appendChild(key);
      this.keys.push(key);
    }
  }

  // --- Pied de page -----------------------------------------------------------

  buildKnobs() {
    const wrap = this.root.querySelector('#knobs');
    const add = (key, cfg) => {
      const knob = createKnob(cfg);
      this.knobs[key] = knob;
      wrap.appendChild(knob.el);
    };
    add('tempo', {
      iconName: 'speed', label: 'Vitesse', min: 60, max: 180, step: 1, value: this.state.tempo,
      format: (v) => `${Math.round(v)}`, onChange: (v) => this.handlers.onTempo(v),
    });
    add('transpose', {
      iconName: 'pitch', label: 'Hauteur', min: -12, max: 12, step: 1, value: this.state.transpose,
      format: (v) => (v > 0 ? `+${v}` : `${v}`), onChange: (v) => this.handlers.onTranspose(v),
    });
    add('filter', {
      iconName: 'filter', label: 'Filtre', min: 0, max: 1, step: 0.01, value: this.state.filter,
      format: (v) => `${Math.round(v * 100)}`, onChange: (v) => this.handlers.onFilter(v),
    });
    add('delay', {
      iconName: 'echo', label: 'Écho', min: 0, max: 1, step: 0.01, value: this.state.delay,
      format: (v) => `${Math.round(v * 100)}`, onChange: (v) => this.handlers.onDelay(v),
    });
    add('space', {
      iconName: 'space', label: 'Espace', min: 0, max: 1, step: 0.01, value: this.state.space,
      format: (v) => `${Math.round(v * 100)}`, onChange: (v) => this.handlers.onSpace(v),
    });
  }

  buildTransport() {
    this.playBtn = this.root.querySelector('#play');
    this.playBtn.addEventListener('click', () => this.handlers.onPlayToggle());
    // Un mot sous chaque icône : à 6 ans, une icône seule ne suffit pas.
    const clear = this.root.querySelector('#clear');
    clear.innerHTML = `${icon('trash')}<span>Effacer</span>`;
    clear.addEventListener('click', () => this.handlers.onClear());
    const surprise = this.root.querySelector('#surprise');
    surprise.innerHTML = `${icon('magic')}<span>Surprise</span>`;
    surprise.addEventListener('click', () => this.handlers.onSurprise());
    const songs = this.root.querySelector('#songs');
    songs.innerHTML = `${icon('songs')}<span>Morceaux</span>`;
    songs.addEventListener('click', () => this.openSongs());
  }

  // --- Mes morceaux : six emplacements de sauvegarde ---------------------------

  buildSongs() {
    const panel = document.createElement('div');
    panel.id = 'songs-panel';
    panel.className = 'modal hidden';
    panel.innerHTML = `
      <div class="modal-box">
        <div class="modal-head">
          <h2>Mes morceaux</h2>
          <button class="close-btn" aria-label="Fermer">${icon('close')}</button>
        </div>
        <div class="song-grid"></div>
        <p class="modal-hint">« Garder » enregistre le morceau du moment. « Jouer » le ressort.</p>
      </div>`;
    panel.querySelector('.close-btn').addEventListener('click', () => this.closeSongs());
    panel.addEventListener('pointerdown', (e) => {
      if (e.target === panel) this.closeSongs();   // toucher à côté referme
    });

    const grid = panel.querySelector('.song-grid');
    for (let i = 0; i < SLOTS; i++) {
      const card = document.createElement('div');
      card.className = 'song-card';
      card.dataset.slot = String(i);
      card.innerHTML = `
        <div class="song-top"><span class="song-num">${i + 1}</span><span class="song-tag"></span></div>
        <div class="song-preview"></div>
        <div class="song-actions">
          <button class="song-save">${icon('save')}<span>Garder</span></button>
          <button class="song-load">${icon('open')}<span>Jouer</span></button>
        </div>`;

      const saveBtn = card.querySelector('.song-save');
      const loadBtn = card.querySelector('.song-load');
      let confirmTimer = null;
      const resetSave = () => {
        clearTimeout(confirmTimer);
        saveBtn.classList.remove('confirm', 'done');
        saveBtn.querySelector('span').textContent = 'Garder';
      };
      saveBtn.addEventListener('click', () => {
        // Écraser un morceau existant demande deux appuis : on ne perd rien par erreur.
        if (card.classList.contains('filled') && !saveBtn.classList.contains('confirm')) {
          saveBtn.classList.add('confirm');
          saveBtn.querySelector('span').textContent = 'Sûr ?';
          confirmTimer = setTimeout(resetSave, 2500);
          return;
        }
        resetSave();
        this.handlers.onSongSave(i);
        saveBtn.classList.add('done');
        saveBtn.querySelector('span').textContent = 'Gardé !';
        confirmTimer = setTimeout(resetSave, 1400);
        this.refreshSongs();
      });
      loadBtn.addEventListener('click', () => {
        if (!card.classList.contains('filled')) return;
        this.handlers.onSongLoad(i);
        this.closeSongs();
      });

      card.saveBtn = saveBtn;
      card.resetSave = resetSave;
      grid.appendChild(card);
    }

    this.root.appendChild(panel);
    this.songsPanel = panel;
  }

  openSongs() {
    this.refreshSongs();
    this.songsPanel.classList.remove('hidden');
  }

  closeSongs() {
    this.songsPanel.querySelectorAll('.song-card').forEach((c) => c.resetSave());
    this.songsPanel.classList.add('hidden');
  }

  refreshSongs() {
    const slots = this.handlers.getSlots();
    this.songsPanel.querySelectorAll('.song-card').forEach((card) => {
      const slot = slots[Number(card.dataset.slot)];
      card.classList.toggle('filled', !!slot);
      const tag = card.querySelector('.song-tag');
      const preview = card.querySelector('.song-preview');
      if (!slot) {
        tag.textContent = 'vide';
        preview.innerHTML = '';
        return;
      }
      const style = getStyle(slot.data.styleId);
      tag.innerHTML = `${icon(style.icon)}<span>${style.label} · ${Math.round(slot.data.tempo)}</span>`;
      preview.innerHTML = previewSvg(slot.data.phrases?.[slot.data.phraseIndex] || slot.data.phrases?.[0]);
    });
  }



  // --- Rafraîchissement --------------------------------------------------------

  refreshAll() {
    this.refreshPads();
    this.refreshTracks();
    this.refreshChips();
    this.refreshPhrases();
    this.refreshKnobs();
    this.refreshView();
    this.refreshLive();
  }

  refreshPads() {
    TRACKS.forEach((track) => {
      const values = this.state.patterns[track.id];
      this.pads[track.id].forEach((pad, i) => {
        const v = values[i];
        const on = track.type === 'drum' ? v === 1 : v !== null;
        pad.classList.toggle('on', on);
        const height = track.type === 'drum' ? 100 : 25 + ((v ?? 0) / MAX_DEGREE) * 75;
        pad.querySelector('.fill').style.height = on ? `${height}%` : '0%';
      });
    });
  }

  refreshTracks() {
    TRACKS.forEach((track) => {
      const btn = this.root.querySelector(`.track-btn[data-track="${track.id}"]`);
      const volume = this.state.volumes[track.id] ?? 1;
      // Volume à zéro : la piste est muette, elle doit le montrer comme si elle
      // était coupée, sinon on cherche pourquoi on n'entend rien.
      const on = this.state.enabled[track.id] && volume > 0;
      btn.classList.toggle('off', !on);
      btn.closest('.row').classList.toggle('muted', !on);
      // Petit trait sous l'animal quand son volume n'est pas au réglage normal.
      const bar = btn.querySelector('.track-vol');
      bar.style.width = `${Math.min(volume / 1.3, 1) * 100}%`;
      btn.classList.toggle('tuned', volume !== 1);
    });
  }

  refreshChips() {
    this.root.querySelectorAll('.style-chip').forEach((c) => {
      c.classList.toggle('selected', c.dataset.style === this.state.styleId);
    });
    this.root.querySelectorAll('.key-chip').forEach((c) => {
      c.classList.toggle('selected', Number(c.dataset.key) === this.state.keyIndex);
    });
    const major = this.state.mode === 'major';
    this.modeBtn.innerHTML = `${icon(major ? 'sun' : 'moon')}<span class="chip-label">${major ? 'joyeux' : 'mystère'}</span>`;
    this.modeBtn.classList.toggle('minor', !major);
  }

  refreshPhrases() {
    this.root.querySelectorAll('.phrase-btn').forEach((b) => {
      const i = Number(b.dataset.phrase);
      b.classList.toggle('selected', i === this.state.phraseIndex);
      b.classList.toggle('queued', i === this.state.queuedPhrase);
      b.classList.toggle('filled', !isEmptyPhrase(this.state.phrases[i]));
    });
    this.chainBtn.classList.toggle('on', this.state.chain);
  }

  refreshKnobs() {
    this.knobs.tempo.set(this.state.tempo);
    this.knobs.transpose.set(this.state.transpose);
    this.knobs.filter.set(this.state.filter);
    this.knobs.delay.set(this.state.delay);
    this.knobs.space.set(this.state.space);
  }

  refreshView() {
    this.root.querySelectorAll('.view-tab').forEach((t) => {
      t.classList.toggle('selected', t.dataset.view === this.state.view);
    });
    this.root.querySelector('#view-motif').classList.toggle('hidden', this.state.view !== 'motif');
    this.root.querySelector('#view-live').classList.toggle('hidden', this.state.view !== 'live');
  }

  refreshLive() {
    const track = TRACKS.find((t) => t.id === this.state.liveTrack);
    this.root.querySelectorAll('.instr-btn').forEach((b) => {
      b.classList.toggle('selected', b.dataset.instrument === this.state.liveTrack);
    });
    this.root.querySelector('#keyboard').style.setProperty('--c', track.color);
    const oct = this.state.octave;
    this.octaveLabel.textContent = oct === 0 ? 'normal' : oct > 0 ? `+${oct}` : `${oct}`;
  }

  setPlaying(playing) {
    this.playBtn.innerHTML = icon(playing ? 'stop' : 'play');
    this.playBtn.classList.toggle('playing', playing);
  }

  setPlayhead(step, hits = []) {
    hits.forEach((id) => this.bounce(id));
    if (this.currentStep === step) return;
    if (this.currentStep >= 0) {
      TRACKS.forEach((t) => this.pads[t.id][this.currentStep]?.classList.remove('cursor'));
    }
    this.currentStep = step;
    if (step < 0) {
      this.playhead.classList.remove('on');
      this.lastPlayheadStep = -1;
      return;
    }
    TRACKS.forEach((t) => this.pads[t.id][step]?.classList.add('cursor'));
    this.movePlayhead(step);
  }

  /** Place la colonne lumineuse sur le pas courant. */
  movePlayhead(step) {
    const pad = this.pads[TRACKS[0].id][step];
    const grid = this.playhead.parentElement;
    if (!pad || !grid) return;
    const padBox = pad.getBoundingClientRect();
    const gridBox = grid.getBoundingClientRect();
    if (!padBox.width) return;   // grille masquée (mode live)

    // Retour au début de la mesure (ou saut arrière de l'effet « répète ») : le
    // curseur doit sauter, pas glisser. Sinon on le voit repartir en arrière en
    // travers de la grille, ce qui ne correspond à rien de ce qu'on entend.
    const saut = step <= this.lastPlayheadStep;
    if (saut) {
      this.playhead.classList.add('jump');
      void this.playhead.offsetWidth;
    }
    this.lastPlayheadStep = step;

    this.playhead.style.left = `${padBox.left - gridBox.left - 3}px`;
    this.playhead.style.width = `${padBox.width + 6}px`;
    if (saut) {
      void this.playhead.offsetWidth;              // la position saute maintenant
      requestAnimationFrame(() => this.playhead.classList.remove('jump'));
    }
    this.playhead.classList.add('on');
    // Les temps forts s'accentuent : on sent la mesure d'un coup d'œil.
    this.playhead.classList.toggle('beat', step % 4 === 0);
  }

  /** Fait sauter l'animal d'une piste quand sa note tombe. */
  bounce(trackId) {
    const btn = this.root.querySelector(`.track-btn[data-track="${trackId}"]`);
    if (!btn) return;
    btn.classList.remove('hit');
    void btn.offsetWidth;   // relance l'animation même sur deux notes rapprochées
    btn.classList.add('hit');
  }
}
