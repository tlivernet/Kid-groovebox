// Séquenceur : horloge « lookahead » (le timer JS planifie, Web Audio joue à l'heure exacte).
import { STEPS, TRACK_ROOT, KEYS } from './patterns.js';
import { degreeToMidi } from './audio.js';

const LOOKAHEAD_MS = 25;      // fréquence de réveil du timer
const SCHEDULE_AHEAD = 0.12;  // secondes planifiées à l'avance

export class Sequencer {
  constructor(engine, state, onStep) {
    this.engine = engine;
    this.state = state;
    this.onStep = onStep;      // appelé pour l'affichage du curseur
    this.playing = false;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.queue = [];
    this.stutter = null;       // { start, length } quand l'effet « répète » est tenu
    this.halfTime = false;
  }

  get stepDuration() {
    const beat = 60 / this.state.tempo;
    return (beat / 4) * (this.halfTime ? 2 : 1);
  }

  start() {
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.engine.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), LOOKAHEAD_MS);
    this.tick();
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    this.queue = [];
    this.onStep(-1);
  }

  schedule() {
    const ctx = this.engine.ctx;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const dur = this.stepDuration;
      // Swing : on retarde légèrement les temps faibles.
      const offset = this.step % 2 === 1 ? dur * this.state.swing * 0.5 : 0;
      this.playStep(this.step, this.nextTime + offset, dur);
      this.queue.push({ step: this.step, time: this.nextTime + offset });
      this.nextTime += dur;
      this.step = this.nextStep(this.step);
    }
  }

  nextStep(step) {
    if (this.stutter) {
      const { start, length } = this.stutter;
      const rel = (step - start + STEPS) % STEPS;
      return (start + ((rel + 1) % length)) % STEPS;
    }
    return (step + 1) % STEPS;
  }

  /** Déclenche l'effet « répète » à partir du pas courant. */
  setStutter(length) {
    this.stutter = length ? { start: this.step, length } : null;
  }

  playStep(step, time, dur) {
    const s = this.state;
    const rootShift = KEYS[s.keyIndex].semitone + s.transpose;

    for (const id of ['kick', 'snare', 'hat']) {
      if (!s.enabled[id]) continue;
      if (!s.patterns[id][step]) continue;
      if (id === 'kick') this.engine.kick(time);
      else if (id === 'snare') this.engine.snare(time);
      else this.engine.hat(time);
    }

    if (s.enabled.bass) {
      const deg = s.patterns.bass[step];
      if (deg !== null) {
        this.engine.bass(degreeToMidi(deg, TRACK_ROOT.bass + rootShift, s.mode), time, dur * 1.8);
      }
    }
    if (s.enabled.chord) {
      const deg = s.patterns.chord[step];
      if (deg !== null) {
        const root = TRACK_ROOT.chord + rootShift;
        const notes = [deg, deg + 2, deg + 4].map((d) => degreeToMidi(d, root, s.mode));
        this.engine.chord(notes, time, dur * 5);
      }
    }
    if (s.enabled.lead) {
      const deg = s.patterns.lead[step];
      if (deg !== null) {
        this.engine.lead(degreeToMidi(deg, TRACK_ROOT.lead + rootShift, s.mode), time, dur * 1.4);
      }
    }
  }

  /** Boucle d'affichage : le curseur s'allume pile au moment où le son sort. */
  tick() {
    if (!this.playing) return;
    const now = this.engine.ctx.currentTime;
    while (this.queue.length && this.queue[0].time <= now) {
      this.onStep(this.queue.shift().step);
    }
    requestAnimationFrame(() => this.tick());
  }
}
