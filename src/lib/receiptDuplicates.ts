import { supabase } from "@/integrations/supabase/client";

export interface DupScan {
  id: string;
  parsed_merchant?: string | null;
  parsed_amount?: number | null;
  parsed_date?: string | null;
}

const normalizeMerchant = (s?: string | null) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

const similarity = (a: DupScan, b: DupScan): number => {
  let score = 0;
  let checks = 0;

  if (a.parsed_amount != null && b.parsed_amount != null) {
    checks++;
    if (Math.abs(Number(a.parsed_amount) - Number(b.parsed_amount)) < 1) {
      score += 0.4;
    }
  }

  if (a.parsed_date && b.parsed_date) {
    checks++;
    const diff = Math.abs(
      new Date(a.parsed_date).getTime() - new Date(b.parsed_date).getTime()
    );
    if (diff <= 86400000) score += 0.35;
  }

  if (a.parsed_merchant && b.parsed_merchant) {
    checks++;
    const na = normalizeMerchant(a.parsed_merchant);
    const nb = normalizeMerchant(b.parsed_merchant);
    if (na && nb) {
      if (na === nb) score += 0.25;
      else if (na.includes(nb) || nb.includes(na)) score += 0.15;
    }
  }

  return checks === 0 ? 0 : score;
};

export interface DuplicatePair {
  scan1: DupScan;
  scan2: DupScan;
  score: number;
}

export const detectDuplicates = async (
  userId: string
): Promise<DuplicatePair[]> => {
  const { data: scans } = await supabase
    .from("receipt_scans")
    .select("id, parsed_merchant, parsed_amount, parsed_date")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!scans || scans.length < 2) return [];

  // Load dismissed pairs
  const { data: dismissed } = await supabase
    .from("receipt_duplicates" as any)
    .select("scan_id_1, scan_id_2")
    .eq("user_id", userId)
    .eq("dismissed", true);

  const dismissedSet = new Set<string>(
    ((dismissed as any[]) || []).map((d) =>
      [d.scan_id_1, d.scan_id_2].sort().join("|")
    )
  );

  const duplicates: DuplicatePair[] = [];
  for (let i = 0; i < scans.length; i++) {
    for (let j = i + 1; j < scans.length; j++) {
      const a = scans[i] as DupScan;
      const b = scans[j] as DupScan;
      const key = [a.id, b.id].sort().join("|");
      if (dismissedSet.has(key)) continue;
      const score = similarity(a, b);
      if (score >= 0.75) {
        duplicates.push({ scan1: a, scan2: b, score });
      }
    }
  }
  return duplicates;
};

export const dismissDuplicate = async (
  userId: string,
  scan1Id: string,
  scan2Id: string
) => {
  await supabase.from("receipt_duplicates" as any).insert({
    user_id: userId,
    scan_id_1: scan1Id,
    scan_id_2: scan2Id,
    dismissed: true,
  });
};
