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
| **Styles** (en haut à gauche) | 1 appui | Techno, rock, hip-hop, reggae, disco, doux, latino, jeu vidéo — change le tempo, les sons, le swing et charge un motif de départ dans la phrase en cours |
| **Tonalité** (en haut à droite) | 1 appui | Note de base : do, ré, mi… |
| **Soleil / lune** | 1 appui | Joyeux (majeur) ou mystérieux (mineur) |
| **Icône d'instrument** | 1 appui | Coupe ou rallume la couche |
| **Pads** | 1 appui | Ajoute ou enlève un son sur ce temps |
| **Pads mélodiques** | glisser haut/bas | Change la note : la barre monte avec le son |
| **Dé** (à droite de chaque ligne) | 1 appui | Invente un motif pour cette ligne |

### Live — jouer par-dessus

| Élément | Geste | Effet |
|---|---|---|
| **Clavier** (10 touches) | appuyer, **plusieurs doigts à la fois** | Joue la basse, les accords ou la mélodie pendant que la boucle tourne. Les touches marquées d'un point sont les notes « maison » |
| **Basse / Accords / Mélodie** | 1 appui | Choisit l'instrument du clavier |
| **− / +** | 1 appui | Descend ou monte d'une octave |
| **12 effets** | **maintenir appuyé** | Voir le tableau ci-dessous |

Les effets sont **tenus** : on appuie, ça change ; on relâche, la musique repart exactement comme
avant. C'est le principe des *punch-in effects* de l'OP-Z.

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

Le morceau est **sauvegardé automatiquement** dans la tablette.

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
téléphone, portrait et paysage) ainsi que le comportement musical : copie et enchaînement des
phrases, changement calé sur la mesure, clavier multi-touch, retour à la normale des douze effets,
sauvegarde et rechargement.

## Comment c'est fait

```
index.html            page unique
styles.css            habillage « machine » + adaptations portrait / paysage / téléphone
js/patterns.js        pistes, gammes, 8 styles, liste des effets
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
- Mémoriser plusieurs morceaux complets, avec une couleur chacun.
- Mode « micro » : enregistrer sa voix et la déclencher sur un pad.
- Export audio du morceau pour l'envoyer à la famille.
- Jeu d'écoute : l'appli joue un rythme, l'enfant le rejoue.
