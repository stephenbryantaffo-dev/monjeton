

## Remplacement du selecteur de periode sur le Dashboard

### Objectif
Transformer la barre de selection de periode actuelle (`Semaine | Mois | Annee`) en un nouveau systeme plus pratique : `Hier | Aujourd'hui | [icone calendrier]`.

### Ce qui change visuellement

```text
AVANT :  [ Semaine ] [ Mois ] [ Annee ]

APRES :  [  Hier  ] [ Aujourd'hui ] [ icone calendrier ]
```

Le troisieme bouton affichera une icone `CalendarIcon` de Lucide. En cliquant dessus, un **Popover** s'ouvrira avec un **calendrier** (composant `Calendar` de shadcn) permettant de choisir une date ou un intervalle personnalise.

### Details techniques

**Fichier modifie** : `src/pages/Dashboard.tsx`

1. **Constantes** : Remplacer `const periods = ["Semaine", "Mois", "Annee"]` par une logique a 3 modes :
   - Mode 0 = "Hier" (filtre sur la date d'hier)
   - Mode 1 = "Aujourd'hui" (filtre sur la date du jour) -- selectionne par defaut
   - Mode 2 = "Calendrier" (date/intervalle personnalise via un date picker)

2. **Logique de filtrage (useEffect)** : Adapter le calcul de `startDate` et ajouter un `endDate` :
   - **Hier** : `startDate = endDate = hier`
   - **Aujourd'hui** : `startDate = endDate = aujourd'hui`
   - **Calendrier** : utiliser les dates selectionnees par l'utilisateur (nouvel etat `customDate`)

3. **Requete Supabase** : Ajouter un filtre `.lte("date", endDate)` en plus du `.gte("date", startDate)` existant pour borner correctement l'intervalle.

4. **Nouvel etat** : Ajouter `const [customDate, setCustomDate] = useState<Date | undefined>()` pour stocker la date choisie dans le calendrier.

5. **UI du troisieme bouton** : Remplacer le texte "Annee" par l'icone `CalendarIcon` de Lucide, entoure d'un composant `Popover` + `PopoverContent` contenant le `Calendar` de shadcn. Quand une date est selectionnee, le bouton affichera la date formatee (ex: "15 fev") a la place de l'icone.

6. **Imports supplementaires** :
   - `CalendarIcon` depuis `lucide-react`
   - `Calendar` depuis `@/components/ui/calendar`
   - `Popover`, `PopoverTrigger`, `PopoverContent` depuis `@/components/ui/popover`

7. **Trend modes** : Adapter `trendModes` pour correspondre aux nouveaux termes (ex: `["Jour", "Semaine"]`).

8. **Couleurs** : Aucun changement -- le bouton actif gardera le style `gradient-primary text-primary-foreground` existant, et le calendrier utilisera les couleurs shadcn deja configurees.

