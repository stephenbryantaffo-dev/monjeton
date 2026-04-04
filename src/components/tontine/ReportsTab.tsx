import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, MessageCircle, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TontineData, TontineMember, TontineCycle, TontinePayment, FREQ_LABELS } from "./types";
import { fmt } from "./utils";

interface Props {
  tontines: TontineData[];
}

const ReportsTab = ({ tontines }: Props) => {
  const [selectedId, setSelectedId] = useState("");
  const [cycleId, setCycleId] = useState("all");
  const [members, setMembers] = useState<TontineMember[]>([]);
  const [cycles, setCycles] = useState<TontineCycle[]>([]);
  const [payments, setPayments] = useState<TontinePayment[]>([]);

  const selected = tontines.find((t) => t.id === selectedId);

  useEffect(() => {
    if (tontines.length > 0 && !selectedId) setSelectedId(tontines[0].id);
  }, [tontines]);

  useEffect(() => {
    if (selectedId) loadData();
  }, [selectedId]);

  const loadData = async () => {
    const [mRes, cRes, pRes] = await Promise.all([
      supabase.from("tontine_members" as any).select("*").eq("tontine_id", selectedId),
      supabase.from("tontine_cycles" as any).select("*").eq("tontine_id", selectedId).order("cycle_number"),
      supabase.from("tontine_payments" as any).select("*, tontine_cycles!inner(tontine_id)").eq("tontine_cycles.tontine_id", selectedId),
    ]);
    setMembers((mRes.data || []) as unknown as TontineMember[]);
    setCycles((cRes.data || []) as unknown as TontineCycle[]);

    if (pRes.error) {
      const allPayments: TontinePayment[] = [];
      for (const c of (cRes.data || []) as unknown as TontineCycle[]) {
        const { data } = await supabase.from("tontine_payments" as any).select("*").eq("cycle_id", c.id);
        if (data) allPayments.push(...(data as TontinePayment[]));
      }
      setPayments(allPayments);
    } else {
      setPayments((pRes.data || []) as TontinePayment[]);
    }
  };

  const filteredCycles = cycleId === "all" ? cycles : cycles.filter((c) => c.id === cycleId);
  const selectedCycle = cycles.find((c) => c.id === cycleId);

  const getCycleReport = (cycle: TontineCycle) => {
    const cyclePayments = payments.filter((p) => p.cycle_id === cycle.id);
    return members.map((m) => {
      const mP = cyclePayments.filter((p) => p.member_id === m.id);
      const total = mP.reduce((s, p) => s + Number(p.amount_paid), 0);
      const expected = selected?.contribution_amount || 0;
      let status: "paid" | "partial" | "pending" = "pending";
      if (total >= expected) status = "paid";
      else if (total > 0) status = "partial";
      const lastDate = mP.length > 0 ? mP[mP.length - 1].payment_date : null;
      return { member: m, total, expected, status, lastDate, remaining: Math.max(0, expected - total) };
    });
  };

  const getCumulativeData = () => {
    return members.map((m) => {
      const perCycle = cycles.map((c) => {
        const cP = payments.filter((p) => p.cycle_id === c.id && p.member_id === m.id);
        const total = cP.reduce((s, p) => s + Number(p.amount_paid), 0);
        const expected = selected?.contribution_amount || 0;
        if (total >= expected) return "paid";
        if (total > 0) return "partial";
        return "pending";
      });
      const paidCount = perCycle.filter((s) => s === "paid").length;
      const reliability = cycles.length > 0 ? Math.round((paidCount / cycles.length) * 100) : 0;
      return { member: m, perCycle, reliability };
    });
  };

  const shareWhatsApp = () => {
    if (!selected) return;
    const cycle = selectedCycle || cycles[cycles.length - 1];
    if (!cycle) return;
    const report = getCycleReport(cycle);
    const lines = report.map((r) => {
      const icon = r.status === "paid" ? "✅" : r.status === "partial" ? "⚠️" : "⏳";
      return `${icon} ${r.member.name} — ${fmt(r.total)} F`;
    });
    const msg = `📊 Rapport — ${selected.name}\n${cycle.period_label}\n\nTotal : ${fmt(cycle.total_collected)} / ${fmt(cycle.total_expected)} F\n\n${lines.join("\n")}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const exportPDF = () => {
    if (!selected) return;
    const targetCycles = cycleId === "all" ? cycles : [selectedCycle!].filter(Boolean);
    const cyclePages = targetCycles.map((cycle) => {
      const report = getCycleReport(cycle);
      const pctCollected = cycle.total_expected > 0 ? Math.round((cycle.total_collected / cycle.total_expected) * 100) : 0;
      const rows = report.map((r) => {
        const icon = r.status === "paid" ? "✅" : r.status === "partial" ? "⚠️" : "⏳";
        const detail = r.status === "paid" && r.lastDate
          ? `Payé le ${new Date(r.lastDate).toLocaleDateString("fr-FR")}`
          : r.status === "partial"
          ? `Partiel — Reste ${fmt(r.remaining)} F`
          : "N'a pas encore cotisé";
        return `<tr><td style="padding:8px;border-bottom:1px solid #333">${icon} ${r.member.name}${r.member.is_owner ? " (Moi)" : ""}</td><td style="padding:8px;border-bottom:1px solid #333;text-align:right;font-weight:bold">${fmt(r.total)} F</td><td style="padding:8px;border-bottom:1px solid #333;color:#888;font-size:12px">${detail}</td></tr>`;
      }).join("");

      return `<div style="margin-bottom:40px;page-break-inside:avoid"><h2 style="color:#10b981;margin-bottom:4px">📊 Cycle ${cycle.cycle_number} — ${cycle.period_label}</h2><p style="color:#888;font-size:13px">Du ${new Date(cycle.start_date).toLocaleDateString("fr-FR")} au ${new Date(cycle.end_date).toLocaleDateString("fr-FR")}</p><div style="display:flex;gap:20px;margin:16px 0"><div style="background:#1a1a2e;border-radius:12px;padding:12px 20px;flex:1;text-align:center"><p style="color:#888;font-size:12px">Total attendu</p><p style="font-size:20px;font-weight:bold">${fmt(cycle.total_expected)} F</p></div><div style="background:#1a1a2e;border-radius:12px;padding:12px 20px;flex:1;text-align:center"><p style="color:#888;font-size:12px">Total collecté</p><p style="font-size:20px;font-weight:bold;color:#10b981">${fmt(cycle.total_collected)} F</p></div><div style="background:#1a1a2e;border-radius:12px;padding:12px 20px;flex:1;text-align:center"><p style="color:#888;font-size:12px">Taux</p><p style="font-size:20px;font-weight:bold;color:${pctCollected >= 80 ? "#10b981" : "#f59e0b"}">${pctCollected}%</p></div></div><table style="width:100%;border-collapse:collapse">${rows}</table></div>`;
    }).join("");

    const cumulData = getCumulativeData();
    const cumulHeaders = cycles.map((c) => `<th style="padding:6px;font-size:11px;color:#888">C${c.cycle_number}</th>`).join("");
    const cumulRows = cumulData.map((d) => {
      const cells = d.perCycle.map((s) => {
        const icon = s === "paid" ? "✅" : s === "partial" ? "⚠️" : "⏳";
        return `<td style="padding:6px;text-align:center">${icon}</td>`;
      }).join("");
      return `<tr><td style="padding:6px;font-weight:500">${d.member.name}</td>${cells}<td style="padding:6px;text-align:center;font-weight:bold;color:${d.reliability >= 80 ? "#10b981" : "#f59e0b"}">${d.reliability}%</td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport Tontine — ${selected.name}</title><style>@media print{body{padding:10px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0a1a;color:#fff;padding:30px;max-width:800px;margin:0 auto}h1{font-size:22px}table{width:100%}th{text-align:left;padding:6px;border-bottom:2px solid #333}td{padding:6px;border-bottom:1px solid #222}</style></head><body><h1>🪙 Mon Jeton — Rapport Tontine</h1><p style="color:#888">${selected.name} · ${FREQ_LABELS[selected.frequency] || selected.frequency}</p><p style="color:#666;font-size:12px">Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p><hr style="border-color:#333;margin:20px 0">${cyclePages}${cycles.length > 1 ? `<h2 style="color:#10b981;margin-top:40px">📋 Fiabilité cumulée</h2><table><tr><th>Membre</th>${cumulHeaders}<th style="text-align:center">Fiabilité</th></tr>${cumulRows}</table>` : ""}<p style="text-align:center;color:#444;font-size:11px;margin-top:40px">🪙 Mon Jeton — Document confidentiel</p></body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    win?.addEventListener("load", () => {
      setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 800);
    });
  };

  if (tontines.length === 0) {
    return <p className="text-center text-muted-foreground text-sm py-12">Créez d'abord une tontine</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setCycleId("all"); }}>
          <SelectTrigger className="bg-secondary border-border flex-1">
            <SelectValue placeholder="Tontine" />
          </SelectTrigger>
          <SelectContent>
            {tontines.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cycleId} onValueChange={setCycleId}>
          <SelectTrigger className="bg-secondary border-border w-40">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>Cycle {c.cycle_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cycle reports */}
      {filteredCycles.map((cycle) => {
        const report = getCycleReport(cycle);
        const pctC = cycle.total_expected > 0 ? Math.round((cycle.total_collected / cycle.total_expected) * 100) : 0;
        return (
          <motion.div key={cycle.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
            <p className="font-bold text-foreground mb-1">📊 Cycle {cycle.cycle_number} — {cycle.period_label}</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-secondary rounded-xl p-2 text-center">
                <p className="text-xs text-muted-foreground">Attendu</p>
                <p className="font-bold text-sm text-foreground">{fmt(cycle.total_expected)} F</p>
              </div>
              <div className="bg-secondary rounded-xl p-2 text-center">
                <p className="text-xs text-muted-foreground">Collecté</p>
                <p className="font-bold text-sm text-primary">{fmt(cycle.total_collected)} F</p>
              </div>
              <div className="bg-secondary rounded-xl p-2 text-center">
                <p className="text-xs text-muted-foreground">Taux</p>
                <p className={`font-bold text-sm ${pctC >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{pctC}%</p>
              </div>
            </div>
            <div className="space-y-1">
              {report.map((r) => (
                <div key={r.member.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {r.status === "paid" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {r.status === "partial" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {r.status === "pending" && <Clock className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <span className="text-sm font-medium text-foreground">{r.member.name}{r.member.is_owner ? " (Moi)" : ""}</span>
                      <p className="text-xs text-muted-foreground">
                        {r.status === "paid" && r.lastDate && `Payé le ${new Date(r.lastDate).toLocaleDateString("fr-FR")}`}
                        {r.status === "partial" && `Partiel — Reste ${fmt(r.remaining)} F`}
                        {r.status === "pending" && "N'a pas encore cotisé"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-foreground">{fmt(r.total)} F</span>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Cumulative table */}
      {cycles.length > 1 && cycleId === "all" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 overflow-x-auto">
          <p className="font-bold text-foreground mb-3">📋 Fiabilité cumulée</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Membre</th>
                {cycles.map((c) => (
                  <th key={c.id} className="text-center py-2 text-muted-foreground font-medium text-xs">C{c.cycle_number}</th>
                ))}
                <th className="text-center py-2 text-muted-foreground font-medium">Fiab.</th>
              </tr>
            </thead>
            <tbody>
              {getCumulativeData().map((d) => (
                <tr key={d.member.id} className="border-b border-border/30">
                  <td className="py-2 text-foreground font-medium">{d.member.name}</td>
                  {d.perCycle.map((s, i) => (
                    <td key={i} className="text-center py-2">
                      {s === "paid" ? "✅" : s === "partial" ? "⚠️" : "⏳"}
                    </td>
                  ))}
                  <td className={`text-center py-2 font-bold ${d.reliability >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
                    {d.reliability}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <div className="flex gap-2">
        <Button onClick={exportPDF} variant="outline" className="flex-1 glass">
          <FileText className="w-4 h-4 mr-2" /> Exporter PDF
        </Button>
        <Button onClick={shareWhatsApp} variant="outline" className="flex-1 glass">
          <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
        </Button>
      </div>
    </div>
  );
};

export default ReportsTab;
