# Sélecteur de langue illisible en thème clair

## Problème

Le bloc « Langue de l'application » (`src/components/settings/LanguageSelector.tsx`) utilise des couleurs codées en dur pour le mode sombre : texte blanc, fonds `white/[0.02]`, bordures `white/8`. Sur les thèmes Blanc et Crème, le texte blanc sur fond clair devient invisible (visible sur la capture envoyée), alors que le reste de la page Paramètres suit bien le thème.

## Correction

Remplacer dans ce composant toutes les couleurs codées en dur par les tokens sémantiques déjà utilisés ailleurs :

- Carte : `bg-card` / `border-border` au lieu de `bg-white/[0.02]` + `border-white/8`
- Titre : `text-foreground` au lieu de `text-white`
- Sous-titres et note de bas de bloc : `text-muted-foreground` au lieu de `text-white/50` et `text-white/40`
- Option non sélectionnée : fond `bg-muted/30`, bordure `border-border`, texte `text-foreground`, survol `hover:bg-muted/50`
- Option sélectionnée : conserver l'accent vert via `bg-primary/10`, `border-primary/40`, texte et icône `text-primary` (le token `--primary` est déjà décliné par thème, donc vert vif en sombre et vert profond lisible en clair)

Aucun changement de logique ni de comportement : seules les classes de présentation changent. Le rendu en mode sombre reste identique.

## Vérification

Contrôler visuellement le bloc en Sombre, Blanc et Crème depuis Paramètres, et vérifier qu'aucune autre carte de la page n'utilise encore `text-white` codé en dur.
