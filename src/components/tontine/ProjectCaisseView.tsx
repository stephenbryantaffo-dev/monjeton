import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Plus, Lock, Target, Calendar, Users, FileText,
  TrendingUp, TrendingDown, Trash2, CheckCircle2, Pencil, Link2, Eye, Crown, Wrench, ListChecks, ArrowUp, ArrowDown, UserMinus,
  Search, ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import EditCaisseModal from "./EditCaisseModal";
import InviteCaisseModal from "@/components/caisse/InviteCaisseModal";
import { TontineData, TontineMember, TontineCycle, TontinePayment, TontineExpense } from "./types";
import { fmt } from "./utils";
import { logNotification } from "@/lib/tontineNotifications";

interface Props {
  tontine: TontineData;
  onBack: () => void;
  onUpdated: () => void;
  currentRole?: string;
}

const DEPENSE_CATS = [
  { id: "location_vehicule", label: "🚌 Location véhicule" },
  { id: "location_lieu", label: "🏟️ Location lieu" },
  { id: "evenement", label: "🎉 Événement" },
  { id: "achat", label: "🛍️ Achat" },
  { id: "urgence", label: "🆘 Urgence" },
  { id: "autre", label: "📦 Autre" },
];

interface CollabRow {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
}

const ROLE_BADGE: Record<string, { label: string; icon: typeof Eye; cls: string }> = {
  owner:   { label: "Propriétaire",   icon: Crown,  cls: "bg-amber-500/15 text-amber-500" },
  manager: { label: "Co-gestionnaire", icon: Wrench, cls: "bg-blue-500/15 text-blue-400" },
  viewer:  { label: "Observateur",     icon: Eye,    cls: "bg-muted text-muted-foreground" },
};

