import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Pencil, Wallet, icons } from "lucide-react";
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

const COLOR_PALETTE = [
  "hsl(84,81%,44%)",
  "hsl(270,70%,60%)",
  "hsl(45,96%,58%)",
  "hsl(200,70%,50%)",
  "hsl(0,70%,55%)",
  "hsl(340,70%,55%)",
  "hsl(180,60%,45%)",
  "hsl(30,80%,50%)",
  "hsl(150,60%,45%)",
  "hsl(220,70%,60%)",
  "hsl(60,70%,50%)",
  "hsl(0,0%,60%)",
];

const ICON_OPTIONS = [
  "Utensils", "Car", "Home", "ShoppingBag", "Zap", "Heart", "GraduationCap",
  "Plane", "Gift", "Phone", "Wifi", "Shirt", "Dumbbell", "Music", "Film",
  "Coffee", "Baby", "PiggyBank", "Briefcase", "Stethoscope", "Wrench",
  "Bus", "Fuel", "Landmark", "HandCoins", "TrendingUp", "Wallet",
  "Gamepad2", "Building2", "Smartphone", "Package", "CreditCard",
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
      const Icon = (icons as any)[name] || Wallet;
      return (
        <button
          key={name}
          onClick={() => onChange(name)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${value === name ? "ring-2 ring-foreground" : ""}`}
          style={{ backgroundColor: color + "20" }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </button>
      );
    })}
  </div>
);

const CatIcon = ({ iconName, color }: { iconName?: string | null; color: string }) => {
  const Icon = iconName && (icons as any)[iconName] ? (icons as any)[iconName] : Wallet;
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
      <Icon className="w-5 h-5" style={{ color }} />
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

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from("categories").select("*").eq("user_id", user.id).order("created_at");
    setCategories(data || []);
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

  useEffect(() => {
    fetchCategories();
    fetchMonthlySpend();
  }, [user]);

  const expenseCats = useMemo(() => categories.filter(c => c.type === "expense"), [categories]);
  const incomeCats = useMemo(() => categories.filter(c => c.type === "income"), [categories]);
  const maxSpend = useMemo(() => {
    const filtered = activeTab === "expense" ? expenseCats : incomeCats;
    const vals = filtered.map(c => monthlySpend[c.id] || 0);
    return Math.max(...vals, 1);
  }, [expenseCats, incomeCats, monthlySpend, activeTab]);

  const handleAdd = async () => {
    if (!newName.trim() || !user) return;
    await supabase.from("categories").insert({
      user_id: user.id, name: newName, type: newType, color: newColor, icon: newIcon,
    });
    toast({ title: "Catégorie ajoutée ✅" });
    setNewName("");
    setNewColor(COLOR_PALETTE[3]);
    setNewIcon("Wallet");
    setShowAdd(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "Catégorie supprimée" });
    fetchCategories();
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
            <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {spent > 0 ? `Ce mois : ${formatMoneySmart(spent)} F` : "Aucune transaction"}
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
        <DialogContent className="sm:max-w-md">
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
