import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { GridItemSkeleton } from "@/components/DashboardSkeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

const ColorPicker = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
  <div className="grid grid-cols-4 gap-2">
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

const Categories = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [newColor, setNewColor] = useState(COLOR_PALETTE[3]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from("categories").select("*").eq("user_id", user.id).order("created_at");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, [user]);

  const handleAdd = async () => {
    if (!newName.trim() || !user) return;
    await supabase.from("categories").insert({ user_id: user.id, name: newName, type: newType, color: newColor });
    toast({ title: "Catégorie ajoutée ✅" });
    setNewName("");
    setNewColor(COLOR_PALETTE[3]);
    setShowAdd(false);
    fetchCategories();
  };

  const handleColorChange = async (id: string, color: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c));
    await supabase.from("categories").update({ color }).eq("id", id);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "Catégorie supprimée" });
    fetchCategories();
  };

  return (
    <DashboardLayout title="Catégories">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <GridItemSkeleton key={i} />)
          : categories.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.04 * i }}
              className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 relative"
            >
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: `${c.color || 'hsl(200,70%,50%)'}20` }}>
                    <span className="text-lg" style={{ color: c.color || 'hsl(200,70%,50%)' }}>●</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <ColorPicker value={c.color || 'hsl(200,70%,50%)'} onChange={(color) => handleColorChange(c.id, color)} />
                </PopoverContent>
              </Popover>
              <span className="text-sm font-medium text-foreground">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.type === "expense" ? "Dépense" : "Revenu"}</span>
              <div className="absolute top-2 right-2">
                <ConfirmDeleteDialog onConfirm={() => handleDelete(c.id)} title="Supprimer cette catégorie ?" />
              </div>
            </motion.div>
          ))}
      </div>

      {showAdd ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
          <Input placeholder="Nom de la catégorie" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-secondary border-border" />
          <div className="flex gap-2">
            <button onClick={() => setNewType("expense")} className={`flex-1 py-2 rounded-lg text-sm ${newType === "expense" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}>Dépense</button>
            <button onClick={() => setNewType("income")} className={`flex-1 py-2 rounded-lg text-sm ${newType === "income" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>Revenu</button>
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
    </DashboardLayout>
  );
};

export default Categories;
