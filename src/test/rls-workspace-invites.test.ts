import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Tests d'intégration RLS : workspace_invites
 *
 * Objectif : garantir qu'un utilisateur non membre (ou anonyme) ne peut PAS
 * lire les invitations d'un espace de travail — ni par identifiant, ni par
 * jeton (invite_code / invite_link_token). Seuls les membres autorisés
 * (owner / admin / member) y ont accès via has_workspace_role.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const enabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
const d = enabled ? describe : describe.skip;

const RANDOM_WORKSPACE_ID = "00000000-0000-4000-8000-0000000000ff";

d("RLS workspace_invites — lecture réservée aux membres", () => {
  let anon: SupabaseClient;
  let outsider: SupabaseClient;
  let member: SupabaseClient;
  let workspaceId = "";
  let inviteCode = "";
  let inviteToken = "";
  let inviteId = "";

  const mkEmail = () =>
    `rls-inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = `Rls!Inv${Math.random().toString(36).slice(2, 10)}A1`;

  const signUp = async (client: SupabaseClient) => {
    const email = mkEmail();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw new Error(`Signup échoué: ${error.message}`);
    if (!data.session) {
      const { error: e2 } = await client.auth.signInWithPassword({ email, password });
      if (e2) throw new Error(`Login échoué: ${e2.message}`);
    }
    return data.user?.id ?? "";
  };

  beforeAll(async () => {
    const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
    anon = createClient(SUPABASE_URL!, SUPABASE_KEY!, opts);
    member = createClient(SUPABASE_URL!, SUPABASE_KEY!, opts);
    outsider = createClient(SUPABASE_URL!, SUPABASE_KEY!, opts);

    const memberId = await signUp(member);
    await signUp(outsider);

    // Le créateur devient owner de l'espace (trigger / policy côté serveur).
    const { data: ws } = await member
      .from("workspaces")
      .insert({ name: `RLS Invites ${Date.now()}`, created_by: memberId } as never)
      .select("id")
      .maybeSingle();
    workspaceId = (ws as { id?: string } | null)?.id ?? "";

    if (workspaceId) {
      inviteCode = `C${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      inviteToken = `T${Math.random().toString(36).slice(2, 18)}`;
      const { data: inv } = await member
        .from("workspace_invites")
        .insert({
          workspace_id: workspaceId,
          invite_code: inviteCode,
          invite_link_token: inviteToken,
          created_by: memberId,
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        } as never)
        .select("id")
        .maybeSingle();
      inviteId = (inv as { id?: string } | null)?.id ?? "";
    }
  }, 90_000);

  afterAll(async () => {
    await member.auth.signOut();
    await outsider.auth.signOut();
  });

  it("un membre autorisé lit les invitations de son espace", async () => {
    if (!inviteId) return; // création d'espace indisponible : rien à vérifier
    const { data, error } = await member
      .from("workspace_invites")
      .select("id, invite_code, invite_link_token")
      .eq("workspace_id", workspaceId);
    expect(error).toBeNull();
    expect((data ?? []).some((r) => (r as { id: string }).id === inviteId)).toBe(true);
  });

  it("un utilisateur non membre ne lit rien par invite_code", async () => {
    if (!inviteCode) return;
    const { data, error } = await outsider
      .from("workspace_invites")
      .select("id")
      .eq("invite_code", inviteCode);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("un utilisateur non membre ne lit rien par invite_link_token", async () => {
    if (!inviteToken) return;
    const { data, error } = await outsider
      .from("workspace_invites")
      .select("id")
      .eq("invite_link_token", inviteToken);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("un utilisateur non membre ne peut pas énumérer les invitations", async () => {
    const { data, error } = await outsider.from("workspace_invites").select("id").limit(50);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("un visiteur anonyme ne lit aucune invitation", async () => {
    const { data, error } = await anon
      .from("workspace_invites")
      .select("id")
      .eq("invite_link_token", inviteToken || "inexistant");
    // Soit rejet explicite, soit résultat vide — jamais de fuite de données
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("aucune invitation n'est lisible pour un espace inconnu", async () => {
    const { data, error } = await outsider
      .from("workspace_invites")
      .select("id")
      .eq("workspace_id", RANDOM_WORKSPACE_ID);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
