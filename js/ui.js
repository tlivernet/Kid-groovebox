// Interface : grille de pads, potards tactiles, sélecteurs de style et de tonalité.
import { TRACKS, STYLES, KEYS, STEPS, MAX_DEGREE } from './patterns.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Potard rond, réglable au doigt (glisser vers le haut = augmenter). */
export function createKnob({ emoji, label, min, max, value, step = 1, format, onChange }) {
  const el = document.createElement('div');
  el.className = 'knob';
  el.innerHTML = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="knob-bg" cx="50" cy="50" r="38"></circle>
      <path class="knob-arc" d=""></path>
      <line class="knob-pointer" x1="50" y1="50" x2="50" y2="16"></line>
    </svg>
    <div class="knob-emoji">${emoji}</div>
    <div class="knob-label">${label}</div>
    <div class="knob-value"></div>`;

  const arc = el.querySelector('.knob-arc');
  const pointer = el.querySelector('.knob-pointer');
  const valueEl = el.querySelector('.knob-value');
  let current = value;

  const START = -135, END = 135; // degrés de rotation utiles

  function render() {
    const t = (current - min) / (max - min);
    const angle = START + t * (END - START);
    const rad = ((angle - 90) * Math.PI) / 180;
    pointer.setAttribute('x2', String(50 + Math.cos(rad) * 34));
    pointer.setAttribute('y2', String(50 + Math.sin(rad) * 34));
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
    if (snapped === current) return;
    current = snapped;
    render();
    if (notify) onChange(current);
  }

  let dragStartY = 0, dragStartValue = 0;
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    el.classList.add('active');
    dragStartY = e.clientY;
    dragStartValue = current;
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    const dy = dragStartY - e.clientY;
    set(dragStartValue + (dy / 140) * (max - min));
  });
  const release = (e) => {
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    el.classList.remove('active');
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('dblclick', () => set(value));

  render();
  return { el, set: (v) => set(v, false), get value() { return current; } };
}

export class UI {
  constructor(root, state, handlers) {
    this.root = root;
    this.state = state;
    this.handlers = handlers;
    this.pads = {};   // trackId -> [éléments]
    this.knobs = {};
    this.currentStep = -1;
    this.build();
  }

  build() {
    this.buildStyles();
    this.buildKeys();
    this.buildGrid();
    this.buildKnobs();
    this.buildFx();
    this.buildTransport();
    this.refreshAll();
  }

  buildStyles() {
    const bar = this.root.querySelector('#styles');
    STYLES.forEach((style) => {
      const b = document.createElement('button');
      b.className = 'chip style-chip';
      b.dataset.style = style.id;
      b.innerHTML = `<span class="chip-emoji">${style.emoji}</span><span class="chip-label">${style.label}</span>`;
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
    const mode = document.createElement('button');
    mode.className = 'chip mode-chip';
    mode.id = 'mode-btn';
    mode.addEventListener('click', () => this.handlers.onToggleMode());
    bar.appendChild(mode);
    this.modeBtn = mode;
  }

  buildGrid() {
    const grid = this.root.querySelector('#grid');
    TRACKS.forEach((track) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.setProperty('--c', track.color);

      const toggle = document.createElement('button');
      toggle.className = 'track-btn';
      toggle.dataset.track = track.id;
      toggle.title = track.label;
      toggle.innerHTML = `<span class="track-emoji">${track.emoji}</span>`;
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
      dice.textContent = '🎲';
      dice.title = 'Motif au hasard';
      dice.addEventListener('click', () => this.handlers.onRandomTrack(track.id));
      row.appendChild(dice);

      grid.appendChild(row);
    });
  }

  attachPadEvents(pad, track, step) {
    let wasOn = false, moved = false, startY = 0, startDegree = 0;

    pad.addEventListener('pointerdown', (e) => {
      pad.setPointerCapture(e.pointerId);
      e.preventDefault();
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
      if (!pad.hasPointerCapture(e.pointerId) || track.type !== 'pitch') return;
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
      if (pad.hasPointerCapture(e.pointerId)) pad.releasePointerCapture(e.pointerId);
      if (wasOn && !moved) this.handlers.onSetPad(track.id, step, null);
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }

  buildKnobs() {
    const wrap = this.root.querySelector('#knobs');
    const add = (key, cfg) => {
      const knob = createKnob(cfg);
      this.knobs[key] = knob;
      wrap.appendChild(knob.el);
    };
    add('tempo', {
      emoji: '🏃', label: 'Vitesse', min: 60, max: 180, step: 1, value: this.state.tempo,
      format: (v) => `${Math.round(v)}`, onChange: (v) => this.handlers.onTempo(v),
    });
    add('transpose', {
      emoji: '🎚️', label: 'Hauteur', min: -12, max: 12, step: 1, value: 0,
      format: (v) => (v > 0 ? `+${v}` : `${v}`), onChange: (v) => this.handlers.onTranspose(v),
    });
    add('filter', {
      emoji: '🌫️', label: 'Filtre', min: 0, max: 1, step: 0.01, value: this.state.filter,
      format: (v) => `${Math.round(v * 100)}`, onChange: (v) => this.handlers.onFilter(v),
    });
    add('delay', {
      emoji: '🔁', label: 'Écho', min: 0, max: 1, step: 0.01, value: this.state.delay,
      format: (v) => `${Math.round(v * 100)}`, onChange: (v) => this.handlers.onDelay(v),
    });
    add('space', {
      emoji: '🌌', label: 'Espace', min: 0, max: 1, step: 0.01, value: this.state.space,
      format: (v) => `${Math.round(v * 100)}`, onChange: (v) => this.handlers.onSpace(v),
    });
  }

  buildFx() {
    const wrap = this.root.querySelector('#fx');
    const FX = [
      { id: 'sweep',  emoji: '🌀', label: 'Balayage' },
      { id: 'repeat', emoji: '⚡', label: 'Répète' },
      { id: 'space',  emoji: '🚀', label: 'Espace' },
      { id: 'slow',   emoji: '🐢', label: 'Ralenti' },
    ];
    FX.forEach((fx) => {
      const b = document.createElement('button');
      b.className = 'fx-btn';
      b.innerHTML = `<span class="fx-emoji">${fx.emoji}</span><span class="fx-label">${fx.label}</span>`;
      const on = (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        b.classList.add('active');
        this.handlers.onFx(fx.id, true);
      };
      const off = (e) => {
        if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
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

  buildTransport() {
    this.playBtn = this.root.querySelector('#play');
    this.playBtn.addEventListener('click', () => this.handlers.onPlayToggle());
    this.root.querySelector('#clear').addEventListener('click', () => this.handlers.onClear());
    this.root.querySelector('#surprise').addEventListener('click', () => this.handlers.onSurprise());
  }

  // --- Rafraîchissement ----------------------------------------------------

  refreshAll() {
    this.refreshPads();
    this.refreshTracks();
    this.refreshChips();
    this.refreshKnobs();
  }

  refreshPads() {
    TRACKS.forEach((track) => {
      const values = this.state.patterns[track.id];
      this.pads[track.id].forEach((pad, i) => {
        const v = values[i];
        const on = track.type === 'drum' ? v === 1 : v !== null;
        pad.classList.toggle('on', on);
        // Sur une piste mélodique, la hauteur de la barre montre la note jouée.
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
    this.modeBtn.textContent = major ? '☀️' : '🌙';
    this.modeBtn.classList.toggle('minor', !major);
  }

  refreshKnobs() {
    this.knobs.tempo.set(this.state.tempo);
    this.knobs.transpose.set(this.state.transpose);
    this.knobs.filter.set(this.state.filter);
    this.knobs.delay.set(this.state.delay);
    this.knobs.space.set(this.state.space);
  }

  setPlaying(playing) {
    this.playBtn.textContent = playing ? '⏹' : '▶️';
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
