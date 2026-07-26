import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Coins, Languages, Check, ChevronRight, ArrowLeft } from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";
import { useAppLang, AppLang } from "@/lib/appTranslation";
import { COUNTRIES, CountryConfig } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

/**
 * Première étape de l'onboarding : confirmer pays / devise / langue.
 *
 * Principe : tout est déjà pré-rempli par la détection automatique
 * (IP pour le pays, navigateur pour la langue). L'utilisateur confirme
 * en un clic, ou corrige si la détection s'est trompée.
 *
 * Important : le pays est sauvegardé dans profiles.country, car c'est
 * cette colonne qui détermine quelle banque de rappels push l'utilisateur
 * reçoit (ivoirienne pour CI, française neutre sinon).
 */

type EditMode = null | "country" | "language";

const APP_LANGUAGES: { code: AppLang; label: string; sub: string }[] = [
  { code: "fr", label: "Français", sub: "Langue par défaut" },
  { code: "en", label: "English", sub: "Traduction par IA" },
];

interface LocaleSetupStepProps {
  onComplete: () => void;
}

export function LocaleSetupStep({ onComplete }: LocaleSetupStepProps) {
  const { country, setCountry } = useCountry();
  const { lang, setLang } = useAppLang();
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [saving, setSaving] = useState(false);

  // Détection de la langue du navigateur au premier montage.
  // Si l'utilisateur n'a jamais choisi de langue et que son navigateur
  // est en anglais, on bascule l'app en anglais automatiquement.
  useEffect(() => {
    const alreadyChosen = localStorage.getItem("monjeton_app_lang");
    if (alreadyChosen) return;

    const browserLang = navigator.language?.toLowerCase() || "";
    if (browserLang.startsWith("en")) {
      setLang("en");
    }
  }, [setLang]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Sauvegarde du pays sur le profil (utilisé par les rappels push)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ country: country.code })
          .eq("user_id", user.id);
      }
    } catch (e) {
      // Non bloquant : le pays reste en localStorage via CountryContext
      console.warn("Sauvegarde du pays sur le profil impossible", e);
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const handlePickCountry = (c: CountryConfig) => {
    setCountry(c);
    setEditMode(null);
  };

  const handlePickLang = (code: AppLang) => {
    setLang(code);
    setEditMode(null);
  };

  // ── Écran de sélection du pays ──
  if (editMode === "country") {
    return (
      <div className="flex flex-col h-full">
        <button
          type="button"
          onClick={() => setEditMode(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <h2 className="text-xl font-bold mb-1">Choisis ton pays</h2>
        <p className="text-sm text-muted-foreground mb-5">
          La devise est ajustée automatiquement.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {COUNTRIES.map((c) => {
            const isActive = c.code === country.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => handlePickCountry(c)}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition-all ${
                  isActive
                    ? "bg-primary/10 border-primary/40"
                    : "bg-white/[0.02] border-white/8 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold tracking-wide text-muted-foreground w-7 text-left">
                    {c.code}
                  </span>
                  <div className="text-left">
                    <div className={`font-medium ${isActive ? "text-primary" : ""}`}>
                      {c.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.currencySymbol}
                    </div>
                  </div>
                </div>
                {isActive && <Check className="w-5 h-5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Écran de sélection de la langue ──
  if (editMode === "language") {
    return (
      <div className="flex flex-col h-full">
        <button
          type="button"
          onClick={() => setEditMode(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <h2 className="text-xl font-bold mb-1">Langue de l'application</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Tu pourras la changer à tout moment dans les paramètres.
        </p>

        <div className="space-y-2">
          {APP_LANGUAGES.map((option) => {
            const isActive = option.code === lang;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => handlePickLang(option.code)}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition-all ${
                  isActive
                    ? "bg-primary/10 border-primary/40"
                    : "bg-white/[0.02] border-white/8 hover:bg-white/[0.04]"
                }`}
              >
                <div className="text-left">
                  <div className={`font-medium ${isActive ? "text-primary" : ""}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{option.sub}</div>
                </div>
                {isActive && <Check className="w-5 h-5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Écran principal : confirmation ──
  const currentLangLabel = APP_LANGUAGES.find((l) => l.code === lang)?.label ?? "Français";

  const rows = [
    {
      icon: Globe,
      label: "Pays",
      value: country.name,
      onEdit: () => setEditMode("country"),
    },
    {
      icon: Coins,
      label: "Devise",
      value: `${country.currency} · ${country.currencySymbol}`,
      onEdit: () => setEditMode("country"),
    },
    {
      icon: Languages,
      label: "Langue",
      value: currentLangLabel,
      onEdit: () => setEditMode("language"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      <h2 className="text-2xl font-bold mb-2">Confirme ta configuration</h2>
      <p className="text-sm text-muted-foreground mb-6">
        On a détecté ces réglages. Modifie-les si besoin.
      </p>

      <div className="space-y-2 mb-6">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <button
              key={row.label}
              type="button"
              onClick={row.onEdit}
              className="w-full flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">{row.label}</div>
                  <div className="font-medium">{row.value}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={saving}
        className="w-full rounded-xl bg-primary py-4 font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Enregistrement..." : "Tout est bon, continuer"}
      </button>

      <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed">
        Ces réglages sont modifiables à tout moment dans les paramètres.
      </p>
    </motion.div>
  );
}
