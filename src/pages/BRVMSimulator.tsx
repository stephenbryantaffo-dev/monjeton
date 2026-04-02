import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Sparkles,
  ChevronDown, Loader2, RefreshCw, BarChart3, DollarSign,
  Clock, ArrowLeft, Calculator, Percent, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";


interface Stock {
  ticker: string;
  name: string;
  price: number;
  variation: number;
  sector: string;
  perf_1y: number;
}

const BRVMSimulator = () => {
  // Live data states
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [fromCache, setFromCache] = useState(false);

  // Simulator states
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [investAmount, setInvestAmount] = useState(100000);
  const [duration, setDuration] = useState(12);
  const [showResult, setShowResult] = useState(false);

  const fetchLiveData = async () => {
    try {
      setLiveError(false);
      setLiveLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brvm-data`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (!resp.ok) throw new Error("Fetch failed");
      const json = await resp.json();
      if (json.stocks && json.stocks.length > 0) {
        setStocks(json.stocks);
        if (!selectedStock) setSelectedStock(json.stocks[0]);
        setLastUpdate(json.fetched_at);
        setFromCache(json.from_cache);
      }
    } catch {
      setLiveError(true);
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchLiveData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulation calculations
  const simulation = useMemo(() => {
    if (!selectedStock) return null;
    const annualReturn = selectedStock.perf_1y / 100;
    const monthlyReturn = annualReturn / 12;
    const months = duration;
    const finalValue = investAmount * Math.pow(1 + monthlyReturn, months);
    const profit = finalValue - investAmount;
    const totalReturn = ((finalValue - investAmount) / investAmount) * 100;
    const shares = Math.floor(investAmount / selectedStock.price);
    const actualInvest = shares * selectedStock.price;

    return {
      finalValue: Math.round(finalValue),
      profit: Math.round(profit),
      totalReturn: totalReturn.toFixed(1),
      shares,
      actualInvest,
      monthlyReturn: (monthlyReturn * 100).toFixed(2),
    };
  }, [selectedStock, investAmount, duration]);

  const presetAmounts = [50000, 100000, 250000, 500000, 1000000];
  const presetDurations = [3, 6, 12, 24, 36];

  return (
    <DashboardLayout>
      <div className="px-4 pt-4 pb-32 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              BRVM Simulator
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top 10 actions · Simulation d'investissement
            </p>
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-lg">
              <div className={`w-1.5 h-1.5 rounded-full ${fromCache ? "bg-yellow-500" : "bg-green-500"}`} />
              <span>{fromCache ? "Cache" : "Direct"}</span>
              <span>· {new Date(lastUpdate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              <button onClick={fetchLiveData} className="ml-1 hover:text-primary transition-colors">
                <RefreshCw className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>

        {/* Loading state */}
        {liveLoading && stocks.length === 0 && (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Chargement des cours BRVM en direct...
            </span>
          </div>
        )}

        {/* Error state */}
        {liveError && stocks.length === 0 && (
          <div className="glass-card rounded-2xl p-6 text-center border border-destructive/30">
            <Activity className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive mb-3">
              Impossible de charger les données en direct
            </p>
            <button
              onClick={fetchLiveData}
              className="text-xs text-primary flex items-center gap-1.5 mx-auto hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Réessayer
            </button>
          </div>
        )}

        {/* Top 10 Stocks */}
        {stocks.length > 0 && (
          <>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Top 10 du jour
              </h2>
              <div className="space-y-1.5">
                {stocks.map((stock, i) => (
                  <motion.button
                    key={stock.ticker}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      setSelectedStock(stock);
                      setShowResult(false);
                    }}
                    className={`w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left transition-all ${
                      selectedStock?.ticker === stock.ticker
                        ? "ring-1 ring-primary/50 bg-primary/5"
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                      {i + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{stock.ticker}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{stock.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{stock.sector}</span>
                    </div>

                    {/* Price & Variation */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {stock.price.toLocaleString("fr-FR")} <span className="text-[10px] text-muted-foreground">F</span>
                      </p>
                      <div className={`flex items-center justify-end gap-0.5 text-xs font-medium ${
                        stock.variation >= 0 ? "text-primary" : "text-destructive"
                      }`}>
                        {stock.variation >= 0
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />
                        }
                        {stock.variation > 0 ? "+" : ""}{stock.variation}%
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Simulator Section */}
            {selectedStock && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Simulateur</h2>
                </div>

                {/* Selected stock card */}
                <div className="glass-card rounded-2xl p-4 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold text-foreground">{selectedStock.ticker}</p>
                      <p className="text-xs text-muted-foreground">{selectedStock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {selectedStock.price.toLocaleString("fr-FR")} F
                      </p>
                      <div className={`flex items-center justify-end gap-1 text-xs font-medium ${
                        selectedStock.variation >= 0 ? "text-primary" : "text-destructive"
                      }`}>
                        {selectedStock.variation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {selectedStock.variation > 0 ? "+" : ""}{selectedStock.variation}% aujourd'hui
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Perf. 1 an : <span className={selectedStock.perf_1y >= 0 ? "text-primary" : "text-destructive"}>
                        {selectedStock.perf_1y > 0 ? "+" : ""}{selectedStock.perf_1y}%
                      </span>
                    </span>
                    <span>{selectedStock.sector}</span>
                  </div>
                </div>

                {/* Change stock */}
                <div className="relative">
                  <select
                    value={selectedStock.ticker}
                    onChange={(e) => {
                      const s = stocks.find((s) => s.ticker === e.target.value);
                      if (s) { setSelectedStock(s); setShowResult(false); }
                    }}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {stocks.map((s, i) => (
                      <option key={s.ticker} value={s.ticker}>
                        #{i + 1} {s.ticker} — {s.name} ({s.variation > 0 ? "+" : ""}{s.variation}%)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Investment amount */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Montant à investir (FCFA)
                  </label>
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => { setInvestAmount(Number(e.target.value)); setShowResult(false); }}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    min={1000}
                    step={1000}
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {presetAmounts.map((a) => (
                      <button
                        key={a}
                        onClick={() => { setInvestAmount(a); setShowResult(false); }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                          investAmount === a
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {(a / 1000)}K
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Durée (mois)
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {presetDurations.map((d) => (
                      <button
                        key={d}
                        onClick={() => { setDuration(d); setShowResult(false); }}
                        className={`text-xs px-3 py-2 rounded-xl border transition-all ${
                          duration === d
                            ? "bg-primary/15 border-primary/40 text-primary font-medium"
                            : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {d} mois
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulate button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowResult(true)}
                  className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Simuler l'investissement
                </motion.button>

                {/* Results */}
                <AnimatePresence>
                  {showResult && simulation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="glass-card rounded-2xl p-4 space-y-4 border border-primary/20">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Valeur estimée après {duration} mois</p>
                          <p className="text-2xl font-bold text-foreground">
                            {simulation.finalValue.toLocaleString("fr-FR")} <span className="text-sm text-muted-foreground">FCFA</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-secondary/50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">Gain estimé</p>
                            <p className={`text-sm font-bold ${simulation.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                              {simulation.profit > 0 ? "+" : ""}{simulation.profit.toLocaleString("fr-FR")} F
                            </p>
                          </div>
                          <div className="bg-secondary/50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">Rendement total</p>
                            <p className={`text-sm font-bold ${Number(simulation.totalReturn) >= 0 ? "text-primary" : "text-destructive"}`}>
                              {Number(simulation.totalReturn) > 0 ? "+" : ""}{simulation.totalReturn}%
                            </p>
                          </div>
                          <div className="bg-secondary/50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">Actions achetables</p>
                            <p className="text-sm font-bold text-foreground">{simulation.shares}</p>
                          </div>
                          <div className="bg-secondary/50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">Investissement réel</p>
                            <p className="text-sm font-bold text-foreground">
                              {simulation.actualInvest.toLocaleString("fr-FR")} F
                            </p>
                          </div>
                        </div>

                        <div className="bg-accent/10 rounded-xl p-3 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            <strong className="text-foreground">Avertissement :</strong> Cette simulation est basée sur les performances passées et ne garantit pas les résultats futurs. Investir en bourse comporte des risques.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BRVMSimulator;
