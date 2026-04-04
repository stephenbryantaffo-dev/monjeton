import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TontineData, TontineMember, TontineCycle, TontinePayment } from "./types";
import { fmt, generateCycleInfo } from "./utils";

interface Props {
  tontines: TontineData[];
}

type MemberStatus = {
  member: TontineMember;
  totalPaid: number;
  expected: number;
  status: "paid" | "partial" | "pending";
  lastDate?: string;
};

const CyclesTab = ({ tontines }: Props) => {
  const [selectedId, setSelectedId] = useState<string>("");
  const [members, setMembers] = useState<TontineMember[]>([]);
  const [openCycle, setOpenCycle] = useState<TontineCycle | null>(null);
  const [closedCycles, setClosedCycles] = useState<TontineCycle[]>([]);
  const [payments, setPayments] = useState<TontinePayment[]>([]);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMember, setPayMember] = useState<TontineMember | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNote, setPayNote] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = tontines.find((t) => t.id === selectedId);

  useEffect(() => {
    if (tontines.length > 0 && !selectedId) setSelectedId(tontines[0].id);
  }, [tontines]);

  useEffect(() => {
    if (selectedId) loadCycleData();
  }, [selectedId]);

  const loadCycleData = async () => {
    const [mRes, cRes] = await Promise.all([
      supabase.from("tontine_members" as any).select("*").eq("tontine_id", selectedId),
      supabase.from("tontine_cycles" as any).select("*").eq("tontine_id", selectedId).order("cycle_number", { ascending: true }),
    ]);
    const allMembers = (mRes.data || []) as unknown as TontineMember[];
    const allCycles = (cRes.data || []) as unknown as TontineCycle[];
    setMembers(allMembers);

    const open = allCycles.find((c) => c.status === "open") || null;
    setOpenCycle(open);
    setClosedCycles(allCycles.filter((c) => c.status === "closed"));

    if (open) {
      const pRes = await supabase.from("tontine_payments" as any).select("*").eq("cycle_id", open.id);
      setPayments((pRes.data || []) as TontinePayment[]);
    } else {
      setPayments([]);
    }
  };

  const getMemberStatuses = (): MemberStatus[] => {
    if (!openCycle || !selected) return [];
    return members.map((m) => {
      const mPayments = payments.filter((p) => p.member_id === m.id);
      const totalPaid = mPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
      const expected = selected.contribution_amount;
      let status: "paid" | "partial" | "pending" = "pending";
      if (totalPaid >= expected) status = "paid";
      else if (totalPaid > 0) status = "partial";
      const lastDate = mPayments.length > 0 ? mPayments[mPayments.length - 1].payment_date : undefined;
      return { member: m, totalPaid, expected, status, lastDate };
    });
  };

  const paidCount = getMemberStatuses().filter((s) => s.status === "paid").length;
  const pct = openCycle && openCycle.total_expected > 0
    ? Math.round((openCycle.total_collected / openCycle.total_expected) * 100)
    : 0;

  const openPayModal = (member: TontineMember) => {
    setPayMember(member);
    setPayAmount(String(selected?.contribution_amount || 0));
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayNote("");
    setPayModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!payMember || !openCycle || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_payments" as any).insert({
        cycle_id: openCycle.id,
        member_id: payMember.id,
        amount_paid: Number(payAmount),
        payment_date: payDate,
        note: payNote || null,
      });
      if (error) throw error;

      const { data: allP } = await supabase.from("tontine_payments" as any).select("amount_paid").eq("cycle_id", openCycle.id);
      const newTotal = (allP || []).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
      await supabase.from("tontine_cycles" as any).update({ total_collected: newTotal }).eq("id", openCycle.id);

      toast({ title: `Paiement de ${payMember.name} enregistré ✅` });
      setPayModalOpen(false);
      loadCycleData();
    } catch {
      toast({ title: "Erreur paiement", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const closeCycle = async () => {
    if (!openCycle || !selected) return;
    try {
      await supabase.from("tontine_cycles" as any).update({ status: "closed" }).eq("id", openCycle.id);

      const nextInfo = generateCycleInfo(selected, openCycle.cycle_number + 1, members.length, openCycle.end_date);
      await supabase.from("tontine_cycles" as any).insert({
        tontine_id: selected.id,
        ...nextInfo,
      });

      toast({ title: "Cycle clôturé, nouveau cycle ouvert ✅" });
      loadCycleData();
    } catch {
      toast({ title: "Erreur clôture", variant: "destructive" });
    }
  };

  if (tontines.length === 0) {
    return <p className="text-center text-muted-foreground text-sm py-12">Créez d'abord une tontine</p>;
  }

  const statuses = getMemberStatuses();

  return (
    <div className="space-y-4">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="bg-secondary border-border">
          <SelectValue placeholder="Choisir une tontine" />
        </SelectTrigger>
        <SelectContent>
          {tontines.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {openCycle ? (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
            <p className="text-lg font-bold text-foreground">Cycle {openCycle.cycle_number} — {openCycle.period_label}</p>
            <p className="text-xs text-muted-foreground mb-3">
              Du {new Date(openCycle.start_date).toLocaleDateString("fr-FR")} au {new Date(openCycle.end_date).toLocaleDateString("fr-FR")}
            </p>
            <Progress value={pct} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              {paidCount} / {members.length} membres ont cotisé — {fmt(openCycle.total_collected)} / {fmt(openCycle.total_expected)} F
            </p>
          </motion.div>

          <Tabs defaultValue="current">
            <TabsList className="w-full">
              <TabsTrigger value="current" className="flex-1">Cycle actuel</TabsTrigger>
              <TabsTrigger value="past" className="flex-1">Cycles passés</TabsTrigger>
            </TabsList>

            <TabsContent value="current">
              <div className="space-y-2 mt-2">
                {statuses.map((s, i) => (
                  <motion.div
                    key={s.member.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i }}
                    className="glass-card rounded-xl p-3 flex items-center justify-between cursor-pointer"
                    onClick={() => s.status !== "paid" && openPayModal(s.member)}
                  >
                    <div className="flex items-center gap-2">
                      {s.status === "paid" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      {s.status === "partial" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {s.status === "pending" && <Clock className="w-4 h-4 text-muted-foreground" />}
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {s.member.name}
                          {s.member.is_owner && <span className="ml-1 text-xs text-primary">(Moi)</span>}
                        </span>
                        {s.status === "paid" && s.lastDate && (
                          <p className="text-xs text-muted-foreground">Payé le {new Date(s.lastDate).toLocaleDateString("fr-FR")}</p>
                        )}
                        {s.status === "partial" && (
                          <p className="text-xs text-amber-400">Partiel : {fmt(s.totalPaid)} / {fmt(s.expected)} F</p>
                        )}
                        {s.status === "pending" && (
                          <p className="text-xs text-muted-foreground">En attente</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground">{fmt(s.totalPaid)} F</span>
                  </motion.div>
                ))}
              </div>

              <Button onClick={closeCycle} variant="outline" className="w-full mt-4 glass">
                <Lock className="w-4 h-4 mr-2" /> Clôturer ce cycle
              </Button>
            </TabsContent>

            <TabsContent value="past">
              <div className="space-y-2 mt-2">
                {closedCycles.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">Aucun cycle clôturé</p>
                ) : (
                  closedCycles.map((c) => {
                    const cPct = c.total_expected > 0 ? Math.round((c.total_collected / c.total_expected) * 100) : 0;
                    return (
                      <div key={c.id} className="glass-card rounded-xl p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-foreground">Cycle {c.cycle_number} — {c.period_label}</span>
                          <span className="text-xs font-bold text-primary">{cPct}%</span>
                        </div>
                        <Progress value={cPct} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">{fmt(c.total_collected)} / {fmt(c.total_expected)} F</p>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <p className="text-center text-muted-foreground text-sm py-8">Aucun cycle ouvert</p>
      )}

      {/* Payment Modal */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Enregistrer paiement — {payMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Montant (FCFA)</label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date du paiement</label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Note (optionnel)</label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Détail..." className="glass" />
            </div>
            <Button onClick={confirmPayment} disabled={saving} className="w-full">
              <CheckCircle className="w-4 h-4 mr-2" /> Confirmer le paiement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CyclesTab;
