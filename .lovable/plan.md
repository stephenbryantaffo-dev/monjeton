Plan : notifications push pour les rappels d’abonnement

Contexte actuel confirmé
- Le rappel quotidien de dépenses est déjà opérationnel (edge function `send-daily-reminders`, cron 8h/20h, push web via VAPID).
- L’edge function `subscription-reminders` existe déjà mais : elle ne gère que les notifications in-app (`public.notifications`), et son cron job actuel est rejeté en 401 car la méthode d’authentification ne correspond pas à ce que la fonction attend.

Objectif
Envoyer des notifications push aux utilisateurs 7 jours, 3 jours, 1 jour et le jour de l’expiration de leur abonnement, en complément des notifications in-app déjà présentes.

Travail à faire

1. Corriger l’authentification de `subscription-reminders`
   - Remplacer le système actuel (header Authorization Bearer vs service role) par le même mécanisme que `send-daily-reminders` : token lu depuis `public.system_config` (clé `subscription_reminders_cron_token`) ou variable d’env `REMINDERS_CRON_TOKEN`, passé en header `x-cron-token` ou en query `?token=`.
   - Mettre à jour le cron job `subscription-reminders-daily` pour envoyer ce token au lieu de la clé anon.
   - Stocker le token dans `public.system_config` s’il n’existe pas encore.

2. Ajouter l’envoi de push dans `subscription-reminders`
   - Importer `web-push` (même version que `send-daily-reminders`).
   - Configurer VAPID avec les variables d’env existantes (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
   - Pour chaque utilisateur à relancer (J-7, J-3, J-1, J0) ou pour chaque abonnement expiré :
     - récupérer ses abonnements actifs dans `push_subscriptions` ;
     - envoyer une notification push avec le titre/body adapté au stage (J7/J3/J1/J0/expiré) ;
     - nettoyer les endpoints retournant 404/410 (désactivés).
   - Conserver la création de la notification in-app dans `public.notifications`.

3. Respecter les contraintes existantes
   - Ne pas modifier les messages WhatsApp (laisser inchangés).
   - Ne pas toucher au système de rappels quotidiens — il reste indépendant.
   - Aucun changement UI dans un premier temps : on utilise les abonnements push déjà collectés par le bouton « Activer les rappels ».

4. Vérification
   - Vérifier la compilation TypeScript de l’edge function.
   - Déclencher un appel test authentifié et vérifier les logs de `subscription-reminders` pour s’assurer que les pushes partent sans 401.
   - Confirmer que les cron jobs quotidiens (dépenses) continuent de fonctionner.

Livrables
- Edge function `supabase/functions/subscription-reminders/index.ts` modifiée (auth corrigée + push ajouté).
- Mise à jour du cron job `subscription-reminders-daily`.
- Ligne ajoutée dans `public.system_config` pour le token si nécessaire.