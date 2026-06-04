import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Plus, Lock, Target, Calendar, Users, FileText,
  TrendingUp, TrendingDown, Trash2, CheckCircle2, Pencil, Link2, Eye, Crown, Wrench,
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
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [loadedRole, setLoadedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    const [mRes, cRes, eRes, collabRes] = await Promise.all([
      supabase.from("tontine_members").select("*").eq("tontine_id", tontine.id),
      supabase.from("tontine_cycles").select("*").eq("tontine_id", tontine.id).order("cycle_number").limit(1),
      supabase.from("tontine_expenses" as any).select("*").eq("tontine_id", tontine.id).order("expense_date", { ascending: false }),
      supabase.from("caisse_collaborators" as any).select("user_id, role").eq("caisse_id", tontine.id),
    ]);
    const ms = (mRes.data || []) as unknown as TontineMember[];
    setMembers(ms);
    const cyc = ((cRes.data || [])[0] || null) as unknown as TontineCycle | null;
    setCycle(cyc);
    setExpenses(((eRes.data as any[]) || []) as TontineExpense[]);
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

  // ─── Computed totals ───
  const recettes = useMemo(() => payments.reduce((s, p) => s + Number(p.amount_paid), 0), [payments]);
  const depenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const solde = recettes - depenses;
  const target = Number(tontine.target_amount || 0);
  const pctCollect = target > 0 ? Math.min(100, Math.round((recettes / target) * 100)) : 0;

  const memberPaid = (mid: string) => payments.filter(p => p.member_id === mid).reduce((s, p) => s + Number(p.amount_paid), 0);
  const expectedPerMember = Number(tontine.contribution_per_member || tontine.contribution_amount || 0);

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
      });
      if (error) { toast({ title: "Erreur dépense", description: error.message, variant: "destructive" }); return; }
      toast({ title: `Dépense "${expLabel}" : ${fmt(Number(expAmount))} ✅` });
      setExpOpen(false);
      setExpLabel(""); setExpAmount(""); setExpCat("autre"); setExpBenef(""); setExpNote("");
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
        .update({ amount_paid: Number(editPayAmount) })
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
    <div>
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
            <Users className="w-3.5 h-3.5 text-primary" /> Suivi par ({collaborators.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {collaborators.map((c) => {
              const ri = ROLE_BADGE[c.role] || ROLE_BADGE.viewer;
              const Icon = ri.icon;
              const display = c.full_name || c.email || "Utilisateur";
              const initial = (c.full_name || c.email || "?").trim().charAt(0).toUpperCase();
              const isMe = c.user_id === user?.id;
              return (
                <div key={c.user_id} className="flex items-center gap-2 glass rounded-full pl-1 pr-2.5 py-1 border border-border">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary-foreground">{initial}</span>
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                    {display}{isMe && " (toi)"}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${ri.cls}`}>
                    <Icon className="w-2.5 h-2.5" /> {ri.label}
                  </span>
                </div>
              );
            })}
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
        <div className="grid grid-cols-2 gap-2 mb-4">
          {canManage ? (
            <Button onClick={() => setExpOpen(true)} variant="outline" className="glass">
              <TrendingDown className="w-4 h-4 mr-1" /> Dépense
            </Button>
          ) : <div />}
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
      <div className="space-y-2 mb-4">
        {members.map((m, i) => {
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
                        {fmt(Number(p.amount_paid))}{p.payment_date ? ` · ${new Date(p.payment_date).toLocaleDateString("fr-FR")}` : ""}
                      </span>
                      {canManage && !isClosed && (
                        <>
                          <button
                            className="text-muted-foreground hover:text-primary p-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPayment(p);
                              setEditPayAmount(String(p.amount_paid));
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
              </div>
            </motion.div>
          );
        })}
        {members.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun membre — ajoutez-en pour commencer</p>}
      </div>

      {/* ─── Expenses list ─── */}
      {expenses.length > 0 && (
        <>
          <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-1">
            <TrendingDown className="w-4 h-4" /> Dépenses
          </p>
          <div className="space-y-2 mb-4">
            {expenses.map((e) => (
              <div key={e.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{e.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.expense_date).toLocaleDateString("fr-FR")}
                    {e.beneficiaire && ` · ${e.beneficiaire}`}
                  </p>
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
            ))}
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
            <Button onClick={updatePayment} disabled={saving || !editPayAmount || Number(editPayAmount) <= 0} className="w-full">
              {saving ? "Enregistrement…" : "Enregistrer la modification"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Expense Dialog ─── */}
      <Dialog open={expOpen} onOpenChange={setExpOpen}>
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
    </div>
  );
};

export default ProjectCaisseView;
