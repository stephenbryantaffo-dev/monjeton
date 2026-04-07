import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronRight, ChevronLeft, ArrowDownLeft, ArrowUpRight, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import CreateCaisseModal from "./CreateCaisseModal";
import { CaisseData, CaisseMember, CaisseCotisation, CaisseDepense, DEPENSE_CATEGORIES, DEPENSE_CAT_LABELS } from "./types";

const fmt = (n: number) => n?.toLocaleString("fr-FR") ?? "0";

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

  // Dialogs
  const [showCotisation, setShowCotisation] = useState(false);
  const [showDepense, setShowDepense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

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
    const [mRes, cRes, dRes] = await Promise.all([
      supabase.from("caisse_members" as any).select("*").eq("caisse_id", caisse.id),
      supabase.from("caisse_cotisations" as any).select("*").eq("caisse_id", caisse.id).order("created_at", { ascending: false }),
      supabase.from("caisse_depenses" as any).select("*").eq("caisse_id", caisse.id).order("created_at", { ascending: false }),
    ]);
    setMembers((mRes.data || []) as unknown as CaisseMember[]);
    setCotisations((cRes.data || []) as unknown as CaisseCotisation[]);
    setDepenses((dRes.data || []) as unknown as CaisseDepense[]);
  }, []);

  const refreshDetail = async () => {
    if (!selected) return;
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
    cotisations.some((c) => c.member_id === memberId && c.cycle_label === (cycleLabel || defaultCycleLabel));

  const soldeDisponible = selected ? (selected.total_collected - selected.total_spent) : 0;

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
    if (!selected || !newMemberName.trim() || saving) return;
    setSaving(true);
    try {
      await supabase.from("caisse_members" as any).insert({
        caisse_id: selected.id,
        name: newMemberName.trim(),
        phone: newMemberPhone || null,
      } as any);
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
    ...cotisations.map((c) => ({
      id: c.id,
      movement_type: "cotisation" as const,
      display_label: `Cotisation de ${getMemberName(c.member_id)}`,
      display_sub: c.cycle_label || "",
      amount: c.amount,
      date: c.cotisation_date,
      created_at: c.created_at,
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
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Membres ({members.length}) · {fmt(selected.contribution_amount)} F/membre
      </h3>
      <div className="space-y-2 mb-6">
        {members.map((m, i) => {
          const memberTotal = cotisations.filter((c) => c.member_id === m.id).reduce((s, c) => s + Number(c.amount), 0);
          const paid = hasPaidThisCycle(m.id);
          return (
            <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
              <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <p className="text-sm font-bold text-primary-foreground">{m.name.charAt(0).toUpperCase()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">Total versé : {fmt(memberTotal)} F</p>
                </div>
                <div className="flex-shrink-0">
                  {paid ? (
                    <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-full">✅ Payé</span>
                  ) : (
                    <button onClick={() => { setCotisationMemberId(m.id); setCotisationAmount(String(selected.contribution_amount)); setCycleLabel(defaultCycleLabel); setShowCotisation(true); }}
                      className="text-xs gradient-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium">
                      + Cotiser
                    </button>
                  )}
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
            {allMovements.slice(0, 20).map((mvt, i) => (
              <motion.div key={mvt.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
                <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mvt.movement_type === "cotisation" ? "bg-primary/15" : "bg-destructive/15"}`}>
                    {mvt.movement_type === "cotisation" ? <ArrowDownLeft className="w-5 h-5 text-primary" /> : <ArrowUpRight className="w-5 h-5 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{mvt.display_label}</p>
                    <p className="text-xs text-muted-foreground">{mvt.display_sub} · {new Date(mvt.date).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${mvt.movement_type === "cotisation" ? "text-primary" : "text-destructive"}`}>
                    {mvt.movement_type === "cotisation" ? "+" : "-"}{fmt(mvt.amount)} F
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

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
                  {members.map((m) => (
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
