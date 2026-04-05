import type { SpendingPrediction } from "./predictions";

export interface BudgetAlert {
  category: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  level: "warning" | "danger" | "exceeded";
  message: string;
  predictedExceedDate?: string;
}

export const checkBudgetAlerts = (
  categoryBudgets: any[],
  transactions: any[],
  predictions: SpendingPrediction[]
): BudgetAlert[] => {
  const alerts: BudgetAlert[] = [];
  const now = new Date();
  const currentMonthStr = now.toISOString().substring(0, 7);

  categoryBudgets.forEach(budget => {
    const catName = budget.category?.name || budget.categories?.name || "Autre";
    const budgetAmount = Number(budget.budget_amount);
    if (budgetAmount <= 0) return;

    const spent = transactions
      .filter(
        t =>
          t.type === "expense" &&
          t.date.startsWith(currentMonthStr) &&
          (t.categories?.name || "Autre") === catName
      )
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

    const pct = (spent / budgetAmount) * 100;
    const prediction = predictions.find(p => p.category === catName);

    if (pct >= 100) {
      alerts.push({
        category: catName,
        budgetAmount,
        spent,
        percentage: pct,
        level: "exceeded",
        message: `Budget ${catName} dépassé de ${Math.round(pct - 100)}% !`,
      });
    } else if (pct >= 90) {
      alerts.push({
        category: catName,
        budgetAmount,
        spent,
        percentage: pct,
        level: "danger",
        message: `Plus que ${Math.round(budgetAmount - spent).toLocaleString("fr-FR")} FCFA restants en ${catName} !`,
      });
    } else if (pct >= 70 && prediction && prediction.predictedEndOfMonth > budgetAmount) {
      const dailyRate = now.getDate() > 0 ? spent / now.getDate() : 0;
      const daysToExceed = dailyRate > 0 ? Math.ceil((budgetAmount - spent) / dailyRate) : 999;
      const exceedDate = new Date();
      exceedDate.setDate(exceedDate.getDate() + daysToExceed);

      alerts.push({
        category: catName,
        budgetAmount,
        spent,
        percentage: pct,
        level: "warning",
        message: `À ce rythme, budget ${catName} dépassé vers le ${exceedDate.getDate()}/${exceedDate.getMonth() + 1}`,
        predictedExceedDate: exceedDate.toISOString().split("T")[0],
      });
    }
  });

  return alerts.sort((a, b) => b.percentage - a.percentage);
};
