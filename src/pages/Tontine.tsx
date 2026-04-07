import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import {
  Plus, Users, ChevronLeft, ChevronRight, CheckCircle, CheckCircle2, Clock, AlertTriangle,
  Lock, Crown, ChevronDown, ChevronUp, FileText, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";
import CreateTontineModal from "@/components/tontine/CreateTontineModal";
import { TontineData, TontineMember, TontineCycle, TontinePayment, FREQ_LABELS, FREQ_BADGE_CLASSES } from "@/components/tontine/types";
import { fmt, generateCycleInfo } from "@/components/tontine/utils";

type MemberStatus = {
  member: TontineMember;
  totalPaid: number;
  expected: number;
  status: "paid" | "partial" | "pending";
  lastDate?: string;
};

const TontinePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tontines, setTontines] = useState<TontineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<TontineMember[]>([]);
  const [openCycle, setOpenCycle] = useState<TontineCycle | null>(null);
  const [closedCycles, setClosedCycles] = useState<TontineCycle[]>([]);
  const [payments, setPayments] = useState<TontinePayment[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [cycleMap, setCycleMap] = useState<Record<string, { total_expected: number; total_collected: number; period_label: string }>>({});

  // Payment modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMember, setPayMember] = useState<TontineMember | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNote, setPayNote] = useState("");
  const [saving, setSaving] = useState(false);

  // History
  const [showHistory, setShowHistory] = useState(false);

  const selected = tontines.find(t => t.id === selectedId);

  const loadTontines = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tontines")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data || []) as unknown as TontineData[];
    setTontines(list);
    setLoading(false);

    if (list.length > 0) {
      const ids = list.map(t => t.id);
      const [cyclesRes, membersRes] = await Promise.all([
        supabase.from("tontine_cycles").select("tontine_id, total_expected, total_collected, period_label").in("tontine_id", ids).eq("status", "open"),
        supabase.from("tontine_members").select("tontine_id").in("tontine_id", ids),
      ]);
      const cMap: Record<string, { total_expected: number; total_collected: number; period_label: string }> = {};
      ((cyclesRes.data || []) as any[]).forEach(c => { cMap[c.tontine_id] = c; });
      setCycleMap(cMap);
      const mMap: Record<string, number> = {};
      ((membersRes.data || []) as any[]).forEach(m => { mMap[m.tontine_id] = (mMap[m.tontine_id] || 0) + 1; });
      setMemberCounts(mMap);
    }
  }, [user]);

  const loadDetail = useCallback(async (tontineId: string) => {
    const [mRes, cRes] = await Promise.all([
      supabase.from("tontine_members").select("*").eq("tontine_id", tontineId),
      supabase.from("tontine_cycles").select("*").eq("tontine_id", tontineId).order("cycle_number", { ascending: true }),
    ]);
    const allMembers = (mRes.data || []) as unknown as TontineMember[];
    const allCycles = (cRes.data || []) as unknown as TontineCycle[];
    setMembers(allMembers);
    const open = allCycles.find(c => c.status === "open") || null;
    setOpenCycle(open);
    setClosedCycles(allCycles.filter(c => c.status === "closed"));

    if (open) {
      const pRes = await supabase.from("tontine_payments").select("*").eq("cycle_id", open.id);
      setPayments((pRes.data || []) as unknown as TontinePayment[]);
    } else {
      setPayments([]);
    }
  }, []);

  useEffect(() => { loadTontines(); }, [loadTontines]);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setShowHistory(false);
    loadDetail(id);
  };

  const goBack = () => {
    setSelectedId(null);
    setMembers([]);
    setOpenCycle(null);
    setClosedCycles([]);
    setPayments([]);
    loadTontines();
  };

  // Member statuses for current cycle
  const getMemberStatuses = (): MemberStatus[] => {
    if (!openCycle || !selected) return [];
    return members.map(m => {
      const mPayments = payments.filter(p => p.member_id === m.id);
      const totalPaid = mPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
      const expected = selected.contribution_amount;
      let status: "paid" | "partial" | "pending" = "pending";
      if (totalPaid >= expected) status = "paid";
      else if (totalPaid > 0) status = "partial";
      const lastDate = mPayments.length > 0 ? mPayments[mPayments.length - 1].payment_date : undefined;
      return { member: m, totalPaid, expected, status, lastDate };
    });
  };

  const statuses = getMemberStatuses();
  const paidCount = statuses.filter(s => s.status === "paid").length;
  const allPaid = statuses.length > 0 && paidCount === statuses.length;
  const cyclePct = openCycle && openCycle.total_expected > 0
    ? Math.round((openCycle.total_collected / openCycle.total_expected) * 100) : 0;

  // Beneficiary = member at index (cycle_number - 1) % members.length
  const getBeneficiary = () => {
    if (!openCycle || members.length === 0) return null;
    const idx = (openCycle.cycle_number - 1) % members.length;
    return members[idx];
  };
  const beneficiary = getBeneficiary();

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
      const { error } = await supabase.from("tontine_payments").insert({
        cycle_id: openCycle.id,
        member_id: payMember.id,
        amount_paid: Number(payAmount),
        payment_date: payDate,
        note: payNote || null,
      } as any);
      if (error) throw error;

      const { data: allP } = await supabase.from("tontine_payments").select("amount_paid").eq("cycle_id", openCycle.id);
      const newTotal = (allP || []).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
      await supabase.from("tontine_cycles").update({ total_collected: newTotal } as any).eq("id", openCycle.id);

      toast({ title: `Paiement de ${payMember.name} enregistré ✅` });
      setPayModalOpen(false);

      // Reload detail to check if all paid
      await loadDetail(selectedId!);

      // Check if all paid after reload
      const updatedPayments = (await supabase.from("tontine_payments").select("*").eq("cycle_id", openCycle.id)).data as unknown as TontinePayment[] || [];
      const updatedStatuses = members.map(m => {
        const mP = updatedPayments.filter(p => p.member_id === m.id);
        const total = mP.reduce((s, p) => s + Number(p.amount_paid), 0);
        return total >= (selected?.contribution_amount || 0);
      });
      if (updatedStatuses.length > 0 && updatedStatuses.every(Boolean)) {
        const ben = getBeneficiary();
        toast({
          title: `Tour complet ! 🎉`,
          description: `${ben?.name || "Le bénéficiaire"} reçoit ${fmt(openCycle.total_expected)} F`,
        });
      }
    } catch {
      toast({ title: "Erreur paiement", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const closeCycle = async () => {
    if (!openCycle || !selected) return;
    try {
      await supabase.from("tontine_cycles").update({ status: "closed" } as any).eq("id", openCycle.id);
      const nextInfo = generateCycleInfo(selected, openCycle.cycle_number + 1, members.length, openCycle.end_date);
      await supabase.from("tontine_cycles").insert({ tontine_id: selected.id, ...nextInfo } as any);
      toast({ title: "Cycle clôturé, nouveau cycle ouvert ✅" });
      loadDetail(selected.id);
    } catch {
      toast({ title: "Erreur clôture", variant: "destructive" });
    }
  };

  const deleteTontine = async (id: string) => {
    await supabase.from("tontines").delete().eq("id", id);
    toast({ title: "Tontine supprimée" });
    loadTontines();
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const AVATAR_COLORS = [
    "bg-primary/20 text-primary",
    "bg-destructive/20 text-destructive",
    "bg-amber-500/20 text-amber-500",
    "bg-blue-500/20 text-blue-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-purple-500/20 text-purple-400",
  ];

  // ─── LIST VIEW ───
  if (!selectedId) {
    return (
      <DashboardLayout title="Tontines">
        <Button onClick={() => setCreateOpen(true)} className="w-full mb-4 gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle tontine
        </Button>
        <CreateTontineModal open={createOpen} onOpenChange={setCreateOpen} onCreated={loadTontines} />

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)
          ) : tontines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🪙</p>
              <p className="font-semibold text-foreground mb-1">Aucune tontine</p>
              <p className="text-sm text-muted-foreground">Crée ta première tontine pour commencer</p>
            </div>
          ) : (
            tontines.map((t, i) => {
              const cycle = cycleMap[t.id];
              const mc = memberCounts[t.id] || 0;
              const paidInCycle = cycle ? Math.round(cycle.total_collected / (t.contribution_amount || 1)) : 0;
              const pct = mc > 0 ? Math.round((paidInCycle / mc) * 100) : 0;

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  onClick={() => openDetail(t.id)}
                  className="glass-card rounded-2xl p-4 mb-3 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(t.contribution_amount)} F/cycle · {mc} membres
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ConfirmDeleteDialog onConfirm={() => deleteTontine(t.id)} title="Supprimer cette tontine ?">
                        <button className="text-muted-foreground hover:text-destructive p-1" onClick={e => e.stopPropagation()}>✕</button>
                      </ConfirmDeleteDialog>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{paidInCycle}/{mc} ont payé</span>
                      <span>{Math.min(pct, 100)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="h-1.5 gradient-primary rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ─── DETAIL VIEW ───
  return (
    <DashboardLayout title={selected?.name || "Tontine"}>
      <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>

      {/* ─── CURRENT CYCLE SUMMARY ─── */}
      {openCycle ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-foreground">Cycle {openCycle.cycle_number} — {openCycle.period_label}</p>
            <span className="text-xs font-bold text-primary">{cyclePct}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Du {new Date(openCycle.start_date).toLocaleDateString("fr-FR")} au {new Date(openCycle.end_date).toLocaleDateString("fr-FR")}
          </p>
          <Progress value={cyclePct} className="h-2.5 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{paidCount}/{members.length} ont cotisé</span>
            <span>{fmt(openCycle.total_collected)} / {fmt(openCycle.total_expected)} F</span>
          </div>

          {/* Beneficiary */}
          {beneficiary && (
            <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Bénéficiaire de ce tour</p>
                  <p className="text-sm font-bold text-foreground truncate">{beneficiary.name}</p>
                </div>
                <span className="text-sm font-bold text-primary shrink-0">{fmt(openCycle.total_expected)} F</span>
              </div>
            </div>
          )}

          {/* All paid celebration */}
          {allPaid && (
            <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-sm font-bold text-primary">Tour complet ! 🎉</p>
              <p className="text-xs text-muted-foreground">
                {beneficiary?.name} reçoit {fmt(openCycle.total_expected)} F
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        <p className="text-center text-muted-foreground text-sm py-4 mb-4">Aucun cycle ouvert</p>
      )}

      {/* ─── MEMBERS ─── */}
      <p className="text-sm font-semibold text-foreground mb-2">Membres</p>
      <div className="space-y-2 mb-4">
        {statuses.length > 0 ? statuses.map((s, i) => (
          <motion.div
            key={s.member.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i }}
          >
            <div className="glass-card rounded-xl p-4 flex items-center gap-3 mb-2">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <p className="text-sm font-bold text-primary-foreground">
                  {s.member.name.charAt(0).toUpperCase()}
                </p>
              </div>
              {/* Name + status */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-semibold text-foreground truncate">
                  {s.member.name}
                  {s.member.is_owner && <span className="ml-1 text-xs text-primary">(Moi)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.status === "paid" ? "A payé ce cycle" : s.status === "partial" ? `${fmt(s.totalPaid)} / ${fmt(s.expected)} F` : "En attente de paiement"}
                </p>
              </div>
              {/* Action + status */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.status === "paid" ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <button
                    onClick={() => openPayModal(s.member)}
                    className="gradient-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium"
                  >
                    + Payer
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )) : members.length > 0 ? members.map((m, i) => (
          <div key={m.id} className="glass-card rounded-xl p-4 flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
              <p className="text-sm font-bold text-primary-foreground">
                {m.name.charAt(0).toUpperCase()}
              </p>
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold text-foreground truncate">
                {m.name}
                {m.is_owner && <span className="ml-1 text-xs text-primary">(Moi)</span>}
              </p>
            </div>
          </div>
        )) : (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun membre</p>
        )}
      </div>

      {/* ─── ACTIONS ─── */}
      {openCycle && (
        <Button onClick={closeCycle} variant="glass" className="w-full mb-4">
          <Lock className="w-4 h-4 mr-2" /> Clôturer ce cycle
        </Button>
      )}

      {/* ─── HISTORY ─── */}
      {closedCycles.length > 0 && (
        <>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            Cycles passés ({closedCycles.length})
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2 mb-4"
              >
                {closedCycles.map(c => {
                  const cPct = c.total_expected > 0 ? Math.round((c.total_collected / c.total_expected) * 100) : 0;
                  const benIdx = (c.cycle_number - 1) % members.length;
                  const ben = members[benIdx];
                  return (
                    <div key={c.id} className="glass-card rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">Cycle {c.cycle_number} — {c.period_label}</span>
                        <span className="text-xs font-bold text-primary shrink-0">{cPct}%</span>
                      </div>
                      <Progress value={cPct} className="h-1.5 mb-1" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{fmt(c.total_collected)} / {fmt(c.total_expected)} F</span>
                        {ben && <span className="truncate ml-2">👑 {ben.name}</span>}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ─── PAYMENT MODAL ─── */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="truncate">Paiement — {payMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Montant (FCFA)</label>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date du paiement</label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Note (optionnel)</label>
              <Input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Détail..." className="bg-secondary border-border" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPayModalOpen(false)} className="flex-1 glass">
                Annuler
              </Button>
              <Button onClick={confirmPayment} disabled={saving} className="flex-1 gradient-primary text-primary-foreground">
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TontinePage;
