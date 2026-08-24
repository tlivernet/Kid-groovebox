# Ma Groovebox

Une **groovebox tactile** (application web installable, type PWA) pensée pour un enfant de 6 ans
sur tablette. Inspirée de l'OP-Z de Teenage Engineering — phrases enchaînées, effets tenus au
clavier — mais radicalement simplifiée : grosses cibles, icônes dessinées, et **aucune fausse note
possible**.

Tout est synthétisé en direct par le navigateur (Web Audio API) : pas un seul fichier son à
télécharger, aucune dépendance, aucune compilation. L'appli s'installe sur l'écran d'accueil et
fonctionne **hors ligne**.

## Deux modes

### Motif — fabriquer la boucle

Une grille de 16 pas sur 6 couches. Chaque ligne se coupe ou se rallume d'un appui sur son icône.

| Élément | Geste | Effet |
|---|---|---|
| **Styles** (en haut à gauche) | 1 appui | Techno, rock, hip-hop, reggae, disco, doux, latino, jeu vidéo — charge **un petit morceau complet** : tempo, sons, swing et les quatre phrases (voir plus bas) |
| **Tonalité** (en haut à droite) | 1 appui | Note de base : do, ré, mi… |
| **Soleil / lune** | 1 appui | Joyeux (majeur) ou mystérieux (mineur) |
| **Icône d'instrument** | 1 appui | Coupe ou rallume la couche |
| **Pads** | 1 appui | Ajoute ou enlève un son sur ce temps |
| **Pads mélodiques** | poser le doigt, puis glisser haut/bas | Une **grande jauge** s'ouvre à côté du doigt, sur toute la hauteur de l'écran : le remplissage monte avec la note, un gros curseur affiche son nom (do, ré, mi…), et la position du doigt désigne directement la note. On relâche, elle disparaît |
| **Dé** (à droite de chaque ligne) | 1 appui | Invente un motif pour cette ligne |
| **Dossier** (en bas) | 1 appui | Ouvre « mes morceaux » : 6 emplacements de sauvegarde |

Même principe d'agrandissement sur les **potards** : pendant le réglage, une grosse bulle affiche la
valeur au-dessus du bouton, lisible sans se pencher sur la tablette.

### Live — jouer par-dessus

| Élément | Geste | Effet |
|---|---|---|
| **Clavier** (10 touches) | appuyer, **plusieurs doigts à la fois** | Joue la basse, les accords ou la mélodie pendant que la boucle tourne. Les touches marquées d'un point sont les notes « maison » |
| **Basse / Accords / Mélodie** | 1 appui | Choisit l'instrument du clavier |
| **− / +** | 1 appui | Descend ou monte d'une octave |
| **12 effets** | **maintenir appuyé** | Voir le tableau ci-dessous |

Les effets sont **tenus** : on appuie, ça change ; on relâche, la musique repart exactement comme
avant. C'est le principe des *punch-in effects* de l'OP-Z.

Chaque effet s'accompagne d'un **voile visuel plein écran** qui montre ce qu'on entend : le monde se
referme sur le filtre, des flashs pour la répète, des anneaux pour l'écho, un halo pour l'espace, un
quadrillage de vieille machine pour le robot, une vague de lumière qui grimpe pour la montée. Le nom
de l'effet s'affiche en grand, et l'écran bat sur les temps forts.

| Effet | Ce qui se passe |
|---|---|
| Filtre | Le son se referme d'un coup (grosse chute de filtre) |
| Répète / Hyper / Boucle | Bégaie sur 2 pas, 1 pas ou 4 pas |
| Ralenti / Turbo | Moitié vitesse / double vitesse |
| Écho | Envoie tout dans un écho profond |
| Espace | Ouvre une grande réverbération |
| Robot | Écrase le son en 8 bits |
| Frein | La musique ralentit jusqu'à s'arrêter, puis repart d'un coup |
| Montée | Un souffle qui grimpe, avec cymbale au relâchement — la transition classique |
| Cassure | Ne laisse que la grosse caisse |

## Chaque style est un petit morceau

Un style ne charge pas une boucle, mais **quatre phrases écrites à la main** qui s'enchaînent comme
une chanson :

| Phrase | Rôle |
|---|---|
| **A** | Le couplet : le groove de base, épuré |
| **B** | La variation : même harmonie, ça bouge davantage, la mélodie apparaît |
| **C** | Le pont : la batterie s'allège, les accords s'ouvrent |
| **D** | Le refrain : tout revient, avec la mélodie principale |

Il suffit d'appuyer sur **Chaîne** et de laisser tourner : A → B → C → D, un vrai morceau. Basse et
accords partagent les mêmes degrés à chaque instant, pour que l'harmonie tienne debout, et les
mélodies sont écrites motif par motif plutôt que tirées au hasard.

Chaque style a aussi **son propre son** : grosse caisse longue et molle en hip-hop, charleston
métallique à six oscillateurs en techno et en disco, basse qui glisse en reggae, coup sec sur le bord
de la caisse en latino, tout en ondes carrées sans filtre en jeu vidéo, textures douces à attaque
lente en « Doux ».

Changer de style remplace les quatre phrases : on garde d'abord son morceau dans « mes morceaux » si
on y tient.

