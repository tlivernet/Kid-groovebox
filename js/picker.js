/**
 * Jauge de note.
 *
 * Sur un pad de quelques dizaines de pixels, viser une note parmi dix est
 * impossible. Poser le doigt sur un pad mélodique ouvre donc une grande jauge
 * verticale : le remplissage monte avec la note, un gros curseur affiche son
 * nom, et la position du doigt désigne directement la note (pas de calcul de
 * déplacement relatif). La jauge se place à côté du doigt pour rester visible,
 * et disparaît au relâchement.
 */
import { MAX_DEGREE } from './patterns.js';

const COUNT = MAX_DEGREE + 1;
const TOP_RATIO = 0.05;        // marge haute, en fraction de la hauteur d'écran
const HEIGHT_RATIO = 0.9;
const WIDTH = { min: 92, max: 150 };

export class NotePicker {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'picker hidden';
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

    // Graduations : le grave en bas, l'aigu en haut (colonne inversée).
    const ticks = this.el.querySelector('.picker-ticks');
    this.ticks = [];
    for (let i = 0; i < COUNT; i++) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.innerHTML = '<span></span>';
      ticks.appendChild(tick);
      this.ticks.push(tick);
    }

    root.appendChild(this.el);
    this.open = false;
  }

  /** Ouvre la jauge à côté du pad touché. */
  show({ rect, color, degree, names }) {
    const width = Math.max(WIDTH.min, Math.min(rect.width * 2.4, WIDTH.max));
    const height = window.innerHeight * HEIGHT_RATIO;
    const top = window.innerHeight * TOP_RATIO;
    // À droite du pad si la place le permet, sinon à gauche : la main ne cache
    // jamais la jauge.
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

    names.forEach((name, i) => { this.ticks[i].querySelector('span').textContent = name; });
    this.names = names;
    this.el.classList.remove('hidden');
    this.open = true;
    this.highlight(degree);
  }

  /** Quelle note se trouve sous le doigt ? */
  degreeAt(clientY) {
    const position = (this.top + this.height - clientY) / this.height;
    return Math.max(0, Math.min(COUNT - 1, Math.floor(position * COUNT)));
  }

  highlight(degree) {
    const share = 100 / COUNT;
    this.fill.style.height = `${(degree + 1) * share}%`;
    this.thumb.style.bottom = `${degree * share}%`;
    this.thumbLabel.textContent = this.names?.[degree] ?? '';
    this.head.textContent = this.names?.[degree] ?? '';
    this.ticks.forEach((tick, i) => tick.classList.toggle('on', i === degree));
  }

  hide() {
    this.el.classList.add('hidden');
    this.open = false;
  }
}
