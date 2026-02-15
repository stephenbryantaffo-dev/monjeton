

## Integration du calendrier avec presets dans le Dashboard

### Probleme de compatibilite

Le composant fourni utilise l'API de **react-day-picker v9** (classNames comme `month_caption`, `button_previous`, `day_button`, etc.), mais le projet utilise **react-day-picker v8**. Il faut donc adapter le composant pour fonctionner avec la v8, ou bien le reimplementer avec l'API v8 tout en conservant le style premium.

### Approche retenue

Creer un nouveau composant `calendar-with-presets.tsx` adapte a la v8 et l'integrer dans le Dashboard avec des presets en francais.

### Fichiers concernes

1. **Creer `src/components/ui/calendar-with-presets.tsx`**
   - Composant base sur `DayPicker` v8 (API existante)
   - Styles premium : coins arrondis, indicateur "today" avec un point vert, selection en vert (`bg-primary`)
   - Range selection stylee : `range_start` et `range_end` en `bg-primary` arrondi, `range_middle` en `bg-primary/20`
   - Sidebar de presets integree directement dans le composant

2. **Modifier `src/pages/Dashboard.tsx`**
   - Remplacer le `Calendar` actuel dans le `PopoverContent` par le nouveau composant avec presets
   - Ajouter des presets en francais adaptes au contexte financier :
     - Aujourd'hui
     - Hier
     - 7 derniers jours
     - 14 derniers jours
     - 30 derniers jours
     - Ce mois
     - Mois dernier
   - Quand un preset est clique, mettre a jour `customRange` et fermer le popover
   - Quand une plage est selectionnee manuellement sur le calendrier, meme comportement qu'actuellement (ferme a la selection de la 2e date)

### Details techniques

**`calendar-with-presets.tsx`** : Le composant encapsulera :
- A gauche : une liste de boutons preset (scrollable si necessaire)
- A droite : le calendrier `DayPicker` en mode `range`
- Sur mobile : layout empile (presets en haut, calendrier en dessous)
- Utilisation des classNames v8 (`day_selected`, `day_range_middle`, `day_today`, `nav_button`, etc.)
- Couleurs : `bg-primary` pour la selection (vert du theme), `bg-primary/10` pour today, `bg-primary/20` pour le milieu de la plage

**`Dashboard.tsx`** :
- Import du nouveau composant a la place de `Calendar`
- Le `PopoverContent` sera elargi (`w-auto min-w-[320px]`) pour accueillir le layout presets + calendrier
- Les fonctions `subDays`, `startOfMonth`, `endOfMonth` de `date-fns` (deja installe) seront utilisees pour calculer les plages des presets
- Aucune nouvelle dependance NPM necessaire -- tout est deja installe

### Aucun changement de base de donnees

Le filtrage reste cote client/requete Supabase existante, aucune migration necessaire.