## Phrases et enchaînement

Quatre phrases **A B C D** en haut de l'écran, comme les patterns de l'OP-Z :

- **appui** sur une lettre : on passe à cette phrase — le changement tombe **à la fin de la mesure**,
  jamais au milieu, donc ça reste en rythme ;
- **appui long** : copie la phrase en cours dans cette lettre (idéal pour faire une variation) ;
- **Chaîne** : les phrases remplies s'enchaînent toutes seules, en boucle. De quoi construire un
  vrai petit morceau (couplet / refrain) plutôt qu'une seule mesure qui tourne.

Le point sous une lettre indique qu'elle contient quelque chose.

## Partis pris pour un enfant de 6 ans

- **Gamme pentatonique** : les pads mélodiques et le clavier ne donnent accès qu'à 5 notes par
  octave, choisies pour toujours sonner ensemble. On peut appuyer n'importe où, ça marche.
- **Rien à lire** : chaque fonction est portée par une icône dessinée et une couleur. Les mots
  restent en secours, en petit.
- **Aucun état caché** : pas de menu, pas de mode invisible ; ce qui est allumé est ce qu'on entend.
- **Tout est réversible** : les effets se relâchent, la corbeille n'efface que la phrase en cours.

## Sauvegarder ses morceaux

Le morceau en cours est **repris automatiquement** au démarrage suivant. En plus, le bouton
**dossier** ouvre « mes morceaux » : six emplacements, chacun avec un aperçu miniature de sa boucle,
son style et son tempo.

- **Garder** enregistre le morceau du moment dans cet emplacement. Sur un emplacement déjà occupé, il
  faut appuyer deux fois (le bouton demande « Sûr ? ») : on n'écrase rien par erreur.
- **Jouer** ressort le morceau : phrases, style, tonalité, réglages, tout revient.

## Essayer

```bash
cd Kid-groovebox
python3 -m http.server 8000
# puis http://localhost:8000 (ou http://<ip-du-pc>:8000 depuis la tablette)
```

## Installer sur la tablette

1. Publier le dossier sur un hébergement **HTTPS** (GitHub Pages convient : *Settings → Pages →
   Deploy from a branch*, dossier racine).
2. Ouvrir l'adresse dans Chrome (Android) ou Safari (iPad).
3. Menu du navigateur → **« Ajouter à l'écran d'accueil »**.

L'appli se lance en plein écran, sans barre d'adresse, et fonctionne sans connexion. Sur iPad,
penser au bouton latéral : le mode silencieux coupe le son.

## Vérifier après une modification

```bash
npm install --no-save playwright-core
node tools/check.mjs
```

Le script lance un vrai navigateur et contrôle la mise en page sur quatre formats (tablette et
téléphone, portrait et paysage), la validité des 32 phrases écrites, le niveau sonore réel de chaque
style (mesuré à la sortie du moteur : aucun style muet, aucune saturation) ainsi que le comportement
musical : copie et enchaînement des
phrases, changement calé sur la mesure, clavier multi-touch, retour à la normale des douze effets,
sauvegarde et rechargement.

Les gestes tactiles sont testés avec de **vrais événements tactiles** (protocole Chrome DevTools) et
non des événements simulés : c'est le seul moyen de voir le navigateur confisquer un glissé pour
défiler, ce qui empêchait de choisir une note.

## Comment c'est fait

```
index.html            page unique
styles.css            habillage « machine » + adaptations portrait / paysage / téléphone
js/patterns.js        pistes, gammes, 8 styles (4 phrases + réglages de son chacun), effets
js/songs.js           sérialisation du morceau et emplacements de sauvegarde
js/picker.js          jauge de note agrandie
js/overlay.js         voile visuel des effets live
js/icons.js           toutes les icônes, dessinées en SVG (ni émoji ni police d'icônes)
js/audio.js           moteur audio : percussions et synthés synthétisés, filtre, écho,
                      réverbération, écrasement 8 bits, notes tenues pour le jeu live
js/sequencer.js       horloge « lookahead » + enchaînement des phrases sur la mesure
js/ui.js              grille, potards tactiles, clavier, banque d'effets
js/app.js             état, sauvegarde, effets de scène, démarrage
sw.js                 service worker (fonctionnement hors ligne)
manifest.webmanifest  installation sur l'écran d'accueil
tools/make-icons.mjs  génère les icônes PNG de l'appli
tools/check.mjs       vérification automatique dans un navigateur
```

Le séquenceur ne compte pas sur `setInterval` pour la précision : un timer réveille le moteur toutes
les 25 ms et **planifie** les notes à l'avance sur l'horloge audio, qui les joue à la microseconde.
Les changements de phrase sont posés sur le premier pas de la mesure suivante.

## Idées pour la suite

- Enregistrer ce qu'on joue au clavier directement dans la phrase (overdub).
- Écrire une deuxième série de quatre phrases par style, pour varier les morceaux de départ.
- Mémoriser plusieurs morceaux complets, avec une couleur chacun.
- Mode « micro » : enregistrer sa voix et la déclencher sur un pad.
- Export audio du morceau pour l'envoyer à la famille.
- Jeu d'écoute : l'appli joue un rythme, l'enfant le rejoue.
