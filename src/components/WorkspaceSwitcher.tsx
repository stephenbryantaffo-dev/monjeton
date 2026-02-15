import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronDown, Plus, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspace, setActiveWorkspaceId, isEnterprise } = useWorkspace();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-sm font-medium">
        {isEnterprise ? (
          <Building2 className="w-4 h-4 text-primary" />
        ) : (
          <User className="w-4 h-4 text-primary" />
        )}
        <span className="max-w-[140px] truncate">
          {isEnterprise ? activeWorkspace?.name : "Perso"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => { setActiveWorkspaceId(null); navigate("/dashboard"); }}>
          <User className="w-4 h-4 mr-2" />
          Mode Personnel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {workspaces.map(ws => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => { setActiveWorkspaceId(ws.id); navigate(`/workspace/${ws.id}/dashboard`); }}
          >
            <Building2 className="w-4 h-4 mr-2" />
            <span className="truncate">{ws.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/workspace/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Créer un espace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkspaceSwitcher;
