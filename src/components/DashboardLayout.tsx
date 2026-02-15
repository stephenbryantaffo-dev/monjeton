import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import LimelightNav from "@/components/LimelightNav";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

const DashboardLayout = ({ children, title, showBack }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const shouldShowBack = showBack !== undefined ? showBack : !isDashboard;

  return (
    <div className="min-h-screen gradient-bg pb-24">
      {(title || shouldShowBack) && (
        <header className="px-5 pt-6 pb-4 flex items-center gap-3">
          {shouldShowBack && (
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          {title && <h1 className="text-2xl font-bold text-foreground">{title}</h1>}
        </header>
      )}
      <main className="px-5">{children}</main>
      <LimelightNav />
    </div>
  );
};

export default DashboardLayout;
