import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user with their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userId = user.id;

    // Delete user data from all tables (order matters for foreign keys)
    const tables = [
      "assistant_messages", "category_budgets", "monthly_summaries",
      "receipt_scans", "transaction_attachments", "transactions",
      "tontine_payments", "tontine_members", "tontines",
      "debts", "savings_goals", "budgets", "categories", "wallets",
      "workspace_notifications", "workspace_chat_messages",
      "workspace_members", "subscriptions", "profiles", "user_roles",
    ];

    for (const table of tables) {
      const col = ["tontine_payments", "tontine_members", "workspace_chat_messages",
        "workspace_notifications", "workspace_members", "transaction_attachments"]
        .includes(table) ? undefined : "user_id";
      
      if (table === "tontine_payments" || table === "tontine_members") {
        // Delete via tontine ownership
        const { data: tontines } = await adminClient.from("tontines").select("id").eq("user_id", userId);
        if (tontines?.length) {
          const ids = tontines.map(t => t.id);
          await adminClient.from(table).delete().in("tontine_id", ids);
        }
      } else if (table === "workspace_chat_messages") {
        await adminClient.from(table).delete().eq("sender_id", userId);
      } else if (table === "workspace_notifications" || table === "workspace_members") {
        await adminClient.from(table).delete().eq("user_id", userId);
      } else if (table === "transaction_attachments") {
        await adminClient.from(table).delete().eq("created_by", userId);
      } else {
        await adminClient.from(table).delete().eq("user_id", userId);
      }
    }

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Erreur lors de la suppression du compte" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error:", e);
    return new Response(JSON.stringify({ error: "Erreur de traitement" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
