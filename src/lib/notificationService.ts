import { supabase } from "@/integrations/supabase/client";

/**
 * After a transaction is saved, check budgets and wallet balances
 * and create notifications if thresholds are crossed.
 */
export async function checkAndCreateNotifications(
  userId: string,
  transactionType: string,
  categoryId: string | null,
  walletId: string | null
) {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1) Budget overspend check
    if (transactionType === "expense" && categoryId) {
      const [budgetRes, spentRes, catRes] = await Promise.all([
        supabase
          .from("category_budgets")
          .select("budget_amount")
          .eq("user_id", userId)
          .eq("category_id", categoryId)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "expense")
          .eq("category_id", categoryId)
          .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
          .lte("date", `${year}-${String(month).padStart(2, "0")}-31`),
        supabase
          .from("categories")
          .select("name")
          .eq("id", categoryId)
          .maybeSingle(),
      ]);

      const budget = budgetRes.data?.budget_amount;
      const categoryName = catRes.data?.name || "Catégorie";

      if (budget && spentRes.data) {
        const totalSpent = spentRes.data.reduce((s, t) => s + Number(t.amount), 0);
        const pct = (totalSpent / Number(budget)) * 100;
        const today = now.toISOString().split("T")[0];

        if (pct >= 100) {
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("type", "budget_exceeded")
            .ilike("title", `%${categoryName}%`)
            .gte("created_at", today);

          if (!count || count === 0) {
            await supabase.from("notifications").insert({
              user_id: userId,
              type: "budget_exceeded",
              title: `🚨 Budget ${categoryName} dépassé`,
              message: `Vous avez dépensé ${totalSpent.toLocaleString("fr-FR")} F sur un budget de ${Number(budget).toLocaleString("fr-FR")} F ce mois (${Math.round(pct)}%).`,
            });
          }
        } else if (pct >= 80) {
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("type", "budget_warning")
            .ilike("title", `%${categoryName}%`)
            .gte("created_at", today);

          if (!count || count === 0) {
            await supabase.from("notifications").insert({
              user_id: userId,
              type: "budget_warning",
              title: `⚠️ Budget ${categoryName} à ${Math.round(pct)}%`,
              message: `Il ne reste que ${(Number(budget) - totalSpent).toLocaleString("fr-FR")} F sur votre budget ${categoryName} de ${Number(budget).toLocaleString("fr-FR")} F.`,
            });
          }
        }
      }
    }

    // 2) Low wallet balance check
    if (walletId) {
      const [walletRes, incomeRes, expenseRes] = await Promise.all([
        supabase
          .from("wallets")
          .select("wallet_name, initial_balance")
          .eq("id", walletId)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("wallet_id", walletId)
          .eq("type", "income"),
        supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("wallet_id", walletId)
          .eq("type", "expense"),
      ]);

      if (walletRes.data) {
        const initial = Number(walletRes.data.initial_balance) || 0;
        const totalIncome = (incomeRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
        const totalExpense = (expenseRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
        const balance = initial + totalIncome - totalExpense;

        if (balance < 10000) {
          const today = now.toISOString().split("T")[0];
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("type", "low_balance")
            .gte("created_at", today);

          if (!count || count === 0) {
            await supabase.from("notifications").insert({
              user_id: userId,
              type: "low_balance",
              title: `💰 Solde ${walletRes.data.wallet_name} bas`,
              message: `Il ne reste que ${balance.toLocaleString("fr-FR")} F sur ${walletRes.data.wallet_name}.`,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("checkAndCreateNotifications error:", err);
  }
}
