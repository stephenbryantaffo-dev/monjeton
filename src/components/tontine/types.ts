export interface TontineData {
  id: string;
  user_id: string;
  name: string;
  frequency: string;
  custom_frequency_days: number | null;
  contribution_amount: number;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
}

export interface TontineMember {
  id: string;
  tontine_id: string;
  name: string;
  phone: string | null;
  is_owner: boolean;
  created_at: string;
}

export interface TontineCycle {
  id: string;
  tontine_id: string;
  cycle_number: number;
  period_label: string;
  start_date: string;
  end_date: string;
  total_expected: number;
  total_collected: number;
  status: string;
  created_at: string;
}

export interface TontinePayment {
  id: string;
  cycle_id: string;
  member_id: string;
  amount_paid: number;
  payment_date: string;
  note: string | null;
  created_at: string;
}

export const FREQ_LABELS: Record<string, string> = {
  weekly: "Hebdomadaire",
  monthly: "Mensuelle",
  quarterly: "Trimestrielle",
  annual: "Annuelle",
  custom: "Personnalisée",
};

export const FREQ_ICONS: Record<string, string> = {
  weekly: "📅",
  monthly: "📆",
  quarterly: "🗓️",
  annual: "📇",
  custom: "⚙️",
};

export const FREQ_BADGE_CLASSES: Record<string, string> = {
  weekly: "bg-blue-500/15 text-blue-400",
  monthly: "bg-emerald-500/15 text-emerald-400",
  quarterly: "bg-amber-500/15 text-amber-400",
  annual: "bg-purple-500/15 text-purple-400",
  custom: "bg-muted text-muted-foreground",
};
