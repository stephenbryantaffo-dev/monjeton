import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TontineList from "@/components/tontine/TontineList";
import CyclesTab from "@/components/tontine/CyclesTab";
import ReportsTab from "@/components/tontine/ReportsTab";
import type { TontineData } from "@/components/tontine/types";

const TontinePage = () => {
  const { user } = useAuth();
  const [tontines, setTontines] = useState<TontineData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTontines();
  }, [user]);

  const loadTontines = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tontines" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTontines((data || []) as unknown as TontineData[]);
    setLoading(false);
  };

  return (
    <DashboardLayout title="Tontines">
      <Tabs defaultValue="list">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="list" className="flex-1">Mes Tontines</TabsTrigger>
          <TabsTrigger value="cycles" className="flex-1">Cycles</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <TontineList tontines={tontines} loading={loading} onRefresh={loadTontines} />
        </TabsContent>

        <TabsContent value="cycles">
          <CyclesTab tontines={tontines} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab tontines={tontines} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default TontinePage;
