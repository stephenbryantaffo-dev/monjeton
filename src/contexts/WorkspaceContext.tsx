import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Workspace {
  id: string;
  name: string;
  logo_url: string | null;
  default_currency: string;
  created_by: string;
  created_at: string;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  display_name: string;
  avatar_url: string | null;
  member_color: string | null;
  joined_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeRole: string | null;
  activeMember: WorkspaceMember | null;
  setActiveWorkspaceId: (id: string | null) => void;
  isEnterprise: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    () => localStorage.getItem("activeWorkspaceId")
  );
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("user_id", user.id);
    
    setMembers(memberData || []);

    if (memberData && memberData.length > 0) {
      const wsIds = memberData.map((m: any) => m.workspace_id);
      const { data: wsData } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", wsIds);
      setWorkspaces(wsData || []);
    } else {
      setWorkspaces([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem("activeWorkspaceId", activeWorkspaceId);
    } else {
      localStorage.removeItem("activeWorkspaceId");
    }
  }, [activeWorkspaceId]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || null;
  const activeMember = members.find(m => m.workspace_id === activeWorkspaceId && m.user_id === user?.id) || null;
  const activeRole = activeMember?.role || null;

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      activeRole,
      activeMember,
      setActiveWorkspaceId,
      isEnterprise: !!activeWorkspace,
      loading,
      refresh: fetchWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};
