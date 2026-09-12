import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_transactions",
  title: "Lister les transactions",
  description:
    "Liste les transactions (dépenses et revenus) de l'utilisateur connecté, filtrables par période et par type.",
  inputSchema: {
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date de début (AAAA-MM-JJ)."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date de fin (AAAA-MM-JJ)."),
    type: z.enum(["expense", "income"]).optional().describe("Filtrer par type."),
    limit: z.number().int().min(1).max(200).default(50).describe("Nombre maximum de lignes."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("transactions")
      .select("id, date, type, amount, note, merchant_name, categories(name), wallets(wallet_name)")
      .order("date", { ascending: false })
      .limit(limit ?? 50);

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []).map((t: any) => ({
      id: t.id,
      date: t.date,
      type: t.type,
      amount: Number(t.amount),
      note: t.note ?? t.merchant_name ?? null,
      category: t.categories?.name ?? null,
      wallet: t.wallets?.wallet_name ?? null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { transactions: rows, count: rows.length },
    };
  },
});
