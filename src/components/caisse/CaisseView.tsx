import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronRight, ChevronLeft, ArrowDownLeft, ArrowUpRight, UserPlus, MoreVertical, XCircle, PauseCircle, CheckCircle, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import CreateCaisseModal from "./CreateCaisseModal";
import { CaisseData, CaisseMember, CaisseCotisation, CaisseDepense, CaisseMemberHistory, DEPENSE_CATEGORIES, DEPENSE_CAT_LABELS } from "./types";

const fmt = (n: number) => n?.toLocaleString("fr-FR") ?? "0";

const getActionLabel = (action: string) => ({
  added: '➕ Membre ajouté',
  removed: '❌ Membre retiré',
  reinstated: '✅ Membre réintégré',
  cotisation_cancelled: '↩️ Cotisation annulée',
  suspended: '⏸️ Membre suspendu',
}[action] || action);

const getActionColor = (action: string) => ({
  added: 'text-primary',
  removed: 'text-destructive',
  reinstated: 'text-primary',
  cotisation_cancelled: 'text-yellow-500',
  suspended: 'text-yellow-500',
}[action] || 'text-muted-foreground');

const CaisseView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caisses, setCaisses] = useState<CaisseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Detail
  const [selected, setSelected] = useState<CaisseData | null>(null);
  const [members, setMembers] = useState<CaisseMember[]>([]);
  const [cotisations, setCotisations] = useState<CaisseCotisation[]>([]);
  const [depenses, setDepenses] = useState<CaisseDepense[]>([]);
  const [memberHistory, setMemberHistory] = useState<CaisseMemberHistory[]>([]);

  // Dialogs
  const [showCotisation, setShowCotisation] = useState(false);
  const [showDepense, setShowDepense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Member actions
  const [selectedMember, setSelectedMember] = useState<(CaisseMember & { total_paid?: number; has_paid?: boolean }) | null>(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);

  // Cotisation form
  const [cotisationMemberId, setCotisationMemberId] = useState("");
  const [cotisationAmount, setCotisationAmount] = useState("");
  const [cycleLabel, setCycleLabel] = useState("");
  const [cotisationDate, setCotisationDate] = useState(new Date().toISOString().split("T")[0]);

  // Depense form
  const [depenseLabel, setDepenseLabel] = useState("");
  const [depenseAmount, setDepenseAmount] = useState("");
  const [depenseCategory, setDepenseCategory] = useState("autre");
  const [depenseDate, setDepenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [beneficiaire, setBeneficiaire] = useState("");
  const [depenseNote, setDepenseNote] = useState("");

  // Add member form
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");

  const [saving, setSaving] = useState(false);

  const loadCaisses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("caisses" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setCaisses((data || []) as unknown as CaisseData[]);
    setLoading(false);
  }, [user]);

  const loadDetail = useCallback(async (caisse: CaisseData) => {
    const [mRes, cRes, dRes, hRes] = await Promise.all([
      supabase.from("caisse_members" as any).select("*").eq("caisse_id", caisse.id),
      supabase.from("caisse_cotisations" as any).select("*").eq("caisse_id", caisse.id).order("created_at", { ascending: false }),
      supabase.from("caisse_depenses" as any).select("*").eq("caisse_id", caisse.id).order("created_at", { ascending: false }),
      supabase.from("caisse_member_history" as any).select("*").eq("caisse_id", caisse.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setMembers((mRes.data || []) as unknown as CaisseMember[]);
    setCotisations((cRes.data || []) as unknown as CaisseCotisation[]);
    setDepenses((dRes.data || []) as unknown as CaisseDepense[]);
    setMemberHistory((hRes.data || []) as unknown as CaisseMemberHistory[]);
  }, []);

  const refreshDetail = async () => {
    if (!selected) return;
    // Recalculate total_collected from confirmed cotisations
    const { data: confirmedCots } = await supabase
      .from("caisse_cotisations" as any)
      .select("amount")
      .eq("caisse_id", selected.id)
      .eq("status", "confirmed");
    const totalCollected = (confirmedCots || []).reduce((s: number, c: any) => s + Number(c.amount), 0);
    await supabase.from("caisses" as any).update({ total_collected: totalCollected } as any).eq("id", selected.id);

    const { data } = await supabase.from("caisses" as any).select("*").eq("id", selected.id).single();
    if (data) {
      const updated = data as unknown as CaisseData;
      setSelected(updated);
      setCaisses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
    await loadDetail(selected);
  };

  useEffect(() => { loadCaisses(); }, [loadCaisses]);

  const openDetail = (c: CaisseData) => { setSelected(c); loadDetail(c); };
  const goBack = () => { setSelected(null); loadCaisses(); };

  const deleteCaisse = async (id: string) => {
    await supabase.from("caisses" as any).delete().eq("id", id);
    toast({ title: "Caisse supprimée" });
    loadCaisses();
  };

  // Current cycle label helper
  const now = new Date();
  const defaultCycleLabel = `${now.toLocaleString("fr-FR", { month: "long" })} ${now.getFullYear()}`;

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name || "?";

  const hasPaidThisCycle = (memberId: string) =>
    cotisations.some((c) => c.member_id === memberId && c.cycle_label === (cycleLabel || defaultCycleLabel) && c.status === "confirmed");

  const soldeDisponible = selected ? (selected.total_collected - selected.total_spent) : 0;

  const removedCount = members.filter(m => m.status === 'removed').length;
  const displayedMembers = showRemoved ? members : members.filter(m => m.status !== 'removed');

  // ─── MEMBER ACTIONS ───
  const openMemberActions = (member: CaisseMember, totalPaid: number, hasPaid: boolean) => {
    setSelectedMember({ ...member, total_paid: totalPaid, has_paid: hasPaid });
    setShowMemberActions(true);
  };

  const openCancelCotisationDialog = (member: any) => {
    setSelectedMember(member);
    setCancelReason("");
    setShowCancelDialog(true);
  };

  const openRemoveMemberDialog = (member: any) => {
    setSelectedMember(member);
    setRemoveReason("");
    setShowRemoveDialog(true);
  };

  const cancelCotisation = async (member: any, reason: string) => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      const { data: cotisation } = await supabase
        .from("caisse_cotisations" as any)
        .select("id, amount")
        .eq("member_id", member.id)
        .eq("caisse_id", selected.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cotisation) {
        toast({ title: "Aucune cotisation à annuler", variant: "destructive" });
        return;
      }
      await supabase.from("caisse_cotisations" as any).update({
        status: "cancelled",
        cancel_reason: reason || null,
        cancelled_at: new Date().toISOString(),
      } as any).eq("id", (cotisation as any).id);
      await supabase.from("caisse_member_history" as any).insert({
        caisse_id: selected.id,
        member_id: member.id,
        action: "cotisation_cancelled",
        reason: reason || null,
        performed_by: user.id,
      } as any);
      toast({ title: `Cotisation de ${member.name} annulée` });
      setShowCancelDialog(false);
      setCancelReason("");
      await refreshDetail();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member: any, reason: string) => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      await supabase.from("caisse_members" as any).update({ status: "removed" } as any).eq("id", member.id);
      await supabase.from("caisse_member_history" as any).insert({
        caisse_id: selected.id,
        member_id: member.id,
        action: "removed",
        reason: reason || null,
        performed_by: user.id,
      } as any);
      toast({ title: `${member.name} retiré de la caisse` });
      setShowRemoveDialog(false);
      setRemoveReason("");
      await refreshDetail();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const suspendMember = async (member: any) => {
    if (!selected || !user) return;
    await supabase.from("caisse_members" as any).update({ status: "suspended" } as any).eq("id", member.id);
    await supabase.from("caisse_member_history" as any).insert({
      caisse_id: selected.id,
      member_id: member.id,
      action: "suspended",
      performed_by: user.id,
    } as any);
    toast({ title: `${member.name} suspendu` });
    setShowMemberActions(false);
    await refreshDetail();
  };

  const reinstateMember = async (member: any) => {
    if (!selected || !user) return;
    await supabase.from("caisse_members" as any).update({ status: "active" } as any).eq("id", member.id);
    await supabase.from("caisse_member_history" as any).insert({
      caisse_id: selected.id,
      member_id: member.id,
      action: "reinstated",
      performed_by: user.id,
    } as any);
    toast({ title: `${member.name} réintégré ✅` });
    setShowMemberActions(false);
    await refreshDetail();
  };

  // ─── SAVE COTISATION ───
  const saveCotisation = async () => {
    if (!selected || !cotisationMemberId || saving) return;
    setSaving(true);
    try {
      const amount = Number(cotisationAmount);
      const label = cycleLabel || defaultCycleLabel;
      await supabase.from("caisse_cotisations" as any).insert({
        caisse_id: selected.id,
        member_id: cotisationMemberId,
        amount,
        cotisation_date: cotisationDate,
        cycle_label: label,
        status: "confirmed",
      } as any);
      await supabase.from("caisses" as any).update({ total_collected: selected.total_collected + amount } as any).eq("id", selected.id);
      toast({ title: `Cotisation de ${getMemberName(cotisationMemberId)} enregistrée ✅` });
      setShowCotisation(false);
      setCotisationMemberId("");
      await refreshDetail();
    } catch {
      toast({ title: "Erreur cotisation", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── SAVE DEPENSE ───
  const saveDepense = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const amount = Number(depenseAmount);
      await supabase.from("caisse_depenses" as any).insert({
        caisse_id: selected.id,
        label: depenseLabel,
        amount,
        category: depenseCategory,
        depense_date: depenseDate,
        beneficiaire: beneficiaire || null,
        note: depenseNote || null,
      } as any);
      await supabase.from("caisses" as any).update({ total_spent: selected.total_spent + amount } as any).eq("id", selected.id);
      toast({ title: "Dépense enregistrée", description: `${depenseLabel} — ${fmt(amount)} F` });
      setShowDepense(false);
      setDepenseLabel("");
      setDepenseAmount("");
      setBeneficiaire("");
      setDepenseNote("");
      await refreshDetail();
    } catch {
      toast({ title: "Erreur dépense", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── ADD MEMBER ───
  const addMember = async () => {
    if (!selected || !newMemberName.trim() || saving || !user) return;
    setSaving(true);
    try {
      const { data: newM } = await supabase.from("caisse_members" as any).insert({
        caisse_id: selected.id,
        name: newMemberName.trim(),
        phone: newMemberPhone || null,
        status: "active",
      } as any).select("id").single();
      if (newM) {
        await supabase.from("caisse_member_history" as any).insert({
          caisse_id: selected.id,
          member_id: (newM as any).id,
          action: "added",
          performed_by: user.id,
        } as any);
      }
      toast({ title: `${newMemberName} ajouté ✅` });
      setShowAddMember(false);
      setNewMemberName("");
      setNewMemberPhone("");
      await refreshDetail();
    } catch {
      toast({ title: "Erreur ajout membre", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── MOVEMENTS ───
  const allMovements = [
    ...cotisations.filter(c => c.status === "confirmed").map((c) => ({
      id: c.id,
      movement_type: "cotisation" as const,
      display_label: `Cotisation de ${getMemberName(c.member_id)}`,
      display_sub: c.cycle_label || "",
      amount: c.amount,
      date: c.cotisation_date,
      created_at: c.created_at,
    })),
    ...cotisations.filter(c => c.status === "cancelled").map((c) => ({
      id: c.id + "-cancelled",
      movement_type: "cancelled" as const,
      display_label: `↩️ Cotisation annulée — ${getMemberName(c.member_id)}`,
      display_sub: c.cancel_reason || c.cycle_label || "",
      amount: c.amount,
      date: c.cancelled_at || c.cotisation_date,
      created_at: c.cancelled_at || c.created_at,
    })),
    ...depenses.map((d) => ({
      id: d.id,
      movement_type: "depense" as const,
      display_label: d.label,
      display_sub: DEPENSE_CAT_LABELS[d.category || "autre"] || d.category || "",
      amount: d.amount,
      date: d.depense_date,
      created_at: d.created_at,
    })),
    ...memberHistory.map((h) => ({
      id: h.id,
      movement_type: "history" as const,
      display_label: `${getActionLabel(h.action)} — ${getMemberName(h.member_id)}`,
      display_sub: h.reason || "",
      amount: 0,
      date: h.created_at,
      created_at: h.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ═══════════ LIST VIEW ═══════════
  if (!selected) {
    return (
      <>
        <Button onClick={() => setCreateOpen(true)} className="w-full mb-4 gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle caisse commune
        </Button>
        <CreateCaisseModal open={createOpen} onOpenChange={setCreateOpen} onCreated={loadCaisses} />

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)
          ) : caisses.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <span className="text-4xl">🏦</span>
              <p className="text-sm font-semibold text-foreground mt-3 mb-1">Aucune caisse créée</p>
              <p className="text-xs text-muted-foreground mb-4">Crée une caisse commune pour gérer les cotisations de ton groupe — location, événements, urgences...</p>
            </div>
          ) : (
            caisses.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                onClick={() => openDetail(c)} className="glass-card rounded-2xl p-4 mb-3 cursor-pointer active:scale-[0.98] transition-transform border border-primary/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🏦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                    {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ConfirmDeleteDialog onConfirm={() => deleteCaisse(c.id)} title="Supprimer cette caisse ?">
                      <button className="text-muted-foreground hover:text-destructive p-1" onClick={(e) => e.stopPropagation()}>✕</button>
                    </ConfirmDeleteDialog>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="glass rounded-xl p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Collecté</p>
                    <p className="text-sm font-bold text-primary tabular-nums">{fmt(c.total_collected)} F</p>
                  </div>
                  <div className="glass rounded-xl p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Dépensé</p>
                    <p className="text-sm font-bold text-destructive tabular-nums">{fmt(c.total_spent)} F</p>
                  </div>
                  <div className="glass rounded-xl p-2.5 text-center border border-primary/30">
                    <p className="text-xs text-muted-foreground">Disponible</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">{fmt(c.total_collected - c.total_spent)} F</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </>
    );
  }

  // ═══════════ DETAIL VIEW ═══════════
  return (
    <>
      {/* HEADER */}
      <div className="glass-card rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack}><ChevronLeft className="w-5 h-5 text-muted-foreground" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{selected.name}</p>
            {selected.description && <p className="text-xs text-muted-foreground truncate">{selected.description}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Total collecté</p>
            <p className="text-base font-bold text-primary tabular-nums">{fmt(selected.total_collected)} F</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Total dépensé</p>
            <p className="text-base font-bold text-destructive tabular-nums">{fmt(selected.total_spent)} F</p>
          </div>
          <div className="glass rounded-xl p-3 border border-primary/30">
            <p className="text-xs text-muted-foreground">Disponible</p>
            <p className="text-base font-bold text-foreground tabular-nums">{fmt(soldeDisponible)} F</p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => { setCotisationAmount(String(selected.contribution_amount)); setCycleLabel(defaultCycleLabel); setShowCotisation(true); }}
          className="flex-1 glass-card rounded-xl p-3.5 flex flex-col items-center gap-1 border border-primary/30">
          <ArrowDownLeft className="w-5 h-5 text-primary" />
          <span className="text-xs font-medium text-foreground">Cotisation</span>
        </button>
        <button onClick={() => { setDepenseDate(new Date().toISOString().split("T")[0]); setShowDepense(true); }}
          className="flex-1 glass-card rounded-xl p-3.5 flex flex-col items-center gap-1 border border-destructive/30">
          <ArrowUpRight className="w-5 h-5 text-destructive" />
          <span className="text-xs font-medium text-foreground">Dépense</span>
        </button>
        <button onClick={() => setShowAddMember(true)}
          className="flex-1 glass-card rounded-xl p-3.5 flex flex-col items-center gap-1 border border-border">
          <UserPlus className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Membre</span>
        </button>
      </div>

      {/* MEMBERS */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Membres ({members.filter(m => m.status !== 'removed').length}) · {fmt(selected.contribution_amount)} F/membre
        </h3>
      </div>
      {removedCount > 0 && (
        <button onClick={() => setShowRemoved(!showRemoved)} className="text-xs text-muted-foreground underline mb-3 block">
          {showRemoved ? 'Masquer les membres retirés' : `Voir les membres retirés (${removedCount})`}
        </button>
      )}
      <div className="space-y-2 mb-6">
        {displayedMembers.map((m, i) => {
          const memberTotal = cotisations.filter((c) => c.member_id === m.id && c.status === "confirmed").reduce((s, c) => s + Number(c.amount), 0);
          const paid = hasPaidThisCycle(m.id);
          return (
            <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
              <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 mb-2 relative overflow-visible">
                {m.status === 'removed' && <div className="absolute inset-0 bg-destructive/5 pointer-events-none rounded-xl" />}
                {m.status === 'suspended' && <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none rounded-xl" />}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.status === 'removed' ? 'bg-destructive/20' :
                  m.status === 'suspended' ? 'bg-yellow-500/20' :
                  'gradient-primary'
                }`}>
                  <p className={`text-sm font-bold ${
                    m.status === 'removed' ? 'text-destructive' :
                    m.status === 'suspended' ? 'text-yellow-500' :
                    'text-primary-foreground'
                  }`}>{m.name.charAt(0).toUpperCase()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${m.status === 'removed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{m.name}</p>
                    {m.status === 'suspended' && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full flex-shrink-0">Suspendu</span>
                    )}
                    {m.status === 'removed' && (
                      <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full flex-shrink-0">Retiré</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Total versé : {fmt(memberTotal)} F</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {m.status === 'active' && (
                    paid ? (
                      <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-full">✅ Payé</span>
                    ) : (
                      <button onClick={() => { setCotisationMemberId(m.id); setCotisationAmount(String(selected.contribution_amount)); setCycleLabel(defaultCycleLabel); setShowCotisation(true); }}
                        className="text-xs gradient-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium">
                        + Cotiser
                      </button>
                    )
                  )}
                  <button
                    onClick={() => openMemberActions(m, memberTotal, paid)}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* MOVEMENTS HISTORY */}
      {allMovements.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-foreground mb-3">Historique des mouvements</h3>
          <div className="space-y-2 mb-4">
            {allMovements.slice(0, 30).map((mvt, i) => (
              <motion.div key={mvt.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
                <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    mvt.movement_type === "cotisation" ? "bg-primary/15" :
                    mvt.movement_type === "depense" ? "bg-destructive/15" :
                    mvt.movement_type === "cancelled" ? "bg-yellow-500/15" :
                    "bg-secondary"
                  }`}>
                    {mvt.movement_type === "cotisation" ? <ArrowDownLeft className="w-5 h-5 text-primary" /> :
                     mvt.movement_type === "depense" ? <ArrowUpRight className="w-5 h-5 text-destructive" /> :
                     mvt.movement_type === "cancelled" ? <XCircle className="w-5 h-5 text-yellow-500" /> :
                     <CheckCircle className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      mvt.movement_type === "history" ? getActionColor(mvt.display_label.split(' — ')[0]?.replace(/^[^\w]+/, '') || '') : 'text-foreground'
                    }`}>{mvt.display_label}</p>
                    <p className="text-xs text-muted-foreground">{mvt.display_sub} · {new Date(mvt.date).toLocaleDateString("fr-FR")}</p>
                  </div>
                  {mvt.amount > 0 && (
                    <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${
                      mvt.movement_type === "cotisation" ? "text-primary" :
                      mvt.movement_type === "cancelled" ? "text-yellow-500 line-through" :
                      "text-destructive"
                    }`}>
                      {mvt.movement_type === "cotisation" ? "+" : mvt.movement_type === "cancelled" ? "" : "-"}{fmt(mvt.amount)} F
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* ─── MEMBER ACTIONS SHEET ─── */}
      <Sheet open={showMemberActions} onOpenChange={setShowMemberActions}>
        <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                selectedMember?.status === 'removed' ? 'bg-destructive/20 text-destructive' :
                selectedMember?.status === 'suspended' ? 'bg-yellow-500/20 text-yellow-500' :
                'gradient-primary text-primary-foreground'
              }`}>
                {selectedMember?.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-base font-bold">{selectedMember?.name}</p>
                <p className="text-xs text-muted-foreground">Total versé : {fmt(selectedMember?.total_paid || 0)} F</p>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 pb-6">
            {selectedMember?.has_paid && selectedMember?.status === 'active' && (
              <button onClick={() => { setShowMemberActions(false); openCancelCotisationDialog(selectedMember); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl glass-card border border-yellow-500/20 hover:border-yellow-500/40 transition">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Annuler la cotisation</p>
                  <p className="text-xs text-muted-foreground">Marquer comme non payé ce cycle</p>
                </div>
              </button>
            )}
            {selectedMember?.status === 'active' && (
              <button onClick={() => suspendMember(selectedMember)}
                className="w-full flex items-center gap-3 p-4 rounded-xl glass-card border border-yellow-500/20 hover:border-yellow-500/40 transition">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                  <PauseCircle className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Suspendre temporairement</p>
                  <p className="text-xs text-muted-foreground">Le membre reste visible mais inactif</p>
                </div>
              </button>
            )}
            {selectedMember?.status === 'suspended' && (
              <button onClick={() => reinstateMember(selectedMember)}
                className="w-full flex items-center gap-3 p-4 rounded-xl glass-card border border-primary/20 hover:border-primary/40 transition">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Réactiver le membre</p>
                  <p className="text-xs text-muted-foreground">Remettre en statut actif</p>
                </div>
              </button>
            )}
            {selectedMember?.status === 'removed' && (
              <button onClick={() => reinstateMember(selectedMember)}
                className="w-full flex items-center gap-3 p-4 rounded-xl glass-card border border-primary/20 hover:border-primary/40 transition">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Remettre dans la caisse</p>
                  <p className="text-xs text-muted-foreground">Réintégrer ce membre</p>
                </div>
              </button>
            )}
            {selectedMember?.status !== 'removed' && (
              <button onClick={() => { setShowMemberActions(false); openRemoveMemberDialog(selectedMember!); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl glass-card border border-destructive/20 hover:border-destructive/40 transition">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                  <UserMinus className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-destructive">Retirer de la caisse</p>
                  <p className="text-xs text-muted-foreground">Le membre ne peut plus cotiser</p>
                </div>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── CANCEL COTISATION DIALOG ─── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Annuler la cotisation de {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Cette action marquera la cotisation comme annulée et déduira {fmt(selected.contribution_amount)} F du total collecté.
          </p>
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Raison (optionnelle)</Label>
            <Input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="Ex: Erreur de saisie, remboursement..." className="bg-secondary border-border" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowCancelDialog(false)} className="flex-1">Annuler</Button>
            <Button onClick={() => cancelCotisation(selectedMember!, cancelReason)} disabled={saving}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
              Confirmer l'annulation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── REMOVE MEMBER DIALOG ─── */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive">Retirer {selectedMember?.name} de la caisse ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Ce membre ne pourra plus cotiser. Son historique est conservé. Vous pourrez le réintégrer plus tard.
          </p>
          {(selectedMember?.total_paid || 0) > 0 && (
            <div className="glass-card rounded-xl p-3 mb-4 border border-yellow-500/20">
              <p className="text-xs text-yellow-500">
                ⚠️ Ce membre a déjà versé {fmt(selectedMember?.total_paid || 0)} F. Ces fonds restent dans la caisse.
              </p>
            </div>
          )}
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Raison (optionnelle)</Label>
            <Input value={removeReason} onChange={e => setRemoveReason(e.target.value)}
              placeholder="Ex: Abandon, départ du groupe..." className="bg-secondary border-border" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowRemoveDialog(false)} className="flex-1">Annuler</Button>
            <Button onClick={() => removeMember(selectedMember!, removeReason)} disabled={saving}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold">
              Retirer le membre
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── COTISATION DIALOG ─── */}
      <Dialog open={showCotisation} onOpenChange={setShowCotisation}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Enregistrer une cotisation</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Membre</Label>
              <Select value={cotisationMemberId} onValueChange={setCotisationMemberId}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue placeholder="Choisir un membre" /></SelectTrigger>
                <SelectContent>
                  {members.filter(m => m.status === 'active').map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} {hasPaidThisCycle(m.id) ? "✅" : "⏳"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant (F CFA)</Label>
              <Input type="number" value={cotisationAmount} onChange={(e) => setCotisationAmount(e.target.value)} className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Cycle (période)</Label>
              <Input value={cycleLabel} onChange={(e) => setCycleLabel(e.target.value)} placeholder="Ex: Janvier 2025, Semaine 12..." className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={cotisationDate} onChange={(e) => setCotisationDate(e.target.value)} className="bg-secondary border-border mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCotisation(false)} className="flex-1 glass">Annuler</Button>
              <Button onClick={saveCotisation} disabled={saving || !cotisationMemberId} className="flex-1 gradient-primary text-primary-foreground">Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DEPENSE DIALOG ─── */}
      <Dialog open={showDepense} onOpenChange={setShowDepense}>
        <DialogContent className="glass-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enregistrer une dépense</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Description de la dépense</Label>
              <Input value={depenseLabel} onChange={(e) => setDepenseLabel(e.target.value)} placeholder="Ex: Location bus, Terrain Cocody..." className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Catégorie</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DEPENSE_CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => setDepenseCategory(cat.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium text-left transition-colors ${depenseCategory === cat.id ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Montant (F CFA)</Label>
              <Input type="number" value={depenseAmount} onChange={(e) => setDepenseAmount(e.target.value)} className="bg-secondary border-border mt-1" />
              {Number(depenseAmount) > soldeDisponible && (
                <p className="text-xs text-destructive mt-1">⚠️ Solde insuffisant — disponible : {fmt(soldeDisponible)} F</p>
              )}
            </div>
            <div>
              <Label>Payé à (bénéficiaire)</Label>
              <Input value={beneficiaire} onChange={(e) => setBeneficiaire(e.target.value)} placeholder="Ex: Transport Kouamé..." className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={depenseDate} onChange={(e) => setDepenseDate(e.target.value)} className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Note (optionnel)</Label>
              <Input value={depenseNote} onChange={(e) => setDepenseNote(e.target.value)} placeholder="Détails supplémentaires..." className="bg-secondary border-border mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDepense(false)} className="flex-1 glass">Annuler</Button>
              <Button onClick={saveDepense} disabled={saving || !depenseLabel || !depenseAmount || Number(depenseAmount) > soldeDisponible}
                className="flex-1 bg-destructive text-destructive-foreground">
                Enregistrer la dépense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── ADD MEMBER DIALOG ─── */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Ajouter un membre</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nom</Label>
              <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Nom du membre" className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Téléphone (optionnel)</Label>
              <Input value={newMemberPhone} onChange={(e) => setNewMemberPhone(e.target.value)} placeholder="0X XX XX XX XX" className="bg-secondary border-border mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddMember(false)} className="flex-1 glass">Annuler</Button>
              <Button onClick={addMember} disabled={saving || !newMemberName.trim()} className="flex-1 gradient-primary text-primary-foreground">Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaisseView;
