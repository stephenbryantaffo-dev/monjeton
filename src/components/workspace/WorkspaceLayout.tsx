import { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import WorkspaceNav from "./WorkspaceNav";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

interface Props {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

const WorkspaceLayout = ({ children, title, showBack }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg pb-24">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
        )}
        <WorkspaceSwitcher />
        {title && <h1 className="text-lg font-bold text-foreground ml-auto">{title}</h1>}
      </header>
      <main className="px-5">{children}</main>
      <WorkspaceNav />
    </div>
  );
};

export default WorkspaceLayout;
