import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_budgets",
  title: "Budgets du mois",
  description:
    "Liste les budgets par catégorie du mois demandé avec le montant déjà dépensé et le reste disponible.",
  inputSchema: {
    month: z.number().int().min(1).max(12).optional().describe("Mois (1-12)."),
    year: z.number().int().min(2000).max(2100).optional().describe("Année."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ month, year }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const now = new Date();
    const m = month ?? now.getUTCMonth() + 1;
    const y = year ?? now.getUTCFullYear();
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

    const { data: budgets, error: budgetError } = await supabase
      .from("category_budgets")
      .select("id, category_id, budget_amount, categories(name)")
      .eq("month", m)
      .eq("year", y)
      .limit(200);
    if (budgetError) return { content: [{ type: "text", text: budgetError.message }], isError: true };

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("type", "expense")
      .gte("date", start)
      .lte("date", end)
      .limit(2000);
    if (txError) return { content: [{ type: "text", text: txError.message }], isError: true };

    const spentByCategory: Record<string, number> = {};
    for (const t of (tx ?? []) as any[]) {
      if (!t.category_id) continue;
      spentByCategory[t.category_id] = (spentByCategory[t.category_id] ?? 0) + (Number(t.amount) || 0);
    }

    const rows = ((budgets ?? []) as any[]).map((b) => {
      const budget = Number(b.budget_amount) || 0;
      const spent = spentByCategory[b.category_id] ?? 0;
      return {
        category: b.categories?.name ?? "Sans catégorie",
        budget,
        spent,
        remaining: budget - spent,
        usedPercent: budget > 0 ? Math.round((spent / budget) * 100) : null,
      };
    });

    const payload = { period: { month: m, year: y }, budgets: rows };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
