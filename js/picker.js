/**
 * Sélecteur de note agrandi.
 *
 * Sur un pad de 40 pixels de haut, choisir parmi dix notes au doigt est
 * impossible. Dès qu'un doigt se pose sur un pad mélodique, on ouvre une
 * grande réglette sur toute la hauteur de l'écran : chaque note occupe une
 * bande épaisse, et la position du doigt désigne directement la note (pas de
 * calcul de déplacement relatif). On relâche, la réglette disparaît.
 */
import { MAX_DEGREE } from './patterns.js';

const COUNT = MAX_DEGREE + 1;
const TOP_RATIO = 0.06;      // marge haute, en fraction de la hauteur d'écran
const HEIGHT_RATIO = 0.88;

export class NotePicker {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'picker hidden';
    this.el.setAttribute('aria-hidden', 'true');
    this.segments = [];
    // Le degré le plus aigu est en haut : la réglette se lit comme le son monte.
    for (let i = COUNT - 1; i >= 0; i--) {
      const seg = document.createElement('div');
      seg.className = 'picker-seg';
      seg.dataset.degree = String(i);
      seg.innerHTML = '<span class="picker-name"></span>';
      this.el.appendChild(seg);
      this.segments[i] = seg;
    }
    root.appendChild(this.el);
    this.open = false;
  }

  /** Ouvre la réglette au-dessus du pad touché. */
  show({ rect, color, degree, names }) {
    const width = Math.max(78, Math.min(rect.width * 2.6, 150));
    const height = window.innerHeight * HEIGHT_RATIO;
    const top = window.innerHeight * TOP_RATIO;
    const left = Math.max(6, Math.min(
      rect.left + rect.width / 2 - width / 2,
      window.innerWidth - width - 6,
    ));

    this.el.style.setProperty('--c', color);
    this.el.style.width = `${width}px`;
    this.el.style.height = `${height}px`;
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
    this.top = top;
    this.height = height;

    names.forEach((name, i) => {
      this.segments[i].querySelector('.picker-name').textContent = name;
    });
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
    this.segments.forEach((seg, i) => seg.classList.toggle('on', i === degree));
  }

  hide() {
    this.el.classList.add('hidden');
    this.open = false;
  }
}
