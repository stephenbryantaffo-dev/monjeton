## Objectif

Transformer `/settings/subscription` en vrai tableau de bord d'abonnement où l'utilisateur voit d'un coup d'œil :
- Son **plan actuel** (Gratuit / Pro / Ultra Pro) avec badge bien visible
- Son **usage du mois** (scans IA, messages assistant) avec jauges
- La **prochaine échéance estimée** (basée sur le dernier paiement Jèko + 30 jours)
- Un **comparatif des 3 plans** pour décider d'upgrader
- L'**historique des paiements** (déjà existant, conservé)

## Modifications

### `src/pages/SubscriptionManage.tsx` — refonte du contenu

1. **Hero "Mon plan actuel"** (toujours affiché, même en Gratuit) :
   - Grand badge : Gratuit (gris), Pro (gradient lime), Ultra Pro (noir/or avec couronne)
   - Prix mensuel + date d'activation
   - Pour Gratuit : "Tu utilises Mon Jeton en mode découverte"
   - Pour actif : date de prochaine échéance estimée = `last_payment + 30j`

2. **Carte "Usage ce mois-ci"** (nouveau) :
   - Scans IA utilisés : `X / 5` (Gratuit) · `X / 50` (Pro) · `X / ∞` (Ultra)
     - Source : `SELECT count(*) FROM receipt_scans WHERE user_id = ? AND created_at >= début_du_mois`
   - Messages Assistant IA : `X` ce mois
     - Source : `SELECT count(*) FROM assistant_messages WHERE user_id = ? AND message_role = 'user' AND created_at >= début_du_mois`
   - Jauge `<Progress />` avec couleur qui passe au orange à 70%, rouge à 90%

3. **Carte "Comparer les plans"** (nouveau, collapsible) :
   - Tableau 3 colonnes : Gratuit · Pro · Ultra Pro
   - 5-6 lignes : Transactions, Scans IA/mois, Assistant IA, Rapports PDF, Support, Nouveautés
   - Plan actuel mis en évidence avec bordure neon
   - CTA "Passer à Pro" / "Passer à Ultra Pro" selon plan actuel

4. **Carte renouvellement** (si actif) :
   - "Prochain paiement estimé : 30 juin 2026"
   - Note : "Renouvelle avant cette date pour ne pas perdre l'accès Pro"
   - Bouton "Renouveler maintenant"

5. **Historique paiements** : conservé tel quel

### Code structurel

- Ajouter 2 requêtes parallèles dans le `useEffect` existant : count scans + count messages du mois
- Constante `PLAN_LIMITS = { Gratuit: 5, Pro: 50, "Ultra Pro": Infinity }`
- Composant `<UsageBar label, current, limit />` réutilisable
- Helper `nextRenewalDate(lastPaymentISO)` qui ajoute 30 jours

### Hors scope

- Pas de modification base de données (toutes les tables nécessaires existent : `subscriptions`, `jeko_payments`, `receipt_scans`, `assistant_messages`)
- Pas de modification du lien dans Settings (déjà bon : `/settings/subscription`)
- Pas de modification du routing dans App.tsx (route déjà présente)
- La publication sur monjeton.app reste à faire par l'utilisateur après validation
