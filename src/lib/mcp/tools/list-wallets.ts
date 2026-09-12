import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_wallets_and_categories",
  title: "Portefeuilles et catégories",
  description:
    "Liste les portefeuilles et les catégories de l'utilisateur connecté, utiles pour renseigner une nouvelle transaction.",
  inputSchema: {
    kind: z.enum(["all", "wallets", "categories"]).default("all").describe("Ce qu'il faut retourner."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const want = kind ?? "all";

    const result: Record<string, unknown> = {};

    if (want === "all" || want === "wallets") {
      const { data, error } = await supabase
        .from("wallets")
        .select("id, wallet_name, currency, initial_balance")
        .limit(100);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      result.wallets = data ?? [];
    }

    if (want === "all" || want === "categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type")
        .limit(200);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      result.categories = data ?? [];
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
