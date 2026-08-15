import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import LimelightNav from "@/components/LimelightNav";
import NotificationBell from "@/components/NotificationBell";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
  headerLeft?: ReactNode;
  /** Répartit exactement la hauteur de l'écran au lieu d'empiler les
      réserves du bas. À utiliser sur les pages qui doivent tenir sans
      défilement, comme la saisie d'une transaction. */
  fullHeight?: boolean;
}

const DashboardLayout = ({ children, title, showBack, backTo, headerLeft, fullHeight }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const shouldShowBack = showBack !== undefined ? showBack : !isDashboard;

  return (
    <div
      className={
        fullHeight
          ? "h-[100dvh] gradient-bg flex flex-col overflow-hidden"
          : "min-h-screen gradient-bg pb-24"
      }
      style={
        fullHeight
          ? undefined
          : { paddingBottom: "max(116px, calc(100px + env(safe-area-inset-bottom)))" }
      }
    >
      <header className="px-4 sm:px-5 pt-6 pb-4 flex items-center gap-3 shrink-0">
        {shouldShowBack && (
          <button
            onClick={() => backTo ? navigate(backTo) : navigate(-1)}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
        )}
        {headerLeft && <div className="flex-shrink-0">{headerLeft}</div>}
        {title && <h1 className="text-xl sm:text-2xl font-bold text-foreground flex-1 min-w-0 truncate">{title}</h1>}
        <div className="ml-auto flex-shrink-0">
          <NotificationBell />
        </div>
      </header>
      <main className={fullHeight ? "px-4 sm:px-5 flex-1 min-h-0 flex flex-col" : "px-4 sm:px-5"}>
        {children}
      </main>
      <LimelightNav />
    </div>
  );
};

export default DashboardLayout;
