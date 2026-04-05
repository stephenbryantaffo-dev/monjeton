import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = now.getDate();
    const daysLeft = daysInMonth - currentDay;

    // Only auto-save on last 2 days of month
    if (daysLeft > 1) {
      return new Response(JSON.stringify({ message: "Not end of month yet", daysLeft }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users with category budgets this month
    const { data: budgets } = await supabase
      .from("category_budgets")
      .select("user_id, category_id, budget_amount, categories:category_id(name)")
      .eq("month", month)
      .eq("year", year);

    if (!budgets || budgets.length === 0) {
      return new Response(JSON.stringify({ message: "No budgets found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group budgets by user
    const userBudgets: Record<string, any[]> = {};
    budgets.forEach((b: any) => {
      if (!userBudgets[b.user_id]) userBudgets[b.user_id] = [];
      userBudgets[b.user_id].push(b);
    });

    let savedCount = 0;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    for (const [userId, userBuds] of Object.entries(userBudgets)) {
      // Get current month transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, category_id, categories:category_id(name)")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      if (!transactions) continue;

      // Get 3-month historical data
      const threeMonthsAgo = new Date(year, month - 4, 1).toISOString().split("T")[0];
      const { data: historicalTx } = await supabase
        .from("transactions")
        .select("amount, category_id, categories:category_id(name)")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", threeMonthsAgo)
        .lt("date", monthStart)
        .limit(1000);

      const rows: any[] = [];

      for (const budget of userBuds) {
        const catName = (budget as any).categories?.name || "Autre";
        const budgetAmount = Number(budget.budget_amount);

        const currentSpent = transactions
          .filter((t: any) => t.category_id === budget.category_id)
          .reduce((s: number, t: any) => s + Number(t.amount), 0);

        const historicalAmounts = (historicalTx || [])
          .filter((t: any) => t.category_id === budget.category_id)
          .map((t: any) => Number(t.amount));
        const avgMonthly = historicalAmounts.length > 0
          ? historicalAmounts.reduce((a: number, b: number) => a + b, 0) / 3
          : 0;

        const dailyRate = currentDay > 0 ? currentSpent / currentDay : 0;
        const predicted = currentSpent + dailyRate * daysLeft;

        const accuracy = budgetAmount > 0
          ? Math.round(100 - (Math.abs(predicted - currentSpent) / budgetAmount) * 100)
          : null;

        rows.push({
          user_id: userId,
          month,
          year,
          category: catName,
          predicted_amount: Math.round(predicted),
          actual_amount: Math.round(currentSpent),
          budget_amount: budgetAmount,
          accuracy_pct: accuracy,
        });
      }

      if (rows.length > 0) {
        const { error } = await supabase
          .from("prediction_snapshots")
          .upsert(rows, { onConflict: "user_id,month,year,category" });
        if (!error) savedCount += rows.length;
      }
    }

    return new Response(JSON.stringify({ message: "OK", savedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
