Ajouter un lien **"Pour qui ?"** dans la barre de navigation de la landing page (tubelight nav), pointant vers la section existante `#for-who` (composant `ForWhoSection`).

## Changement

**Fichier :** `src/components/landing/Navbar.tsx`

Ajouter un nouvel item dans le tableau `tubelightItems`, inséré entre "Fonctionnalités" et "Scan AI" pour suivre l'ordre logique du parcours utilisateur :

- Libellé : `Pour qui ?`
- Cible : `#for-who` (id déjà présent dans `ForWhoSection.tsx`)
- Icône : `Users` (lucide-react)
- Comportement : scroll smooth via la fonction `scrollToEl` déjà en place

Ajouter `Users` à l'import depuis `lucide-react`.

Aucun autre fichier n'est modifié — la section cible existe déjà et le scroll fonctionnera automatiquement aussi bien sur la nav desktop (haut) que mobile (bas), puisque les deux utilisent le même tableau `tubelightItems`.