# Remplacer uniquement la landing page

## Résultat attendu
- La route publique `/` reprend fidèlement le contenu, les visuels et les interactions de l’archive ZIP.
- Toutes les autres routes, l’authentification, les données et les écrans connectés restent inchangés.
- Le bandeau Orange Money, Wave, Djamo, Push CI, Moov Money et MTN conserve son fond `#14171C`, sa légère lueur verte et son défilement continu.

## Mise en œuvre
1. Copier les images, logos et polices de l’archive dans `public/assets`, sans dépendance vers l’archive ou un chemin local externe.
2. Convertir le HTML en composants React dédiés à la landing : navigation, démonstration principale, bandeau de paiement, démonstrations fonctionnelles, profils, témoignages, tarifs, FAQ et pied de page.
3. Reproduire les interactions JavaScript en état React et effets nettoyés : menu mobile, onglets des téléphones, simulations, pause du bandeau, profondeur du téléphone, tracés au défilement et réduction des animations.
4. Intégrer les trois feuilles de style dans l’ordre strict `styles.css`, `hybrid.css`, puis `atmosphere.css`, en les limitant au conteneur de la landing pour éviter tout impact sur l’application connectée.
5. Relier les boutons aux parcours existants : `/signup`, `/privacy`, `/terms`, ancres internes, et ouverture directe de la modale Jèko pour Pro et Ultra Pro. Conserver le masquage des offres dans l’application iOS native.
6. Remplacer uniquement le contenu de `src/pages/Landing.tsx` et ses nouveaux composants associés, puis vérifier le rendu et les interactions sur ordinateur et mobile.

## Vérifications
- Aucun asset manquant ni chemin local hors projet.
- Aucune erreur de compilation, console ou navigation.
- Défilement continu du bandeau sans saut, pause/reprise et comportement adapté à la réduction des animations.
- Les routes privées et la modale de paiement existante restent accessibles et inchangées.
