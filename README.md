# 🎛️ Ma Groovebox

Une petite **groovebox tactile** (application web installable, type PWA) pensée pour un enfant de 6 ans
sur tablette. Inspirée de l'OP-Z de Teenage Engineering, mais radicalement simplifiée : gros boutons,
pictogrammes plutôt que du texte, et **aucune fausse note possible**.

Tout est synthétisé en direct par le navigateur (Web Audio API) : pas un seul fichier son à télécharger,
l'appli pèse quelques dizaines de kilo-octets et fonctionne **hors ligne**.

## Ce que l'enfant peut faire

| Élément | Geste | Effet |
|---|---|---|
| **Styles** (en haut à gauche) | 1 appui | Change d'univers musical : techno, rock, hip-hop, reggae, disco, doux, latino, jeu vidéo |
| **Tonalité** (en haut à droite) | 1 appui | Choisit la note de base (do, ré, mi…) |
| ☀️ / 🌙 | 1 appui | Bascule joyeux (majeur) / mystérieux (mineur) |
| **Icône d'instrument** (à gauche de chaque ligne) | 1 appui | Allume ou coupe la couche : batterie, basse, accords, mélodie… |
| **Pads** (la grille) | 1 appui | Ajoute ou enlève un son sur ce temps |
| **Pads mélodiques** (🐘 🌈 🎵) | glisser vers le haut/bas | Change la note (la barre monte = le son monte) |
| 🎲 (à droite de chaque ligne) | 1 appui | Invente un motif au hasard pour cette ligne |
| **Potards** | glisser vers le haut/bas | Vitesse, hauteur, filtre, écho, espace (double-clic = valeur d'origine) |
| **Effets** 🌀 ⚡ 🚀 🐢 | **maintenir appuyé** | Balayage de filtre, répétition (bégaiement), grand espace, ralenti |
| ▶️ / ⏹ | 1 appui | Départ / arrêt |
| 🎁 | 1 appui | Surprise : nouveau style et nouveaux motifs au hasard |
| 🗑️ | 1 appui | Efface tout pour repartir de zéro |

Deux partis pris pédagogiques :

- **Gamme pentatonique** : les pads mélodiques ne peuvent jouer que 5 notes par octave, choisies pour
  toujours sonner juste ensemble. L'enfant peut appuyer n'importe où, ça marche.
- **Rien à lire** : chaque fonction est portée par un émoji et une couleur.

Le travail en cours est **sauvegardé automatiquement** dans la tablette : on retrouve son morceau
en rouvrant l'appli.

## Essayer

Il faut un petit serveur local (les modules JavaScript ne se chargent pas depuis `file://`) :

```bash
cd Kid-groovebox
python3 -m http.server 8000
# puis ouvrir http://localhost:8000 (ou http://<ip-du-pc>:8000 depuis la tablette)
```

## Installer sur la tablette

1. Publier le dossier sur n'importe quel hébergement **HTTPS** (GitHub Pages fait très bien l'affaire :
   *Settings → Pages → Deploy from a branch*, dossier racine).
2. Ouvrir l'adresse dans Chrome (Android) ou Safari (iPad).
3. Menu du navigateur → **« Ajouter à l'écran d'accueil »**.

L'appli se lance alors en plein écran, sans barre d'adresse, et fonctionne sans connexion.
Sur iPad, penser à désactiver le mode silencieux (le son passe par le bouton latéral).

## Comment c'est fait

Aucune dépendance, aucune étape de compilation — que des fichiers statiques.

```
index.html            page unique
styles.css            mise en page tactile (grosses cibles, plein écran)
js/patterns.js        pistes, gammes, 8 styles et leurs motifs de départ
js/audio.js           moteur audio : batterie et synthés synthétisés, filtre, écho, réverbération
js/sequencer.js       horloge « lookahead » : le timer planifie, Web Audio joue à l'heure exacte
js/ui.js              grille de pads, potards tactiles, sélecteurs
js/app.js             état, sauvegarde, effets, démarrage
sw.js                 service worker (fonctionnement hors ligne)
manifest.webmanifest  installation sur l'écran d'accueil
tools/make-icons.mjs  génère les icônes PNG (node tools/make-icons.mjs)
```

Le son : chaque instrument est construit à la volée (oscillateur + filtre + enveloppe, bruit filtré pour
les percussions). Les envois d'effets (écho synchronisé au tempo, réverbération à impulsion générée) sont
communs à toutes les pistes, et un filtre passe-bas global sert à la fois de potard et d'effet « balayage ».

## Idées pour la suite

- Mémoriser plusieurs morceaux (4 emplacements 💾 avec une couleur chacun).
- Enchaîner deux motifs de 16 pas (couplet / refrain) avec un bouton A / B.
- Mode « micro » : enregistrer sa voix et la déclencher sur un pad.
- Bouton d'enregistrement pour exporter le morceau en fichier audio et l'envoyer à la famille.
- Jeu d'écoute : l'appli joue un rythme, l'enfant le rejoue.
- Support d'un contrôleur MIDI USB, pour brancher un vrai clavier.
