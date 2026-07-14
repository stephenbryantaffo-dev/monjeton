import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronDown, ChevronRight, Plus, Lock, Target, Calendar, Users, FileText,
  TrendingUp, TrendingDown, Trash2, CheckCircle2, Pencil, Link2, Eye, Crown, Wrench, ListChecks, ArrowUp, ArrowDown, UserMinus,
  Search, ArrowUpDown, MoreHorizontal, UserPlus, AlertCircle, Receipt, Bell,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import LeaveCaisseButton from "./LeaveCaisseButton";
import EditCaisseModal from "./EditCaisseModal";
import InviteCaisseModal from "@/components/caisse/InviteCaisseModal";
import { TontineData, TontineMember, TontineCycle, TontinePayment, TontineExpense } from "./types";
import { fmt } from "./utils";
import { logNotification } from "@/lib/tontineNotifications";
import { DatePickerField } from "@/components/ui/DatePickerField";

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

  // Tabs
  const [activeTab, setActiveTab] = useState<"members" | "items">("members");

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
  const [payItemId, setPayItemId] = useState<string | null>(null);

  // Edit payment dialog
  const [editPayOpen, setEditPayOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<TontinePayment | null>(null);
  const [editPayAmount, setEditPayAmount] = useState("");
  const [editPayNote, setEditPayNote] = useState("");
  const [editPayItemId, setEditPayItemId] = useState<string | null>(null);

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
  const [payItemTarget, setPayItemTarget] = useState<any | null>(null);
  const [payItemAmount, setPayItemAmount] = useState("");

  // Members search & sort
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState<"name" | "paid">("name");

  // Expense items (postes) sort & filter
  const [itemSort, setItemSort] = useState("created");
  const [itemFilter, setItemFilter] = useState<"all" | "todo" | "done">("all");

  // Collaborators search & sort
  const [collabSearch, setCollabSearch] = useState("");
  const [collabSort, setCollabSort] = useState<"name" | "role">("name");
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const collectedByItem = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p: any) => {
      if (p.expense_item_id) {
        map[p.expense_item_id] = (map[p.expense_item_id] || 0) + Number(p.amount_paid);
      }
    });
    return map;
  }, [payments]);
  const totalPlanned = useMemo(
    () => expenseItems.reduce((s, it) => s + Number(it.planned_amount || 0), 0),
    [expenseItems]
  );
  const totalPaidOnItems = useMemo(
    () => Object.values(paidByItem).reduce((s, v) => s + v, 0),
    [paidByItem]
  );

  const sortedItems = useMemo(() => {
    const arr = [...expenseItems];
    const paid = (it: any) => paidByItem[it.id] || 0;
    const coll = (it: any) => collectedByItem[it.id] || 0;
    switch (itemSort) {
      case "budget_desc": return arr.sort((a, b) => Number(b.planned_amount) - Number(a.planned_amount));
      case "budget_asc":  return arr.sort((a, b) => Number(a.planned_amount) - Number(b.planned_amount));
      case "paid_desc":   return arr.sort((a, b) => paid(b) - paid(a));
      case "collected_desc": return arr.sort((a, b) => coll(b) - coll(a));
      case "reste_desc":  return arr.sort((a, b) => (Number(b.planned_amount) - paid(b)) - (Number(a.planned_amount) - paid(a)));
      default: return arr;
    }
  }, [expenseItems, itemSort, paidByItem, collectedByItem]);

  // ─── Actions ───
  const openPay = (m: TontineMember) => {
    setPayMember(m);
    setPayAmount(String(expectedPerMember || ""));
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayNote("");
    setPayItemId(null);
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
        expense_item_id: payItemId || null,
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
      setPayItemId(null);
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

  const openPayItem = (item: any) => {
    const paid = paidByItem[item.id] || 0;
    const collected = collectedByItem[item.id] || 0;
    const planned = Number(item.planned_amount || 0);
    const suggested = Math.max(0, Math.min(collected - paid, planned - paid));
    setPayItemTarget(item);
    setPayItemAmount(String(suggested || ""));
  };

  const markItemPaid = async () => {
    if (!payItemTarget) return;
    const montant = Number(payItemAmount);
    if (saving || montant <= 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tontine_expenses" as any).insert({
        tontine_id: tontine.id,
        label: `Paiement ${payItemTarget.label}`,
        amount: montant,
        category: "autre",
        beneficiaire: null,
        expense_date: new Date().toISOString().slice(0, 10),
        note: "Versé depuis les cotisations collectées",
        expense_item_id: payItemTarget.id,
      } as any);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: `${fmt(montant)} payé pour "${payItemTarget.label}" ✅` });
      setPayItemTarget(null);
      setPayItemAmount("");
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
        .update({ amount_paid: Number(editPayAmount), note: editPayNote.trim() || null, expense_item_id: editPayItemId || null })
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
    if (!isOwner || saving) return;
    setSaving(true);
    try {
      const { error: tErr } = await supabase
        .from("tontines" as any)
        .update({ is_closed: true, status: "closed" } as any)
        .eq("id", tontine.id);
      if (tErr) {
        toast({ title: "Clôture impossible", description: tErr.message, variant: "destructive" });
        return;
      }
      if (cycle) {
        const { error: cErr } = await supabase
          .from("tontine_cycles" as any)
          .update({ status: "closed" } as any)
          .eq("id", cycle.id);
        if (cErr) {
          toast({ title: "Erreur", description: cErr.message, variant: "destructive" });
          return;
        }
      }
      setClotureOpen(false);
      setBilanOpen(true);
      toast({ title: "Projet clôturé 🔒" });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  // ─── Export PDF (print-window) ───
  const exportPDF = () => {
    // Échappement HTML pour éviter XSS via données utilisateur (noms membres, libellés)
    const esc = (s: unknown) => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bilan ${esc(tontine.name)}</title>
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
  <h1>Bilan du projet : ${esc(tontine.name)}</h1>
  <p>Date événement : ${tontine.event_date ? new Date(tontine.event_date).toLocaleDateString("fr-FR") : "—"}</p>
  <div class="kpi">
    <div><small>Recettes</small><br/><b class="pos">${fmt(recettes)} F</b></div>
    <div><small>Dépenses</small><br/><b class="neg">${fmt(depenses)} F</b></div>
    <div><small>Solde</small><br/><b class="${solde >= 0 ? "pos" : "neg"}">${solde >= 0 ? "+" : ""}${fmt(solde)} F</b></div>
  </div>
  <h2>👥 Cotisations par membre</h2>
  <table><tr><th>Membre</th><th>Téléphone</th><th>Cotisé</th></tr>
  ${members.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.phone || "—")}</td><td>${fmt(memberPaid(m.id))} F</td></tr>`).join("")}
  </table>
  <h2>🧾 Dépenses détaillées</h2>
  <table><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Bénéficiaire</th><th>Montant</th></tr>
  ${expenses.map(e => `<tr><td>${new Date(e.expense_date).toLocaleDateString("fr-FR")}</td><td>${esc(e.label)}</td><td>${esc(e.category || "")}</td><td>${esc(e.beneficiaire || "")}</td><td>${fmt(Number(e.amount))} F</td></tr>`).join("")}
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

      {/* Header — compact : badges + date + actions */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-foreground truncate mb-1">{tontine.name}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded-full">🎯 Projet</span>
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${roleInfo.cls}`}>
              <RoleIcon className="w-2.5 h-2.5" /> {roleInfo.label}
            </span>
            {isClosed && <span className="text-[10px] font-bold bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full">Clôturé</span>}
            {tontine.event_date && (
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" /> {new Date(tontine.event_date).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isClosed && canManage && (
            <Button
              onClick={() => setInviteOpen(true)}
              size="sm"
              className="h-9 rounded-xl gradient-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
            >
              <UserPlus className="w-4 h-4 mr-1" /> Inviter
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-xl glass-card hover:bg-muted/40 transition-colors"
                title="Plus d'actions"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 glass-card border-border p-2 space-y-1.5">
              <Button
                onClick={exportPDF}
                variant="outline"
                size="sm"
                className="w-full glass justify-start"
              >
                <FileText className="w-4 h-4 mr-2" /> Bilan PDF
              </Button>
              {!isClosed && isOwner && (
                <Button
                  onClick={() => setEditOpen(true)}
                  variant="outline"
                  size="sm"
                  className="w-full glass justify-start"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Modifier la caisse
                </Button>
              )}
              {!isClosed && canManage && (
                <Button
                  onClick={() => setInviteOpen(true)}
                  variant="outline"
                  size="sm"
                  className="w-full glass justify-start"
                >
                  <Link2 className="w-4 h-4 mr-2" /> Copier le lien de partage
                </Button>
              )}
              {isOwner && !isClosed && (
                <Button
                  onClick={() => setClotureOpen(true)}
                  variant="outline"
                  className="w-full glass border-destructive/30 text-destructive justify-start"
                  size="sm"
                >
                  <Lock className="w-4 h-4 mr-2" /> Clôturer le projet
                </Button>
              )}
              <LeaveCaisseButton
                caisseId={tontine.id}
                isOwner={isOwner}
                onLeft={onBack}
                className="w-full justify-start"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* HÉRO — Cible / Collecté */}
      {target > 0 ? (
        <div className="relative overflow-hidden rounded-2xl p-5 mb-4 border border-primary/[0.18] bg-gradient-to-br from-primary/10 to-primary/[0.02] shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.35)]">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 opacity-60 motion-reduce:hidden"
            style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.28), transparent 70%)", filter: "blur(4px)" }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 opacity-40"
            style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.18), transparent 70%)" }} />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-widest text-primary/90 font-bold mb-2 flex items-center gap-1">
              <Target className="w-3 h-3" /> Collecté
            </p>
            <div className="flex items-baseline gap-2 flex-wrap mb-1">
              <span className="text-4xl font-black text-gradient leading-none">{fmt(recettes)}</span>
              <span className="text-xs text-muted-foreground">/ {fmt(target)} FCFA</span>
              <span className="ml-auto text-sm font-black text-primary">{pctCollect}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">sur l'objectif</p>
            <div className="w-full bg-secondary/60 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctCollect}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-2.5 rounded-full bg-gradient-to-r from-primary/70 to-primary shadow-[0_0_14px_hsl(var(--primary)/0.55)] motion-reduce:transition-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl p-5 mb-4 border border-primary/[0.18] bg-gradient-to-br from-primary/10 to-primary/[0.02] shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.35)]">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 opacity-60"
            style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.28), transparent 70%)", filter: "blur(4px)" }} />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-widest text-primary/90 font-bold mb-1">Collecté</p>
            <p className="text-4xl font-black text-gradient leading-none">{fmt(recettes)} <span className="text-sm text-muted-foreground font-normal">FCFA</span></p>
          </div>
        </div>
      )}

      {/* Ligne compacte : recettes · dépenses · solde */}
      <div className="glass-card rounded-xl px-3 py-2 mb-4 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="font-semibold text-foreground">{fmt(recettes)}</span>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <TrendingDown className="w-3 h-3 text-destructive" />
          <span className="font-semibold text-foreground">{fmt(depenses)}</span>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          Solde
          <span className={`font-semibold ${solde >= 0 ? "text-emerald-400" : "text-destructive"}`}>
            {solde >= 0 ? "+" : ""}{fmt(solde)}
          </span>
        </span>
      </div>

      {/* Collaborateurs — chips compactes (si présents) */}
      {collaborators.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(() => {
            const roleOrder: Record<string, number> = { owner: 0, manager: 1, viewer: 2 };
            const list = collaborators.slice().sort((a, b) => {
              const ra = roleOrder[a.role] ?? 3;
              const rb = roleOrder[b.role] ?? 3;
              if (ra !== rb) return ra - rb;
              return (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "");
            });
            return list.map((c) => {
              const ri = ROLE_BADGE[c.role] || ROLE_BADGE.viewer;
              const Icon = ri.icon;
              const display = c.full_name || c.email || "Utilisateur";
              const initial = (c.full_name || c.email || "?").trim().charAt(0).toUpperCase();
              const isMe = c.user_id === user?.id;
              return (
                <div key={c.user_id} className="flex items-center gap-1.5 glass rounded-full pl-1 pr-2 py-0.5 border border-border">
                  <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-[9px] font-bold text-primary-foreground">{initial}</span>
                  </div>
                  <span className="text-[11px] font-medium text-foreground truncate max-w-[110px]">
                    {display}{isMe && " (toi)"}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded-full ${ri.cls}`}>
                    <Icon className="w-2.5 h-2.5" />
                  </span>
                  {canManage && !isMe && c.role !== "owner" && (
                    <>
                      {c.role === "viewer" ? (
                        <button
                          title="Promouvoir co-gestionnaire"
                          disabled={saving}
                          onClick={() => changeCollabRole(c.user_id, "manager")}
                          className="text-muted-foreground hover:text-blue-400 disabled:opacity-50"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      ) : c.role === "manager" ? (
                        <button
                          title="Passer observateur"
                          disabled={saving}
                          onClick={() => changeCollabRole(c.user_id, "viewer")}
                          className="text-muted-foreground hover:text-amber-400 disabled:opacity-50"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      ) : null}
                      <ConfirmDeleteDialog
                        onConfirm={() => removeCollaborator(c.user_id)}
                        title={`Retirer ${display} de la caisse ?`}
                        description="Il n'aura plus accès à cette caisse."
                      >
                        <button title="Retirer" className="text-muted-foreground hover:text-destructive">
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
      )}

      {/* ─── Tabs : Membres / Postes ─── */}
      {(() => {
        const paidCount = members.filter(m => expectedPerMember > 0 && memberPaid(m.id) >= expectedPerMember).length;
        const unpaidCount = expectedPerMember > 0 ? members.length - paidCount : 0;
        return (
          <div className="flex gap-1 mb-4 glass-card rounded-2xl p-1">
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-all ${
                activeTab === "members"
                  ? "bg-primary/15 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.25)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Membres
              {expectedPerMember > 0 && members.length > 0 && (
                <span className="text-[10px] opacity-80">({paidCount}/{members.length})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("items")}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-all ${
                activeTab === "items"
                  ? "bg-primary/15 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.25)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Postes & dépenses
              {expenseItems.length > 0 && (
                <span className="text-[10px] opacity-80">({expenseItems.length})</span>
              )}
            </button>
          </div>
        );
      })()}

      {/* ─── Onglet Membres ─── */}
      {activeTab === "members" && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {expectedPerMember > 0
                ? `${members.filter(m => memberPaid(m.id) >= expectedPerMember).length}/${members.length} ont cotisé`
                : `${members.length} membre${members.length > 1 ? "s" : ""}`}
            </p>
            {canManage && !isClosed && (
              <Button size="sm" variant="outline" className="glass h-8" onClick={() => setAddMemberOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
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

          <div className="space-y-2 mb-3">
            {(() => {
              const query = memberSearch.trim().toLowerCase();
              let list = members.slice();
              if (query) list = list.filter(m => m.name.toLowerCase().includes(query));
              // Impayés en haut, payés en bas
              list.sort((a, b) => {
                const pa = memberPaid(a.id);
                const pb = memberPaid(b.id);
                const oka = expectedPerMember > 0 && pa >= expectedPerMember;
                const okb = expectedPerMember > 0 && pb >= expectedPerMember;
                if (oka !== okb) return oka ? 1 : -1;
                if (memberSort === "paid" && pb !== pa) return pb - pa;
                return a.name.localeCompare(b.name);
              });
              if (list.length === 0) {
                return query
                  ? <p className="text-xs text-muted-foreground text-center py-4">Aucun membre ne correspond à « {memberSearch} »</p>
                  : <p className="text-xs text-muted-foreground text-center py-4">Aucun membre — ajoutez-en pour commencer</p>;
              }
              return list.map((m, i) => {
                const paid = memberPaid(m.id);
                const ok = expectedPerMember > 0 && paid >= expectedPerMember;
                const due = Math.max(0, expectedPerMember - paid);
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.02 * i }}>
                    <div className={`glass-card rounded-xl p-3 flex items-center gap-3 border transition-all ${
                      ok ? "border-border/40 opacity-70" : "border-amber-500/30"
                    }`}>
                      {ok ? (
                        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_hsl(var(--primary)/0.4)]">
                          <span className="text-xs font-bold text-primary-foreground">{m.name.charAt(0).toUpperCase()}</span>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full border border-dashed border-amber-500/40 bg-amber-500/[0.05] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-amber-400">{m.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                        {ok ? (
                          <p className="text-[11px] text-emerald-400 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> A cotisé · {fmt(paid)} FCFA
                          </p>
                        ) : expectedPerMember > 0 ? (
                          <p className="text-[11px] text-amber-400 font-medium">
                            En attente · doit {fmt(due)} FCFA
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">{fmt(paid)} FCFA cotisé</p>
                        )}
                      </div>
                      {canManage && !isClosed && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openPay(m)}
                            className={`h-8 px-3 text-xs flex-shrink-0 ${
                              ok
                                ? "glass border border-border/60 text-foreground bg-transparent hover:bg-primary/10"
                                : "gradient-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.35)]"
                            }`}
                          >
                            Cotiser
                          </Button>
                          <ConfirmDeleteDialog
                            onConfirm={() => removeMember(m.id)}
                            title={`Retirer ${m.name} de la liste ?`}
                            description="Ses cotisations seront aussi supprimées."
                          >
                            <button
                              className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"
                              title="Retirer ce membre"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </ConfirmDeleteDialog>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              });
            })()}
          </div>

          {/* Alerte impayés — discrète, EN BAS de la liste */}
          {(() => {
            if (expectedPerMember <= 0 || members.length === 0) return null;
            const unpaid = members.filter(m => memberPaid(m.id) < expectedPerMember).length;
            if (unpaid === 0) return null;
            return (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 bg-amber-500/[0.08] border border-amber-500/25 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <p className="text-[11px] font-medium">
                  {unpaid} membre{unpaid > 1 ? "s" : ""} n'{unpaid > 1 ? "ont" : "a"} pas encore cotisé
                </p>
              </div>
            );
          })()}

          {/* ─── Historique des cotisations ─── */}
          {payments.length > 0 && (
            <>
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full text-sm font-bold text-foreground mb-2 mt-4 flex items-center gap-1"
              >
                {historyOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <FileText className="w-4 h-4" />
                Historique des cotisations ({payments.length})
              </button>
              {historyOpen && (
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
                          {(p as any).expense_item_id && (() => {
                            const lbl = expenseItems.find(i => i.id === (p as any).expense_item_id)?.label;
                            return lbl ? (
                              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                🎯 {lbl}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {canManage && !isClosed && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              className="text-muted-foreground hover:text-primary p-1"
                              onClick={() => {
                                setEditingPayment(p);
                                setEditPayAmount(String(p.amount_paid));
                                setEditPayNote(((p as any).note ?? "") as string);
                                setEditPayItemId(((p as any).expense_item_id ?? null));
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
              )}
            </>
          )}
        </>
      )}

      {/* ─── Onglet Postes & dépenses ─── */}
      {activeTab === "items" && (
        <>
          {/* ─── Trésorerie de la caisse ─── */}
          <div
            className="rounded-2xl p-4 mb-3"
            style={{
              background: "rgba(20,23,28,0.7)",
              border: "1px solid rgba(124,255,58,0.14)",
              backdropFilter: "blur(10px)",
            }}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Trésorerie de la caisse</p>
            <p
              className="text-3xl font-bold font-display"
              style={{ color: solde >= 0 ? "#3DFF9A" : "#FF6B6B" }}
            >
              {fmt(solde)} FCFA
            </p>
            <p className="text-[11px] text-muted-foreground mb-3">disponible après dépenses</p>
            <Progress
              value={recettes > 0 ? Math.min(100, Math.round((depenses / recettes) * 100)) : 0}
              className="h-2 [&>div]:bg-[#7CFF3A]"
            />
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span style={{ color: "#8FF2B0" }}>Collecté (membres) : {fmt(recettes)}</span>
              <span style={{ color: "#FFB0B0" }}>Payé (postes) : {fmt(depenses)}</span>
            </div>
          </div>

          {/* ─── Rappel de cotisations ─── */}
          {(() => {
            if (expectedPerMember <= 0) return null;
            const unpaid = members.filter((m) => memberPaid(m.id) < expectedPerMember);
            if (unpaid.length === 0) return null;
            const remaining = unpaid.reduce(
              (s, m) => s + Math.max(0, expectedPerMember - memberPaid(m.id)),
              0
            );
            return (
              <button
                type="button"
                onClick={() => setActiveTab("members")}
                className="w-full flex items-center gap-3 rounded-xl p-3 mb-3 text-left transition-colors hover:bg-amber-500/15"
                style={{
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.35)",
                }}
              >
                <Bell className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs flex-1 text-amber-100">
                  <span className="font-bold">{unpaid.length}</span> membre{unpaid.length > 1 ? "s" : ""} n'{unpaid.length > 1 ? "ont" : "a"} pas encore cotisé · <span className="font-bold">{fmt(remaining)} F</span> attendus
                </p>
                <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
              </button>
            );
          })()}

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-primary" /> Postes budgétés
            </p>
            {canManage && !isClosed && (
              <Button size="sm" onClick={() => setExpOpen(true)} variant="outline" className="glass h-8">
                <TrendingDown className="w-3.5 h-3.5 mr-1" /> Dépense
              </Button>
            )}
          </div>

          {expenseItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {([
                  { id: "all", label: "Tous" },
                  { id: "todo", label: "À payer" },
                  { id: "done", label: "Soldés" },
                ] as const).map((chip) => {
                  const active = itemFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setItemFilter(chip.id)}
                      className="text-[11px] font-medium px-3 py-1 rounded-full transition-colors"
                      style={{
                        background: active ? "rgba(124,255,58,0.15)" : "rgba(255,255,255,0.03)",
                        border: active ? "1px solid rgba(124,255,58,0.45)" : "1px solid rgba(255,255,255,0.08)",
                        color: active ? "#7CFF3A" : "#EAFBEA",
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
                <div className="flex-1" />
                <span className="text-[11px] text-muted-foreground">Trier</span>
                <select
                  value={itemSort}
                  onChange={(e) => setItemSort(e.target.value)}
                  className="glass rounded-lg border border-input bg-background px-2.5 py-1 text-[11px] text-foreground"
                >
                  <option value="created">Par défaut</option>
                  <option value="budget_desc">Budget (grand → petit)</option>
                  <option value="budget_asc">Budget (petit → grand)</option>
                  <option value="paid_desc">Payé (grand → petit)</option>
                  <option value="collected_desc">Collecté (grand → petit)</option>
                  <option value="reste_desc">Reste à payer (grand → petit)</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-2 mb-3">
            {(() => {
              const filtered = sortedItems.filter((it) => {
                const planned = Number(it.planned_amount || 0);
                const paid = paidByItem[it.id] || 0;
                const reste = Math.max(planned - paid, 0);
                const depassement = Math.max(paid - planned, 0);
                if (itemFilter === "todo") return reste > 0 && depassement === 0;
                if (itemFilter === "done") return planned > 0 && reste === 0 && depassement === 0;
                return true;
              });
              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {sortedItems.length === 0
                      ? "Aucun poste. Ajoute la salle, le traiteur, la déco…"
                      : "Aucun poste dans cette catégorie."}
                  </p>
                );
              }
              return filtered.map((it) => {
              const planned = Number(it.planned_amount || 0);
              const paid = paidByItem[it.id] || 0;
              const collected = collectedByItem[it.id] || 0;
              const pct = planned > 0 ? Math.min(100, Math.round((paid / planned) * 100)) : (paid > 0 ? 100 : 0);
              const reste = Math.max(planned - paid, 0);
              const depassement = Math.max(paid - planned, 0);
              const isOver = depassement > 0;
              const isSolded = !isOver && planned > 0 && reste === 0;
              const isEditing = editingItemId === it.id;
              const linkedCount = expenses.filter((e: any) => e.expense_item_id === it.id).length;
              const expanded = expandedItemId === it.id;

              const cardBorder = isOver
                ? "1px solid rgba(239,68,68,0.45)"
                : isSolded
                ? "1px solid rgba(61,255,154,0.35)"
                : "1px solid rgba(255,255,255,0.06)";

              const barClass = isOver
                ? "[&>div]:bg-red-500"
                : isSolded
                ? "[&>div]:bg-emerald-500"
                : "[&>div]:bg-[#7CFF3A]";

              return (
                <div
                  key={it.id}
                  className="rounded-xl p-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: cardBorder,
                  }}
                >
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
                        <Button size="sm" variant="outline" className="flex-1 glass" onClick={() => setEditingItemId(null)}>Annuler</Button>
                        <Button size="sm" className="flex-1" onClick={updateExpenseItem} disabled={saving || !editItemLabel.trim()}>Enregistrer</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-foreground flex-1 truncate">{it.label}</p>
                        {isOver && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                            Dépassé
                          </span>
                        )}
                        {isSolded && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                            Soldé
                          </span>
                        )}
                        {canManage && !isClosed && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button className="text-muted-foreground hover:text-primary p-1" onClick={() => startEditItem(it)} title="Modifier">
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

                      <div className="mb-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {isOver ? "Dépassement" : "Reste à payer"}
                        </p>
                        <p
                          className="text-xl font-bold font-display"
                          style={{
                            color: isOver ? "#FF6B6B" : isSolded ? "#3DFF9A" : "#EAFBEA",
                          }}
                        >
                          {isOver ? `+ ${fmt(depassement)}` : fmt(reste)} FCFA
                        </p>
                      </div>

                      <Progress value={pct} className={`h-2 ${barClass}`} />

                      <div className="flex items-center justify-between mt-2 gap-2">
                        <p className="text-[11px] text-muted-foreground">
                          Payé {fmt(paid)} / {fmt(planned)}
                        </p>
                        {linkedCount > 0 ? (
                          <button
                            onClick={() => setExpandedItemId(expanded ? null : it.id)}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            Dépenses ({linkedCount})
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">Aucune dépense</span>
                        )}
                      </div>

                      {canManage && !isClosed && collected > paid && (planned === 0 || paid < planned) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 h-8 text-xs glass border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => openPayItem(it)}
                          disabled={saving}
                        >
                          Marquer comme payé
                        </Button>
                      )}

                      {expanded && linkedCount > 0 && (
                        <div className="mt-2 space-y-1 pl-2 border-l border-border">
                          {expenses.filter((e: any) => e.expense_item_id === it.id).map((e: any) => (
                            <div key={e.id} className="flex items-center justify-between text-xs">
                              <span className="truncate text-foreground/80">
                                {new Date(e.expense_date).toLocaleDateString("fr-FR")} · {e.label}
                              </span>
                              <span className="text-destructive font-semibold ml-2 flex-shrink-0">-{fmt(Number(e.amount))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
              });
            })()}
          </div>


          {/* + Nouveau poste */}
          {canManage && !isClosed && (
            <div className="glass-card rounded-xl p-3 space-y-2 border border-primary/20 mb-4">
              <p className="text-xs font-bold text-foreground flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-primary" /> Nouveau poste de dépense
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
              <Button onClick={addExpenseItem} disabled={saving || !newItemLabel.trim()} className="w-full" size="sm">
                {saving ? "Enregistrement…" : "Ajouter le poste"}
              </Button>
            </div>
          )}

          {expenseItems.length > 0 && (
            <div className="glass-card rounded-xl p-3 mb-4 border border-primary/25">
              <p className="text-xs text-muted-foreground mb-1">Récapitulatif postes</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total prévu</span>
                <span className="font-bold text-foreground">{fmt(totalPlanned)} FCFA</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total payé</span>
                <span className="font-bold text-emerald-400">{fmt(totalPaidOnItems)} FCFA</span>
              </div>
            </div>
          )}

          {/* ─── Dépenses (toutes) ─── */}
          {expenses.length > 0 && (
            <>
              <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-destructive" /> Dépenses ({expenses.length})
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
        </>
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
              <DatePickerField value={payDate} onChange={setPayDate} className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Motif (optionnel)</label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Ex: pour la vidéo du concert" className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Affecter à un poste (optionnel)</label>
              <select
                value={payItemId || ""}
                onChange={(e) => setPayItemId(e.target.value || null)}
                className="w-full glass rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pot commun (non affecté)</option>
                {expenseItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.label}</option>
                ))}
              </select>
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
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Affecter à un poste (optionnel)</label>
              <select
                value={editPayItemId || ""}
                onChange={(e) => setEditPayItemId(e.target.value || null)}
                className="w-full glass rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pot commun (non affecté)</option>
                {expenseItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={updatePayment} disabled={saving || !editPayAmount || Number(editPayAmount) <= 0} className="w-full">
              {saving ? "Enregistrement…" : "Enregistrer la modification"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Expense Dialog ─── */}
      <Dialog open={expOpen} onOpenChange={(o) => { setExpOpen(o); if (!o) { setExpItemId(null); setExpCat("autre"); } }}>
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
              <label className="text-sm text-muted-foreground mb-1 block">Catégoriser</label>
              <select
                value={
                  expItemId ? `poste:${expItemId}`
                  : expCat && expCat !== "autre" ? `cat:${expCat}`
                  : ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.startsWith("poste:")) {
                    setExpItemId(v.slice(6));
                    setExpCat("autre");
                  } else if (v.startsWith("cat:")) {
                    setExpCat(v.slice(4));
                    setExpItemId(null);
                  } else {
                    setExpItemId(null);
                    setExpCat("autre");
                  }
                }}
                className="w-full glass rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Choisir…</option>
                {expenseItems.length > 0 && (
                  <optgroup label="Tes postes de dépense">
                    {expenseItems.map((it) => (
                      <option key={`poste-${it.id}`} value={`poste:${it.id}`}>🎯 {it.label}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Catégories générales">
                  {DEPENSE_CATS.map((c) => (
                    <option key={`cat-${c.id}`} value={`cat:${c.id}`}>{c.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Bénéficiaire (optionnel)</label>
              <Input value={expBenef} onChange={(e) => setExpBenef(e.target.value)} placeholder="Ex: Transporteur" className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date</label>
              <DatePickerField value={expDate} onChange={setExpDate} className="glass" />
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
            <Button onClick={cloturer} disabled={saving} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

            {expenseItems.length > 0 && (
              <div className="flex items-center justify-end gap-2">
                <span className="text-[11px] text-muted-foreground">Trier</span>
                <select
                  value={itemSort}
                  onChange={(e) => setItemSort(e.target.value)}
                  className="glass rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  <option value="created">Par défaut</option>
                  <option value="budget_desc">Budget (grand → petit)</option>
                  <option value="budget_asc">Budget (petit → grand)</option>
                  <option value="paid_desc">Payé (grand → petit)</option>
                  <option value="collected_desc">Collecté (grand → petit)</option>
                  <option value="reste_desc">Reste à payer (grand → petit)</option>
                </select>
              </div>
            )}

            {sortedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun poste pour l'instant. Ajoute la salle, la déco, le traiteur…
              </p>
            ) : (
              <div className="space-y-2">
                {sortedItems.map((it) => {
                  const planned = Number(it.planned_amount || 0);
                  const paid = paidByItem[it.id] || 0;
                  const collected = collectedByItem[it.id] || 0;
                  const pct = planned > 0 ? Math.min(100, Math.round((paid / planned) * 100)) : (paid > 0 ? 100 : 0);
                  const reste = Math.max(planned - paid, 0);
                  const resteCollect = Math.max(planned - collected, 0);
                  const finance = planned > 0 && collected >= planned;
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
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Collecté</p>
                              <p className="text-xs font-semibold text-emerald-400">{fmt(collected)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payé</p>
                              <p className="text-xs font-semibold text-destructive">{fmt(paid)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Budget</p>
                              <p className="text-xs font-semibold text-foreground">{fmt(planned)}</p>
                            </div>
                          </div>
                          <Progress value={pct} className={`h-2 ${paid >= planned && planned > 0 ? "[&>div]:bg-emerald-500" : ""}`} />
                          <div className="flex items-center justify-between mt-1.5 gap-2">
                            <p className={`text-[11px] font-medium ${paid >= planned && planned > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                              {planned > 0 && paid >= planned ? "✅ Soldé" : `Reste à payer : ${fmt(reste)}`}
                            </p>
                            <p className={`text-[11px] font-medium ${finance ? "text-emerald-400" : "text-muted-foreground"}`}>
                              {finance ? "✅ Financé" : `À collecter : ${fmt(resteCollect)}`}
                            </p>
                          </div>
                          {canManage && !isClosed && collected > paid && (planned === 0 || paid < planned) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2 h-8 text-xs glass border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => openPayItem(it)}
                              disabled={saving}
                            >
                              Marquer comme payé
                            </Button>
                          )}
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

      <Dialog open={!!payItemTarget} onOpenChange={(o) => { if (!o) { setPayItemTarget(null); setPayItemAmount(""); } }}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Marquer comme payé</DialogTitle>
          </DialogHeader>
          {payItemTarget && (() => {
            const paid = paidByItem[payItemTarget.id] || 0;
            const collected = collectedByItem[payItemTarget.id] || 0;
            const planned = Number(payItemTarget.planned_amount || 0);
            const maxPayable = Math.max(0, Math.min(collected - paid, planned > 0 ? planned - paid : collected - paid));
            const montant = Number(payItemAmount) || 0;
            return (
              <div className="space-y-3">
                <div className="glass-card rounded-lg p-3 text-xs space-y-1">
                  <p><span className="text-muted-foreground">Poste : </span><b className="text-foreground">{payItemTarget.label}</b></p>
                  <p><span className="text-muted-foreground">Collecté : </span><b className="text-emerald-400">{fmt(collected)} FCFA</b></p>
                  <p><span className="text-muted-foreground">Déjà payé : </span><b className="text-destructive">{fmt(paid)} FCFA</b></p>
                  {planned > 0 && (
                    <p><span className="text-muted-foreground">Budget : </span><b className="text-foreground">{fmt(planned)} FCFA</b></p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Montant à payer maintenant</Label>
                  <MoneyInput
                    value={payItemAmount}
                    onChange={(n) => setPayItemAmount(n ? String(n) : "")}
                    showCurrency={false}
                    className="[&>input]:glass mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Suggéré : {fmt(maxPayable)} FCFA (cotisations disponibles{planned > 0 ? ", sans dépasser le budget" : ""})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 glass" onClick={() => { setPayItemTarget(null); setPayItemAmount(""); }}>
                    Annuler
                  </Button>
                  <Button className="flex-1" onClick={markItemPaid} disabled={saving || montant <= 0}>
                    Confirmer
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectCaisseView;
