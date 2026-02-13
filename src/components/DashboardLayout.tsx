import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Plus, PieChart, Settings, Wallet, BookOpen, Target, MessageCircle } from "lucide-react";

const navItems = [
  { icon: Home, label: "Accueil", path: "/dashboard" },
  { icon: BookOpen, label: "Transactions", path: "/transactions" },
  { icon: Plus, label: "Ajouter", path: "/transactions/new", isMain: true },
  { icon: PieChart, label: "Rapports", path: "/reports" },
  { icon: Settings, label: "Plus", path: "/settings" },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen gradient-bg pb-20">
      {title && (
        <header className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </header>
      )}
      <main className="px-5">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-50">
        <div className="flex items-center justify-around max-w-lg mx-auto py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            if (item.isMain) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center -mt-5"
                >
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center neon-glow shadow-lg">
                    <item.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                </Link>
              );
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
