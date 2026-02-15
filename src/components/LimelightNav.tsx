import { Link, useLocation } from "react-router-dom";
import { Home, Plus, PieChart, Settings, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Accueil", path: "/dashboard" },
  { icon: BookOpen, label: "Transactions", path: "/transactions" },
  { icon: Plus, label: "Ajouter", path: "/transactions/new", isMain: true },
  { icon: PieChart, label: "Rapports", path: "/reports" },
  { icon: Settings, label: "Plus", path: "/settings" },
];

const LimelightNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Gradient fade above the nav */}
      <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="bg-card/80 backdrop-blur-xl border-t border-border/60">
        <div className="flex items-center justify-around max-w-lg mx-auto py-1.5 px-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

            if (item.isMain) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative -mt-7"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-[0_4px_24px_hsla(84,81%,44%,0.4)] rotate-45"
                  >
                    <item.icon className="w-5 h-5 text-primary-foreground -rotate-45" />
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-0.5 py-1.5 px-3"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors duration-300",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Safe area spacer for notched phones */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
};

export default LimelightNav;
