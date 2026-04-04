import { addDays, addMonths, addYears, endOfMonth, startOfMonth, format, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { TontineData } from "./types";

export const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

export function generateCycleInfo(
  tontine: TontineData,
  cycleNumber: number,
  membersCount: number,
  previousEndDate?: string
) {
  let startDate: Date;
  let endDate: Date;
  let periodLabel: string;

  if (cycleNumber === 1 || !previousEndDate) {
    startDate = parseISO(tontine.start_date);
  } else {
    startDate = addDays(parseISO(previousEndDate), 1);
  }

  switch (tontine.frequency) {
    case "weekly":
      endDate = addDays(startDate, 6);
      periodLabel = `Semaine ${cycleNumber} — ${format(startDate, "MMM yyyy", { locale: fr })}`;
      break;
    case "monthly":
      if (cycleNumber > 1) startDate = startOfMonth(startDate);
      endDate = endOfMonth(startDate);
      periodLabel = format(startDate, "MMMM yyyy", { locale: fr });
      periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
      break;
    case "quarterly":
      endDate = subDays(addMonths(startDate, 3), 1);
      periodLabel = `T${Math.ceil((startDate.getMonth() + 1) / 3)} ${startDate.getFullYear()}`;
      break;
    case "annual":
      endDate = subDays(addYears(startDate, 1), 1);
      periodLabel = `Année ${startDate.getFullYear()}`;
      break;
    case "custom":
      endDate = addDays(startDate, (tontine.custom_frequency_days || 30) - 1);
      periodLabel = `Cycle ${cycleNumber}`;
      break;
    default:
      endDate = endOfMonth(startDate);
      periodLabel = `Cycle ${cycleNumber}`;
  }

  return {
    cycle_number: cycleNumber,
    period_label: periodLabel,
    start_date: format(startDate, "yyyy-MM-dd"),
    end_date: format(endDate, "yyyy-MM-dd"),
    total_expected: membersCount * tontine.contribution_amount,
  };
}
