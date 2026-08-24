// Moteur audio : tout est synthétisé en direct (aucun fichier son à télécharger).
import { SCALES } from './patterns.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Réglages de son par défaut. Chaque style ne décrit dans patterns.js que ce
 * qui le distingue : la grosse caisse molle du hip-hop, le charleston
 * métallique de la techno, la basse qui glisse du reggae…
 */
const DEFAULTS = {
  kick:  { tune: 150, drop: 48, decay: 0.34, click: 0.25, level: 1 },
  snare: { kind: 'snare', tone: 195, decay: 0.19, noise: 0.55, hp: 1500, level: 1 },
  hat:   { decay: 0.05, hp: 7200, metal: false, level: 0.28 },
  bass:  { wave: 'sawtooth', sub: 0.3, cutoff: 700, decay: 1.8, level: 0.42, glide: 0 },
  chord: { wave: 'triangle', detune: 8, cutoff: 2200, attack: 0.02, hold: 5, level: 0.14 },
  lead:  { wave: 'square', detune: 6, cutoff: 3500, decay: 1.5, level: 0.21 },
};

// Rapports de fréquence des six carrés d'un charleston de boîte à rythmes.
const METAL_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];

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

    // Limiteur de sécurité seulement : avec assez de marge, il ne travaille
    // que sur les crêtes, au lieu d'écraser le morceau en permanence.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -4;
    this.limiter.knee.value = 4;
    this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(this.limiter);

    // Étage « robot » : le son passe soit propre, soit dans un quantificateur.
    this.crushDry = ctx.createGain();
    this.crushWet = ctx.createGain();
    this.crushWet.gain.value = 0;
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = this.makeCrushCurve(6);
    this.crushDry.connect(this.master);
    this.crushWet.connect(this.shaper);
    this.shaper.connect(this.master);

    // Filtre global (le « potar » filtre + l'effet balayage).
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 18000;
    this.filter.Q.value = 1;
    this.filter.connect(this.crushDry);
    this.filter.connect(this.crushWet);

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

    // Un gain par piste : coupure instantanée et volume réglable.
    this.trackVolume = {};
    for (const id of ['kick', 'snare', 'hat', 'bass', 'chord', 'lead']) {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(this.bus);
      this.tracks[id] = g;
      this.trackVolume[id] = 1;
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

  /** Courbe en escalier : réduit le son à quelques niveaux (effet 8 bits). */
  makeCrushCurve(levels) {
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.round(x * levels) / levels * 0.92;
    }
    return curve;
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
    this.trackOn = this.trackOn || {};
    this.trackOn[id] = on;
    g.gain.setTargetAtTime(on ? this.trackVolume[id] : 0, this.ctx.currentTime, 0.02);
  }

  /** Volume d'une piste (1 = normal). Sans effet si la piste est coupée. */
  setTrackVolume(id, volume) {
    if (!this.ctx || !this.tracks[id]) return;
    this.trackVolume[id] = volume;
    if (this.trackOn?.[id] === false) return;
    this.tracks[id].gain.setTargetAtTime(volume, this.ctx.currentTime, 0.03);
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

  /** Réglages d'un instrument : les valeurs du style par-dessus les valeurs par défaut. */
  cfg(part) {
    return { ...DEFAULTS[part], ...(this.sound[part] || {}) };
  }

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
    const c = this.cfg('kick');
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(c.tune, time);
    osc.frequency.exponentialRampToValueAtTime(c.drop, time + Math.min(0.14, c.decay * 0.4));
    const g = this.env(time, 0.002, c.decay, c.level);
    osc.connect(g).connect(this.tracks.kick);
    osc.start(time);
    osc.stop(time + c.decay + 0.06);

    if (c.click > 0) {   // le « clac » de la peau, qui donne l'attaque
      const click = this.noiseSource(time, 0.03);
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      const cg = this.env(time, 0.001, 0.024, c.click * 0.35);
      click.connect(hp).connect(cg).connect(this.tracks.kick);
    }
  }

  snare(time) {
    const c = this.cfg('snare');
    const out = this.tracks.snare;

    if (c.kind === 'clap') {
      // Trois rafales très rapprochées : le claquement de mains.
      for (let i = 0; i < 3; i++) {
        const t = time + i * 0.012;
        const src = this.noiseSource(t, c.decay + 0.05);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1500;
        bp.Q.value = 1.3;
        const g = this.env(t, 0.001, i === 2 ? c.decay : 0.03, (i === 2 ? 0.6 : 0.36) * c.level);
        src.connect(bp).connect(g).connect(out);
      }
      return;
    }

    if (c.kind === 'rim') {
      // Coup sec sur le bord : une note très courte et un grain de bruit.
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.tone, time);
      osc.frequency.exponentialRampToValueAtTime(c.tone * 0.55, time + c.decay);
      const g = this.env(time, 0.001, c.decay, 0.5 * c.level);
      osc.connect(g).connect(out);
      osc.start(time);
      osc.stop(time + c.decay + 0.05);

      const src = this.noiseSource(time, 0.03);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600;
      const ng = this.env(time, 0.001, 0.02, c.noise * 0.3 * c.level);
      src.connect(bp).connect(ng).connect(out);
      return;
    }

    const brush = c.kind === 'brush';
    const src = this.noiseSource(time, c.decay + 0.1);
    const filter = this.ctx.createBiquadFilter();
    filter.type = brush ? 'bandpass' : 'highpass';
    filter.frequency.value = brush ? 3200 : c.hp;
    const g = this.env(time, 0.001, c.decay, c.noise * c.level);
    src.connect(filter).connect(g).connect(out);

    if (!brush) {   // le corps de la caisse, sous le souffle
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.tone, time);
      osc.frequency.exponentialRampToValueAtTime(c.tone * 0.63, time + 0.1);
      const og = this.env(time, 0.001, c.decay * 0.65, 0.45 * c.level);
      osc.connect(og).connect(out);
      osc.start(time);
      osc.stop(time + c.decay + 0.1);
    }
  }

  hat(time) {
    const c = this.cfg('hat');
    const out = this.tracks.hat;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = c.hp;
    const g = this.env(time, 0.001, c.decay, c.level);
    hp.connect(g).connect(out);

    if (c.metal) {
      // Six carrés désaccordés : le charleston sec des boîtes à rythmes.
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 10000;
      bp.Q.value = 0.8;
      bp.connect(hp);
      for (const ratio of METAL_RATIOS) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 40 * ratio;
        osc.connect(bp);
        osc.start(time);
        osc.stop(time + c.decay + 0.05);
      }
      return;
    }
    this.noiseSource(time, c.decay + 0.05).connect(hp);
  }

  /** Voix synthétique : oscillateur(s) + filtre qui se referme + enveloppe. */
  voice(trackId, freq, time, duration, opts = {}) {
    const {
      wave = 'sawtooth', peak = 0.3, attack = 0.005, cutoff = 4000,
      detune = 0, glideFrom = null, sub = 0,
    } = opts;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(cutoff * 2.6, 16000), time);
    lp.frequency.exponentialRampToValueAtTime(Math.max(cutoff, 180), time + duration * 0.8);
    const g = this.env(time, attack, duration, peak);
    lp.connect(g).connect(this.tracks[trackId] || this.bus);

    const startOsc = (type, frequency, level) => {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.detune.value = detune;
      if (glideFrom) {
        osc.frequency.setValueAtTime(glideFrom, time);
        osc.frequency.exponentialRampToValueAtTime(frequency, time + 0.07);
      } else {
        osc.frequency.setValueAtTime(frequency, time);
      }
      if (level === 1) {
        osc.connect(lp);
      } else {
        const mix = this.ctx.createGain();
        mix.gain.value = level;
        osc.connect(mix).connect(lp);
      }
      osc.start(time);
      osc.stop(time + duration + attack + 0.06);
    };

    startOsc(wave, freq, 1);
    if (sub > 0) startOsc('sine', freq / 2, sub);   // l'octave du dessous, pour le poids
  }

  bass(midi, time, stepDuration) {
    const c = this.cfg('bass');
    const freq = midiToFreq(midi);
    this.voice('bass', freq, time, stepDuration * c.decay, {
      wave: c.wave, peak: c.level, cutoff: c.cutoff, attack: 0.004, sub: c.sub,
      glideFrom: c.glide > 0 ? this.lastBassFreq : null,
    });
    this.lastBassFreq = freq;
  }

  lead(midi, time, stepDuration) {
    const c = this.cfg('lead');
    const freq = midiToFreq(midi);
    const duration = stepDuration * c.decay;
    this.voice('lead', freq, time, duration, {
      wave: c.wave, peak: c.level, cutoff: c.cutoff, attack: 0.006,
    });
    if (c.detune > 0) {   // deuxième voix légèrement décalée : ça épaissit
      this.voice('lead', freq, time, duration, {
        wave: c.wave, peak: c.level * 0.45, cutoff: c.cutoff * 0.85,
        detune: c.detune, attack: 0.01,
      });
    }
  }

  chord(midis, time, stepDuration) {
    const c = this.cfg('chord');
    const duration = stepDuration * c.hold;
    midis.forEach((midi, i) => {
      this.voice('chord', midiToFreq(midi), time, duration, {
        wave: c.wave, peak: c.level, cutoff: c.cutoff, attack: c.attack,
        detune: c.detune * (i % 2 ? 1 : -1),
      });
    });
  }

  // --- Jeu en direct : notes tenues tant que le doigt reste posé -------------

  /** Démarre une note (ou un accord) et renvoie de quoi l'arrêter. */
  noteOn(trackId, midis) {
    const t = this.ctx.currentTime;
    const part = this.cfg(trackId);
    const detune = part.detune ?? 0;
    const cfg = {
      wave: part.wave,
      cutoff: Math.max(part.cutoff, trackId === 'bass' ? 900 : 1600),
      peak: part.level * (trackId === 'chord' ? 0.9 : 1),
      detunes: detune > 0 ? [-detune, detune] : [0],
    };

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(cfg.peak, t + 0.014);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cfg.cutoff;
    lp.connect(gain);
    gain.connect(this.tracks[trackId] || this.bus);

    const oscs = [];
    for (const midi of midis) {
      for (const detune of cfg.detunes) {
        const osc = this.ctx.createOscillator();
        osc.type = cfg.wave;
        osc.frequency.value = midiToFreq(midi);
        osc.detune.value = detune;
        osc.connect(lp);
        osc.start(t);
        oscs.push(osc);
      }
    }
    return { gain, oscs };
  }

  noteOff(handle) {
    if (!handle) return;
    const t = this.ctx.currentTime;
    const g = handle.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.exponentialRampToValueAtTime(0.0001, t + 0.3);
    handle.oscs.forEach((osc) => osc.stop(t + 0.34));
  }

  // --- Effets de scène -------------------------------------------------------

  setCrush(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.crushDry.gain.setTargetAtTime(on ? 0 : 1, t, 0.01);
    this.crushWet.gain.setTargetAtTime(on ? 1 : 0, t, 0.01);
  }

  /** Ne laisse passer que la grosse caisse (effet « cassure »). */
  setSoloKick(on, enabled) {
    if (!this.ctx) return;
    for (const [id, gain] of Object.entries(this.tracks)) {
      const volume = this.trackVolume[id];
      const target = on ? (id === 'kick' ? volume : 0) : (enabled[id] ? volume : 0);
      gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  /** Montée : un souffle qui grimpe, suivi d'une cymbale quand on relâche. */
  startRise() {
    if (this.rise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(8000, t + 4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 2.5);
    src.connect(bp).connect(gain).connect(this.bus);
    src.start(t);
    this.rise = { src, gain };
  }

  stopRise(withCrash = true) {
    if (!this.rise) return;
    const t = this.ctx.currentTime;
    const { src, gain } = this.rise;
    this.rise = null;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.stop(t + 0.16);
    if (withCrash) this.crash(t);
  }

  crash(time) {
    const src = this.noiseSource(time, 1.2);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4500;
    const g = this.env(time, 0.002, 1.1, 0.32);
    src.connect(hp).connect(g).connect(this.tracks.hat);
  }
}
