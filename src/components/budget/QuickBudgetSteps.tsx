import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input } from "@/components/ui/input";
import {
  Home, Utensils, Bus, GraduationCap, Users, Receipt,
  Plus, X, Check, Loader2, Sparkles, ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Budget en 3 écrans — version simplifiée.
 *
 * POURQUOI
 * L'ancien parcours faisait 11 écrans (revenu, charges, dettes, revenu
 * exceptionnel, objectifs, situation, habitudes, mois spécial, récap…).
 * Trop long : les utilisateurs abandonnaient avant la fin.
 *
 * Ici on demande le strict minimum — le revenu et les grosses charges —
 * et l'IA déduit le reste. Trois écrans, puis génération du plan.
 *
 * Les champs non demandés gardent leurs valeurs par défaut côté parent :
 * l'edge function budget-coaching-plan sait déjà les gérer.
 */

export type QuickCharge = { nom: string; montant: number };

type PresetCharge = { key: string; nom: string; Icon: LucideIcon; hint: number };

// Charges courantes en Côte d'Ivoire, avec une estimation de départ
// que l'utilisateur peut ajuster ou laisser.
const PRESETS: PresetCharge[] = [
  { key: "loyer", nom: "Loyer", Icon: Home, hint: 0 },
  { key: "nourriture", nom: "Nourriture", Icon: Utensils, hint: 0 },
  { key: "transport", nom: "Transport", Icon: Bus, hint: 0 },
  { key: "ecole", nom: "École", Icon: GraduationCap, hint: 0 },
  { key: "tontine", nom: "Tontine", Icon: Users, hint: 0 },
  { key: "factures", nom: "Factures", Icon: Receipt, hint: 0 },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, "\u202F");

type Props = {
  /** Revenu déjà connu (reprise de session), sinon 0. */
  initialRevenu?: number;
  initialCharges?: QuickCharge[];
  generating: boolean;
  /** Appelé à la fin : le parent enregistre puis lance l'IA. */
  onGenerate: (revenu: number, charges: QuickCharge[]) => void;
};

