import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface ScoreData {
  score: number;
  insights: string[];
  tip_of_week: string;
}

const ScoreGauge = ({ score }: { score: number }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score < 40 ? "hsl(0, 70%, 55%)" : score < 70 ? "hsl(35, 90%, 55%)" : "hsl(84, 81%, 44%)";

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground font-medium">/100</span>
      </div>
    </div>
  );
};

export const FinancialScoreSkeleton = () => (
  <div className="glass-card rounded-2xl p-5 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="w-32 h-32 rounded-full mx-auto" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

const FinancialScore = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScore = useCallback(async (force = false) => {
    if (!user) return;
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-score`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ force }),
      });

      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      if (result.score !== undefined) {
        setData({
          score: result.score,
          insights: result.insights || [],
          tip_of_week: result.tip_of_week || "",
        });
      }
    } catch (e) {
      console.error("FinancialScore error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchScore(); }, [fetchScore]);

  if (loading) return <FinancialScoreSkeleton />;
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Score Financier</h3>
        </div>
        <button
          onClick={() => fetchScore(true)}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <ScoreGauge score={data.score} />

      <div className="mt-4 space-y-2">
        {data.insights.map((insight, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.15 }}
            className="text-xs text-muted-foreground leading-relaxed"
          >
            {insight}
          </motion.p>
        ))}
      </div>

      {data.tip_of_week && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-3 p-2.5 rounded-lg bg-primary/10 border border-primary/20"
        >
          <p className="text-xs text-primary font-medium">💡 {data.tip_of_week}</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FinancialScore;
