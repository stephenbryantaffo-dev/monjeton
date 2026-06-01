# Page de gestion d'abonnement utilisateur

Créer une vraie page où l'utilisateur voit l'état de son abonnement Jèko et peut agir dessus, au lieu d'envoyer directement vers `/subscribe`.

## Parcours

- Dans **Settings**, remplacer le lien "Abonnement → /subscribe" par "Mon abonnement → /settings/subscription".
- Sur la nouvelle page :
  - Si l'utilisateur a un abonnement actif → afficher l'état du plan + historique + actions.
  - Sinon → afficher un encart "Aucun abonnement actif" avec un CTA vers `/subscribe`.

## Contenu de la page `/settings/subscription`

1. **Carte "Plan actuel"**
   - Badge plan (Gratuit / Pro / Ultra Pro) avec couleur cohérente (`neon-glow` pour Pro, gradient pour Ultra).
   - Prix mensuel localisé.
   - Statut (`active` / `inactive`) + date de dernière activation (`subscriptions.updated_at`).
   - Liste courte des avantages du plan.

2. **Actions**
   - Bouton "Renouveler" (toujours visible si abo actif) → ouvre Jèko avec le même plan.
   - Bouton "Passer à Ultra Pro" (visible uniquement si plan = Pro) → ouvre Jèko Max.
   - Bouton secondaire "Voir tous les plans" → `/subscribe`.
   - Lien discret "Un problème de paiement ?" → ouvre WhatsApp support (numéro déjà utilisé ailleurs si présent, sinon mailto).

3. **Historique des paiements Jèko de l'utilisateur**
   - Liste des entrées de `jeko_payments` où `matched_user_id = auth.uid()`, triée desc.
   - Pour chaque ligne : date, montant FCFA, plan, numéro téléphone masqué (`**** 1234`), badge "Reçu".
   - État vide propre ("Aucun paiement enregistré pour le moment").

## Détails techniques

- **RLS à ajouter** sur `jeko_payments` : nouvelle policy SELECT `authenticated` `USING (matched_user_id = auth.uid())`. La policy admin existante reste. Pas d'INSERT/UPDATE/DELETE côté client (webhook s'en charge via service_role).
- **Lecture abonnement** : `supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()` (policy SELECT déjà OK).
- **Renouvellement** : réutiliser `openJekoPro` / `openJekoMax` depuis `src/lib/jeko.ts`.
- **Route** : ajouter `/settings/subscription` dans `src/App.tsx` sous `ProtectedRoute` + `OnboardingGuard`.
- **Composants** : nouveau fichier `src/pages/SubscriptionManage.tsx` utilisant `DashboardLayout` (titre "Mon abonnement"), `glass-card`, skeletons pendant chargement, Framer Motion comme le reste de l'app.
- **Settings.tsx** : changer le `path: "/subscribe"` du item Abonnement en `/settings/subscription` et renommer le label en "Mon abonnement".
- **SEO** : `useDocumentMeta` avec title/description appropriés.
- **i18n monétaire** : utiliser `formatMoney` existant + `useCountry` pour conversion XOF.

## Hors scope (à proposer ensuite si tu veux)

- Expiration automatique 30 jours + cron `pg_cron` pour passer `status='expired'`.
- Notifications J-3 avant expiration.
- Page admin `/admin/payments` pour réconcilier les paiements `matched_user_id IS NULL`.

Dis-moi si je passe en build, ou si tu veux ajuster le scope (par ex. ajouter dès maintenant l'expiration auto).
