# Optimiser les médias de la landing sans perte visible

## Constat vérifié

- Les médias de la landing occupent actuellement environ **11 Mo**.
- Les cinq personnages PNG pèsent chacun entre **1,4 et 1,7 Mo**, alors qu’ils sont affichés à seulement 170–259 px de large selon l’écran.
- Les quatre illustrations d’audience ajoutent environ **2,7 Mo**.
- Les logos sont déjà légers dans l’ensemble ; leur impact est faible comparé aux personnages.
- Les images situées sous le premier écran utilisent déjà le chargement différé, mais le personnage principal est chargé immédiatement.

## Plan

1. Convertir les personnages et illustrations PNG en formats modernes **AVIF et WebP**, avec transparence conservée et réglages haute qualité.
2. Produire plusieurs dimensions adaptées au mobile, à la tablette et aux écrans haute densité, au lieu d’envoyer systématiquement les fichiers 1024–1536 px.
3. Utiliser `picture`, `srcset` et `sizes` afin que chaque appareil télécharge automatiquement la plus petite variante suffisamment nette.
4. Conserver le chargement prioritaire uniquement pour le personnage visible dès l’ouverture ; différer toutes les illustrations plus basses dans la page avec décodage asynchrone.
5. Convertir les polices Manrope de TTF vers WOFF2 et ne précharger que la graisse réellement nécessaire au premier affichage.
6. Conserver les SVG légers des moyens de paiement et optimiser seulement les PNG/WebP surdimensionnés, sans modifier leur apparence ni le fond sombre animé du bandeau.
7. Externaliser les médias optimisés via le stockage CDN du projet, puis retirer les fichiers binaires lourds du dépôt.
8. Vérifier visuellement la landing sur ordinateur et mobile, contrôler l’absence de décalage de mise en page, puis mesurer le poids transféré avant/après.

## Objectif

Réduire fortement les **11 Mo actuels**, avec une cible prudente d’environ **2 à 3 Mo au total** et nettement moins lors du premier affichage, sans perte visuelle perceptible.
