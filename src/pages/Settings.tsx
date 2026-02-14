import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Wallet, Tag, Target, CreditCard, LogOut, ChevronRight, MessageCircle, Shield } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { icon: Wallet, label: "Portefeuilles", path: "/wallets" },
  { icon: Tag, label: "Catégories", path: "/categories" },
  { icon: Target, label: "Épargne", path: "/savings" },
  { icon: Shield, label: "Dettes", path: "/debts" },
  { icon: MessageCircle, label: "Assistant IA", path: "/assistant" },
  { icon: CreditCard, label: "Abonnement", path: "/subscribe" },
];

const Settings = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DashboardLayout title="Paramètres">
      <div className="glass-card rounded-2xl p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
          <User className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{profile?.full_name || "Utilisateur"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-1 mb-6">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path} className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <button onClick={handleLogout} className="w-full glass-card rounded-xl p-3.5 flex items-center gap-3 text-destructive hover:bg-destructive/10 transition-colors">
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Se déconnecter</span>
      </button>
    </DashboardLayout>
  );
};

export default Settings;
