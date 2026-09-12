import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "get_financial_summary",
  title: "Résumé financier du mois",
  description:
    "Retourne les revenus, dépenses, solde et le détail par catégorie pour un mois donné (mois courant par défaut).",
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
    const endDate = new Date(Date.UTC(y, m, 0));
    const end = endDate.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("transactions")
      .select("type, amount, categories(name)")
      .gte("date", start)
      .lte("date", end)
      .limit(2000);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    let income = 0;
    let expense = 0;
    const byCategory: Record<string, number> = {};
    for (const t of (data ?? []) as any[]) {
      const amount = Number(t.amount) || 0;
      if (t.type === "income") {
        income += amount;
      } else {
        expense += amount;
        const name = t.categories?.name ?? "Sans catégorie";
        byCategory[name] = (byCategory[name] ?? 0) + amount;
      }
    }

    const summary = {
      period: { month: m, year: y, from: start, to: end },
      income,
      expense,
      balance: income - expense,
      expensesByCategory: Object.entries(byCategory)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
