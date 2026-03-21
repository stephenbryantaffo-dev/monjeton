import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ScoreData {
  score: number;
  insights: string[];
  tip_of_week: string;
}

interface ScoreHistoryItem {
  score: number;
  created_at: string;
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

const ScoreHistoryChart = ({ history }: { history: ScoreHistoryItem[] }) => {
  if (history.length < 2) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          L'historique apparaîtra après plusieurs analyses.
        </p>
      </div>
    );
  }

  const maxScore = 100;
  const chartHeight = 100;
  const chartWidth = 280;
  const padding = { top: 10, bottom: 24, left: 30, right: 10 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const points = history.map((item, i) => ({
    x: padding.left + (i / (history.length - 1)) * innerW,
    y: padding.top + innerH - (item.score / maxScore) * innerH,
    ...item,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;

  const getColor = (score: number) =>
    score < 40 ? "hsl(0, 70%, 55%)" : score < 70 ? "hsl(35, 90%, 55%)" : "hsl(84, 81%, 44%)";

  const lastScore = history[history.length - 1].score;
  const lineColor = getColor(lastScore);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Évolution (4 semaines)</span>
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padding.top + innerH - (v / maxScore) * innerH;
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y}
                stroke="hsl(var(--muted))" strokeWidth="0.5" strokeDasharray="3 3" />
              <text x={padding.left - 4} y={y + 3} textAnchor="end"
                className="fill-muted-foreground" fontSize="7">{v}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill="url(#scoreGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Dots and date labels */}
        {points.map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.x} cy={p.y} r="3"
              fill={getColor(p.score)}
              stroke="hsl(var(--background))"
              strokeWidth="1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            />
            <text x={p.x} y={chartHeight - 4} textAnchor="middle"
              className="fill-muted-foreground" fontSize="6">
              {format(new Date(p.created_at), "d MMM", { locale: fr })}
            </text>
          </g>
        ))}
      </svg>
    </motion.div>
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
  const [history, setHistory] = useState<ScoreHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const { data: scores } = await supabase
      .from("financial_scores")
      .select("score, created_at")
      .eq("user_id", user.id)
      .gte("created_at", fourWeeksAgo.toISOString())
      .order("created_at", { ascending: true })
      .limit(30);

    if (scores) setHistory(scores);
  }, [user]);

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
        // Refresh history after new score
        fetchHistory();
      }
    } catch (e) {
      console.error("FinancialScore error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, fetchHistory]);

  useEffect(() => {
    fetchScore();
    fetchHistory();
  }, [fetchScore, fetchHistory]);

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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(h => !h)}
            className={`p-2 rounded-lg transition-colors ${showHistory ? "bg-primary/15 text-primary" : "hover:bg-secondary text-muted-foreground"}`}
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => fetchScore(true)}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
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

      {showHistory && <ScoreHistoryChart history={history} />}
    </motion.div>
  );
};

export default FinancialScore;
