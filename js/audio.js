// Moteur audio : tout est synthétisé en direct (aucun fichier son à télécharger).
import { SCALES } from './patterns.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Convertit un degré de gamme pentatonique en note MIDI. */
export function degreeToMidi(degree, root, mode) {
  const scale = SCALES[mode] || SCALES.major;
  const n = scale.length;
  const octave = Math.floor(degree / n);
  const index = ((degree % n) + n) % n;
  return root + scale[index] + 12 * octave;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.tracks = {};
    this.sound = {};
  }

  /** À appeler depuis un geste utilisateur (obligatoire sur tablette). */
  async start() {
    if (!this.ctx) this.build();
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx({ latencyHint: 'interactive' });
    this.ctx = ctx;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;
    this.limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.limiter);

    // Filtre global (le « potar » filtre + l'effet balayage).
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 18000;
    this.filter.Q.value = 1;
    this.filter.connect(this.master);

    // Entrée commune de tous les instruments.
    this.bus = ctx.createGain();
    this.bus.connect(this.filter);

    // Écho synchronisé au tempo.
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = 0;
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.25;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delayTone = ctx.createBiquadFilter();
    this.delayTone.type = 'lowpass';
    this.delayTone.frequency.value = 2600;
    this.bus.connect(this.delaySend);
    this.delaySend.connect(this.delay);
    this.delay.connect(this.delayTone);
    this.delayTone.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delayTone.connect(this.master);

    // Réverbération (« espace ») via une impulsion générée.
    this.spaceSend = ctx.createGain();
    this.spaceSend.gain.value = 0;
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.2, 2.6);
    this.bus.connect(this.spaceSend);
    this.spaceSend.connect(this.reverb);
    this.reverb.connect(this.master);

    // Un gain par piste : permet de couper une couche instantanément.
    for (const id of ['kick', 'snare', 'hat', 'bass', 'chord', 'lead']) {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(this.bus);
      this.tracks[id] = g;
    }

    this.noise = this.makeNoise(2);
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // --- Réglages temps réel -------------------------------------------------

  setSound(sound) { this.sound = sound || {}; }

  setTrackEnabled(id, on) {
    const g = this.tracks[id];
    if (!g) return;
    g.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.02);
  }

  /** value 0..1 -> fréquence de coupure musicale (200 Hz -> 18 kHz). */
  setFilter(value, resonance = 1) {
    if (!this.ctx) return;
    const f = 200 * Math.pow(90, clamp(value, 0, 1));
    this.filter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.03);
    this.filter.Q.setTargetAtTime(resonance, this.ctx.currentTime, 0.03);
  }

  setDelay(value) {
    if (!this.ctx) return;
    this.delaySend.gain.setTargetAtTime(clamp(value, 0, 1) * 0.7, this.ctx.currentTime, 0.05);
  }

  setDelayFeedback(value) {
    if (!this.ctx) return;
    this.delayFeedback.gain.setTargetAtTime(clamp(value, 0, 0.85), this.ctx.currentTime, 0.05);
  }

  setSpace(value) {
    if (!this.ctx) return;
    this.spaceSend.gain.setTargetAtTime(clamp(value, 0, 1) * 0.9, this.ctx.currentTime, 0.05);
  }

  /** L'écho suit le tempo (croche pointée = effet « dub »). */
  syncDelay(tempo) {
    if (!this.ctx) return;
    const beat = 60 / tempo;
    this.delay.delayTime.setTargetAtTime(clamp(beat * 0.75, 0.02, 2), this.ctx.currentTime, 0.1);
  }

  // --- Instruments ---------------------------------------------------------

  noiseSource(time, duration) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(time, Math.random() * 1.5, duration);
    src.stop(time + duration);
    return src;
  }

  env(time, attack, decay, peak = 1) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    return g;
  }

  kick(time) {
    const kind = this.sound.kick || 'punch';
    const cfg = {
      punch: { start: 160, end: 48, decay: 0.32, gain: 1.0 },
      boom:  { start: 130, end: 38, decay: 0.65, gain: 1.0 },
      soft:  { start: 110, end: 45, decay: 0.4,  gain: 0.7 },
    }[kind];
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(cfg.start, time);
    osc.frequency.exponentialRampToValueAtTime(cfg.end, time + 0.12);
    const g = this.env(time, 0.002, cfg.decay, cfg.gain);
    osc.connect(g).connect(this.tracks.kick);
    osc.start(time);
    osc.stop(time + cfg.decay + 0.05);

    if (kind !== 'soft') { // petit « clic » d'attaque
      const click = this.noiseSource(time, 0.03);
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const cg = this.env(time, 0.001, 0.025, 0.25);
      click.connect(hp).connect(cg).connect(this.tracks.kick);
    }
  }

  snare(time) {
    const kind = this.sound.snare || 'snare';
    if (kind === 'clap') {
      // Trois petites rafales : effet « claquement de mains ».
      for (let i = 0; i < 3; i++) {
        const t = time + i * 0.012;
        const src = this.noiseSource(t, 0.13);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1500;
        bp.Q.value = 1.2;
        const g = this.env(t, 0.001, i === 2 ? 0.16 : 0.03, i === 2 ? 0.55 : 0.35);
        src.connect(bp).connect(g).connect(this.tracks.snare);
      }
      return;
    }
    const soft = kind === 'brush';
    const src = this.noiseSource(time, 0.3);
    const bp = this.ctx.createBiquadFilter();
    bp.type = soft ? 'bandpass' : 'highpass';
    bp.frequency.value = soft ? 3000 : 1400;
    const g = this.env(time, 0.001, soft ? 0.14 : 0.19, soft ? 0.35 : 0.6);
    src.connect(bp).connect(g).connect(this.tracks.snare);

    if (!soft) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, time);
      osc.frequency.exponentialRampToValueAtTime(120, time + 0.1);
      const og = this.env(time, 0.001, 0.12, 0.45);
      osc.connect(og).connect(this.tracks.snare);
      osc.start(time);
      osc.stop(time + 0.2);
    }
  }

  hat(time) {
    const open = (this.sound.hat || 'tight') === 'open';
    const decay = open ? 0.22 : 0.055;
    const src = this.noiseSource(time, decay + 0.05);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.env(time, 0.001, decay, 0.3);
    src.connect(hp).connect(g).connect(this.tracks.hat);
  }

  /** Voix synthétique simple : oscillateur + filtre + enveloppe. */
  voice(trackId, freq, time, duration, opts = {}) {
    const {
      wave = 'sawtooth', peak = 0.3, attack = 0.005, cutoff = 4000,
      detune = 0, glideFrom = null,
    } = opts;
    const osc = this.ctx.createOscillator();
    osc.type = wave;
    osc.detune.value = detune;
    if (glideFrom) {
      osc.frequency.setValueAtTime(glideFrom, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06);
    } else {
      osc.frequency.setValueAtTime(freq, time);
    }
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(cutoff * 2.2, 16000), time);
    lp.frequency.exponentialRampToValueAtTime(Math.max(cutoff, 200), time + duration * 0.8);
    const g = this.env(time, attack, duration, peak);
    osc.connect(lp).connect(g).connect(this.tracks[trackId] || this.bus);
    osc.start(time);
    osc.stop(time + duration + attack + 0.05);
  }

  bass(midi, time, duration) {
    const freq = midiToFreq(midi);
    this.voice('bass', freq, time, duration, {
      wave: this.sound.bassWave || 'sawtooth', peak: 0.42, cutoff: 700, attack: 0.004,
    });
  }

  lead(midi, time, duration) {
    const freq = midiToFreq(midi);
    const wave = this.sound.leadWave || 'square';
    this.voice('lead', freq, time, duration, { wave, peak: 0.22, cutoff: 3500, attack: 0.006 });
    this.voice('lead', freq, time, duration, { wave, peak: 0.1, cutoff: 3000, detune: 8, attack: 0.01 });
  }

  chord(midis, time, duration) {
    const wave = this.sound.chordWave || 'triangle';
    midis.forEach((midi, i) => {
      this.voice('chord', midiToFreq(midi), time, duration, {
        wave, peak: 0.16, cutoff: 2200, attack: 0.02, detune: i % 2 ? 6 : -6,
      });
    });
  }
}
