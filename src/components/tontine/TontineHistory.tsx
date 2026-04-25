import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Filter, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  TontineData,
  TontineMember,
  TontineCycle,
  TontinePayment,
  FREQ_LABELS,
} from "./types";
import { fmt } from "./utils";

interface Props {
  tontine: TontineData;
}

type RangeFilter = "all" | "week" | "month";

const startOfRange = (range: RangeFilter): Date | null => {
  if (range === "all") return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "week") {
    const day = d.getDay() || 7; // Mon = 1
    d.setDate(d.getDate() - (day - 1));
  } else if (range === "month") {
    d.setDate(1);
  }
  return d;
};

const TontineHistory = ({ tontine }: Props) => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<RangeFilter>("month");
  const [members, setMembers] = useState<TontineMember[]>([]);
  const [cycles, setCycles] = useState<TontineCycle[]>([]);
  const [payments, setPayments] = useState<TontinePayment[]>([]);

  useEffect(() => {
    if (!expanded) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, tontine.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        supabase
          .from("tontine_members" as any)
          .select("*")
          .eq("tontine_id", tontine.id),
        supabase
          .from("tontine_cycles" as any)
          .select("*")
          .eq("tontine_id", tontine.id)
          .order("cycle_number", { ascending: false }),
      ]);
      const cycleList = (cRes.data || []) as unknown as TontineCycle[];
      setMembers((mRes.data || []) as unknown as TontineMember[]);
      setCycles(cycleList);

      if (cycleList.length > 0) {
        const { data: pData } = await supabase
          .from("tontine_payments" as any)
          .select("*")
          .in(
            "cycle_id",
            cycleList.map((c) => c.id),
          );
        setPayments((pData || []) as unknown as TontinePayment[]);
      } else {
        setPayments([]);
      }
    } catch (e) {
      console.error("[History] load failed", e);
      toast({ title: "Erreur chargement historique", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const memberById = useMemo(() => {
    const m = new Map<string, TontineMember>();
    members.forEach((x) => m.set(x.id, x));
    return m;
  }, [members]);

  const filteredPayments = useMemo(() => {
    const start = startOfRange(range);
    return payments
      .filter((p) => !start || new Date(p.payment_date) >= start)
      .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));
  }, [payments, range]);

  const filteredCycles = useMemo(() => {
    const start = startOfRange(range);
    if (!start) return cycles;
    // include any cycle that overlaps the period
    return cycles.filter((c) => new Date(c.end_date) >= start);
  }, [cycles, range]);

  const totals = useMemo(() => {
    const collected = filteredPayments.reduce(
      (s, p) => s + Number(p.amount_paid),
      0,
    );
    return {
      collected,
      paymentsCount: filteredPayments.length,
      cyclesCount: filteredCycles.length,
    };
  }, [filteredPayments, filteredCycles]);

  const exportPDF = () => {
    const start = startOfRange(range);
    const periodLabel =
      range === "all"
        ? "Tous les enregistrements"
        : range === "week"
          ? "Cette semaine"
          : "Ce mois-ci";

    const cyclesRows = filteredCycles
      .map((c) => {
        const pct =
          c.total_expected > 0
            ? Math.round((c.total_collected / c.total_expected) * 100)
            : 0;
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a">Cycle ${c.cycle_number} — ${c.period_label}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a;color:#94a3b8;font-size:12px">${new Date(c.start_date).toLocaleDateString("fr-FR")} → ${new Date(c.end_date).toLocaleDateString("fr-FR")}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a;text-align:right;font-weight:600">${fmt(c.total_collected)} / ${fmt(c.total_expected)} F</td>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a;text-align:right;color:${pct >= 80 ? "#10b981" : pct > 0 ? "#f59e0b" : "#94a3b8"};font-weight:700">${pct}%</td>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a;text-align:right;color:${c.status === "open" ? "#10b981" : "#94a3b8"};text-transform:uppercase;font-size:11px">${c.status === "open" ? "En cours" : "Clôturé"}</td>
        </tr>`;
      })
      .join("");

    const paymentRows = filteredPayments
      .map((p) => {
        const m = memberById.get(p.member_id);
        const c = cycles.find((x) => x.id === p.cycle_id);
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a">${new Date(p.payment_date).toLocaleDateString("fr-FR")}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a">${m?.name || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a;color:#94a3b8;font-size:12px">${c ? `Cycle ${c.cycle_number}` : "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a;text-align:right;font-weight:600;color:#10b981">+${fmt(Number(p.amount_paid))} F</td>
          <td style="padding:8px;border-bottom:1px solid #2a2f3a;color:#94a3b8;font-size:12px">${p.note || ""}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Historique — ${tontine.name}</title>
<style>
@media print{body{padding:14px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0a0f1c;color:#fff;padding:32px;max-width:880px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:16px;color:#10b981;margin:24px 0 8px}
.meta{color:#94a3b8;font-size:13px}
.cards{display:flex;gap:12px;margin:18px 0}
.card{flex:1;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:12px 16px;text-align:center}
.card p{margin:0;font-size:11px;color:#94a3b8}
.card strong{display:block;font-size:18px;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px;border-bottom:2px solid #1f2937;color:#94a3b8;font-weight:600;font-size:11px;text-transform:uppercase}
.empty{color:#64748b;text-align:center;padding:24px;font-size:13px}
hr{border:0;border-top:1px solid #1f2937;margin:18px 0}
footer{text-align:center;color:#475569;font-size:11px;margin-top:32px}
</style></head><body>
<h1>🪙 Historique — ${tontine.name}</h1>
<p class="meta">${FREQ_LABELS[tontine.frequency] || tontine.frequency} · ${fmt(tontine.contribution_amount)} F / membre · Filtre : <strong>${periodLabel}</strong>${start ? ` (depuis le ${start.toLocaleDateString("fr-FR")})` : ""}</p>
<p class="meta">Généré le ${new Date().toLocaleString("fr-FR")}</p>
<div class="cards">
  <div class="card"><p>Cycles</p><strong>${totals.cyclesCount}</strong></div>
  <div class="card"><p>Paiements</p><strong>${totals.paymentsCount}</strong></div>
  <div class="card"><p>Total collecté</p><strong style="color:#10b981">${fmt(totals.collected)} F</strong></div>
</div>
<hr>
<h2>Cycles</h2>
${filteredCycles.length > 0 ? `<table><thead><tr><th>Cycle</th><th>Période</th><th style="text-align:right">Collecté / Attendu</th><th style="text-align:right">Taux</th><th style="text-align:right">Statut</th></tr></thead><tbody>${cyclesRows}</tbody></table>` : `<p class="empty">Aucun cycle sur la période sélectionnée</p>`}
<h2>Paiements</h2>
${filteredPayments.length > 0 ? `<table><thead><tr><th>Date</th><th>Membre</th><th>Cycle</th><th style="text-align:right">Montant</th><th>Note</th></tr></thead><tbody>${paymentRows}</tbody></table>` : `<p class="empty">Aucun paiement sur la période sélectionnée</p>`}
<footer>🪙 Mon Jeton — Document confidentiel</footer>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      toast({
        title: "Bloqué par le navigateur",
        description: "Autorise les pop-ups pour exporter le PDF.",
        variant: "destructive",
      });
      return;
    }
    win.addEventListener("load", () => {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 600);
    });
  };

  const RANGES: { value: RangeFilter; label: string }[] = [
    { value: "week", label: "Cette semaine" },
    { value: "month", label: "Ce mois-ci" },
    { value: "all", label: "Tout" },
  ];

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full glass-card rounded-2xl p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Historique</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-3"
        >
          {/* Filters */}
          <div className="glass-card rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Période
              </span>
            </div>
            <div className="flex gap-2">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all ${
                    range === r.value
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Cycles</p>
              <p className="text-sm font-bold text-foreground">
                {totals.cyclesCount}
              </p>
            </div>
            <div className="glass-card rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Paiements</p>
              <p className="text-sm font-bold text-foreground">
                {totals.paymentsCount}
              </p>
            </div>
            <div className="glass-card rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Collecté</p>
              <p className="text-sm font-bold text-primary tabular-nums">
                {fmt(totals.collected)} F
              </p>
            </div>
          </div>

          {/* Cycles list */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">
              Cycles
            </p>
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Chargement…
              </p>
            ) : filteredCycles.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Aucun cycle sur la période
              </p>
            ) : (
              <div className="space-y-2">
                {filteredCycles.map((c) => {
                  const pct =
                    c.total_expected > 0
                      ? Math.round(
                          (c.total_collected / c.total_expected) * 100,
                        )
                      : 0;
                  return (
                    <div
                      key={c.id}
                      className="glass-card rounded-xl p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          Cycle {c.cycle_number} — {c.period_label}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {new Date(c.start_date).toLocaleDateString("fr-FR")}{" "}
                          → {new Date(c.end_date).toLocaleDateString("fr-FR")}
                          {c.status === "open" && (
                            <span className="ml-2 text-primary font-medium">
                              · en cours
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {fmt(c.total_collected)} F
                        </p>
                        <p
                          className={`text-[11px] font-bold ${pct >= 80 ? "text-emerald-400" : pct > 0 ? "text-amber-400" : "text-muted-foreground"}`}
                        >
                          {pct}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payments list */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">
              Paiements
            </p>
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Chargement…
              </p>
            ) : filteredPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Aucun paiement sur la période
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredPayments.map((p) => {
                  const m = memberById.get(p.member_id);
                  const c = cycles.find((x) => x.id === p.cycle_id);
                  return (
                    <div
                      key={p.id}
                      className="glass-card rounded-xl p-3 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {m?.name?.charAt(0).toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {m?.name || "Membre supprimé"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {new Date(p.payment_date).toLocaleDateString(
                            "fr-FR",
                          )}
                          {c && ` · Cycle ${c.cycle_number}`}
                          {p.note && ` · ${p.note}`}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-primary tabular-nums shrink-0">
                        +{fmt(Number(p.amount_paid))} F
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            onClick={exportPDF}
            variant="outline"
            className="w-full glass"
            disabled={loading}
          >
            <FileText className="w-4 h-4 mr-2" /> Exporter en PDF
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default TontineHistory;