const ProjectCaisseView = ({ tontine, onBack, onUpdated, currentRole: currentRoleProp }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<TontineMember[]>([]);
  const [cycle, setCycle] = useState<TontineCycle | null>(null);
  const [payments, setPayments] = useState<TontinePayment[]>([]);
  const [expenses, setExpenses] = useState<TontineExpense[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [loadedRole, setLoadedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Expense items (postes) UI
  const [itemsViewOpen, setItemsViewOpen] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemPlanned, setNewItemPlanned] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemLabel, setEditItemLabel] = useState("");
  const [editItemPlanned, setEditItemPlanned] = useState("");

  const currentRole = currentRoleProp || loadedRole || (tontine.user_id === user?.id ? "owner" : "viewer");
  const isOwner = currentRole === "owner";
  const canManage = currentRole === "owner" || currentRole === "manager";
  const isClosed = !!tontine.is_closed;
  const roleInfo = ROLE_BADGE[currentRole] || ROLE_BADGE.viewer;
  const RoleIcon = roleInfo.icon;

  // Anti double-click guard
  const [saving, setSaving] = useState(false);

  // Payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payMember, setPayMember] = useState<TontineMember | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNote, setPayNote] = useState("");

  // Edit payment dialog
  const [editPayOpen, setEditPayOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<TontinePayment | null>(null);
  const [editPayAmount, setEditPayAmount] = useState("");
  const [editPayNote, setEditPayNote] = useState("");

  // Expense dialog
  const [expOpen, setExpOpen] = useState(false);
  const [expLabel, setExpLabel] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCat, setExpCat] = useState("autre");
  const [expBenef, setExpBenef] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expNote, setExpNote] = useState("");
  const [expItemId, setExpItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Members search & sort
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState<"name" | "paid">("name");

  // Collaborators search & sort
  const [collabSearch, setCollabSearch] = useState("");
  const [collabSort, setCollabSort] = useState<"name" | "role">("name");

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");

  // Cloture dialog
  const [clotureOpen, setClotureOpen] = useState(false);
  const [bilanOpen, setBilanOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [mRes, cRes, eRes, iRes, collabRes] = await Promise.all([
      supabase.from("tontine_members").select("*").eq("tontine_id", tontine.id),
      supabase.from("tontine_cycles").select("*").eq("tontine_id", tontine.id).order("cycle_number").limit(1),
      supabase.from("tontine_expenses" as any).select("*").eq("tontine_id", tontine.id).order("expense_date", { ascending: false }),
      supabase.from("tontine_expense_items" as any).select("*").eq("tontine_id", tontine.id).order("created_at", { ascending: true }),
      supabase.from("caisse_collaborators" as any).select("user_id, role").eq("caisse_id", tontine.id),
    ]);
    const ms = (mRes.data || []) as unknown as TontineMember[];
    setMembers(ms);
    const cyc = ((cRes.data || [])[0] || null) as unknown as TontineCycle | null;
    setCycle(cyc);
    setExpenses(((eRes.data as any[]) || []) as TontineExpense[]);
    setExpenseItems((iRes.data as any[]) || []);
    if (cyc) {
      const { data: pData } = await supabase.from("tontine_payments").select("*").eq("cycle_id", cyc.id);
      setPayments((pData || []) as unknown as TontinePayment[]);
    }

    // Collaborators + profile lookup for "Suivi par"
    const collabs = ((collabRes.data || []) as any[]) as { user_id: string; role: string }[];
    if (user) {
      const mine = collabs.find(c => c.user_id === user.id);
      setLoadedRole(mine?.role || (tontine.user_id === user.id ? "owner" : "viewer"));
    }
    if (collabs.length > 0) {
      const uids = collabs.map(c => c.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", uids);
      const pmap = new Map<string, { full_name: string | null; email: string | null }>();
      (profs || []).forEach((p: any) => pmap.set(p.user_id, { full_name: p.full_name, email: p.email }));
      setCollaborators(collabs.map(c => ({
        user_id: c.user_id,
        role: c.role,
        full_name: pmap.get(c.user_id)?.full_name ?? null,
        email: pmap.get(c.user_id)?.email ?? null,
      })));
    } else {
      setCollaborators([]);
    }

    setLoading(false);
  }, [tontine.id, tontine.user_id, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!tontine?.id) return;
    const channel = supabase
      .channel(`caisse-${tontine.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tontine_payments" },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tontine_members", filter: `tontine_id=eq.${tontine.id}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tontine_expenses", filter: `tontine_id=eq.${tontine.id}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tontine_expense_items", filter: `tontine_id=eq.${tontine.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tontine?.id, load]);

  // ─── Computed totals ───
  const recettes = useMemo(() => payments.reduce((s, p) => s + Number(p.amount_paid), 0), [payments]);
  const depenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const solde = recettes - depenses;
  const target = Number(tontine.target_amount || 0);
  const pctCollect = target > 0 ? Math.min(100, Math.round((recettes / target) * 100)) : 0;

  const memberPaid = (mid: string) => payments.filter(p => p.member_id === mid).reduce((s, p) => s + Number(p.amount_paid), 0);
  const expectedPerMember = Number(tontine.contribution_per_member || tontine.contribution_amount || 0);

  const paidByItem = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => {
      if (e.expense_item_id) {
        map[e.expense_item_id] = (map[e.expense_item_id] || 0) + Number(e.amount);
      }
    });
    return map;
  }, [expenses]);
  const totalPlanned = useMemo(
    () => expenseItems.reduce((s, it) => s + Number(it.planned_amount || 0), 0),
    [expenseItems]
  );
  const totalPaidOnItems = useMemo(
    () => Object.values(paidByItem).reduce((s, v) => s + v, 0),
    [paidByItem]
  );


  // ─── Actions ───
  const openPay = (m: TontineMember) => {
    setPayMember(m);
    setPayAmount(String(expectedPerMember || ""));
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayNote("");
    setPayOpen(true);
  };

  const confirmPay = async () => {
    if (!payMember || !cycle || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_payments").insert({
        cycle_id: cycle.id, member_id: payMember.id,
        amount_paid: Number(payAmount), payment_date: payDate,
        note: payNote.trim() || null,
      } as any);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      await supabase.rpc("recalculate_cycle_collected" as any, { p_cycle_id: cycle.id } as any);
      try {
        await logNotification({
          tontineId: tontine.id,
          membreId: payMember.id,
          type: "systeme",
          canal: "systeme",
          message: `${payMember.name} a cotisé ${fmt(Number(payAmount))} FCFA dans "${tontine.name}"`,
        });
      } catch {}
      toast({ title: `${payMember.name} : ${fmt(Number(payAmount))} enregistré ✅` });
      setPayOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const addExpense = async () => {
    if (!expLabel.trim() || Number(expAmount) <= 0 || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_expenses" as any).insert({
        tontine_id: tontine.id, label: expLabel.trim(), amount: Number(expAmount),
        category: expCat, beneficiaire: expBenef || null, expense_date: expDate, note: expNote || null,
        expense_item_id: expItemId || null,
      } as any);
      if (error) { toast({ title: "Erreur dépense", description: error.message, variant: "destructive" }); return; }
      toast({ title: `Dépense "${expLabel}" : ${fmt(Number(expAmount))} ✅` });
      setExpOpen(false);
      setExpLabel(""); setExpAmount(""); setExpCat("autre"); setExpBenef(""); setExpNote(""); setExpItemId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("tontine_expenses" as any).delete().eq("id", id);
    if (error) {
      console.error("Delete expense error:", error);
      toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dépense supprimée ✅" });
    await load();
  };

  // ─── Expense items (postes) ───
  const addExpenseItem = async () => {
    if (saving || !canManage || !newItemLabel.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_expense_items" as any).insert({
        tontine_id: tontine.id,
        label: newItemLabel.trim(),
        planned_amount: Number(newItemPlanned) || 0,
        created_by: user?.id,
      } as any);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: `Poste "${newItemLabel}" ajouté ✅` });
      setNewItemLabel("");
      setNewItemPlanned("");
      await load();
    } finally { setSaving(false); }
  };

  const startEditItem = (it: any) => {
    setEditingItemId(it.id);
    setEditItemLabel(it.label || "");
    setEditItemPlanned(String(it.planned_amount || ""));
  };

  const updateExpenseItem = async () => {
    if (saving || !canManage || !editingItemId || !editItemLabel.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_expense_items" as any)
        .update({
          label: editItemLabel.trim(),
          planned_amount: Number(editItemPlanned) || 0,
        } as any)
        .eq("id", editingItemId);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Poste modifié ✅" });
      setEditingItemId(null);
      setEditItemLabel("");
      setEditItemPlanned("");
      await load();
    } finally { setSaving(false); }
  };

  const deleteExpenseItem = async (id: string) => {
    if (saving || !canManage) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_expense_items" as any).delete().eq("id", id);
      if (error) {
        toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Poste supprimé ✅" });
      await load();
    } finally { setSaving(false); }
  };



  const addMember = async () => {
    if (!newMemberName.trim() || !canManage || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_members" as any).insert({
        tontine_id: tontine.id,
        name: newMemberName.trim(),
        phone: newMemberPhone.trim() || null,
        is_owner: false,
      });
      if (error) {
        console.error("Add project member error:", error);
        toast({ title: "Ajout membre impossible", description: error.message, variant: "destructive" });
        return;
      }
      setNewMemberName("");
      setNewMemberPhone("");
      setAddMemberOpen(false);
      toast({ title: `${newMemberName.trim()} ajouté ✅` });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (saving || !canManage) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_members" as any).delete().eq("id", memberId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      if (cycle) await supabase.rpc("recalculate_cycle_collected" as any, { p_cycle_id: cycle.id } as any);
      toast({ title: "Membre retiré ✅" });
      await load();
    } finally { setSaving(false); }
  };

  const changeCollabRole = async (collabUserId: string, newRole: "manager" | "viewer") => {
    if (saving || !canManage) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("caisse_collaborators" as any)
        .update({ role: newRole })
        .eq("caisse_id", tontine.id)
        .eq("user_id", collabUserId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Rôle mis à jour ✅" });
      await load();
    } finally { setSaving(false); }
  };

  const removeCollaborator = async (collabUserId: string) => {
    if (saving || !canManage) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("caisse_collaborators" as any)
        .delete()
        .eq("caisse_id", tontine.id)
        .eq("user_id", collabUserId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Collaborateur retiré ✅" });
      await load();
    } finally { setSaving(false); }
  };

  const deletePayment = async (paymentId: string) => {
    if (saving || !cycle) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_payments" as any).delete().eq("id", paymentId);
      if (error) { toast({ title:"Erreur", description:error.message, variant:"destructive" }); return; }
      await supabase.rpc("recalculate_cycle_collected" as any, { p_cycle_id: cycle.id } as any);
      toast({ title: "Cotisation supprimée ✅" });
      await load();
    } finally { setSaving(false); }
  };

  const updatePayment = async () => {
    if (saving || !cycle || !editingPayment) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_payments" as any)
        .update({ amount_paid: Number(editPayAmount), note: editPayNote.trim() || null })
        .eq("id", editingPayment.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      await supabase.rpc("recalculate_cycle_collected" as any, { p_cycle_id: cycle.id } as any);
      toast({ title: "Cotisation modifiée ✅" });
      setEditPayOpen(false);
      setEditingPayment(null);
      await load();
    } finally { setSaving(false); }
  };

  const cloturer = async () => {
    if (!isOwner) return;
    await supabase.from("tontines" as any).update({ is_closed: true, status: "closed" } as any).eq("id", tontine.id);
    if (cycle) await supabase.from("tontine_cycles" as any).update({ status: "closed" } as any).eq("id", cycle.id);
    setClotureOpen(false);
    setBilanOpen(true);
    toast({ title: "Projet clôturé 🔒" });
    onUpdated();
  };

  // ─── Export PDF (print-window) ───
  const exportPDF = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bilan ${tontine.name}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:24px;max-width:780px;margin:auto}
  h1{color:#5a9d2e;margin-bottom:4px}
  h2{color:#333;margin-top:24px;border-bottom:1px solid #eee;padding-bottom:4px}
  table{border-collapse:collapse;width:100%;margin-top:8px;font-size:13px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left}
  th{background:#f7f7f7}
  .kpi{display:flex;gap:12px;margin:16px 0}
  .kpi div{flex:1;padding:12px;border:1px solid #eee;border-radius:8px;text-align:center}
  .pos{color:#5a9d2e;font-weight:700}
  .neg{color:#c43838;font-weight:700}
</style></head><body>
  <h1>Bilan du projet : ${tontine.name}</h1>
  <p>Date événement : ${tontine.event_date ? new Date(tontine.event_date).toLocaleDateString("fr-FR") : "—"}</p>
  <div class="kpi">
    <div><small>Recettes</small><br/><b class="pos">${fmt(recettes)} F</b></div>
    <div><small>Dépenses</small><br/><b class="neg">${fmt(depenses)} F</b></div>
    <div><small>Solde</small><br/><b class="${solde >= 0 ? "pos" : "neg"}">${solde >= 0 ? "+" : ""}${fmt(solde)} F</b></div>
  </div>
  <h2>👥 Cotisations par membre</h2>
  <table><tr><th>Membre</th><th>Téléphone</th><th>Cotisé</th></tr>
  ${members.map(m => `<tr><td>${m.name}</td><td>${m.phone || "—"}</td><td>${fmt(memberPaid(m.id))} F</td></tr>`).join("")}
  </table>
  <h2>🧾 Dépenses détaillées</h2>
  <table><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Bénéficiaire</th><th>Montant</th></tr>
  ${expenses.map(e => `<tr><td>${new Date(e.expense_date).toLocaleDateString("fr-FR")}</td><td>${e.label}</td><td>${e.category || ""}</td><td>${e.beneficiaire || ""}</td><td>${fmt(Number(e.amount))} F</td></tr>`).join("")}
  </table>
  ${solde > 0 && members.length > 0 ? `<h2>🎁 Répartition équitable du bénéfice</h2><p>Chaque membre recevrait : <b>${fmt(Math.floor(solde / members.length))} FCFA</b></p>` : ""}
  ${solde < 0 ? `<h2>⚠️ Déficit</h2><p>Il manque ${fmt(Math.abs(solde))} FCFA pour équilibrer le projet.</p>` : ""}
  <p style="margin-top:32px;font-size:11px;color:#999">Généré par Mon Jeton</p>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Bloqué", description: "Autorise les pop-ups pour exporter", variant: "destructive" }); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  if (loading) return <p className="text-center text-muted-foreground py-12">Chargement...</p>;

  return (
    <div className="pb-28">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full">🎯 Projet</span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${roleInfo.cls}`}>
              <RoleIcon className="w-3 h-3" /> {roleInfo.label}
            </span>
            {isClosed && <span className="text-xs font-bold bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">Clôturé</span>}
          </div>
          {tontine.event_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {new Date(tontine.event_date).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
        {!isClosed && (isOwner || canManage) && (
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={() => setInviteOpen(true)}
                className="p-2 rounded-xl glass-card hover:bg-primary/10 transition-colors"
                title="Inviter à suivre la caisse"
              >
                <Link2 className="w-4 h-4 text-primary" />
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setEditOpen(true)}
                className="p-2 rounded-xl glass-card hover:bg-primary/10 transition-colors"
                title="Modifier la caisse"
              >
                <Pencil className="w-4 h-4 text-primary" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Suivi par (collaborators) ─── */}
      {collaborators.length > 0 && (
        <div className="glass-card rounded-2xl p-3 mb-4">
          <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" /> Suivi par
          </p>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={collabSearch}
                onChange={(e) => setCollabSearch(e.target.value)}
                placeholder="Rechercher…"
                className="glass pl-8 text-xs h-8"
              />
            </div>
            <button
              onClick={() => setCollabSort(s => s === "name" ? "role" : "name")}
              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground glass rounded-lg px-2 py-1.5 border border-border"
              title={collabSort === "name" ? "Trier par rôle" : "Trier par nom"}
            >
              <ArrowUpDown className="w-3 h-3" />
              {collabSort === "name" ? "Nom" : "Rôle"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const query = collabSearch.trim().toLowerCase();
              let list = collaborators.slice();
              if (query) {
                list = list.filter(c =>
                  (c.full_name || "").toLowerCase().includes(query) ||
                  (c.email || "").toLowerCase().includes(query) ||
                  (ROLE_BADGE[c.role]?.label || "").toLowerCase().includes(query)
                );
              }
              const roleOrder: Record<string, number> = { owner: 0, manager: 1, viewer: 2 };
              list.sort((a, b) => {
                if (collabSort === "role") {
                  const ra = roleOrder[a.role] ?? 3;
                  const rb = roleOrder[b.role] ?? 3;
                  if (ra !== rb) return ra - rb;
                }
                const na = (a.full_name || a.email || "").toLowerCase();
                const nb = (b.full_name || b.email || "").toLowerCase();
                return na.localeCompare(nb);
              });
              return list.map((c) => {
              const ri = ROLE_BADGE[c.role] || ROLE_BADGE.viewer;
              const Icon = ri.icon;
              const display = c.full_name || c.email || "Utilisateur";
              const initial = (c.full_name || c.email || "?").trim().charAt(0).toUpperCase();
              const isMe = c.user_id === user?.id;
              return (
                <div key={c.user_id} className="flex items-center gap-1.5 glass rounded-full pl-1 pr-1.5 py-1 border border-border">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary-foreground">{initial}</span>
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                    {display}{isMe && " (toi)"}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${ri.cls}`}>
                    <Icon className="w-2.5 h-2.5" /> {ri.label}
                  </span>
                  {canManage && !isMe && c.role !== "owner" && (
                    <>
                      {c.role === "viewer" ? (
                        <button
                          title="Promouvoir co-gestionnaire"
                          disabled={saving}
                          onClick={() => changeCollabRole(c.user_id, "manager")}
                          className="text-muted-foreground hover:text-blue-400 p-1 disabled:opacity-50"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      ) : c.role === "manager" ? (
                        <button
                          title="Passer observateur"
                          disabled={saving}
                          onClick={() => changeCollabRole(c.user_id, "viewer")}
                          className="text-muted-foreground hover:text-amber-400 p-1 disabled:opacity-50"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      ) : null}
                      <ConfirmDeleteDialog
                        onConfirm={() => removeCollaborator(c.user_id)}
                        title={`Retirer ${display} de la caisse ?`}
                        description="Il n'aura plus accès à cette caisse."
                      >
                        <button
                          title="Retirer"
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                      <UserMinus className="w-3 h-3" />
                        </button>
                      </ConfirmDeleteDialog>
                    </>
                  )}
                </div>
              );
            });
            })()}
          </div>
        </div>
      )}


      {/* ─── 3 KPIs ─── */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Recettes</p>
          <p className="text-base font-bold text-foreground mt-1">{fmt(recettes)}</p>
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 mx-auto mt-1" />
        </div>
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Dépenses</p>
          <p className="text-base font-bold text-foreground mt-1">{fmt(depenses)}</p>
          <TrendingDown className="w-3.5 h-3.5 text-destructive mx-auto mt-1" />
        </div>
        <div className={`glass-card rounded-2xl p-3 text-center border ${solde >= 0 ? "border-emerald-500/30" : "border-destructive/30"}`}>
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Solde</p>
          <p className={`text-base font-bold mt-1 ${solde >= 0 ? "text-emerald-400" : "text-destructive"}`}>
            {solde >= 0 ? "+" : ""}{fmt(solde)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{solde >= 0 ? "Bénéfice" : "Déficit"}</p>
        </div>
      </div>

      {/* Progress to target */}
      {target > 0 && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Cible : {fmt(target)} FCFA</span>
            <span className="font-bold text-primary">{pctCollect}%</span>
          </div>
          <Progress value={pctCollect} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-2">
            {fmt(recettes)} / {fmt(target)} FCFA collectés
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isClosed && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {canManage ? (
            <Button onClick={() => setExpOpen(true)} variant="outline" className="glass">
              <TrendingDown className="w-4 h-4 mr-1" /> Dépense
            </Button>
          ) : <div />}
          <Button onClick={() => setItemsViewOpen(true)} variant="outline" className="glass">
            <ListChecks className="w-4 h-4 mr-1" /> Postes{expenseItems.length > 0 ? ` (${expenseItems.length})` : ""}
          </Button>
          <Button onClick={exportPDF} variant="outline" className="glass">
            <FileText className="w-4 h-4 mr-1" /> Bilan PDF
          </Button>
        </div>
      )}


      {/* ─── Members + cotisations ─── */}
      <div className="flex items-center justify-between mb-2 mt-4">
        <p className="text-sm font-bold text-foreground flex items-center gap-1">
          <Users className="w-4 h-4" /> Membres ({members.length})
        </p>
        {canManage && !isClosed && (
          <Button size="sm" variant="outline" className="glass" onClick={() => setAddMemberOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Membre
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Rechercher un membre…"
            className="glass pl-8 text-xs h-8"
          />
        </div>
        <button
          onClick={() => setMemberSort(s => s === "name" ? "paid" : "name")}
          className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground glass rounded-lg px-2 py-1.5 border border-border"
          title={memberSort === "name" ? "Trier par cotisation" : "Trier par nom"}
        >
          <ArrowUpDown className="w-3 h-3" />
          {memberSort === "name" ? "Nom" : "Cotisé"}
        </button>
      </div>
      <div className="space-y-2 mb-4">
        {(() => {
          const query = memberSearch.trim().toLowerCase();
          let list = members.slice();
          if (query) {
            list = list.filter(m => m.name.toLowerCase().includes(query));
          }
          list.sort((a, b) => {
            if (memberSort === "paid") {
              const pa = memberPaid(a.id);
              const pb = memberPaid(b.id);
              if (pb !== pa) return pb - pa;
            }
            return a.name.localeCompare(b.name);
          });
          return list.map((m, i) => {
          const paid = memberPaid(m.id);
          const ok = expectedPerMember > 0 && paid >= expectedPerMember;
          const clickable = !isClosed && canManage;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
              <div className="glass-card rounded-xl p-3 flex items-center gap-3"
                onClick={() => clickable && openPay(m)}
                style={{ cursor: clickable ? "pointer" : "default" }}>
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-foreground">{m.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                    {m.name}
                    {ok && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(paid)} {expectedPerMember > 0 ? `/ ${fmt(expectedPerMember)}` : ""} FCFA
                  </p>
                  {payments.filter(p => p.member_id === m.id).map(p => (
                    <div key={p.id} className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {fmt(Number(p.amount_paid))}{p.payment_date ? ` · ${new Date(p.payment_date).toLocaleDateString("fr-FR")}` : ""}{(p as any).note ? ` · ${(p as any).note}` : ""}
                      </span>
                      {canManage && !isClosed && (
                        <>
                          <button
                            className="text-muted-foreground hover:text-primary p-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPayment(p);
                              setEditPayAmount(String(p.amount_paid));
                              setEditPayNote(((p as any).note ?? "") as string);
                              setEditPayOpen(true);
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <ConfirmDeleteDialog
                            onConfirm={() => deletePayment(p.id)}
                            title={`Supprimer cette cotisation de ${fmt(Number(p.amount_paid))} FCFA ?`}
                          >
                            <button className="text-muted-foreground hover:text-destructive p-0.5" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </ConfirmDeleteDialog>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {canManage && !isClosed && (
                  <ConfirmDeleteDialog
                    onConfirm={() => removeMember(m.id)}
                    title={`Retirer ${m.name} de la liste ?`}
                    description="Ses cotisations seront aussi supprimées."
                  >
                    <button
                      className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      title="Retirer ce membre"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </ConfirmDeleteDialog>
                )}
              </div>
            </motion.div>
          );
        })()
        }
        {(() => {
          const query = memberSearch.trim().toLowerCase();
          const list = query ? members.filter(m => m.name.toLowerCase().includes(query)) : members;
          if (list.length === 0) {
            return query
              ? <p className="text-xs text-muted-foreground text-center py-4">Aucun membre ne correspond à « {memberSearch} »</p>
              : <p className="text-xs text-muted-foreground text-center py-4">Aucun membre — ajoutez-en pour commencer</p>;
          }
          return null;
        })()}
      </div>

      {/* ─── Expenses list ─── */}
      {expenses.length > 0 && (
        <>
          <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-1">
            <TrendingDown className="w-4 h-4" /> Dépenses
          </p>
          <div className="space-y-2 mb-4">
            {expenses.map((e) => {
              const itemLabel = (e as any).expense_item_id
                ? expenseItems.find(i => i.id === (e as any).expense_item_id)?.label
                : null;
              return (
              <div key={e.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{e.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.expense_date).toLocaleDateString("fr-FR")}
                    {e.beneficiaire && ` · ${e.beneficiaire}`}
                  </p>
                  {itemLabel ? (
                    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      📌 {itemLabel}
                    </span>
                  ) : (
                    <span className="inline-block mt-1 text-[10px] text-muted-foreground/70">hors poste</span>
                  )}
                </div>
                <span className="text-sm font-bold text-destructive flex-shrink-0">-{fmt(Number(e.amount))}</span>
                {canManage && !isClosed && (
                  <ConfirmDeleteDialog onConfirm={() => deleteExpense(e.id)} title="Supprimer cette dépense ?">
                    <button className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </ConfirmDeleteDialog>
                )}
              </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Historique des cotisations ─── */}
      {payments.length > 0 && (
        <>
          <p className="text-sm font-bold text-foreground mb-2 mt-4 flex items-center gap-1">
            <FileText className="w-4 h-4" /> Historique des cotisations ({payments.length})
          </p>
          <div className="space-y-2 mb-4">
            {[...payments]
              .sort((a, b) => {
                const da = new Date(a.payment_date || 0).getTime();
                const db = new Date(b.payment_date || 0).getTime();
                return db - da;
              })
              .map((p) => {
                const member = members.find(m => m.id === p.member_id);
                const note = (p as any).note as string | null | undefined;
                return (
                  <div key={p.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {(member?.name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {member?.name || "Membre supprimé"} · <span className="text-emerald-400">{fmt(Number(p.amount_paid))} FCFA</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString("fr-FR") : "—"}
                        {note ? ` · ${note}` : ""}
                      </p>
                    </div>
                    {canManage && !isClosed && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          className="text-muted-foreground hover:text-primary p-1"
                          onClick={() => {
                            setEditingPayment(p);
                            setEditPayAmount(String(p.amount_paid));
                            setEditPayNote(((p as any).note ?? "") as string);
                            setEditPayOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <ConfirmDeleteDialog
                          onConfirm={() => deletePayment(p.id)}
                          title={`Supprimer cette cotisation de ${fmt(Number(p.amount_paid))} FCFA ?`}
                        >
                          <button className="text-muted-foreground hover:text-destructive p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </ConfirmDeleteDialog>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}



      {/* Clôture button */}
      {isOwner && !isClosed && (
        <Button onClick={() => setClotureOpen(true)} variant="outline" className="w-full glass border-destructive/30 text-destructive">
          <Lock className="w-4 h-4 mr-1" /> Clôturer le projet
        </Button>
      )}

      {/* ─── Payment Dialog ─── */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Cotisation — {payMember?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Montant (FCFA)</label>
              <MoneyInput value={payAmount} onChange={(n) => setPayAmount(n ? String(n) : "")} showCurrency={false} className="[&>input]:glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date</label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Motif (optionnel)</label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Ex: pour la vidéo du concert" className="glass" />
            </div>
            <Button onClick={confirmPay} disabled={saving || !payAmount || Number(payAmount) <= 0} className="w-full">
              {saving ? "Enregistrement…" : "Enregistrer la cotisation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Payment Dialog ─── */}
      <Dialog open={editPayOpen} onOpenChange={(o) => { if (!o) { setEditPayOpen(false); setEditingPayment(null); } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Modifier la cotisation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nouveau montant (FCFA)</label>
              <MoneyInput value={editPayAmount} onChange={(n) => setEditPayAmount(n ? String(n) : "")} showCurrency={false} className="[&>input]:glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Motif (optionnel)</label>
              <Input value={editPayNote} onChange={(e) => setEditPayNote(e.target.value)} placeholder="Ex: pour la vidéo du concert" className="glass" />
            </div>
            <Button onClick={updatePayment} disabled={saving || !editPayAmount || Number(editPayAmount) <= 0} className="w-full">
              {saving ? "Enregistrement…" : "Enregistrer la modification"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Expense Dialog ─── */}
      <Dialog open={expOpen} onOpenChange={(o) => { setExpOpen(o); if (!o) setExpItemId(null); }}>
        <DialogContent className="glass-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Libellé</label>
              <Input value={expLabel} onChange={(e) => setExpLabel(e.target.value)} placeholder="Ex: Location bus" className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Montant (FCFA)</label>
              <MoneyInput value={expAmount} onChange={(n) => setExpAmount(n ? String(n) : "")} showCurrency={false} className="[&>input]:glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Catégorie</label>
              <div className="grid grid-cols-2 gap-2">
                {DEPENSE_CATS.map((c) => (
                  <button key={c.id} onClick={() => setExpCat(c.id)}
                    className={`p-2 rounded-xl text-xs font-medium border transition-colors ${
                      expCat === c.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground"
                    }`}>{c.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Bénéficiaire (optionnel)</label>
              <Input value={expBenef} onChange={(e) => setExpBenef(e.target.value)} placeholder="Ex: Transporteur" className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date</label>
              <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Note (optionnel)</label>
              <Input value={expNote} onChange={(e) => setExpNote(e.target.value)} className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Rattacher à un poste (optionnel)</label>
              <select
                value={expItemId || ""}
                onChange={(e) => setExpItemId(e.target.value || null)}
                className="w-full glass rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Aucun poste / hors poste</option>
                {expenseItems.map((it) => {
                  const planned = Number(it.planned_amount || 0);
                  const paid = paidByItem[it.id] || 0;
                  return (
                    <option key={it.id} value={it.id}>
                      {it.label} ({fmt(paid)}/{fmt(planned)})
                    </option>
                  );
                })}
              </select>
            </div>
            <Button onClick={addExpense} disabled={saving || !expLabel.trim() || Number(expAmount) <= 0} className="w-full">
              {saving ? "Enregistrement…" : "Enregistrer la dépense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Add member Dialog ─── */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Nouveau membre</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Nom" className="glass" />
            <Input value={newMemberPhone} onChange={(e) => setNewMemberPhone(e.target.value)} placeholder="Téléphone (optionnel)" className="glass" />
            <Button onClick={addMember} disabled={saving || !newMemberName.trim()} className="w-full">
              {saving ? "Enregistrement…" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Cloture confirm ─── */}
      <Dialog open={clotureOpen} onOpenChange={setClotureOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Clôturer ce projet ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Le projet sera marqué comme terminé. Tu pourras toujours consulter le bilan et l'exporter en PDF.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setClotureOpen(false)} className="flex-1 glass">Annuler</Button>
            <Button onClick={cloturer} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Lock className="w-4 h-4 mr-1" /> Clôturer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Bilan dialog ─── */}
      <Dialog open={bilanOpen} onOpenChange={setBilanOpen}>
        <DialogContent className="glass-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>📋 Bilan final — {tontine.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Recettes</p>
                <p className="font-bold text-emerald-400">{fmt(recettes)}</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Dépenses</p>
                <p className="font-bold text-destructive">{fmt(depenses)}</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Solde</p>
                <p className={`font-bold ${solde >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {solde >= 0 ? "+" : ""}{fmt(solde)}
                </p>
              </div>
            </div>
            {solde > 0 && members.length > 0 && (
              <div className="glass rounded-xl p-3 border border-primary/30">
                <p className="text-xs text-muted-foreground">🎁 Bénéfice à répartir équitablement</p>
                <p className="font-bold text-primary">{fmt(Math.floor(solde / members.length))} FCFA / membre</p>
              </div>
            )}
            <Button onClick={exportPDF} className="w-full">
              <FileText className="w-4 h-4 mr-1" /> Télécharger le bilan PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit caisse modal ─── */}
      <EditCaisseModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        tontine={tontine}
        onUpdated={() => { load(); onUpdated(); }}
      />

      {/* ─── Invite modal ─── */}
      <InviteCaisseModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        caisseId={tontine.id}
        caisseName={tontine.name}
      />

      {/* ─── Postes de dépense Dialog ─── */}
      <Dialog open={itemsViewOpen} onOpenChange={(o) => { setItemsViewOpen(o); if (!o) { setEditingItemId(null); } }}>
        <DialogContent className="glass-card border-border max-w-2xl max-h-[90vh] overflow-y-auto pb-28">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" /> Postes de dépense
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {canManage && (
              <div className="glass rounded-xl p-3 space-y-2 border border-border">
                <p className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-primary" /> Ajouter un poste
                </p>
                <Input
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder="Nom du poste (ex: Salle, Traiteur…)"
                  className="glass"
                />
                <MoneyInput
                  value={newItemPlanned}
                  onChange={(n) => setNewItemPlanned(n ? String(n) : "")}
                  showCurrency={false}
                  className="[&>input]:glass"
                />
                <Button
                  onClick={addExpenseItem}
                  disabled={saving || !newItemLabel.trim()}
                  className="w-full"
                  size="sm"
                >
                  {saving ? "Enregistrement…" : "Ajouter le poste"}
                </Button>
              </div>
            )}

            {expenseItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun poste pour l'instant. Ajoute la salle, la déco, le traiteur…
              </p>
            ) : (
              <div className="space-y-2">
                {expenseItems.map((it) => {
                  const planned = Number(it.planned_amount || 0);
                  const paid = paidByItem[it.id] || 0;
                  const pct = planned > 0 ? Math.min(100, Math.round((paid / planned) * 100)) : (paid > 0 ? 100 : 0);
                  const solde = planned >= paid;
                  const reste = Math.max(planned - paid, 0);
                  const isEditing = editingItemId === it.id;
                  return (
                    <div key={it.id} className="glass-card rounded-xl p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editItemLabel}
                            onChange={(e) => setEditItemLabel(e.target.value)}
                            placeholder="Nom du poste"
                            className="glass"
                          />
                          <MoneyInput
                            value={editItemPlanned}
                            onChange={(n) => setEditItemPlanned(n ? String(n) : "")}
                            showCurrency={false}
                            className="[&>input]:glass"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 glass"
                              onClick={() => setEditingItemId(null)}
                            >Annuler</Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={updateExpenseItem}
                              disabled={saving || !editItemLabel.trim()}
                            >Enregistrer</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground flex-1 truncate">{it.label}</p>
                            {canManage && !isClosed && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  className="text-muted-foreground hover:text-primary p-1"
                                  onClick={() => startEditItem(it)}
                                  title="Modifier"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <ConfirmDeleteDialog
                                  onConfirm={() => deleteExpenseItem(it.id)}
                                  title="Supprimer ce poste ?"
                                  description="Les dépenses déjà enregistrées seront conservées (sans poste)."
                                >
                                  <button className="text-muted-foreground hover:text-destructive p-1" title="Supprimer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </ConfirmDeleteDialog>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {fmt(paid)} / {fmt(planned)} FCFA
                          </p>
                          <Progress value={pct} className={`h-2 ${paid >= planned && planned > 0 ? "[&>div]:bg-emerald-500" : ""}`} />
                          <p className={`text-xs mt-1.5 font-medium ${paid >= planned && planned > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {planned > 0 && paid >= planned
                              ? "✅ Soldé"
                              : `Reste : ${fmt(reste)} FCFA`}
                          </p>
                          {(() => {
                            const linked = expenses.filter((e: any) => e.expense_item_id === it.id);
                            if (linked.length === 0) return null;
                            const expanded = expandedItemId === it.id;
                            return (
                              <div className="mt-2">
                                <button
                                  onClick={() => setExpandedItemId(expanded ? null : it.id)}
                                  className="text-[11px] text-primary hover:underline"
                                >
                                  {expanded ? "▾ Masquer" : "▸ Voir"} les dépenses ({linked.length})
                                </button>
                                {expanded && (
                                  <div className="mt-2 space-y-1 pl-2 border-l border-border">
                                    {linked.map((e: any) => (
                                      <div key={e.id} className="flex items-center justify-between text-xs">
                                        <span className="truncate text-foreground/80">
                                          {new Date(e.expense_date).toLocaleDateString("fr-FR")} · {e.label}
                                        </span>
                                        <span className="text-destructive font-semibold ml-2 flex-shrink-0">-{fmt(Number(e.amount))}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {expenseItems.length > 0 && (
              <div className="glass-card rounded-xl p-3 mt-3 border border-primary/30">
                <p className="text-xs text-muted-foreground mb-1">Récapitulatif</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total prévu</span>
                  <span className="font-bold text-foreground">{fmt(totalPlanned)} FCFA</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Total payé sur postes</span>
                  <span className="font-bold text-emerald-400">{fmt(totalPaidOnItems)} FCFA</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectCaisseView;
