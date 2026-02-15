

## Ajouter un lien "Installer l'app" dans les Parametres

Un nouveau lien sera ajoute dans la page Parametres, dirige vers `/install`, avec une icone de telechargement.

### Detail technique

**Fichier modifie : `src/pages/Settings.tsx`**
- Ajout d'une entree dans le tableau `menuItems` avec l'icone `Download` (de lucide-react), le label "Installer l'app" et le chemin `/install`
- Import de l'icone `Download` depuis lucide-react

Aucune autre modification necessaire.

