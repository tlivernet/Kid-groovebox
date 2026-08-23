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
    // Cibles tactiles trop petites (on ignore ce qui est masqué : taille nulle).
    petitsBoutons: [...document.querySelectorAll('.fx-btn, .key, .phrase-btn, .track-btn')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 28 || r.height < 24);
      }).length,
  }));
  check(`mise en page ${size.name}`,
        !info.debordeX && !info.debordeY && info.petitsBoutons === 0 && errors.length === 0,
        JSON.stringify({ ...info, erreurs: errors.length }));
  await page.close();
}

// --- Comportement musical ------------------------------------------------------

const page = await browser.newPage({ viewport: SIZES[0], hasTouch: true });
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

// Réglette de note : elle s'ouvre sous le doigt, la position choisit la note.
await page.click('.view-tab[data-view="motif"]');
const pad = page.locator('.row[data-track="lead"] .pad').nth(1);
const padBox = await pad.boundingBox();
await pad.dispatchEvent('pointerdown', { pointerId: 30, clientX: padBox.x + padBox.width / 2, clientY: padBox.y + 4 });
await page.waitForTimeout(150);
const pickerBox = await page.locator('.picker').boundingBox();
await pad.dispatchEvent('pointermove', { pointerId: 30, clientX: padBox.x, clientY: pickerBox.y + 8 });
await page.waitForTimeout(120);
const aigu = await page.evaluate(() => window.groovebox.state.patterns.lead[1]);
await pad.dispatchEvent('pointermove', { pointerId: 30, clientX: padBox.x, clientY: pickerBox.y + pickerBox.height - 8 });
await page.waitForTimeout(120);
const grave = await page.evaluate(() => window.groovebox.state.patterns.lead[1]);
await pad.dispatchEvent('pointerup', { pointerId: 30 });
const referme = await page.evaluate(() => document.querySelector('.picker').classList.contains('hidden'));
check('la réglette choisit la note à la position du doigt',
      aigu === 9 && grave === 0 && referme && pickerBox.height > window0Height * 0.7,
      `haut : ${aigu}, bas : ${grave}, hauteur : ${Math.round(pickerBox.height)} px`);

// Un simple appui sur une note existante l'efface toujours.
await pad.dispatchEvent('pointerdown', { pointerId: 31, clientX: padBox.x + 4, clientY: padBox.y + 4 });
await pad.dispatchEvent('pointerup', { pointerId: 31 });
check('un appui simple efface la note',
      await page.evaluate(() => window.groovebox.state.patterns.lead[1]) === null);

// Voile visuel : présent pendant l'effet, retiré au relâchement.
await page.click('.view-tab[data-view="live"]');
const fxSpace = page.locator('.fx-btn[data-fx="space"]');
await fxSpace.dispatchEvent('pointerdown', { pointerId: 32 });
await page.waitForTimeout(250);
const voile = await page.evaluate(() => {
  const el = document.querySelector('#fx-overlay');
  return { actif: el.classList.contains('on') && el.classList.contains('fx-space'),
           nom: el.querySelector('.ov-label').textContent };
});
await fxSpace.dispatchEvent('pointerup', { pointerId: 32 });
await page.waitForTimeout(200);
const voileApres = await page.evaluate(() => document.querySelector('#fx-overlay').classList.contains('on'));
check('voile visuel de l\'effet', voile.actif && voile.nom === 'Espace' && !voileApres, JSON.stringify(voile));

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
