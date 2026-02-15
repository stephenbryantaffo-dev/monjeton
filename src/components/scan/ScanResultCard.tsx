import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ParsedResult {
  amount?: number;
  date?: string;
  merchant?: string;
  type?: string;
  category?: string;
  wallet?: string;
}

interface ScanResultCardProps {
  result: ParsedResult;
  categories: any[];
  wallets: any[];
  onConfirm: (data: ParsedResult) => void;
  onReject: () => void;
  isPremium: boolean;
}

const ScanResultCard = ({ result, categories, wallets, onConfirm, onReject, isPremium }: ScanResultCardProps) => {
  const [editMode, setEditMode] = useState(false);
  const [editResult, setEditResult] = useState<ParsedResult>({ ...result });

  const data = editMode ? editResult : result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Résultat de l'analyse</h3>
        <button
          onClick={() => setEditMode(!editMode)}
          className="text-primary text-xs flex items-center gap-1"
        >
          <Edit3 className="w-3 h-3" /> {editMode ? "Aperçu" : "Modifier"}
        </button>
      </div>

      {editMode ? (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Montant (FCFA)</Label>
            <Input
              type="number"
              value={editResult.amount || ""}
              onChange={(e) => setEditResult({ ...editResult, amount: Number(e.target.value) })}
              className="glass"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Commerçant</Label>
            <Input
              value={editResult.merchant || ""}
              onChange={(e) => setEditResult({ ...editResult, merchant: e.target.value })}
              className="glass"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={editResult.date || ""}
              onChange={(e) => setEditResult({ ...editResult, date: e.target.value })}
              className="glass"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditResult({ ...editResult, type: "expense" })}
                className={`flex-1 py-1.5 rounded-lg text-xs ${
                  editResult.type === "expense"
                    ? "bg-destructive text-destructive-foreground"
                    : "glass text-muted-foreground"
                }`}
              >
                Dépense
              </button>
              <button
                type="button"
                onClick={() => setEditResult({ ...editResult, type: "income" })}
                className={`flex-1 py-1.5 rounded-lg text-xs ${
                  editResult.type === "income"
                    ? "gradient-primary text-primary-foreground"
                    : "glass text-muted-foreground"
                }`}
              >
                Revenu
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Catégorie</Label>
            <select
              value={editResult.category || ""}
              onChange={(e) => setEditResult({ ...editResult, category: e.target.value })}
              className="w-full rounded-lg bg-background/50 border border-border p-2 text-foreground text-sm"
            >
              <option value="">Choisir</option>
              {categories
                .filter((c) => c.type === (editResult.type || "expense"))
                .map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Portefeuille</Label>
            <select
              value={editResult.wallet || ""}
              onChange={(e) => setEditResult({ ...editResult, wallet: e.target.value })}
              className="w-full rounded-lg bg-background/50 border border-border p-2 text-foreground text-sm"
            >
              <option value="">Aucun</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.wallet_name}>{w.wallet_name}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {result.amount != null && (
            <div className="glass rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Montant</p>
              <p className="font-bold text-foreground">{result.amount.toLocaleString("fr-FR")} F</p>
            </div>
          )}
          {result.merchant && (
            <div className="glass rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Commerçant</p>
              <p className="font-bold text-foreground">{result.merchant}</p>
            </div>
          )}
          {result.date && (
            <div className="glass rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Date</p>
              <p className="font-bold text-foreground">{result.date}</p>
            </div>
          )}
          {result.type && (
            <div className="glass rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Type</p>
              <p className="font-bold text-foreground">{result.type === "expense" ? "Dépense" : "Revenu"}</p>
            </div>
          )}
          {result.category && (
            <div className="glass rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Catégorie</p>
              <p className="font-bold text-foreground">{result.category}</p>
            </div>
          )}
          {result.wallet && (
            <div className="glass rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Portefeuille</p>
              <p className="font-bold text-foreground">{result.wallet}</p>
            </div>
          )}
        </div>
      )}

      {!isPremium ? (
        <div className="glass rounded-xl p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">🔒 Fonctionnalité Premium</p>
          <p className="text-xs text-muted-foreground">
            Débloquez Scan Intelligent avec le plan PRO pour enregistrer automatiquement vos transactions.
          </p>
          <Button asChild className="gradient-primary text-primary-foreground w-full">
            <a href="/subscribe">Passer à PRO →</a>
          </Button>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button
            onClick={() => onConfirm(data)}
            className="flex-1 gradient-primary text-primary-foreground"
          >
            <Check className="w-4 h-4 mr-2" /> Confirmer
          </Button>
          <Button onClick={onReject} variant="outline" className="flex-1 glass">
            <X className="w-4 h-4 mr-2" /> Rejeter
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default ScanResultCard;
