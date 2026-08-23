// Interface : barres du haut, grille de motif, mode live (clavier + effets), potards.
import {
  TRACKS, STYLES, KEYS, STEPS, MAX_DEGREE, PHRASES, PHRASE_NAMES, PUNCH_FX,
  LIVE_TRACKS, isEmptyPhrase,
} from './patterns.js';
import { icon } from './icons.js';

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
    </div>
    <div class="knob-label">${label}</div>
    <div class="knob-value"></div>`;

  const arc = el.querySelector('.knob-arc');
  const pointer = el.querySelector('.knob-pointer');
  const valueEl = el.querySelector('.knob-value');
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

export class UI {
  constructor(root, state, handlers) {
    this.root = root;
    this.state = state;
    this.handlers = handlers;
    this.pads = {};
    this.knobs = {};
    this.currentStep = -1;
    this.build();
  }

  build() {
    this.buildStyles();
    this.buildKeys();
    this.buildViews();
    this.buildPhrases();
    this.buildGrid();
    this.buildFxBank();
    this.buildKeyboard();
    this.buildKnobs();
    this.buildTransport();
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
    TRACKS.forEach((track) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.setProperty('--c', track.color);
      row.dataset.track = track.id;

      const toggle = document.createElement('button');
      toggle.className = 'track-btn';
      toggle.dataset.track = track.id;
      toggle.setAttribute('aria-label', track.label);
      toggle.innerHTML = icon(track.icon);
      toggle.addEventListener('click', () => this.handlers.onToggleTrack(track.id));
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

  attachPadEvents(pad, track, step) {
    let wasOn = false, moved = false, startY = 0, startDegree = 0, activePointer = null;

    pad.addEventListener('pointerdown', (e) => {
      capture(pad, e.pointerId);
      e.preventDefault();
      activePointer = e.pointerId;
      const value = this.state.patterns[track.id][step];
      wasOn = track.type === 'drum' ? value === 1 : value !== null;
      moved = false;
      startY = e.clientY;
      startDegree = track.type === 'pitch' && wasOn ? value : this.state.lastDegree[track.id] ?? 0;
      if (!wasOn) {
        this.handlers.onSetPad(track.id, step, track.type === 'drum' ? 1 : startDegree);
        this.handlers.onPreview(track.id, track.type === 'drum' ? 0 : startDegree);
      }
    });

    pad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activePointer || track.type !== 'pitch') return;
      const dy = startY - e.clientY;
      if (Math.abs(dy) < 10) return;
      moved = true;
      const degree = clamp(startDegree + Math.round(dy / 18), 0, MAX_DEGREE);
      if (degree !== this.state.patterns[track.id][step]) {
        this.handlers.onSetPad(track.id, step, degree);
        this.handlers.onPreview(track.id, degree);
      }
    });

    const end = (e) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      release(pad, e.pointerId);
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
    const clear = this.root.querySelector('#clear');
    clear.innerHTML = icon('trash');
    clear.addEventListener('click', () => this.handlers.onClear());
    const surprise = this.root.querySelector('#surprise');
    surprise.innerHTML = icon('magic');
    surprise.addEventListener('click', () => this.handlers.onSurprise());
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
      const on = this.state.enabled[track.id];
      btn.classList.toggle('off', !on);
      btn.closest('.row').classList.toggle('muted', !on);
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

  setPlayhead(step) {
    if (this.currentStep === step) return;
    if (this.currentStep >= 0) {
      TRACKS.forEach((t) => this.pads[t.id][this.currentStep]?.classList.remove('cursor'));
    }
    this.currentStep = step;
    if (step >= 0) {
      TRACKS.forEach((t) => this.pads[t.id][step]?.classList.add('cursor'));
    }
  }
}
