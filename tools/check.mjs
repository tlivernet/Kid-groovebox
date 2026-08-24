/**
 * Vérification automatique de l'appli dans un vrai navigateur.
 *
 *   npm install --no-save playwright-core   (ou playwright)
 *   node tools/check.mjs
 *
 * Contrôle deux choses :
 *  - la mise en page tient sans débordement sur 4 formats (tablette et téléphone,
 *    portrait et paysage) ;
 *  - le comportement musical : copie et enchaînement des phrases, changement calé
 *    sur la mesure, clavier multi-touch, retour à la normale des 12 effets,
 *    sauvegarde et rechargement.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8791;
const BASE = `http://localhost:${PORT}/index.html`;

const { chromium } = await import('playwright-core').catch(() => import('playwright'));

const SIZES = [
  { name: 'tablette paysage', width: 1180, height: 820 },
  { name: 'tablette portrait', width: 820, height: 1180 },
  { name: 'téléphone paysage', width: 844, height: 390 },
  { name: 'téléphone portrait', width: 390, height: 844 },
];

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ ok, line: `${ok ? 'OK   ' : 'ÉCHEC'} ${name}${detail ? ' — ' + detail : ''}` });
};

// --- Contrôle des motifs, sans navigateur --------------------------------------

const { STYLES, TRACKS, STEPS, PHRASES, MAX_DEGREE } = await import('../js/patterns.js');

for (const style of STYLES) {
  const soucis = [];
  if (style.phrases.length !== PHRASES) soucis.push(`${style.phrases.length} phrases`);
  style.phrases.forEach((phrase, i) => {
    for (const track of TRACKS) {
      const steps = phrase[track.id];
      if (!Array.isArray(steps) || steps.length !== STEPS) {
        soucis.push(`${'ABCD'[i]}/${track.id} : ${steps?.length} pas`);
        continue;
      }
      for (const v of steps) {
        const bon = track.type === 'drum'
          ? v === 0 || v === 1
          : v === null || (Number.isInteger(v) && v >= 0 && v <= MAX_DEGREE);
        if (!bon) { soucis.push(`${'ABCD'[i]}/${track.id} : valeur ${v}`); break; }
      }
    }
    // Une phrase vide casserait l'enchaînement : chaque phrase doit sonner.
    const vide = TRACKS.every((t) => phrase[t.id].every((v) => (t.type === 'drum' ? !v : v === null)));
    if (vide) soucis.push(`${'ABCD'[i]} est vide`);
  });
  if (style.tempo < 60 || style.tempo > 180) soucis.push(`tempo ${style.tempo}`);
  check(`motifs du style ${style.label}`, soucis.length === 0, soucis.join(', '));
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1000));

const browser = await chromium.launch({
  executablePath: process.env.PW_EXE || undefined,
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});

// --- Mise en page -------------------------------------------------------------

for (const size of SIZES) {
  const page = await browser.newPage({ viewport: size, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('#start-btn');
  await page.waitForTimeout(900);
  await page.click('.view-tab[data-view="live"]');
  await page.waitForTimeout(200);
  const info = await page.evaluate(() => ({
    debordeX: document.documentElement.scrollWidth > window.innerWidth,
    debordeY: document.documentElement.scrollHeight > window.innerHeight,
    // Une barre écrasée à quelques pixels rend son contenu inatteignable.
    barreStyles: Math.round(document.querySelector('#styles').clientWidth),
    // Cibles tactiles trop petites (on ignore ce qui est masqué : taille nulle).
    petitsBoutons: [...document.querySelectorAll('.fx-btn, .key, .phrase-btn, .track-btn')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 28 || r.height < 24);
      }).length,
  }));
  check(`mise en page ${size.name}`,
        !info.debordeX && !info.debordeY && info.petitsBoutons === 0
          && info.barreStyles > 140 && errors.length === 0,
        JSON.stringify({ ...info, erreurs: errors.length }));

  // Sur écran étroit, la barre des styles déborde : elle doit défiler au doigt.
  // (C'est la seule zone à qui l'on rend le geste horizontal.)
  if (size.width <= 500) {
    await page.click('.view-tab[data-view="motif"]');
    const session = await page.context().newCDPSession(page);
    const barre = await page.locator('#styles').boundingBox();
    const y = barre.y + barre.height / 2;
    const envoyer = async (type, x) => {
      await session.send('Input.dispatchTouchEvent', {
        type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, force: 1 }],
      });
      await new Promise((r) => setTimeout(r, 30));
    };
    await page.evaluate(() => { document.querySelector('#styles').scrollLeft = 0; });
    const depart = barre.x + barre.width - 20;
    await envoyer('touchStart', depart);
    for (let i = 1; i <= 10; i++) await envoyer('touchMove', depart - i * 14);
    await envoyer('touchEnd', depart - 140);
    await page.waitForTimeout(300);
    const etat = await page.evaluate(() => {
      const el = document.querySelector('#styles');
      return { deborde: el.scrollWidth > el.clientWidth, defilement: Math.round(el.scrollLeft) };
    });
    check('la barre des styles défile encore au doigt',
          etat.deborde && etat.defilement > 20, JSON.stringify(etat));
  }
  await page.close();
}

// --- Comportement musical ------------------------------------------------------

const page = await browser.newPage({ viewport: SIZES[0], hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.click('#start-btn');
await page.waitForTimeout(700);
await page.evaluate(() => { window.groovebox.state.tempo = 180; });
const window0Height = SIZES[0].height;

const phraseB = page.locator('.phrase-btn[data-phrase="1"]');
await phraseB.dispatchEvent('pointerdown', { pointerId: 1 });
await page.waitForTimeout(700);
await phraseB.dispatchEvent('pointerup', { pointerId: 1 });
await page.waitForTimeout(1400);
const copy = await page.evaluate(() => {
  const s = window.groovebox.state;
  return { index: s.phraseIndex, identique: JSON.stringify(s.phrases[0]) === JSON.stringify(s.phrases[1]) };
});
check('copie de la phrase par appui long', copy.identique && copy.index === 1, `phrase active : ${copy.index}`);

await page.evaluate(() => window.groovebox.handlers.onRandomTrack('lead'));
await page.click('#phrase-tools .tool-btn');
const vues = new Set();
for (let i = 0; i < 40; i++) {
  vues.add(await page.evaluate(() => window.groovebox.state.phraseIndex));
  await page.waitForTimeout(120);
}
check('enchaînement automatique des phrases', vues.size >= 2, `phrases jouées : ${[...vues].join(', ')}`);

await page.click('#phrase-tools .tool-btn');
await page.evaluate(() => { window.groovebox.state.tempo = 60; });
const courante = await page.evaluate(() => window.groovebox.state.phraseIndex);
const cible = courante === 0 ? 1 : 0;
const btn = page.locator(`.phrase-btn[data-phrase="${cible}"]`);
await btn.dispatchEvent('pointerdown', { pointerId: 2 });
await btn.dispatchEvent('pointerup', { pointerId: 2 });
const attente = await page.evaluate(() => ({
  attendue: window.groovebox.state.queuedPhrase,
  active: window.groovebox.state.phraseIndex,
}));
check('le changement attend la fin de la mesure',
      attente.attendue === cible && attente.active === courante, JSON.stringify(attente));

await page.click('.view-tab[data-view="live"]');
const k1 = page.locator('#keyboard .key').nth(2);
const k2 = page.locator('#keyboard .key').nth(6);
await k1.dispatchEvent('pointerdown', { pointerId: 11 });
await k2.dispatchEvent('pointerdown', { pointerId: 12 });
await page.waitForTimeout(250);
const pendant = await page.evaluate(() => document.querySelectorAll('#keyboard .key.down').length);
await k1.dispatchEvent('pointerup', { pointerId: 11 });
await k2.dispatchEvent('pointerup', { pointerId: 12 });
await page.waitForTimeout(200);
const apres = await page.evaluate(() => document.querySelectorAll('#keyboard .key.down').length);
check('clavier multi-touch', pendant === 2 && apres === 0, `pendant : ${pendant}, après : ${apres}`);

const fxIds = await page.evaluate(() => [...document.querySelectorAll('.fx-btn')].map((b) => b.dataset.fx));
for (const id of fxIds) {
  const b = page.locator(`.fx-btn[data-fx="${id}"]`);
  await b.dispatchEvent('pointerdown', { pointerId: 20 });
  await page.waitForTimeout(220);
  await b.dispatchEvent('pointerup', { pointerId: 20 });
  await page.waitForTimeout(140);
}
const repos = await page.evaluate(() => ({
  vitesse: window.groovebox.sequencer.rate,
  repetition: window.groovebox.sequencer.stutter,
  enLecture: window.groovebox.sequencer.playing,
}));
check(`retour à la normale après les ${fxIds.length} effets`,
      repos.vitesse === 1 && repos.repetition === null && repos.enLecture, JSON.stringify(repos));

// Jauge de note, avec de VRAIS événements tactiles (protocole Chrome DevTools) :
// c'est le seul moyen de voir le navigateur confisquer un glissé pour défiler.
await page.click('.view-tab[data-view="motif"]');
const annulations = [];
await page.exposeFunction('signalerAnnulation', (cible) => annulations.push(cible));
await page.evaluate(() => {
  document.addEventListener('pointercancel', (e) => window.signalerAnnulation(String(e.target.className)), true);
});

const cdp = await page.context().newCDPSession(page);
const doigt = async (type, x, y) => {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 12, radiusY: 12, force: 1 }],
  });
  await new Promise((r) => setTimeout(r, 35));
};
const glisser = async (x, depart, arrivee, pas = 12) => {
  for (let i = 1; i <= pas; i++) await doigt('touchMove', x, depart + (arrivee - depart) * (i / pas));
};

const padBox = await page.locator('.row[data-track="lead"] .pad').nth(1).boundingBox();
const padX = padBox.x + padBox.width / 2;
const padY = padBox.y + padBox.height / 2;
await doigt('touchStart', padX, padY);
const jauge = await page.locator('.picker').boundingBox();
await glisser(padX, padY, jauge.y + 12);
const aigu = await page.evaluate(() => window.groovebox.state.patterns.lead[1]);
await glisser(padX, jauge.y + 12, jauge.y + jauge.height - 12);
const grave = await page.evaluate(() => window.groovebox.state.patterns.lead[1]);
await doigt('touchEnd', padX, jauge.y + jauge.height - 12);
const referme = await page.evaluate(() => document.querySelector('.picker').classList.contains('hidden'));
check('la jauge suit un vrai doigt qui glisse',
      aigu === 9 && grave === 0 && referme && jauge.height > SIZES[0].height * 0.7,
      `haut : ${aigu}, bas : ${grave}, jauge ${Math.round(jauge.width)}×${Math.round(jauge.height)} px`);

// Un appui simple, sans glisser, efface toujours la note.
await doigt('touchStart', padX, padY);
await doigt('touchEnd', padX, padY);
check('un appui simple efface la note',
      await page.evaluate(() => window.groovebox.state.patterns.lead[1]) === null);

// Le doigt bouge toujours un peu : ni le clavier ni les effets ne doivent lâcher.
await page.click('.view-tab[data-view="live"]');
const toucheBox = await page.locator('#keyboard .key').nth(3).boundingBox();
await doigt('touchStart', toucheBox.x + toucheBox.width / 2, toucheBox.y + toucheBox.height / 2);
await glisser(toucheBox.x + toucheBox.width / 2, toucheBox.y + toucheBox.height / 2, toucheBox.y + 12, 6);
const toucheTenue = await page.evaluate(() => document.querySelectorAll('#keyboard .key.down').length);
await doigt('touchEnd', toucheBox.x + toucheBox.width / 2, toucheBox.y + 12);

const fxBox = await page.locator('.fx-btn[data-fx="filter"]').boundingBox();
await doigt('touchStart', fxBox.x + fxBox.width / 2, fxBox.y + fxBox.height / 2);
await glisser(fxBox.x + fxBox.width / 2, fxBox.y + fxBox.height / 2, fxBox.y + 10, 6);
const effetTenu = await page.evaluate(() => document.querySelector('.fx-btn[data-fx="filter"]').classList.contains('active'));
await doigt('touchEnd', fxBox.x + fxBox.width / 2, fxBox.y + 10);

check('le navigateur ne confisque aucun glissé',
      annulations.length === 0 && toucheTenue === 1 && effetTenu,
      `pointercancel : ${annulations.length ? annulations.join(', ') : 'aucun'}, touche tenue : ${toucheTenue}, effet tenu : ${effetTenu}`);

// Voile visuel : on mesure l'opacité RÉELLEMENT calculée de la couche attendue,
// pas seulement le nom des classes — c'est ce qui avait laissé passer un bug
// de spécificité CSS qui rendait 7 effets sur 12 invisibles.
const COUCHES = {
  filter: 'ov-veil', drop: 'ov-veil', repeat: 'ov-strobe', hyper: 'ov-strobe',
  loop: 'ov-strobe', slow: 'ov-wave', turbo: 'ov-speed', echo: 'ov-rings',
  space: 'ov-glow', robot: 'ov-scan', brake: 'ov-tape', rise: 'ov-rise',
};
const invisibles = [];
for (const [id, couche] of Object.entries(COUCHES)) {
  const bouton = page.locator(`.fx-btn[data-fx="${id}"]`);
  await bouton.dispatchEvent('pointerdown', { pointerId: 40 });
  // Plusieurs relevés : une couche animée passe par des valeurs basses.
  let maxOpacite = 0, fond = '';
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(70);
    const mesure = await page.evaluate((c) => {
      const el = document.querySelector(`#fx-overlay .${c}`);
      const style = getComputedStyle(el);
      // Une couche peut être peinte par une image de fond (dégradé) ou par une
      // simple couleur : les deux comptent.
      const couleur = style.backgroundColor;
      const peinte = style.backgroundImage !== 'none'
        || (couleur && couleur !== 'rgba(0, 0, 0, 0)' && couleur !== 'transparent');
      return { opacite: Number(style.opacity), fond: peinte ? 'oui' : 'none' };
    }, couche);
    maxOpacite = Math.max(maxOpacite, mesure.opacite);
    fond = mesure.fond;
  }
  const nom = await page.evaluate(() => document.querySelector('.ov-label').textContent);
  await bouton.dispatchEvent('pointerup', { pointerId: 40 });
  await page.waitForTimeout(120);
  const eteint = await page.evaluate((c) => ({
    couche: Number(getComputedStyle(document.querySelector(`#fx-overlay .${c}`)).opacity),
    voile: document.querySelector('#fx-overlay').classList.contains('on'),
  }), couche);
  if (maxOpacite < 0.15 || fond === 'none' || !nom || eteint.voile) {
    invisibles.push(`${id} (opacité ${maxOpacite.toFixed(2)}${fond === 'none' ? ', sans fond' : ''})`);
  }
}
check('les 12 voiles d\'effet s\'affichent vraiment', invisibles.length === 0,
      invisibles.length ? invisibles.join(', ') : 'chaque couche visible puis éteinte');

// Curseur de lecture : la colonne se déplace vraiment d'un pas à l'autre.
await page.click('.view-tab[data-view="motif"]');
await page.evaluate(() => { window.groovebox.state.tempo = 90; });
const positions = new Set();
let largeurCurseur = 0;
for (let i = 0; i < 12; i++) {
  const etat = await page.evaluate(() => {
    const el = document.querySelector('#playhead');
    return { gauche: Math.round(parseFloat(el.style.left) || 0), largeur: Math.round(parseFloat(el.style.width) || 0), visible: el.classList.contains('on') };
  });
  if (etat.visible) { positions.add(etat.gauche); largeurCurseur = etat.largeur; }
  await page.waitForTimeout(90);
}
check('le curseur de lecture balaie la grille',
      positions.size >= 3 && largeurCurseur > 20,
      `${positions.size} positions vues, largeur ${largeurCurseur} px`);

// Les animaux sautent : la classe d'animation apparaît sur les pistes qui jouent.
const sauts = await page.evaluate(async () => {
  const vus = new Set();
  const observateur = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.target.classList.contains('hit')) vus.add(m.target.dataset.track);
    }
  });
  document.querySelectorAll('.track-btn').forEach((b) =>
    observateur.observe(b, { attributes: true, attributeFilter: ['class'] }));
  await new Promise((r) => setTimeout(r, 2500));
  observateur.disconnect();
  return [...vus];
});
check('les animaux bougent quand leur piste joue', sauts.length >= 3, `pistes animées : ${sauts.join(', ')}`);

// Emplacements de sauvegarde : garder, casser le morceau, recharger.
await page.click('#songs');
await page.click('.song-card[data-slot="0"] .song-save');
await page.waitForTimeout(200);
const carteRemplie = await page.evaluate(() =>
  document.querySelector('.song-card[data-slot="0"]').classList.contains('filled'));
await page.click('#songs-panel .close-btn');
const morceauGarde = await page.evaluate(() => JSON.stringify(window.groovebox.state.phrases));
await page.evaluate(() => window.groovebox.handlers.onClear());
await page.click('#songs');
await page.click('.song-card[data-slot="0"] .song-load');
await page.waitForTimeout(250);
const morceauRecharge = await page.evaluate(() => JSON.stringify(window.groovebox.state.phrases));
check('emplacement « mes morceaux » : garder puis rejouer',
      carteRemplie && morceauGarde === morceauRecharge);

// Chaque style doit sonner : on mesure vraiment le signal en sortie.
await page.click('.view-tab[data-view="motif"]');
const niveaux = await page.evaluate(async () => {
  const { engine, handlers, state, sequencer } = window.groovebox;
  const analyser = engine.ctx.createAnalyser();
  analyser.fftSize = 2048;
  engine.master.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  const mesures = {};
  const styles = [...document.querySelectorAll('.style-chip')].map((c) => c.dataset.style);
  state.tempo = 150;
  for (const id of styles) {
    handlers.onStyle(id);
    let crete = 0, somme = 0, n = 0;
    const debut = performance.now();
    while (performance.now() - debut < 1200) {
      await new Promise((r) => setTimeout(r, 40));
      analyser.getFloatTimeDomainData(data);
      for (const v of data) {
        const a = Math.abs(v);
        if (a > crete) crete = a;
        somme += v * v;
        n++;
      }
    }
    mesures[id] = { crete: Number(crete.toFixed(3)), rms: Number(Math.sqrt(somme / n).toFixed(4)) };
  }
  sequencer.stop();
  return mesures;
});
const muets = Object.entries(niveaux).filter(([, m]) => m.rms < 0.005).map(([id]) => id);
const satures = Object.entries(niveaux).filter(([, m]) => m.crete > 0.99).map(([id]) => id);
check('les 8 styles sonnent, sans saturation', muets.length === 0 && satures.length === 0,
      muets.length || satures.length
        ? `muets : ${muets.join(', ') || 'aucun'} / saturés : ${satures.join(', ') || 'aucun'}`
        : Object.entries(niveaux).map(([id, m]) => `${id} ${m.rms}`).join('  '));
await page.evaluate(() => window.groovebox.sequencer.start());

const avant = await page.evaluate(() => JSON.stringify(window.groovebox.state.phrases));
await page.reload();
await page.click('#start-btn');
await page.waitForTimeout(600);
const apresRechargement = await page.evaluate(() => JSON.stringify(window.groovebox.state.phrases));
check('sauvegarde et rechargement du morceau', avant === apresRechargement);
check('aucune erreur dans la console', errors.length === 0, errors.join(' | '));

await browser.close();
server.kill();

console.log(results.map((r) => r.line).join('\n'));
const echecs = results.filter((r) => !r.ok).length;
console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nToutes les vérifications passent.');
process.exit(echecs ? 1 : 0);
