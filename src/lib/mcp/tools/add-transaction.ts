import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "add_transaction",
  title: "Ajouter une transaction",
  description:
    "Enregistre une dépense ou un revenu pour l'utilisateur connecté. La catégorie et le portefeuille sont optionnels et retrouvés par leur nom.",
  inputSchema: {
    amount: z.number().positive().describe("Montant (entier positif, devise du compte)."),
    type: z.enum(["expense", "income"]).default("expense").describe("Dépense ou revenu."),
    note: z.string().trim().max(200).optional().describe("Libellé ou note."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date (AAAA-MM-JJ), aujourd'hui par défaut."),
    category: z.string().trim().max(100).optional().describe("Nom d'une catégorie existante."),
    wallet: z.string().trim().max(100).optional().describe("Nom d'un portefeuille existant."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ amount, type, note, date, category, wallet }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const userId = ctx.getUserId();
    if (!userId) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let categoryId: string | null = null;
    if (category) {
      const { data } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", category)
        .limit(1)
        .maybeSingle();
      categoryId = data?.id ?? null;
    }

    let walletId: string | null = null;
    if (wallet) {
      const { data } = await supabase
        .from("wallets")
        .select("id")
        .ilike("wallet_name", wallet)
        .limit(1)
        .maybeSingle();
      walletId = data?.id ?? null;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        amount,
        type: type ?? "expense",
        note: note ?? null,
        date: date ?? new Date().toISOString().slice(0, 10),
        category_id: categoryId,
        wallet_id: walletId,
      })
      .select("id, date, type, amount, note")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `Transaction enregistrée : ${JSON.stringify(data)}` }],
      structuredContent: {
        transaction: data,
        categoryMatched: category ? categoryId !== null : null,
        walletMatched: wallet ? walletId !== null : null,
      },
    };
  },
});
