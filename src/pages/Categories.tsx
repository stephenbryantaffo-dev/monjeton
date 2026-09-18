import { useState, useEffect, useMemo } from "react";
import { UserText } from "@/components/UserText";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Pencil, Wallet } from "lucide-react";
import { ICON_OPTIONS, resolveCategoryIcon } from "@/lib/categoryIconMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { GridItemSkeleton } from "@/components/DashboardSkeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { z } from "zod";
import { formatMoneySmart } from "@/lib/formatMoney";
import { findMatchingCategory, findSimilarGroups, normalizeCategoryName } from "@/lib/categoryMatch";
import { Merge, AlertTriangle } from "lucide-react";

const COLOR_PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
  "hsl(45,96%,58%)",
  "hsl(200,70%,50%)",
  "hsl(0,70%,55%)",
  "hsl(340,70%,55%)",
  "hsl(180,60%,45%)",
  "hsl(30,80%,50%)",
  "hsl(var(--muted-foreground))",
  "hsl(220,70%,60%)",
  "hsl(60,70%,50%)",
  "hsl(0,0%,60%)",
];


const categorySchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(50, "50 caractères max"),
  type: z.enum(["expense", "income"]),
  color: z.string().min(1),
  icon: z.string().optional(),
});

const ColorPicker = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
  <div className="grid grid-cols-6 gap-2">
    {COLOR_PALETTE.map((c) => (
      <button
        key={c}
        onClick={() => onChange(c)}
        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-foreground scale-110" : "border-transparent"}`}
        style={{ backgroundColor: c }}
      />
    ))}
  </div>
);

