# Simplifier et accélérer la fenêtre de paiement Jèko

## Modifications
- Retirer le numéro Mobile Money et sa validation de la fenêtre de paiement.
- Remplacer les cinq émojis par les logos existants, à 24 px, sans modifier la disposition.
- Ajouter les deux nouveaux textes demandés et un état de redirection avec indicateur de chargement.
- Réveiller la fonction de paiement par une requête OPTIONS à l’ouverture de la fenêtre.
- Utiliser `JEKO_STORE_ID` en priorité côté paiement, avec la recherche actuelle comme repli.
- Déployer la fonction mise à jour et vérifier son préchargement.

## Détails techniques
- Le rattachement reste basé sur l’identifiant du compte connecté ou l’e-mail du visiteur.
- Le secret `JEKO_STORE_ID` recevra l’identifiant actuel de la boutique, récupéré une seule fois via Jèko.
- Les erreurs de création continueront à s’afficher dans la fenêtre.

## Vérification
- Vérifier la compilation et l’absence d’erreurs dans l’aperçu.
- Tester l’ouverture, les logos, les champs affichés, l’état de chargement et la réponse OPTIONS.
- Fournir le diff des deux fichiers demandés.
