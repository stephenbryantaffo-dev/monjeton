

## Probleme identifie

L'erreur **"new row violates row-level security policy for table workspaces"** est causee par le fait que la politique RLS d'insertion sur la table `workspaces` est de type **RESTRICTIVE** au lieu de **PERMISSIVE**.

En PostgreSQL, les politiques restrictives ne font que **reduire** l'acces accorde par les politiques permissives. S'il n'y a **aucune** politique permissive, alors aucun acces n'est accorde, meme si la politique restrictive devrait passer.

Ce meme probleme affecte probablement toutes les tables qui utilisent des politiques restrictives pour INSERT.

## Solution

Executer une migration SQL qui remplace les politiques RLS restrictives par des politiques **permissives** sur toutes les tables concernees :

- `workspaces` (INSERT)
- `workspace_members` (INSERT pour "Users can join workspace" et "Owner/admin can manage members")
- `workspace_invites` (INSERT)
- `workspace_chat_rooms` (INSERT)
- `workspace_chat_messages` (INSERT)
- `workspace_notifications` (INSERT)
- `transaction_attachments` (INSERT)

Pour chaque politique affectee :
1. DROP la politique existante (RESTRICTIVE)
2. Re-creer la meme politique en mode PERMISSIVE (sans le mot-cle `RESTRICTIVE`)

Les politiques SELECT, UPDATE et DELETE resteront inchangees car elles fonctionnent correctement en mode restrictif quand il y a deja d'autres politiques permissives pour le meme type d'operation.

## Details techniques

Exemple pour la table `workspaces` :

```sql
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);
```

Le mot-cle `TO authenticated` garantit que seuls les utilisateurs connectes peuvent inserer, et le `WITH CHECK` verifie que le `created_by` correspond bien a l'utilisateur connecte.

La meme transformation sera appliquee a toutes les politiques INSERT des autres tables listees ci-dessus.

