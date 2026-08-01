import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Tests d'intégration RLS : workspace_members
 *
 * Objectif : garantir qu'un utilisateur authentifié ne peut PAS s'auto-attribuer
 * un rôle (owner / admin / accountant) dans un espace de travail, ni rejoindre
 * un espace sans invitation active.
 *
 * Ces tests s'exécutent contre le backend réel avec la clé publique (anon),
 * donc uniquement sous RLS — exactement comme le client.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const enabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
const d = enabled ? describe : describe.skip;

const RANDOM_WORKSPACE_ID = "00000000-0000-4000-8000-0000000000ff";
const OTHER_USER_ID = "00000000-0000-4000-8000-0000000000aa";

d("RLS workspace_members — anti escalade de rôle", () => {
  let anon: SupabaseClient;
  let authed: SupabaseClient;
  let userId = "";
  const email = `rls-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = `Rls!Test${Math.random().toString(36).slice(2, 10)}A1`;

  beforeAll(async () => {
    anon = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    authed = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authed.auth.signUp({ email, password });
    if (error) throw new Error(`Signup échoué: ${error.message}`);
    userId = data.user?.id ?? "";
    if (!data.session) {
      const { error: signInError } = await authed.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(`Login échoué: ${signInError.message}`);
    }
  }, 60_000);

  afterAll(async () => {
    await authed.auth.signOut();
  });

  const insertMember = (client: SupabaseClient, payload: Record<string, unknown>) =>
    client.from("workspace_members").insert(payload as never).select();

  it("refuse l'auto-attribution du rôle owner", async () => {
    const { error } = await insertMember(authed, {
      workspace_id: RANDOM_WORKSPACE_ID,
      user_id: userId,
      role: "owner",
      display_name: "Attaquant",
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/row-level security|policy|permission/i);
  });

  it("refuse l'auto-attribution du rôle admin", async () => {
    const { error } = await insertMember(authed, {
      workspace_id: RANDOM_WORKSPACE_ID,
      user_id: userId,
      role: "admin",
      display_name: "Attaquant",
    });
    expect(error).not.toBeNull();
  });

  it("refuse l'auto-attribution du rôle accountant", async () => {
    const { error } = await insertMember(authed, {
      workspace_id: RANDOM_WORKSPACE_ID,
      user_id: userId,
      role: "accountant",
      display_name: "Attaquant",
    });
    expect(error).not.toBeNull();
  });

  it("refuse de rejoindre en tant que member sans invitation active", async () => {
    const { error } = await insertMember(authed, {
      workspace_id: RANDOM_WORKSPACE_ID,
      user_id: userId,
      role: "member",
      display_name: "Attaquant",
    });
    expect(error).not.toBeNull();
  });

  it("refuse d'insérer une ligne pour un autre utilisateur", async () => {
    const { error } = await insertMember(authed, {
      workspace_id: RANDOM_WORKSPACE_ID,
      user_id: OTHER_USER_ID,
      role: "member",
      display_name: "Victime",
    });
    expect(error).not.toBeNull();
  });

  it("refuse toute insertion pour un visiteur non authentifié", async () => {
    const { error } = await insertMember(anon, {
      workspace_id: RANDOM_WORKSPACE_ID,
      user_id: OTHER_USER_ID,
      role: "owner",
      display_name: "Anonyme",
    });
    expect(error).not.toBeNull();
  });

  it("ne laisse voir aucun membre d'un espace où l'utilisateur n'est pas membre", async () => {
    const { data, error } = await authed
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", RANDOM_WORKSPACE_ID);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("refuse la promotion de son propre rôle via update", async () => {
    const { data, error } = await authed
      .from("workspace_members")
      .update({ role: "owner" } as never)
      .eq("user_id", userId)
      .select();
    // Soit rejet explicite, soit aucune ligne affectée (RLS filtre la cible)
    if (!error) expect(data ?? []).toHaveLength(0);
  });
});
