import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Categories = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"expense" | "income">("expense");

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from("categories").select("*").eq("user_id", user.id).order("created_at");
    setCategories(data || []);
  };

  useEffect(() => { fetchCategories(); }, [user]);

  const handleAdd = async () => {
    if (!newName.trim() || !user) return;
    await supabase.from("categories").insert({ user_id: user.id, name: newName, type: newType, color: "hsl(200,70%,50%)" });
    toast({ title: "Catégorie ajoutée ✅" });
    setNewName("");
    setShowAdd(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "Catégorie supprimée" });
    fetchCategories();
  };

  return (
    <DashboardLayout title="Catégories">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {categories.map((c) => (
          <div key={c.id} className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 relative">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.color || 'hsl(200,70%,50%)'}20` }}>
              <span className="text-lg" style={{ color: c.color || 'hsl(200,70%,50%)' }}>●</span>
            </div>
            <span className="text-sm font-medium text-foreground">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.type === "expense" ? "Dépense" : "Revenu"}</span>
            <button onClick={() => handleDelete(c.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <Input placeholder="Nom de la catégorie" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-secondary border-border" />
          <div className="flex gap-2">
            <button onClick={() => setNewType("expense")} className={`flex-1 py-2 rounded-lg text-sm ${newType === "expense" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}>Dépense</button>
            <button onClick={() => setNewType("income")} className={`flex-1 py-2 rounded-lg text-sm ${newType === "income" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>Revenu</button>
          </div>
          <div className="flex gap-2">
            <Button variant="glass" onClick={() => setShowAdd(false)} className="flex-1">Annuler</Button>
            <Button variant="hero" onClick={handleAdd} className="flex-1">Ajouter</Button>
          </div>
        </div>
      ) : (
        <Button variant="glass" size="lg" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Ajouter une catégorie
        </Button>
      )}
    </DashboardLayout>
  );
};

export default Categories;
