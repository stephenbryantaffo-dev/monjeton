export interface SpendingPrediction {
  category: string;
  avgMonthly: number;
  currentMonth: number;
  predictedEndOfMonth: number;
  trend: "up" | "down" | "stable";
  daysLeft: number;
  confidence: "low" | "medium" | "high";
  budgetAmount?: number;
}

export const calculatePredictions = (
  transactions: any[],
  categoryBudgets: any[]
): SpendingPrediction[] => {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - currentDay;
  const daysPassed = currentDay;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Historical data grouped by category+month
  const historicalByCategory: Record<string, number[]> = {};
  transactions
    .filter(t => t.type === "expense" && new Date(t.date) >= threeMonthsAgo)
    .forEach(t => {
      const cat = t.categories?.name || "Autre";
      if (!historicalByCategory[cat]) historicalByCategory[cat] = [];
      historicalByCategory[cat].push(Number(t.amount));
    });

  const currentMonthStr = now.toISOString().substring(0, 7);
  const currentMonthTx = transactions.filter(
    t => t.type === "expense" && t.date.startsWith(currentMonthStr)
  );

  const predictions: SpendingPrediction[] = [];

  categoryBudgets.forEach(budget => {
    const catName = budget.category?.name || budget.categories?.name || "Autre";
    const budgetAmount = Number(budget.budget_amount);

    const currentMonthSpent = currentMonthTx
      .filter(t => (t.categories?.name || "Autre") === catName)
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

    const historicalData = historicalByCategory[catName] || [];
    const avgMonthly = historicalData.length > 0
      ? historicalData.reduce((a, b) => a + b, 0) / 3
      : 0;

    const dailyRate = daysPassed > 0 ? currentMonthSpent / daysPassed : 0;
    const predictedEndOfMonth = currentMonthSpent + dailyRate * daysLeft;

    const trend: "up" | "down" | "stable" =
      predictedEndOfMonth > avgMonthly * 1.1
        ? "up"
        : predictedEndOfMonth < avgMonthly * 0.9
          ? "down"
          : "stable";

    const confidence: "low" | "medium" | "high" =
      historicalData.length >= 9
        ? "high"
        : historicalData.length >= 3
          ? "medium"
          : "low";

    predictions.push({
      category: catName,
      avgMonthly,
      currentMonth: currentMonthSpent,
      predictedEndOfMonth,
      trend,
      daysLeft,
      confidence,
      budgetAmount,
    });
  });

  return predictions.sort((a, b) => b.predictedEndOfMonth - a.predictedEndOfMonth);
};
