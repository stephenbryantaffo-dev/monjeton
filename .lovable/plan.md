

# Plan d'implementation -- Track E-Money (fonctionnalites manquantes)

## Etat actuel du projet

Le projet a deja une base solide avec : Landing, Login/Signup, Dashboard, Transactions, Categories, Wallets, Reports, Savings, Debts, Assistant IA (avec streaming, vocaux, fichiers), Settings, Admin, Auth (email/password + reset), RLS, dark theme glassmorphism, bottom nav mobile-first.

## Ce qui manque (par priorite)

---

## PHASE A -- Tables et pages manquantes (priorite haute)

### A1. Nouvelles tables en base de donnees

Creer via migration SQL :

- **budgets** : id, user_id, month, year, total_budget, created_at
- **category_budgets** : id, user_id, category_id (FK categories), month, year, budget_amount, created_at
- **tontines** : id, user_id, name, contribution_amount, frequency, start_date, members_count, created_at
- **tontine_members** : id, tontine_id (FK tontines), member_name, member_phone, created_at
- **tontine_payments** : id, tontine_id (FK tontines), member_name, amount, date, status, created_at
- **receipt_scans** : id, user_id, scan_type, image_url, extracted_text, parsed_amount, parsed_date, parsed_merchant, parsed_wallet, parsed_type, parsed_category, status, created_at

RLS sur toutes les tables : utilisateur voit uniquement ses donnees, admin voit tout.

### A2. Storage bucket

- Creer le bucket `receipts` (public: false) pour stocker les photos de tickets et screenshots mobile money.

### A3. Nouvelles pages

| Route | Description |
|-------|------------|
| `/budgets` | Gestion des budgets mensuels globaux et par categorie, avec alertes depassement |
| `/tontine` | Creation/gestion de tontines, ajout de membres, suivi des paiements |
| `/scan` | Scanner de tickets de caisse et screenshots mobile money (OCR via Gemini) |

### A4. Mise a jour des routes

- Ajouter `/budgets`, `/tontine`, `/scan` dans `App.tsx` comme routes protegees
- Ajouter les liens correspondants dans la navigation (Settings ou DashboardLayout)

---

## PHASE B -- Fonctionnalites Pro manquantes (priorite moyenne)

### B1. Budgets avances (`/budgets`)

- Interface pour definir un budget mensuel global
- Budget par categorie avec barre de progression
- Alerte visuelle (toast + badge rouge) quand une categorie depasse son budget
- Calcul automatique base sur les transactions du mois en cours

### B2. Export PDF

- Bouton "Exporter PDF" sur la page Reports
- Generer un rapport mensuel/annuel en PDF cote client (utiliser une librairie comme jspdf ou html2canvas)
- Contenu : resume revenus/depenses, graphique par categorie, liste des transactions

### B3. Detection de fuites d'argent

- Section dans Reports ou Dashboard
- Identifier les petites depenses frequentes (ex: 3+ transactions <2000F dans la meme categorie par semaine)
- Afficher un message de conseil contextuel

### B4. Fonctionnalites de confidentialite

- **Code PIN** : demander un PIN au lancement de l'app (stocke en localStorage ou profil)
- **Mode discret** : bouton pour masquer tous les montants (remplacer par "***")

---

## PHASE C -- Ultra Pro (priorite basse, plus complexe)

### C1. Scan de tickets de caisse (`/scan`)

- Bouton pour prendre une photo ou uploader une image
- Upload vers le bucket `receipts/{user_id}/`
- Envoyer l'image a une Edge Function qui utilise Gemini (multimodal) pour extraire : montant, date, commercant, type
- Afficher les donnees extraites pour confirmation par l'utilisateur
- Si confirme, creer la transaction automatiquement

### C2. Scan de screenshots Mobile Money

- Meme logique que C1 mais pour les captures d'ecran Wave/Orange/MTN
- Detecter si c'est un envoi ou une reception (revenu/depense)
- Extraire montant, date, portefeuille

### C3. Tontine / Cotisation (`/tontine`)

- Creer une tontine (nom, montant, frequence, date de debut)
- Ajouter des membres (nom + telephone)
- Tracker les paiements de chaque membre
- Vue calendrier des echeances

### C4. Rappel WhatsApp pour dettes

- Bouton "Rappeler via WhatsApp" sur chaque dette de type "on me doit"
- Ouvre WhatsApp avec un message pre-rempli : "Salut [nom], tu me dois [montant] FCFA, stp n'oublie pas."
- Utilise le lien `https://wa.me/?text=...`

### C5. Saisie vocale de transaction

- Sur la page `/transactions/new`, ajouter un bouton micro
- L'utilisateur dit "J'ai depense 1500 en taxi"
- Envoyer au modele Gemini pour parser : montant, categorie, type
- Pre-remplir le formulaire avec les donnees extraites

---

## PHASE D -- Admin et polish

### D1. Admin Dashboard reel (`/admin`)

- Requetes Supabase pour afficher les vrais chiffres :
  - Nombre total d'utilisateurs (via profiles count)
  - Abonnements actifs (via subscriptions where status = 'active')
  - Total transactions (count)
  - Revenus mensuels estimes
- Proteger la route : verifier le role admin via `has_role()`

### D2. Modales de confirmation

- Ajouter des modales de confirmation (AlertDialog) avant chaque suppression (transactions, categories, wallets, debts, etc.)

### D3. Skeleton loaders

- Remplacer les etats de chargement actuels par des skeleton loaders pour une UX premium

### D4. Animations

- Ajouter des transitions Framer Motion sur les changements de page et les actions CRUD

---

## PHASE E -- Stripe (separe)

L'integration Stripe pour le paiement des abonnements necessite d'activer le connecteur Stripe. Pour l'instant, toutes les fonctionnalites sont deverrouillees. L'integration Stripe sera faite quand tu seras pret a passer en production.

---

## Details techniques

### Fichiers a creer
| Fichier | Description |
|---------|------------|
| `src/pages/Budgets.tsx` | Page budgets mensuels et par categorie |
| `src/pages/Tontine.tsx` | Page gestion des tontines |
| `src/pages/Scan.tsx` | Page OCR scanner de tickets |
| `supabase/functions/scan-receipt/index.ts` | Edge Function OCR via Gemini multimodal |

### Fichiers a modifier
| Fichier | Modifications |
|---------|------------|
| `src/App.tsx` | Ajouter les 3 nouvelles routes protegees |
| `src/pages/Settings.tsx` | Ajouter liens vers Budgets, Tontine, Scan |
| `src/pages/Reports.tsx` | Ajouter bouton Export PDF + section fuites |
| `src/pages/Admin.tsx` | Requetes reelles vers la DB |
| `src/pages/NewTransaction.tsx` | Bouton saisie vocale |
| `src/pages/Debts.tsx` | Bouton rappel WhatsApp |
| Toutes les pages avec suppression | Ajouter AlertDialog de confirmation |

### Ordre d'implementation recommande
1. Phase A (tables + pages) -- fondation
2. Phase B (budgets, PDF, fuites, confidentialite) -- valeur pro
3. Phase D (admin, modales, polish) -- qualite
4. Phase C (scan, tontine, WhatsApp, vocal) -- fonctionnalites avancees
5. Phase E (Stripe) -- monetisation

