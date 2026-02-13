import DashboardLayout from "@/components/DashboardLayout";
import { Users, CreditCard, Activity, TrendingUp } from "lucide-react";

const stats = [
  { label: "Utilisateurs", value: "—", icon: Users },
  { label: "Abonnements actifs", value: "—", icon: CreditCard },
  { label: "Transactions totales", value: "—", icon: Activity },
  { label: "Revenus mensuels", value: "—", icon: TrendingUp },
];

const Admin = () => (
  <DashboardLayout title="Admin">
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
          <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  </DashboardLayout>
);

export default Admin;
