import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoneySmart } from "@/lib/formatMoney";

export interface ParsedTransaction {
  amount: number;
  type: "expense" | "income";
  category: string;
  wallet: string | null;
  note: string;
  currency: string;
  date: string | null;
  // Resolved IDs after matching
  categoryId?: string;
  walletId?: string;
}

interface VoiceConfirmationDialogProps {
  transactions: ParsedTransaction[];
  categories: { id: string; name: string; type: string }[];
  wallets: { id: string; wallet_name: string }[];
  onConfirm: (transactions: ParsedTransaction[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function VoiceConfirmationDialog({
  transactions: initialTxs,
  categories,
  wallets,
  onConfirm,
  onCancel,
  isSubmitting,
}: VoiceConfirmationDialogProps) {
  const [transactions, setTransactions] = useState<ParsedTransaction[]>(initialTxs);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateTx = (index: number, updates: Partial<ParsedTransaction>) => {
    setTransactions(prev =>
      prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
    );
  };

  const removeTx = (index: number) => {
    setTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const filteredCategories = (type: string) => categories.filter(c => c.type === type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass-card rounded-2xl p-4 mb-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {transactions.length} transaction{transactions.length > 1 ? "s" : ""} détectée{transactions.length > 1 ? "s" : ""} :
        </p>
      </div>

      <div className="space-y-2">
        {transactions.map((tx, i) => (
          <motion.div
            key={i}
            layout
            className="bg-secondary/50 rounded-xl p-3 space-y-2"
          >
            {editingIndex === i ? (
              // Edit mode
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={tx.amount}
                    onChange={e => updateTx(i, { amount: Number(e.target.value) })}
                    className="bg-background border-border text-sm flex-1"
                    placeholder="Montant"
                  />
                  <select
                    value={tx.currency}
                    onChange={e => updateTx(i, { currency: e.target.value })}
                    className="bg-background border border-border rounded-md px-2 text-sm text-foreground"
                  >
                    <option value="XOF">FCFA</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="NGN">NGN</option>
                    <option value="GHS">GHS</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filteredCategories(tx.type).map(c => (
                    <button
                      key={c.id}
                      onClick={() => updateTx(i, { category: c.name, categoryId: c.id })}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        tx.category.toLowerCase() === c.name.toLowerCase()
                          ? "gradient-primary text-primary-foreground"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={tx.type}
                    onChange={e => updateTx(i, { type: e.target.value as "expense" | "income" })}
                    className="bg-background border border-border rounded-md px-2 text-sm text-foreground"
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                  </select>
                  <Input
                    value={tx.note}
                    onChange={e => updateTx(i, { note: e.target.value })}
                    className="bg-background border-border text-sm flex-1"
                    placeholder="Description"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={tx.date || ""}
                    onChange={e => updateTx(i, { date: e.target.value || null })}
                    className="bg-background border-border text-sm flex-[0.8]"
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditingIndex(null)} className="text-primary text-xs">
                  ✓ Terminé
                </Button>
              </div>
            ) : (
              // Display mode
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                     <span className={`text-sm font-bold ${tx.type === "income" ? "text-primary" : "text-foreground"}`}>
                       {tx.type === "income" ? "+" : "-"}{formatMoneySmart(tx.amount)} {tx.currency === "XOF" ? "FCFA" : tx.currency}
                     </span>
                     <span className="text-xs text-muted-foreground">→ {tx.category}</span>
                     {tx.date && <span className="text-xs text-muted-foreground">📅 {tx.date}</span>}
                   </div>
                  {tx.note && <p className="text-xs text-muted-foreground truncate">{tx.note}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingIndex(i)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeTx(i)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-background transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {transactions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Toutes les transactions ont été supprimées</p>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="hero"
            size="sm"
            className="flex-1"
            onClick={() => onConfirm(transactions)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Enregistrement...</>
            ) : (
              <><Check className="w-4 h-4 mr-1" /> Confirmer ({transactions.length})</>
            )}
          </Button>
          <Button variant="glass" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
        </div>
      )}
    </motion.div>
  );
}
