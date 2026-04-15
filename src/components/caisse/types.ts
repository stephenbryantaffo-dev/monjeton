export interface CaisseData {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  contribution_amount: number;
  frequency: string;
  total_collected: number;
  total_spent: number;
  created_at: string;
}

export interface CaisseMember {
  id: string;
  caisse_id: string;
  name: string;
  phone: string | null;
  status: string; // 'active' | 'removed' | 'suspended'
  created_at: string;
}

export interface CaisseCotisation {
  id: string;
  caisse_id: string;
  member_id: string;
  amount: number;
  cotisation_date: string;
  cycle_label: string | null;
  note: string | null;
  status: string; // 'confirmed' | 'cancelled' | 'partial'
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface CaisseMemberHistory {
  id: string;
  caisse_id: string;
  member_id: string;
  action: string;
  reason: string | null;
  performed_by: string;
  created_at: string;
}

export interface CaisseDepense {
  id: string;
  caisse_id: string;
  label: string;
  amount: number;
  category: string | null;
  depense_date: string;
  beneficiaire: string | null;
  note: string | null;
  created_at: string;
}

export const FREQ_LABELS_CAISSE: Record<string, string> = {
  weekly: "Hebdomadaire",
  monthly: "Mensuelle",
  quarterly: "Trimestrielle",
  custom: "Personnalisée",
};

export const DEPENSE_CATEGORIES = [
  { id: "location_vehicule", label: "🚌 Location véhicule" },
  { id: "location_lieu", label: "🏟️ Location lieu/terrain" },
  { id: "evenement", label: "🎉 Événement / Fête" },
  { id: "urgence", label: "🆘 Urgence" },
  { id: "investissement", label: "📈 Investissement" },
  { id: "autre", label: "📦 Autre" },
] as const;

export const DEPENSE_CAT_LABELS: Record<string, string> = Object.fromEntries(
  DEPENSE_CATEGORIES.map((c) => [c.id, c.label])
);
