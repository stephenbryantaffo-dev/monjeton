## Objectif

Envoyer une notification push (navigateur / PWA installée) à chaque utilisateur **deux fois par jour** — un rappel du matin et un rappel du soir — **uniquement s'il n'a encore enregistré aucune dépense pour la journée en cours**. La notif arrive même quand l'app est fermée, à condition que l'utilisateur ait installé la PWA (ou visité le site sur desktop) et accepté les notifications.

## Ce qu'on va construire

### 1. Base : abonnements push

Nouvelle table `push_subscriptions` (endpoint unique, clés `p256dh` + `auth`, `user_id`, `created_at`, préférences horaires optionnelles). RLS : chaque utilisateur ne voit et ne gère que ses propres abonnements ; `service_role` peut tout lire côté serveur pour envoyer les push.

### 2. Clés VAPID (identité du serveur push)

Le protocole Web Push exige une paire de clés VAPID (publique + privée). On les génère une fois avec la lib `web-push`, puis :
- clé publique → variable publique côté client (`VITE_VAPID_PUBLIC_KEY`)
- clé privée → secret Cloud (`VAPID_PRIVATE_KEY`) utilisé seulement par l'edge function

### 3. Service worker + permission côté app

- Ajout d'un fichier `public/sw.js` **dédié aux push** (kept minimal : handlers `push` et `notificationclick`, pas de cache d'app-shell — on n'ajoute pas d'offline, uniquement du push).
- Wrapper de registration guardé : n'enregistre pas dans l'éditeur Lovable ni en iframe preview, uniquement en prod / PWA installée.
- Nouveau composant `EnableNotificationsCard` affiché sur le Dashboard et dans les Paramètres : bouton "Activer les rappels quotidiens" qui demande la permission puis enregistre l'abonnement dans `push_subscriptions`.
- Bouton "Désactiver" qui supprime l'abonnement.

### 4. Edge function `send-daily-reminders`

Fonction serveur (Deno) qui :
1. Reçoit un paramètre `slot` = `"morning"` ou `"evening"`.
2. Récupère tous les abonnements actifs.
3. Pour chaque utilisateur, vérifie s'il a **déjà créé une transaction de type dépense aujourd'hui** (table `transactions`, `type = 'expense'`, `date = CURRENT_DATE`).
4. Si non → envoie une notif push via la lib `web-push` (esm.sh) avec un message adapté au slot :
   - matin : "Bonjour ! Pense à noter tes dépenses de la journée dès qu'elles arrivent."
   - soir : "N'oublie pas de saisir tes dépenses du jour dans Mon Jeton."
5. Nettoie les abonnements qui renvoient 404/410 (endpoints expirés).

`verify_jwt = false` (appel serveur uniquement, protégé par un secret partagé `REMINDERS_CRON_TOKEN`).

### 5. Planification (cron)

Via `pg_cron` + `pg_net`, deux entrées :
- `08:00 UTC` → appelle `send-daily-reminders?slot=morning`
- `20:00 UTC` → appelle `send-daily-reminders?slot=evening`

L'Afrique de l'Ouest étant à UTC+0 (Côte d'Ivoire, Sénégal, Mali…), 8 h UTC = 8 h locale.

### 6. Suppression du doublon avec le modal existant

Le Dashboard affiche déjà `DailyReminderModal` le soir quand il n'y a pas de dépense. On garde ce modal pour ceux qui n'ont pas installé/activé les push (fallback in-app), mais on l'atténue pour ceux qui ont activé les push (un seul rappel par soir).

## Détails techniques

**Fichiers créés**
- `public/sw.js` — service worker push-only (~40 lignes)
- `src/lib/pushNotifications.ts` — helpers (register SW, subscribe, unsubscribe, save to DB)
- `src/components/EnableNotificationsCard.tsx` — UI d'opt-in
- `supabase/functions/send-daily-reminders/index.ts` — envoi via `web-push` (esm.sh/web-push)

**Fichiers modifiés**
- `src/pages/Dashboard.tsx` — insertion de la carte d'opt-in en haut si permission non demandée
- `src/pages/Parametres.tsx` — section "Rappels quotidiens" avec toggle activer/désactiver
- `.env` — ajout de `VITE_VAPID_PUBLIC_KEY`

**Migration DB**
```text
push_subscriptions (
  id, user_id → auth.users, endpoint UNIQUE,
  p256dh, auth, user_agent, created_at, disabled_at
)
+ RLS user-scoped + GRANT authenticated / service_role
```

**Secrets à créer**
- `VAPID_PRIVATE_KEY` (généré côté serveur avec `web-push`)
- `REMINDERS_CRON_TOKEN` (aléatoire, pour authentifier le cron)

**Cron (inséré via l'outil insert, pas migration)**
```text
cron.schedule('reminders-morning', '0 8 * * *', ...POST /send-daily-reminders?slot=morning)
cron.schedule('reminders-evening', '0 20 * * *', ...POST /send-daily-reminders?slot=evening)
```

## Limites à connaître

- **iOS Safari** exige que la PWA soit **installée sur l'écran d'accueil** (iOS 16.4+) pour recevoir des notifications. Sur navigateur mobile Safari non installé, les push ne marchent pas — dans ce cas, le modal in-app reste le fallback.
- **Android & desktop Chrome / Firefox / Edge** : fonctionne dès que l'utilisateur accepte la permission, même sans installer.
- Les notifications ne partent que si l'appareil est allumé et connecté au réseau (les push sont mis en file par le navigateur sinon).
- L'heure est en **UTC** : 8 h et 20 h GMT. On peut plus tard rendre l'heure paramétrable par utilisateur, mais on part sur horaires fixes pour la V1.

## Étapes de mise en œuvre

1. Créer la table `push_subscriptions` + RLS + GRANT (migration).
2. Générer une paire VAPID, ajouter `VITE_VAPID_PUBLIC_KEY` en clair et `VAPID_PRIVATE_KEY` en secret.
3. Créer le service worker `public/sw.js` + les helpers client + le composant d'opt-in.
4. Intégrer la carte dans le Dashboard et dans Paramètres.
5. Écrire l'edge function `send-daily-reminders` (avec check "aucune dépense aujourd'hui").
6. Créer `REMINDERS_CRON_TOKEN` et planifier les deux cron jobs (8 h / 20 h UTC).
7. Tester : appel manuel de la fonction avec un slot, vérifier la réception et la déduplication (utilisateur qui a déjà une dépense → skip).