const IconPicker = ({ value, onChange, color }: { value: string; onChange: (v: string) => void; color: string }) => (
  <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
    {ICON_OPTIONS.map((name) => {
      const Icon = resolveCategoryIcon(name);
      return (
        <button
          key={name}
          onClick={() => onChange(name)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${value === name ? "ring-2 ring-foreground" : ""}`}
          style={{ backgroundColor: softBg(color) }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </button>
      );
    })}
  </div>
);

/**
 * Fond translucide à partir d'une couleur de catégorie.
 *
 * L'ancien code faisait `color + "20"`, ce qui ne marche QUE si la
 * couleur est un hex 6 chiffres. Les catégories créées avant (ou par
 * l'IA) peuvent contenir "rgb(...)" ou "hsl(...)" : la concaténation
 * produisait alors une valeur invalide, le fond disparaissait et la
 * pastille s'affichait en aplat plein sans icône lisible.
 */
function softBg(color: string | null | undefined): string {
  const c = (color || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c + "20";
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    const [r, g, b] = [c[1], c[2], c[3]];
    return `#${r}${r}${g}${g}${b}${b}20`;
  }
  // rgb(), hsl(), nom de couleur… : on ne peut pas concaténer d'alpha.
  // color-mix est géré par tous les navigateurs récents, avec repli.
  if (c) return `color-mix(in srgb, ${c} 14%, transparent)`;
  return "hsl(var(--secondary))";
}

const CatIcon = ({ iconName, color }: { iconName?: string | null; color: string }) => {
  const Icon = resolveCategoryIcon(iconName);
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        backgroundColor: softBg(color),
        overflow: "visible",
        isolation: "isolate",
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
      }}
    >
      <span style={{ display: "block", lineHeight: 0 }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </span>
    </div>
  );
};

const Categories = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [monthlySpend, setMonthlySpend] = useState<Record<string, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [newColor, setNewColor] = useState(COLOR_PALETTE[3]);
  const [newIcon, setNewIcon] = useState("Wallet");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expense");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"expense" | "income">("expense");
  const [editColor, setEditColor] = useState(COLOR_PALETTE[3]);
  const [editIcon, setEditIcon] = useState("Wallet");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [txCounts, setTxCounts] = useState<Record<string, number>>({});
  const [mergeGroup, setMergeGroup] = useState<any[] | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const createDefaults = async () => {
    if (!user) return;
    const defaults = [
      { name: "Transport", icon: "Car", color: "hsl(20,90%,52%)", type: "expense" },
      { name: "Nourriture", icon: "Utensils", color: "hsl(45,96%,58%)", type: "expense" },
      { name: "Logement", icon: "Home", color: "hsl(200,70%,50%)", type: "expense" },
      { name: "Santé", icon: "Heart", color: "hsl(0,70%,55%)", type: "expense" },
      { name: "Communication", icon: "Phone", color: "hsl(var(--muted-foreground))", type: "expense" },
      { name: "Loisirs", icon: "Gamepad2", color: "hsl(160,60%,45%)", type: "expense" },
      { name: "Éducation", icon: "GraduationCap", color: "hsl(260,70%,55%)", type: "expense" },
      { name: "Autre", icon: "Package", color: "hsl(0,0%,60%)", type: "expense" },
      { name: "Salaire", icon: "Briefcase", color: "hsl(var(--primary))", type: "income" },
      { name: "Business", icon: "Building2", color: "hsl(var(--muted-foreground))", type: "income" },
      { name: "Transfert", icon: "HandCoins", color: "hsl(200,70%,60%)", type: "income" },
    ];
    await supabase.from("categories").insert(
      defaults.map(d => ({ ...d, user_id: user.id }))
    );
  };

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from("categories").select("*").eq("user_id", user.id).order("created_at");
    if (!data || data.length === 0) {
      await createDefaults();
      const { data: refreshed } = await supabase.from("categories").select("*").eq("user_id", user.id).order("created_at");
      setCategories(refreshed || []);
    } else {
      setCategories(data);
    }
    setLoading(false);
  };

  const fetchMonthlySpend = async () => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("transactions")
      .select("category_id, amount, type")
      .eq("user_id", user.id)
      .gte("date", startOfMonth);
    if (!data) return;
    const map: Record<string, number> = {};
    for (const t of data) {
      if (!t.category_id) continue;
      map[t.category_id] = (map[t.category_id] || 0) + Number(t.amount);
    }
    setMonthlySpend(map);
  };

  const fetchTxCounts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("category_id")
      .eq("user_id", user.id)
      .not("category_id", "is", null);
    const map: Record<string, number> = {};
    for (const t of data || []) {
      if (!t.category_id) continue;
      map[t.category_id] = (map[t.category_id] || 0) + 1;
    }
    setTxCounts(map);
  };

  useEffect(() => {
    fetchCategories();
    fetchMonthlySpend();
    fetchTxCounts();
  }, [user]);

  const similarGroups = useMemo(() => findSimilarGroups(categories as any[]), [categories]);

  const expenseCats = useMemo(() => categories.filter(c => c.type === "expense"), [categories]);
  const incomeCats = useMemo(() => categories.filter(c => c.type === "income"), [categories]);
  const maxSpend = useMemo(() => {
    const filtered = activeTab === "expense" ? expenseCats : incomeCats;
    const vals = filtered.map(c => monthlySpend[c.id] || 0);
    return Math.max(...vals, 1);
  }, [expenseCats, incomeCats, monthlySpend, activeTab]);

  const handleAdd = async () => {
    if (!newName.trim() || !user) return;
    const dup = findMatchingCategory(newName, categories as any[], newType);
    if (dup) {
      const exact = normalizeCategoryName(dup.name) === normalizeCategoryName(newName);
      setAddError(
        exact
          ? `« ${dup.name} » existe déjà.`
          : `Trop proche de « ${dup.name} ». Utilise cette catégorie ou choisis un autre nom.`,
      );
      return;
    }
    setAddError("");
    await supabase.from("categories").insert({
      user_id: user.id, name: newName.trim(), type: newType, color: newColor, icon: newIcon,
    });
    toast({ title: "Catégorie ajoutée ✅" });
    setNewName("");
    setNewColor(COLOR_PALETTE[3]);
    setNewIcon("Wallet");
    setShowAdd(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    const count = txCounts[id] || 0;
    if (count > 0) {
      toast({
        title: "Suppression impossible",
        description: `Cette catégorie contient ${count} transaction${count > 1 ? "s" : ""}. Fusionne-la avec une autre catégorie d'abord.`,
        variant: "destructive",
      });
      return;
    }
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "Catégorie supprimée" });
    fetchCategories();
    fetchTxCounts();
  };

  const openMerge = (group: any[]) => {
    // Cible par défaut : la catégorie qui a le plus de transactions
    const target = [...group].sort((a, b) => (txCounts[b.id] || 0) - (txCounts[a.id] || 0))[0];
    setMergeTargetId(target?.id || null);
    setMergeGroup(group);
  };

  const handleMerge = async () => {
    if (!user || !mergeGroup || !mergeTargetId) return;
    const sources = mergeGroup.filter((c) => c.id !== mergeTargetId);
    if (sources.length === 0) return;
    setMerging(true);
    try {
      for (const src of sources) {
        // 1. Réaffecter les transactions
        const { error: txErr } = await supabase
          .from("transactions")
          .update({ category_id: mergeTargetId })
          .eq("user_id", user.id)
          .eq("category_id", src.id);
        if (txErr) throw txErr;

        // 2. Les budgets de la catégorie vidée sont supprimés (le budget de la
        //    catégorie conservée fait foi)
        await supabase
          .from("category_budgets")
          .delete()
          .eq("user_id", user.id)
          .eq("category_id", src.id);

        // 3. Vérifier que la catégorie est bien vide avant suppression
        const { count } = await supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("category_id", src.id);
        if ((count || 0) > 0) {
          throw new Error(`« ${src.name} » contient encore des transactions.`);
        }

        const { error: delErr } = await supabase
          .from("categories")
          .delete()
          .eq("id", src.id)
          .eq("user_id", user.id);
        if (delErr) throw delErr;
      }
      toast({ title: "Catégories fusionnées ✅" });
      setMergeGroup(null);
      await fetchCategories();
      await fetchMonthlySpend();
      await fetchTxCounts();
    } catch (e: any) {
      toast({ title: "Fusion impossible", description: e?.message || "Erreur", variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditType(cat.type);
    setEditColor(cat.color || COLOR_PALETTE[3]);
    setEditIcon(cat.icon || "Wallet");
    setEditError("");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    const result = categorySchema.safeParse({ name: editName, type: editType, color: editColor, icon: editIcon });
    if (!result.success) {
      setEditError(result.error.errors[0]?.message || "Erreur");
      return;
    }
    if (!editId) return;
    setSaving(true);
    const { error } = await supabase.from("categories").update({
      name: result.data.name, type: result.data.type, color: result.data.color, icon: result.data.icon || null,
    }).eq("id", editId);
    setSaving(false);
    if (error) { setEditError(error.message); return; }
    setCategories(prev => prev.map(c => c.id === editId ? { ...c, ...result.data } : c));
    toast({ title: "Catégorie modifiée ✅" });
    setEditOpen(false);
  };

  const renderCategoryCard = (c: any, i: number) => {
    const color = c.color || "hsl(200,70%,50%)";
    const spent = monthlySpend[c.id] || 0;
    const pct = Math.min((spent / maxSpend) * 100, 100);

    return (
      <motion.div
        key={c.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.03 * i }}
        className="glass-card rounded-2xl p-4 flex flex-col gap-2 relative"
      >
        <button
          onClick={() => openEdit(c)}
          className="absolute top-2 right-10 p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-secondary/50 transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <div className="absolute top-2 right-2">
          <ConfirmDeleteDialog onConfirm={() => handleDelete(c.id)} title="Supprimer cette catégorie ?" />
        </div>

        <div className="flex items-center gap-3">
          <CatIcon iconName={c.icon} color={color} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate"><UserText>{c.name}</UserText></p>
            <p className="text-xs text-muted-foreground">
              {spent > 0 ? `Ce mois : ${formatMoneySmart(spent)}` : "Aucune transaction"}
            </p>
          </div>
        </div>

        {spent > 0 && (
          <div className="h-1.5 rounded-full overflow-hidden bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: 0.05 * i }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        )}
      </motion.div>
    );
  };

  const currentCats = activeTab === "expense" ? expenseCats : incomeCats;

  return (
    <DashboardLayout title="Catégories">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="expense" className="flex-1">Dépenses ({expenseCats.length})</TabsTrigger>
          <TabsTrigger value="income" className="flex-1">Revenus ({incomeCats.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3 mb-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <GridItemSkeleton key={i} />)
          : currentCats.length === 0
            ? <p className="text-center text-muted-foreground py-8 text-sm">Aucune catégorie de {activeTab === "expense" ? "dépense" : "revenu"}</p>
            : currentCats.map((c, i) => renderCategoryCard(c, i))
        }
      </div>

      {showAdd ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
          <Input placeholder="Nom de la catégorie" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-secondary border-border" />
          <div className="flex gap-2">
            <button onClick={() => setNewType("expense")} className={`flex-1 py-2 rounded-lg text-sm ${newType === "expense" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}>Dépense</button>
            <button onClick={() => setNewType("income")} className={`flex-1 py-2 rounded-lg text-sm ${newType === "income" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>Revenu</button>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Icône</p>
            <IconPicker value={newIcon} onChange={setNewIcon} color={newColor} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Couleur</p>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <div className="flex gap-2">
            <Button variant="glass" onClick={() => setShowAdd(false)} className="flex-1">Annuler</Button>
            <Button variant="hero" onClick={handleAdd} className="flex-1">Ajouter</Button>
          </div>
        </motion.div>
      ) : (
        <Button variant="glass" size="lg" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Ajouter une catégorie
        </Button>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <Input value={editName} onChange={(e) => { setEditName(e.target.value); setEditError(""); }} className="bg-secondary border-border" maxLength={50} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setEditType("expense")} className={`flex-1 py-2 rounded-lg text-sm ${editType === "expense" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground border border-border"}`}>Dépense</button>
                <button onClick={() => setEditType("income")} className={`flex-1 py-2 rounded-lg text-sm ${editType === "income" ? "gradient-primary text-primary-foreground" : "text-muted-foreground border border-border"}`}>Revenu</button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Icône</Label>
              <div className="mt-2">
                <IconPicker value={editIcon} onChange={setEditIcon} color={editColor} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Couleur</Label>
              <div className="mt-2">
                <ColorPicker value={editColor} onChange={setEditColor} />
              </div>
            </div>
            {editError && <p className="text-xs text-destructive">{editError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEditSave} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Categories;
