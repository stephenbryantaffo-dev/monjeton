import { useState } from "react";
import { BookUser, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parsePhone } from "@/lib/phoneValidation";

interface Props {
  countryCode: string;
  onPick: (data: { name: string; phoneE164: string | null }) => void;
}

interface NavigatorContacts {
  contacts?: {
    select: (
      props: string[],
      opts?: { multiple?: boolean }
    ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
}

export const ContactPickerButton = ({ countryCode, onPick }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePick = async () => {
    setLoading(true);
    try {
      const nav = navigator as Navigator & NavigatorContacts;

      // Web Contacts API (Chrome Android principalement)
      if (nav.contacts?.select) {
        const result = await nav.contacts.select(["name", "tel"], { multiple: false });
        if (result && result.length > 0) {
          const c = result[0];
          const name = c.name?.[0]?.trim() || "";
          const rawPhone = c.tel?.[0]?.trim() || "";
          let phoneE164: string | null = null;
          if (rawPhone) {
            const parsed = parsePhone(rawPhone, countryCode);
            phoneE164 = parsed.valid ? parsed.e164 : rawPhone;
          }
          onPick({ name, phoneE164 });
          toast({ title: "Contact importé ✅", description: name || "Ajouté" });
        }
        return;
      }

      // Tentative Capacitor (si plugin Contacts installé)
      try {
        const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
          .Capacitor;
        if (cap?.isNativePlatform?.()) {
          // Module dynamique : pas d'erreur de build si non installé
          const mod = await import(
            /* @vite-ignore */ "@capacitor-community/contacts"
          ).catch(() => null);
          if (mod?.Contacts?.pickContact) {
            const r = await mod.Contacts.pickContact({
              projection: { name: true, phones: true },
            });
            const name =
              r?.contact?.name?.display ||
              [r?.contact?.name?.given, r?.contact?.name?.family].filter(Boolean).join(" ") ||
              "";
            const rawPhone = r?.contact?.phones?.[0]?.number || "";
            let phoneE164: string | null = null;
            if (rawPhone) {
              const parsed = parsePhone(rawPhone, countryCode);
              phoneE164 = parsed.valid ? parsed.e164 : rawPhone;
            }
            onPick({ name, phoneE164 });
            toast({ title: "Contact importé ✅", description: name || "Ajouté" });
            return;
          }
        }
      } catch {
        // Ignore — pas de plugin natif disponible
      }

      toast({
        title: "Répertoire indisponible",
        description: "Sur ce navigateur, saisis le contact manuellement.",
        variant: "destructive",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      // L'utilisateur a annulé : pas un vrai bug
      if (!/cancel|denied|abort/i.test(msg)) {
        toast({
          title: "Sélection impossible",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <BookUser className="w-3.5 h-3.5" />
      )}
      Répertoire
    </button>
  );
};