export function QuickBudgetSteps({
  initialRevenu = 0,
  initialCharges = [],
  generating,
  onGenerate,
}: Props) {
  const [screen, setScreen] = useState<1 | 2>(1);
  const [revenu, setRevenu] = useState<number>(initialRevenu);

  // Charges sélectionnées : clé preset -> montant (0 = coché sans montant).
  const [selected, setSelected] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    initialCharges.forEach((c) => {
      const p = PRESETS.find((x) => x.nom.toLowerCase() === c.nom.toLowerCase());
      if (p) init[p.key] = c.montant;
    });
    return init;
  });

  // Charges personnalisées ajoutées par l'utilisateur.
  const [custom, setCustom] = useState<QuickCharge[]>(() =>
    initialCharges.filter(
      (c) => !PRESETS.some((p) => p.nom.toLowerCase() === c.nom.toLowerCase())
    )
  );

  // Modale d'ajout
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState<number>(0);

  const togglePreset = (key: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (key in next) delete next[key];
      else next[key] = 0;
      return next;
    });
  };

  const setPresetAmount = (key: string, montant: number) => {
    setSelected((prev) => ({ ...prev, [key]: montant }));
  };

  const addCustom = () => {
    const nom = newName.trim();
    if (!nom) return;
    setCustom((prev) => [...prev, { nom, montant: newAmount }]);
    setNewName("");
    setNewAmount(0);
    setAdding(false);
  };

  const removeCustom = (i: number) =>
    setCustom((prev) => prev.filter((_, j) => j !== i));

  const buildCharges = (): QuickCharge[] => {
    const fromPresets = Object.entries(selected).map(([key, montant]) => ({
      nom: PRESETS.find((p) => p.key === key)!.nom,
      montant: Number(montant) || 0,
    }));
    return [...fromPresets, ...custom];
  };

  const chargesCount = Object.keys(selected).length + custom.length;

  /* ---------------- ÉCRAN 1 : revenu ---------------- */
  if (screen === 1) {
    return (
      <div className="max-w-md mx-auto min-h-[70vh] flex flex-col">
        <div className="pt-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary">
            Étape 1 sur 3
          </span>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] mt-2">
            Combien tu gagnes par mois ?
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Ton salaire, ton business, tout ce qui rentre. Un seul chiffre.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center py-8">
          <MoneyInput
            value={revenu}
            onChange={setRevenu}
            className="text-center text-4xl font-extrabold"
            placeholder="0"
          />
        </div>

        <Button
          className="w-full h-12 gradient-primary text-primary-foreground font-bold"
          disabled={revenu <= 0}
          onClick={() => setScreen(2)}
        >
          Continuer
        </Button>
      </div>
    );
  }

  /* ---------------- ÉCRAN 2 : charges ---------------- */
  return (
    <div className="max-w-md mx-auto min-h-[70vh] flex flex-col">
      <div className="pt-2">
        <button
          onClick={() => setScreen(1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary">
          Étape 2 sur 3
        </span>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] mt-2">
          Tes grosses charges ?
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Touche celles qui te concernent. Le montant, c'est optionnel — l'IA
          estime le reste.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-5">
        {PRESETS.map(({ key, nom, Icon }) => {
          const on = key in selected;
          return (
            <div
              key={key}
              className={`relative rounded-2xl p-3.5 border transition-colors ${
                on
                  ? "border-primary"
                  : "border-border bg-card"
              }`}
              style={
                on
                  ? {
                      background:
                        "linear-gradient(150deg, hsl(var(--primary) / 0.12), hsl(var(--card)) 70%)",
                    }
                  : undefined
              }
            >
              <button
                onClick={() => togglePreset(key)}
                className="w-full text-left"
              >
                {on && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3.5} />
                  </span>
                )}
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: "hsl(var(--primary) / 0.16)" }}
                >
                  <Icon className="w-4 h-4 text-primary" />
                </span>
                <p className="text-sm font-bold">{nom}</p>
              </button>

              {on ? (
                <input
                  inputMode="numeric"
                  value={selected[key] ? fmt(selected[key]) : ""}
                  onChange={(e) => {
                    const raw = Number(e.target.value.replace(/\D/g, "")) || 0;
                    setPresetAmount(key, raw);
                  }}
                  placeholder="Montant"
                  className="mt-1.5 w-full bg-transparent border-none outline-none text-xs font-semibold text-primary placeholder:text-muted-foreground/60 p-0"
                />
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1.5">Toucher</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Charges personnalisées */}
      {custom.map((c, i) => (
        <div
          key={`custom-${i}`}
          className="flex items-center gap-3 mt-2.5 rounded-2xl p-3.5 border border-primary"
          style={{
            background:
              "linear-gradient(150deg, hsl(var(--primary) / 0.12), hsl(var(--card)) 70%)",
          }}
        >
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(var(--primary) / 0.16)" }}
          >
            <Receipt className="w-4 h-4 text-primary" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{c.nom}</p>
            {c.montant > 0 && (
              <p className="text-xs font-semibold text-primary">{fmt(c.montant)} F</p>
            )}
          </div>
          <button onClick={() => removeCustom(i)} aria-label="Retirer" className="flex-shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      ))}

      {/* Bouton ajouter */}
      <button
        onClick={() => setAdding(true)}
        className="mt-3 py-3 rounded-2xl border border-dashed border-border text-primary text-sm font-bold flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Ajouter une charge
      </button>

      <div className="flex-1" />

      <Button
        className="w-full h-12 gradient-primary text-primary-foreground font-bold mt-5"
        disabled={generating || chargesCount === 0}
        onClick={() => onGenerate(revenu, buildCharges())}
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création en cours…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" /> Créer mon budget
          </>
        )}
      </Button>

      {/* Modale d'ajout */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => setAdding(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full max-w-sm bg-card border border-border rounded-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-extrabold">Tu payes quoi d'autre ?</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Nounou, internet, carburant, santé…
              </p>

              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Nom de la charge
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nounou"
                className="mt-1.5 mb-4"
                autoFocus
              />

              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Montant par mois (optionnel)
              </label>
              <MoneyInput
                value={newAmount}
                onChange={setNewAmount}
                placeholder="0"
                className="mt-1.5"
              />
              <p className="text-[11px] text-muted-foreground mt-2 mb-4">
                Laisse vide si tu ne sais pas, l'IA fera une estimation.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAdding(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground"
                  disabled={!newName.trim()}
                  onClick={addCustom}
                >
                  Ajouter
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default QuickBudgetSteps;
