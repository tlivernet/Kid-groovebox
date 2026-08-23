/**
 * Voile visuel du mode live : chaque effet tenu s'accompagne d'une animation
 * plein écran qui « montre » ce qu'on entend (voile qui se referme, flashs,
 * anneaux d'écho, halo, quadrillage robot, montée…). Purement décoratif :
 * la couche ne capte aucun toucher.
 */
const LAYERS = ['veil', 'strobe', 'rings', 'glow', 'scan', 'rise', 'speed', 'wave', 'tape'];

export class FxOverlay {
  constructor(root, labels = {}) {
    this.labels = labels;
    this.active = new Set();
    this.el = document.createElement('div');
    this.el.id = 'fx-overlay';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = LAYERS.map((name) => `<div class="ov-${name}"></div>`).join('')
      + '<div class="ov-label"></div>';
    this.label = this.el.querySelector('.ov-label');
    root.appendChild(this.el);
  }

  set(id, on) {
    if (on) this.active.add(id);
    else this.active.delete(id);
    this.el.classList.toggle(`fx-${id}`, on);
    this.el.classList.toggle('on', this.active.size > 0);
    if (!this.active.size) this.el.classList.remove('beat');
    const last = [...this.active].pop();
    this.label.textContent = last ? (this.labels[last] || '') : '';
  }

  /** Petit battement sur les temps forts, tant qu'un effet est tenu. */
  pulse(step) {
    if (!this.active.size || step % 4 !== 0) return;
    this.el.classList.remove('beat');
    void this.el.offsetWidth;   // relance l'animation
    this.el.classList.add('beat');
  }

  clear() {
    [...this.active].forEach((id) => this.set(id, false));
  }
}
