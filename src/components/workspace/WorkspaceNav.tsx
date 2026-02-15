import { Link, useLocation, useParams } from "react-router-dom";
import { Home, BookOpen, MessageCircle, Users, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const WorkspaceNav = () => {
  const location = useLocation();
  const { workspaceId } = useParams();
  const base = `/workspace/${workspaceId}`;

  const navItems = [
    { icon: Home, label: "Dashboard", path: `${base}/dashboard` },
    { icon: BookOpen, label: "Transactions", path: `${base}/transactions` },
    { icon: MessageCircle, label: "Chat", path: `${base}/chat` },
    { icon: Users, label: "Membres", path: `${base}/members` },
    { icon: Settings, label: "Plus", path: `${base}/settings` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      <div className="bg-card/80 backdrop-blur-xl border-t border-border/60">
        <div className="flex items-center justify-around max-w-lg mx-auto py-1.5 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className="relative flex flex-col items-center gap-0.5 py-1.5 px-3">
                <motion.div whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-0.5">
                  <div className={cn("p-1.5 rounded-xl transition-all duration-300", isActive ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={cn("text-[10px] font-medium transition-colors duration-300", isActive ? "text-primary" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </motion.div>
                {isActive && (
                  <motion.div layoutId="ws-nav-indicator" className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                )}
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
};

export default WorkspaceNav;
