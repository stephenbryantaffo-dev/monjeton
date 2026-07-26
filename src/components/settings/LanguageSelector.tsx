import { Languages, Check } from "lucide-react";
import { useAppLang, AppLang } from "@/lib/appTranslation";
import { toast } from "sonner";

/**
 * Sélecteur de langue à placer dans la page Paramètres.
 *
 * Deux langues activées : Français (source, instantané) et English (traduit par IA).
 * Pour ajouter une langue plus tard : ajouter une entrée dans LANGUAGES.
 */

const LANGUAGES: { code: AppLang; name: string; nativeName: string }[] = [
  { code: "fr", name: "Français", nativeName: "Français" },
  { code: "en", name: "English", nativeName: "English" },
];

export function LanguageSelector() {
  const { lang, setLang } = useAppLang();

  const handleChange = (newLang: AppLang) => {
    if (newLang === lang) return;
    setLang(newLang);
    toast.success(
      newLang === "en"
        ? "Language changed. Translation may take a few seconds on first load."
        : "Langue changée."
    );
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-xl bg-lime-400/10 p-2">
          <Languages className="w-5 h-5 text-lime-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Langue de l'application</h3>
          <p className="text-sm text-white/50">Choisis la langue de l'interface</p>
        </div>
      </div>

      <div className="space-y-2">
        {LANGUAGES.map((option) => {
          const isActive = option.code === lang;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => handleChange(option.code)}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all ${
                isActive
                  ? "bg-lime-400/10 border border-lime-400/40"
                  : "bg-white/[0.02] border border-white/8 hover:bg-white/[0.04]"
              }`}
            >
              <div className="text-left">
                <div className={`font-medium ${isActive ? "text-lime-400" : "text-white"}`}>
                  {option.nativeName}
                </div>
                <div className="text-xs text-white/40 mt-0.5">{option.name}</div>
              </div>
              {isActive && <Check className="w-5 h-5 text-lime-400" />}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-white/40 mt-4 leading-relaxed">
        La traduction utilise l'IA. Les textes sont mis en cache après la première lecture,
        les affichages suivants sont instantanés.
      </p>
    </div>
  );
}
