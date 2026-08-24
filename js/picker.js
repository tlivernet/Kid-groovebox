/**
 * Jauge verticale géante.
 *
 * Sur un pad de quelques dizaines de pixels, viser une valeur parmi dix est
 * impossible au doigt. On ouvre donc une grande jauge sur toute la hauteur de
 * l'écran : le remplissage monte avec la valeur, un gros curseur affiche son
 * nom, et la position du doigt désigne directement le cran (pas de calcul de
 * déplacement relatif). La jauge s'ouvre à côté du doigt et disparaît au
 * relâchement.
 *
 * Deux usages : choisir la note d'un pad, et régler le volume d'une piste.
 */
import { MAX_DEGREE } from './patterns.js';

const TOP_RATIO = 0.05;        // marge haute, en fraction de la hauteur d'écran
const HEIGHT_RATIO = 0.9;
const WIDTH = { min: 92, max: 150 };

export class Gauge {
  constructor(root, count, variante = '') {
    this.count = count;
    this.el = document.createElement('div');
    this.el.className = `picker ${variante} hidden`.replace('  ', ' ');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = `
      <div class="picker-head"></div>
      <div class="picker-track">
        <div class="picker-fill"></div>
        <div class="picker-ticks"></div>
        <div class="picker-thumb"><span></span></div>
      </div>`;

    this.head = this.el.querySelector('.picker-head');
    this.fill = this.el.querySelector('.picker-fill');
    this.thumb = this.el.querySelector('.picker-thumb');
    this.thumbLabel = this.thumb.querySelector('span');

    // Graduations : le bas en bas, le haut en haut (colonne inversée).
    const ticks = this.el.querySelector('.picker-ticks');
    this.ticks = [];
    for (let i = 0; i < count; i++) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.innerHTML = '<span></span>';
      ticks.appendChild(tick);
      this.ticks.push(tick);
    }
    this.thumb.style.height = `${100 / count}%`;

    root.appendChild(this.el);
    this.open = false;
  }

  /** Ouvre la jauge à côté de l'élément touché. */
  show({ rect, color, index, labels }) {
    const width = Math.max(WIDTH.min, Math.min(rect.width * 2.4, WIDTH.max));
    const height = window.innerHeight * HEIGHT_RATIO;
    const top = window.innerHeight * TOP_RATIO;
    // À droite si la place le permet, sinon à gauche : la main ne cache jamais
    // la jauge.
    const right = rect.right + 10;
    const left = right + width <= window.innerWidth - 6
      ? right
      : Math.max(6, rect.left - width - 10);

    this.el.style.setProperty('--c', color);
    Object.assign(this.el.style, {
      width: `${width}px`, height: `${height}px`, left: `${left}px`, top: `${top}px`,
    });
    this.top = top;
    this.height = height;

    labels.forEach((label, i) => { this.ticks[i].querySelector('span').textContent = label; });
    this.labels = labels;
    this.el.classList.remove('hidden');
    this.open = true;
    this.highlight(index);
  }

  /** Quel cran se trouve sous le doigt ? */
  indexAt(clientY) {
    const position = (this.top + this.height - clientY) / this.height;
    return Math.max(0, Math.min(this.count - 1, Math.floor(position * this.count)));
  }

  highlight(index) {
    const share = 100 / this.count;
    this.fill.style.height = `${(index + 1) * share}%`;
    this.thumb.style.bottom = `${index * share}%`;
    this.thumbLabel.textContent = this.labels?.[index] ?? '';
    this.head.textContent = this.labels?.[index] ?? '';
    this.ticks.forEach((tick, i) => tick.classList.toggle('on', i === index));
  }

  hide() {
    this.el.classList.add('hidden');
    this.open = false;
  }
}

/** Jauge des dix notes d'un pad mélodique. */
export class NotePicker extends Gauge {
  constructor(root) { super(root, MAX_DEGREE + 1, 'note-picker'); }

  show({ rect, color, degree, names }) {
    super.show({ rect, color, index: degree, labels: names });
  }

  degreeAt(clientY) { return this.indexAt(clientY); }
}

// Volumes proposés pour une piste, du silence au « plus fort que les autres ».
export const VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1, 1.3];
const VOLUME_LABELS = VOLUME_STEPS.map((v) => (v === 0 ? 'muet' : `${Math.round(v * 100)}`));

/** Jauge de volume d'une piste. */
export class VolumePicker extends Gauge {
  constructor(root) { super(root, VOLUME_STEPS.length, 'volume-picker'); }

  show({ rect, color, volume }) {
    super.show({ rect, color, index: this.indexOf(volume), labels: VOLUME_LABELS });
  }

  /** Cran le plus proche du volume courant. */
  indexOf(volume) {
    let best = 0;
    VOLUME_STEPS.forEach((v, i) => {
      if (Math.abs(v - volume) < Math.abs(VOLUME_STEPS[best] - volume)) best = i;
    });
    return best;
  }

  volumeAt(clientY) { return VOLUME_STEPS[this.indexAt(clientY)]; }
}
