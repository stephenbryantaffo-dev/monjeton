Je vais corriger le problème au niveau du routage/navigation, pas seulement l’apparence de la page.

Plan :
1. Remplacer le lien SPA fragile de “Mon abonnement” par une navigation explicite vers `/settings/subscription`, pour éviter qu’un clic soit interprété comme retour vers `/`.
2. Sécuriser la page `/settings/subscription` pour qu’elle affiche toujours son contenu même si une requête d’usage échoue, au lieu de rester bloquée ou de provoquer un comportement confus.
3. Ajouter un bouton de retour clair vers “Plus” dans la page abonnement, sans dépendre de `navigate(-1)` qui peut renvoyer à l’accueil selon l’historique du navigateur.
4. Vérifier que la route `/settings/subscription` est bien accessible depuis le menu “Plus” et qu’elle ne renvoie plus à l’accueil.